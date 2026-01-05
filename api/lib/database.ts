import { Pool, QueryResultRow } from 'pg';

// 数据库连接字符串
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[db] Database connection string not found. Please set POSTGRES_URL or DATABASE_URL environment variable.');
  // 在生产环境中，如果没有连接字符串，应该抛出错误
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('Database connection string (POSTGRES_URL or DATABASE_URL) is required in production');
  }
}

// 安全地检查 SSL 配置
const needsSSL = connectionString && (
  connectionString.includes('sslmode=require') ||
  connectionString.includes('ssl=true') ||
  connectionString.includes('vercel')
);

// 创建连接池（复用连接，提高性能）
// 连接池配置优化：
// - max: 最大连接数（根据服务器资源调整）
// - min: 最小保持连接数
// - idleTimeoutMillis: 空闲连接超时时间
// - connectionTimeoutMillis: 连接超时时间
const pool = connectionString ? new Pool({
  connectionString,
  ssl: needsSSL ? {
    rejectUnauthorized: false
  } : undefined,
  // 连接池配置
  max: parseInt(process.env.DB_POOL_MAX || '10', 10), // 最大连接数
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),  // 最小连接数
  idleTimeoutMillis: 30000, // 30秒空闲超时
  connectionTimeoutMillis: 10000, // 10秒连接超时
  // 对于海外数据库，可以增加连接超时时间
  ...(process.env.DB_CONNECTION_TIMEOUT ? {
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10)
  } : {})
}) : null;

// 监听连接池错误
if (pool) {
  pool.on('error', (err) => {
    console.error('[db] Unexpected error on idle client', err);
  });
}

// 原始 SQL 标记类，用于标记不应该参数化的值
class RawSQL {
  constructor(public value: string) {}
}

// 导出 SQL 查询函数 (tagged template 语法)
// 使用连接池而不是每次创建新连接，大大提高性能
export const sql = async <T extends QueryResultRow = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<{ rows: T[]; rowCount: number }> => {
  if (!pool || !connectionString) {
    const error = new Error('Database connection string not configured. Please set POSTGRES_URL or DATABASE_URL environment variable.');
    console.error('[sql]', error.message);
    throw error;
  }

  // 构建参数化查询
  let queryText = '';
  const params: any[] = [];
  let paramIndex = 1;

  for (let i = 0; i < strings.length; i++) {
    queryText += strings[i];
    if (i < values.length) {
      // 如果值是 RawSQL 实例，直接插入 SQL，不参数化
      if (values[i] instanceof RawSQL) {
        queryText += values[i].value;
      } else {
        queryText += `$${paramIndex}`;
        params.push(values[i]);
        paramIndex++;
      }
    }
  }

  try {
    // 使用连接池执行查询（自动管理连接）
    const result = await pool.query<T>(queryText, params);

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    };
  } catch (error: any) {
    console.error('[sql] Query error:', error);
    console.error('[sql] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    throw error;
  }
};

// 辅助函数：创建原始 SQL 标记
export function raw(sql: string): RawSQL {
  return new RawSQL(sql);
}

// 测试数据库连接
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('Database connected:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// 关闭连接池（在应用关闭时调用）
export async function closePool() {
  if (pool) {
    await pool.end();
    console.log('[db] Connection pool closed');
  }
}

// 缓存表初始化状态，避免每次请求都执行 DDL
let workflowConfigsTableInitialized = false;
let workflowConfigsTableInitPromise: Promise<void> | null = null;

/**
 * 初始化工作流配置表（带缓存，只执行一次）
 */
export async function initWorkflowConfigsTable() {
  // 如果已经初始化，直接返回
  if (workflowConfigsTableInitialized) {
    return;
  }

  // 如果正在初始化，等待初始化完成
  if (workflowConfigsTableInitPromise) {
    await workflowConfigsTableInitPromise;
    return;
  }

  // 开始初始化
  workflowConfigsTableInitPromise = (async () => {
    try {

      await sql`
        CREATE TABLE IF NOT EXISTS workflow_configs (
          id VARCHAR(255) PRIMARY KEY,
          user_id UUID NOT NULL,
          workflow_id VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_workflow_configs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;

      // 创建索引
      await sql`CREATE INDEX IF NOT EXISTS idx_workflow_configs_user_id ON workflow_configs(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_workflow_configs_workflow_id ON workflow_configs(workflow_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_workflow_configs_user_workflow ON workflow_configs(user_id, workflow_id)`;

      workflowConfigsTableInitialized = true;
    } catch (error) {
      console.error('[initWorkflowConfigsTable] Error initializing table:', error);
      workflowConfigsTableInitPromise = null; // 重置，允许重试
      throw error;
    }
  })();

  await workflowConfigsTableInitPromise;
}
/**
 * 工作流配置接口
 */
export interface WorkflowConfig {
  id: string;
  user_id: string;
  workflow_id: string;
  name: string;
  nodes: any; // JSONB 存储 WorkflowNode[]
  created_at: Date;
  updated_at: Date;
}
/**
 * 创建工作流配置
 */
export async function createWorkflowConfig(
  userId: string,
  workflowId: string,
  name: string,
  nodes: any[]
): Promise<WorkflowConfig> {
  try {
    await initWorkflowConfigsTable();

    const configId = `${workflowId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await sql`
      INSERT INTO workflow_configs (id, user_id, workflow_id, name, nodes, created_at, updated_at)
      VALUES (${configId}, ${userId}, ${workflowId}, ${name.trim()}, ${JSON.stringify(nodes)}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    return {
      id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      workflow_id: result.rows[0].workflow_id,
      name: result.rows[0].name,
      nodes: result.rows[0].nodes,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
    };
  } catch (error) {
    console.error('Error creating workflow config:', error);
    throw error;
  }
}

/**
 * 获取用户的工作流配置列表
 */
export async function getUserWorkflowConfigs(
  userId: string,
  workflowId?: string
): Promise<WorkflowConfig[]> {
  try {
    await initWorkflowConfigsTable();

    let result;
    if (workflowId) {
      result = await sql`
        SELECT * FROM workflow_configs
        WHERE user_id = ${userId} AND workflow_id = ${workflowId}
        ORDER BY updated_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM workflow_configs
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
      `;
    }

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      workflow_id: row.workflow_id,
      name: row.name,
      nodes: row.nodes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting user workflow configs:', error);
    // 如果表不存在，返回空数组
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      return [];
    }
    throw error;
  }
}

/**
 * 根据 ID 获取工作流配置
 */
export async function getWorkflowConfigById(
  configId: string,
  userId?: string
): Promise<WorkflowConfig | null> {
  try {
    await initWorkflowConfigsTable();

    let result;
    if (userId) {
      result = await sql`
        SELECT * FROM workflow_configs
        WHERE id = ${configId} AND user_id = ${userId}
      `;
    } else {
      result = await sql`
        SELECT * FROM workflow_configs
        WHERE id = ${configId}
      `;
    }

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      workflow_id: row.workflow_id,
      name: row.name,
      nodes: row.nodes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error) {
    console.error('Error getting workflow config:', error);
    // 如果表不存在，返回 null
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * 更新工作流配置
 */
export async function updateWorkflowConfig(
  configId: string,
  userId: string,
  updates: { name?: string; nodes?: any[] }
): Promise<WorkflowConfig | null> {
  try {
    await initWorkflowConfigsTable();

    // 构建动态更新语句
    const updateParts: any[] = [];

    if (updates.name !== undefined) {
      updateParts.push(sql`name = ${updates.name.trim()}`);
    }

    if (updates.nodes !== undefined) {
      updateParts.push(sql`nodes = ${JSON.stringify(updates.nodes)}::jsonb`);
    }

    if (updateParts.length === 0) {
      // 没有要更新的字段，直接返回现有配置
      return await getWorkflowConfigById(configId, userId);
    }

    // 总是更新 updated_at
    updateParts.push(sql`updated_at = CURRENT_TIMESTAMP`);

    // 构建 SET 子句
    const setClause = updateParts.reduce((acc, part, index) => {
      if (index === 0) {
        return part;
      }
      return sql`${acc}, ${part}`;
    });

    const result = await sql`
      UPDATE workflow_configs
      SET ${setClause}
      WHERE id = ${configId} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      workflow_id: row.workflow_id,
      name: row.name,
      nodes: row.nodes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error) {
    console.error('Error updating workflow config:', error);
    throw error;
  }
}

/**
 * 删除工作流配置
 */
export async function deleteWorkflowConfig(
  configId: string,
  userId: string
): Promise<boolean> {
  try {
    await initWorkflowConfigsTable();

    const result = await sql`
      DELETE FROM workflow_configs
      WHERE id = ${configId} AND user_id = ${userId}
      RETURNING id
    `;

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting workflow config:', error);
    // 如果表不存在，返回 false
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      return false;
    }
    throw error;
  }
}
/**
 * API Key 接口
 */
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string; // 显示的前缀，如 "nm_live_abc123..."
  last_used_at: Date | null;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
// 缓存 API Keys 表初始化状态
let apiKeysTableInitialized = false;
let apiKeysTableInitPromise: Promise<void> | null = null;

/**
 * 初始化 API Keys 表（带缓存，只执行一次）
 */
export async function initApiKeysTable() {
  // 如果已经初始化，直接返回
  if (apiKeysTableInitialized) {
    return;
  }

  // 如果正在初始化，等待初始化完成
  if (apiKeysTableInitPromise) {
    await apiKeysTableInitPromise;
    return;
  }

  // 开始初始化
  apiKeysTableInitPromise = (async () => {
    try {

      await sql`
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          key_hash VARCHAR(64) UNIQUE NOT NULL,
          key_prefix VARCHAR(50) NOT NULL,
          last_used_at TIMESTAMP,
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_api_keys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active)`;

      apiKeysTableInitialized = true;
    } catch (error) {
      console.error('[initApiKeysTable] Error initializing table:', error);
      apiKeysTableInitPromise = null; // 重置，允许重试
      throw error;
    }
  })();

  await apiKeysTableInitPromise;
}

// =============================================
// Website Data Tables Initialization
// =============================================

let userWebsitesTableInitialized = false;
let userWebsitesTableInitPromise: Promise<void> | null = null;

export async function initUserWebsitesTable() {
  if (userWebsitesTableInitialized) return;
  if (userWebsitesTableInitPromise) {
    await userWebsitesTableInitPromise;
    return;
  }

  userWebsitesTableInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS user_websites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL,
          website_url VARCHAR(500) NOT NULL,
          website_domain VARCHAR(255) NOT NULL,
          website_title VARCHAR(500),
          website_description TEXT,
          website_screenshot TEXT,
          raw_content TEXT,
          content_updated_at TIMESTAMP,
          bound_at TIMESTAMP DEFAULT NOW(),
          industry VARCHAR(100),
          monthly_visits INTEGER,
          monthly_revenue VARCHAR(50),
          marketing_tools TEXT[],
          additional_info TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT unique_user_website UNIQUE (user_id, website_url)
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_user_websites_user ON user_websites(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_websites_domain ON user_websites(website_domain)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_websites_active ON user_websites(is_active)`;

      userWebsitesTableInitialized = true;
    } catch (error) {
      console.error('[initUserWebsitesTable] Error:', error);
      userWebsitesTableInitPromise = null;
      throw error;
    }
  })();

  await userWebsitesTableInitPromise;
}

let websitePagesTableInitialized = false;
let websitePagesTableInitPromise: Promise<void> | null = null;

export async function initWebsitePagesTable() {
  if (websitePagesTableInitialized) return;
  if (websitePagesTableInitPromise) {
    await websitePagesTableInitPromise;
    return;
  }

  websitePagesTableInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS website_pages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL,
          page_url VARCHAR(1000) NOT NULL,
          page_title VARCHAR(500),
          page_description TEXT,
          page_type VARCHAR(50),
          content_markdown TEXT,
          content_length INTEGER,
          topic_cluster VARCHAR(255),
          cluster_priority INTEGER,
          is_scraped BOOLEAN DEFAULT false,
          scraped_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT unique_website_page UNIQUE (website_id, page_url),
          CONSTRAINT fk_website_pages_website FOREIGN KEY (website_id) REFERENCES user_websites(id) ON DELETE CASCADE
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_website_pages_website ON website_pages(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_website_pages_cluster ON website_pages(topic_cluster)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_website_pages_scraped ON website_pages(is_scraped)`;

      websitePagesTableInitialized = true;
    } catch (error) {
      console.error('[initWebsitePagesTable] Error:', error);
      websitePagesTableInitPromise = null;
      throw error;
    }
  })();

  await websitePagesTableInitPromise;
}

let websiteKeywordsTableInitialized = false;
let websiteKeywordsTableInitPromise: Promise<void> | null = null;

export async function initWebsiteKeywordsTable() {
  if (websiteKeywordsTableInitialized) return;
  if (websiteKeywordsTableInitPromise) {
    await websiteKeywordsTableInitPromise;
    return;
  }

  websiteKeywordsTableInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS website_keywords (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL,
          page_id UUID,
          keyword VARCHAR(500) NOT NULL,
          translation VARCHAR(500),
          intent VARCHAR(50),
          estimated_volume INTEGER,
          seranking_volume INTEGER,
          seranking_cpc DECIMAL(10,2),
          seranking_competition DECIMAL(10,2),
          seranking_difficulty INTEGER,
          seranking_history_trend JSONB,
          seranking_data_found BOOLEAN DEFAULT false,
          seranking_updated_at TIMESTAMP,
          ranking_opportunity_score INTEGER,
          opportunity_reasoning TEXT,
          suggested_optimization TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT unique_website_keyword UNIQUE (website_id, keyword),
          CONSTRAINT fk_website_keywords_website FOREIGN KEY (website_id) REFERENCES user_websites(id) ON DELETE CASCADE,
          CONSTRAINT fk_website_keywords_page FOREIGN KEY (page_id) REFERENCES website_pages(id) ON DELETE SET NULL
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_website_keywords_website ON website_keywords(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_website_keywords_page ON website_keywords(page_id)`;

      // 迁移现有表：将 seranking_competition 从 DECIMAL(5,2) 改为 DECIMAL(10,2)
      try {
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'website_keywords'
          )
        `;
        
        if (tableCheck.rows[0].exists) {
          const competitionCheck = await sql`
            SELECT numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'website_keywords' 
            AND column_name = 'seranking_competition'
          `;
          
          if (competitionCheck.rows.length > 0) {
            const precision = competitionCheck.rows[0].numeric_precision;
            if (precision && precision < 10) {
              await sql`ALTER TABLE website_keywords ALTER COLUMN seranking_competition TYPE DECIMAL(10,2)`;
              console.log('[Database] ✅ Updated seranking_competition precision to DECIMAL(10,2) in website_keywords');
            }
          }
        }
      } catch (error: any) {
        console.warn('[Database] Could not migrate website_keywords columns:', error.message);
      }
      await sql`CREATE INDEX IF NOT EXISTS idx_website_keywords_opportunity ON website_keywords(ranking_opportunity_score DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_website_keywords_seranking ON website_keywords(seranking_data_found)`;

      websiteKeywordsTableInitialized = true;
    } catch (error) {
      console.error('[initWebsiteKeywordsTable] Error:', error);
      websiteKeywordsTableInitPromise = null;
      throw error;
    }
  })();

  await websiteKeywordsTableInitPromise;
}

let articleRankingsTableInitialized = false;
let articleRankingsTableInitPromise: Promise<void> | null = null;

export async function initArticleRankingsTable() {
  if (articleRankingsTableInitialized) return;
  if (articleRankingsTableInitPromise) {
    await articleRankingsTableInitPromise;
    return;
  }

  articleRankingsTableInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS article_rankings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL,
          keyword_id UUID NOT NULL,
          current_position INTEGER,
          previous_position INTEGER,
          position_change INTEGER,
          search_engine VARCHAR(50) DEFAULT 'google',
          search_location VARCHAR(50) DEFAULT 'us',
          search_device VARCHAR(50) DEFAULT 'desktop',
          ranking_history JSONB,
          is_tracking BOOLEAN DEFAULT true,
          last_tracked_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT unique_ranking UNIQUE (keyword_id, search_engine, search_location, search_device),
          CONSTRAINT fk_article_rankings_website FOREIGN KEY (website_id) REFERENCES user_websites(id) ON DELETE CASCADE,
          CONSTRAINT fk_article_rankings_keyword FOREIGN KEY (keyword_id) REFERENCES website_keywords(id) ON DELETE CASCADE
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_article_rankings_website ON article_rankings(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_article_rankings_keyword ON article_rankings(keyword_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_article_rankings_position ON article_rankings(current_position)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_article_rankings_tracking ON article_rankings(is_tracking, last_tracked_at)`;

      articleRankingsTableInitialized = true;
    } catch (error) {
      console.error('[initArticleRankingsTable] Error:', error);
      articleRankingsTableInitPromise = null;
      throw error;
    }
  })();

  await articleRankingsTableInitPromise;
}

let userPreferencesTableInitialized = false;
let userPreferencesTableInitPromise: Promise<void> | null = null;

export async function initUserPreferencesTable() {
  if (userPreferencesTableInitialized) return;
  if (userPreferencesTableInitPromise) {
    await userPreferencesTableInitPromise;
    return;
  }

  userPreferencesTableInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id INTEGER PRIMARY KEY,
          default_website_id UUID REFERENCES user_websites(id) ON DELETE SET NULL,
          last_selected_website_id UUID REFERENCES user_websites(id) ON DELETE SET NULL,
          ui_settings JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_user_preferences_default_website ON user_preferences(default_website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_preferences_last_selected ON user_preferences(last_selected_website_id)`;

      userPreferencesTableInitialized = true;
    } catch (error) {
      console.error('[initUserPreferencesTable] Error:', error);
      userPreferencesTableInitPromise = null;
      throw error;
    }
  })();

  await userPreferencesTableInitPromise;
}

let domainCacheTablesInitialized = false;
let domainCacheTablesInitPromise: Promise<void> | null = null;

export async function initDomainCacheTables() {
  if (domainCacheTablesInitialized) return;
  if (domainCacheTablesInitPromise) {
    await domainCacheTablesInitPromise;
    return;
  }

  domainCacheTablesInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS domain_overview_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          data_date DATE DEFAULT CURRENT_DATE,
          organic_traffic NUMERIC(20,2) DEFAULT 0,
          paid_traffic NUMERIC(20,2) DEFAULT 0,
          total_traffic NUMERIC(20,2) DEFAULT 0,
          total_keywords INTEGER DEFAULT 0,
          new_keywords INTEGER DEFAULT 0,
          lost_keywords INTEGER DEFAULT 0,
          improved_keywords INTEGER DEFAULT 0,
          declined_keywords INTEGER DEFAULT 0,
          avg_position DECIMAL(10,2),
          traffic_cost DECIMAL(20,2),
          top3_count INTEGER DEFAULT 0,
          top10_count INTEGER DEFAULT 0,
          top50_count INTEGER DEFAULT 0,
          top100_count INTEGER DEFAULT 0,
          backlinks_info JSONB,
          data_updated_at TIMESTAMP,
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(website_id, data_date)
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_domain_overview_website ON domain_overview_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_overview_date ON domain_overview_cache(data_date)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_overview_expires ON domain_overview_cache(cache_expires_at)`;

      // 迁移现有表：将流量字段从 INTEGER 改为 NUMERIC（如果表已存在）
      try {
        // 检查表是否存在
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'domain_overview_cache'
          )
        `;
        
        if (tableCheck.rows[0].exists) {
          // 检查列类型，如果是 INTEGER，则改为 NUMERIC
          const columnCheck = await sql`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'domain_overview_cache' 
            AND column_name = 'organic_traffic'
          `;
          
          if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'integer') {
            console.log('[Database] Migrating traffic columns from INTEGER to NUMERIC...');
            await sql`ALTER TABLE domain_overview_cache ALTER COLUMN organic_traffic TYPE NUMERIC(20,2)`;
            await sql`ALTER TABLE domain_overview_cache ALTER COLUMN paid_traffic TYPE NUMERIC(20,2)`;
            await sql`ALTER TABLE domain_overview_cache ALTER COLUMN total_traffic TYPE NUMERIC(20,2)`;
            console.log('[Database] ✅ Successfully migrated traffic columns to NUMERIC');
          }
          
          // 检查并更新 traffic_cost 精度
          const costCheck = await sql`
            SELECT numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'domain_overview_cache' 
            AND column_name = 'traffic_cost'
          `;
          
          if (costCheck.rows.length > 0) {
            const precision = costCheck.rows[0].numeric_precision;
            if (precision && precision < 20) {
              await sql`ALTER TABLE domain_overview_cache ALTER COLUMN traffic_cost TYPE DECIMAL(20,2)`;
              console.log('[Database] ✅ Updated traffic_cost precision to DECIMAL(20,2)');
            }
          }
        }
      } catch (error: any) {
        console.warn('[Database] Could not migrate traffic columns:', error.message);
      }

      // 添加 backlinks_info 字段（如果不存在）
      try {
        // 检查列是否存在
        const columnCheck = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = 'domain_overview_cache' 
          AND column_name = 'backlinks_info'
        `;
        
        if (columnCheck.rows.length === 0) {
          await sql`ALTER TABLE domain_overview_cache ADD COLUMN backlinks_info JSONB`;
          console.log('[Database] Added backlinks_info column to domain_overview_cache');
        }
      } catch (error: any) {
        // 如果错误是"列已存在"，这是正常的，可以忽略
        if (error.code === '42701' || error.message?.includes('already exists')) {
          // 静默处理，不输出日志
        } else {
          console.warn('[Database] Could not add backlinks_info column:', error.message);
        }
      }

      await sql`
        CREATE TABLE IF NOT EXISTS domain_keywords_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          keyword VARCHAR(500) NOT NULL,
          current_position INTEGER,
          previous_position INTEGER,
          position_change INTEGER,
          search_volume INTEGER,
          cpc DECIMAL(10,2),
          competition DECIMAL(10,2),
          difficulty INTEGER,
          traffic_percentage DECIMAL(10,2),
          data_updated_at TIMESTAMP,
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_domain_keywords_website ON domain_keywords_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_keywords_keyword ON domain_keywords_cache(keyword)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_keywords_position ON domain_keywords_cache(current_position)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_keywords_expires ON domain_keywords_cache(cache_expires_at)`;

      // 迁移现有表：将 competition 和 traffic_percentage 从 DECIMAL(5,2) 改为 DECIMAL(10,2)
      try {
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'domain_keywords_cache'
          )
        `;
        
        if (tableCheck.rows[0].exists) {
          // 检查并迁移 competition 字段
          const competitionCheck = await sql`
            SELECT numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'domain_keywords_cache' 
            AND column_name = 'competition'
          `;
          
          if (competitionCheck.rows.length > 0) {
            const precision = Number(competitionCheck.rows[0].numeric_precision);
            const scale = Number(competitionCheck.rows[0].numeric_scale);
            // 如果 precision < 10 或者 scale 不是 2，执行迁移
            if (precision < 10 || scale !== 2) {
              await sql`ALTER TABLE domain_keywords_cache ALTER COLUMN competition TYPE DECIMAL(10,2)`;
              console.log('[Database] ✅ Updated competition precision to DECIMAL(10,2) in domain_keywords_cache');
            } else {
              console.log('[Database] ℹ️ competition column already has correct precision');
            }
          }

          // 检查并迁移 traffic_percentage 字段
          const trafficCheck = await sql`
            SELECT numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'domain_keywords_cache' 
            AND column_name = 'traffic_percentage'
          `;
          
          if (trafficCheck.rows.length > 0) {
            const precision = Number(trafficCheck.rows[0].numeric_precision);
            const scale = Number(trafficCheck.rows[0].numeric_scale);
            // 如果 precision < 10 或者 scale 不是 2，执行迁移
            if (precision < 10 || scale !== 2) {
              await sql`ALTER TABLE domain_keywords_cache ALTER COLUMN traffic_percentage TYPE DECIMAL(10,2)`;
              console.log('[Database] ✅ Updated traffic_percentage precision to DECIMAL(10,2) in domain_keywords_cache');
            } else {
              console.log('[Database] ℹ️ traffic_percentage column already has correct precision');
            }
          }
        }
      } catch (error: any) {
        console.error('[Database] ❌ Could not migrate domain_keywords_cache columns:', error.message);
        // 即使迁移失败，也尝试直接执行 ALTER TABLE（可能表结构已经正确）
        try {
          await sql`ALTER TABLE domain_keywords_cache ALTER COLUMN competition TYPE DECIMAL(10,2)`;
          console.log('[Database] ✅ Force updated competition column');
        } catch (e: any) {
          // 忽略错误，可能字段不存在或已经是正确类型
        }
        try {
          await sql`ALTER TABLE domain_keywords_cache ALTER COLUMN traffic_percentage TYPE DECIMAL(10,2)`;
          console.log('[Database] ✅ Force updated traffic_percentage column');
        } catch (e: any) {
          // 忽略错误，可能字段不存在或已经是正确类型
        }
      }

      await sql`
        CREATE TABLE IF NOT EXISTS domain_competitors_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          competitor_domain VARCHAR(255) NOT NULL,
          competitor_title VARCHAR(500),
          common_keywords INTEGER DEFAULT 0,
          organic_traffic NUMERIC(20,2) DEFAULT 0,
          total_keywords INTEGER DEFAULT 0,
          gap_keywords INTEGER DEFAULT 0,
          gap_traffic NUMERIC(20,2) DEFAULT 0,
          data_updated_at TIMESTAMP,
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(website_id, competitor_domain)
        )
      `;

      // Ensure domain column exists (for existing tables that might not have it)
      // This handles the case where the table was created before the domain column was added
      try {
        // Check if column exists by trying to add it (will fail silently if it exists)
        await sql`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'domain_competitors_cache' AND column_name = 'domain'
            ) THEN
              ALTER TABLE domain_competitors_cache ADD COLUMN domain VARCHAR(255);
              UPDATE domain_competitors_cache SET domain = '' WHERE domain IS NULL;
              ALTER TABLE domain_competitors_cache ALTER COLUMN domain SET NOT NULL;
            END IF;
          END $$;
        `;
      } catch (error: any) {
        // If the table doesn't exist yet, that's fine - it will be created above
        // Ignore other errors related to column already existing
        if (error?.code !== '42P01') {
          console.warn('[initDomainCacheTables] Warning adding domain column:', error);
        }
      }

      await sql`CREATE INDEX IF NOT EXISTS idx_domain_competitors_website ON domain_competitors_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_competitors_domain ON domain_competitors_cache(competitor_domain)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_competitors_expires ON domain_competitors_cache(cache_expires_at)`;

      // 创建排名关键词缓存表
      await sql`
        CREATE TABLE IF NOT EXISTS ranked_keywords_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          keyword VARCHAR(500) NOT NULL,
          current_position INTEGER,
          previous_position INTEGER,
          search_volume INTEGER,
          etv NUMERIC(20,2),
          serp_features JSONB,
          ranking_url TEXT,
          cpc DECIMAL(10,2),
          competition DECIMAL(10,2),
          difficulty INTEGER,
          data_updated_at TIMESTAMP,
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(website_id, keyword)
        )
      `;

      // 添加 difficulty 字段（如果不存在）
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'ranked_keywords_cache' AND column_name = 'difficulty'
          ) THEN
            ALTER TABLE ranked_keywords_cache ADD COLUMN difficulty INTEGER;
          END IF;
        END $$;
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_ranked_keywords_website ON ranked_keywords_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_ranked_keywords_keyword ON ranked_keywords_cache(keyword)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_ranked_keywords_position ON ranked_keywords_cache(current_position)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_ranked_keywords_expires ON ranked_keywords_cache(cache_expires_at)`;

      // 迁移现有表：将 competition 从 DECIMAL(5,2) 改为 DECIMAL(10,2)
      try {
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'ranked_keywords_cache'
          )
        `;
        
        if (tableCheck.rows[0].exists) {
          const competitionCheck = await sql`
            SELECT numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'ranked_keywords_cache' 
            AND column_name = 'competition'
          `;
          
          if (competitionCheck.rows.length > 0) {
            const precision = competitionCheck.rows[0].numeric_precision;
            if (precision && precision < 10) {
              await sql`ALTER TABLE ranked_keywords_cache ALTER COLUMN competition TYPE DECIMAL(10,2)`;
              console.log('[Database] ✅ Updated competition precision to DECIMAL(10,2) in ranked_keywords_cache');
            }
          }
        }
      } catch (error: any) {
        console.warn('[Database] Could not migrate ranked_keywords_cache columns:', error.message);
      }

      // 创建历史排名概览缓存表
      await sql`
        CREATE TABLE IF NOT EXISTS historical_rank_overview_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          top1_count INTEGER DEFAULT 0,
          top3_count INTEGER DEFAULT 0,
          top10_count INTEGER DEFAULT 0,
          top50_count INTEGER DEFAULT 0,
          top100_count INTEGER DEFAULT 0,
          data_updated_at TIMESTAMP,
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(website_id, date)
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_historical_rank_website ON historical_rank_overview_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_historical_rank_date ON historical_rank_overview_cache(date)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_historical_rank_expires ON historical_rank_overview_cache(cache_expires_at)`;

      // 创建域名重合度分析缓存表
      await sql`
        CREATE TABLE IF NOT EXISTS domain_intersection_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          competitor_domain VARCHAR(255) NOT NULL,
          common_keywords JSONB,
          gap_keywords JSONB,
          gap_traffic NUMERIC(20,2),
          our_keywords JSONB,
          data_updated_at TIMESTAMP,
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(website_id, competitor_domain)
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_domain_intersection_website ON domain_intersection_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_intersection_competitor ON domain_intersection_cache(competitor_domain)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_intersection_expires ON domain_intersection_cache(cache_expires_at)`;

      // 创建相关页面缓存表
      await sql`
        CREATE TABLE IF NOT EXISTS relevant_pages_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          page_url TEXT NOT NULL,
          organic_traffic NUMERIC(20,2),
          keywords_count INTEGER,
          avg_position DECIMAL(10,2),
          top_keywords JSONB,
          data_updated_at TIMESTAMP,
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(website_id, page_url)
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_relevant_pages_website ON relevant_pages_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_relevant_pages_url ON relevant_pages_cache(page_url)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_relevant_pages_expires ON relevant_pages_cache(cache_expires_at)`;

      // 迁移现有表：将竞争对手表的流量字段从 INTEGER 改为 NUMERIC（如果表已存在）
      try {
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'domain_competitors_cache'
          )
        `;
        
        if (tableCheck.rows[0].exists) {
          const columnCheck = await sql`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'domain_competitors_cache' 
            AND column_name = 'organic_traffic'
          `;
          
          if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'integer') {
            console.log('[Database] Migrating competitor traffic columns from INTEGER to NUMERIC...');
            await sql`ALTER TABLE domain_competitors_cache ALTER COLUMN organic_traffic TYPE NUMERIC(20,2)`;
            await sql`ALTER TABLE domain_competitors_cache ALTER COLUMN gap_traffic TYPE NUMERIC(20,2)`;
            console.log('[Database] ✅ Successfully migrated competitor traffic columns to NUMERIC');
          }
          
          // 检查并修复列名（domain -> competitor_domain, title -> competitor_title）
          // 先检查是否存在旧的列名，且不存在新列名，才进行重命名
          const domainColumnCheck = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'domain_competitors_cache' 
            AND column_name IN ('domain', 'competitor_domain')
          `;
          
          const hasDomain = domainColumnCheck.rows.some((r: any) => r.column_name === 'domain');
          const hasCompetitorDomain = domainColumnCheck.rows.some((r: any) => r.column_name === 'competitor_domain');
          
          if (hasDomain && !hasCompetitorDomain) {
            // 如果存在旧的 'domain' 列且不存在 'competitor_domain'，重命名
            try {
              await sql`ALTER TABLE domain_competitors_cache RENAME COLUMN domain TO competitor_domain`;
              console.log('[Database] ✅ Renamed domain column to competitor_domain');
            } catch (renameError: any) {
              if (renameError.code !== '42701') { // 忽略"列已存在"错误
                console.warn('[Database] Could not rename domain column:', renameError.message);
              }
            }
          }
          
          const titleColumnCheck = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'domain_competitors_cache' 
            AND column_name IN ('title', 'competitor_title')
          `;
          
          const hasTitle = titleColumnCheck.rows.some((r: any) => r.column_name === 'title');
          const hasCompetitorTitle = titleColumnCheck.rows.some((r: any) => r.column_name === 'competitor_title');
          
          if (hasTitle && !hasCompetitorTitle) {
            try {
              await sql`ALTER TABLE domain_competitors_cache RENAME COLUMN title TO competitor_title`;
              console.log('[Database] ✅ Renamed title column to competitor_title');
            } catch (renameError: any) {
              if (renameError.code !== '42701') { // 忽略"列已存在"错误
                console.warn('[Database] Could not rename title column:', renameError.message);
              }
            }
          }
        }
      } catch (error: any) {
        console.warn('[Database] Could not migrate competitor traffic columns:', error.message);
      }

      domainCacheTablesInitialized = true;
    } catch (error) {
      console.error('[initDomainCacheTables] Error:', error);
      domainCacheTablesInitPromise = null;
      throw error;
    }
  })();

  await domainCacheTablesInitPromise;
}

let geoTablesInitialized = false;
let geoTablesInitPromise: Promise<void> | null = null;

export async function initGeoTables() {
  if (geoTablesInitialized) return;
  if (geoTablesInitPromise) {
    await geoTablesInitPromise;
    return;
  }

  geoTablesInitPromise = (async () => {
    try {
      // GEO 排名表
      await sql`
        CREATE TABLE IF NOT EXISTS geo_rankings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          article_ranking_id UUID REFERENCES article_rankings(id) ON DELETE CASCADE,
          website_id UUID REFERENCES user_websites(id) ON DELETE CASCADE,
          keyword_id UUID REFERENCES website_keywords(id) ON DELETE CASCADE,

          -- 地理位置
          country_code VARCHAR(2) DEFAULT 'US',
          region VARCHAR(100),
          city VARCHAR(100),

          -- 排名数据
          current_position INTEGER,
          previous_position INTEGER,
          position_change INTEGER,

          -- 流量估算
          local_traffic INTEGER,

          -- 追踪状态
          is_tracking BOOLEAN DEFAULT true,
          last_tracked_at TIMESTAMP,

          -- 时间戳
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),

          CONSTRAINT unique_geo_ranking UNIQUE (
            article_ranking_id,
            country_code,
            region,
            city
          )
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_geo_rankings_article ON geo_rankings(article_ranking_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geo_rankings_website ON geo_rankings(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geo_rankings_keyword ON geo_rankings(keyword_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geo_rankings_location ON geo_rankings(country_code, region, city)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geo_rankings_tracking ON geo_rankings(is_tracking, last_tracked_at)`;

      // GEO 优化机会表
      await sql`
        CREATE TABLE IF NOT EXISTS geo_opportunities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID REFERENCES user_websites(id) ON DELETE CASCADE,
          keyword_id UUID REFERENCES website_keywords(id) ON DELETE CASCADE,

          -- 地理位置
          target_country VARCHAR(2),
          target_region VARCHAR(100),
          target_city VARCHAR(100),

          -- 机会分析
          current_position INTEGER,
          potential_position INTEGER,
          position_gap INTEGER,

          estimated_traffic_gain INTEGER,

          -- 难度评估
          difficulty_score INTEGER,
          effort_required VARCHAR(50),

          -- 优化建议
          optimization_suggestions TEXT,

          -- 状态
          status VARCHAR(50) DEFAULT 'pending',

          -- 时间戳
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_geo_opportunities_website ON geo_opportunities(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geo_opportunities_keyword ON geo_opportunities(keyword_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geo_opportunities_location ON geo_opportunities(target_country, target_region, target_city)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geo_opportunities_status ON geo_opportunities(status)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_geo_opportunities_score ON geo_opportunities(difficulty_score DESC)`;

      geoTablesInitialized = true;
    } catch (error) {
      console.error('[initGeoTables] Error:', error);
      geoTablesInitPromise = null;
      throw error;
    }
  })();

  await geoTablesInitPromise;
}

// Published Articles Table
let publishedArticlesTableInitialized = false;
let publishedArticlesTableInitPromise: Promise<void> | null = null;

export async function initPublishedArticlesTable() {
  if (publishedArticlesTableInitialized) return;
  if (publishedArticlesTableInitPromise) {
    await publishedArticlesTableInitPromise;
    return;
  }

  publishedArticlesTableInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS published_articles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL,
          title VARCHAR(500) NOT NULL,
          content TEXT NOT NULL,
          images JSONB DEFAULT '[]'::jsonb,
          keyword VARCHAR(255),
          tone VARCHAR(50),
          visual_style VARCHAR(50),
          target_audience VARCHAR(50),
          target_market VARCHAR(50),
          status VARCHAR(50) DEFAULT 'draft',
          published_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 添加 published_at 字段（如果表已存在但没有这个字段）
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'published_articles' 
            AND column_name = 'published_at'
          ) THEN
            ALTER TABLE published_articles ADD COLUMN published_at TIMESTAMP;
          END IF;
        END $$;
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_published_articles_user ON published_articles(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_published_articles_status ON published_articles(status)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_published_articles_created ON published_articles(created_at DESC)`;

      publishedArticlesTableInitialized = true;
    } catch (error) {
      console.error('[initPublishedArticlesTable] Error:', error);
      publishedArticlesTableInitPromise = null;
      throw error;
    }
  })();

  await publishedArticlesTableInitPromise;
}

// Initialize all website data tables
export async function initWebsiteDataTables() {
  await initUserWebsitesTable();
  await initWebsitePagesTable();
  await initWebsiteKeywordsTable();
  await initArticleRankingsTable();
  await initUserPreferencesTable();
  await initDomainCacheTables();
  await initGeoTables();
  await initPublishedArticlesTable();
}

/**
 * 根据 key hash 查找 API Key
 */
export async function getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
  try {
    // 确保表存在
    await initApiKeysTable();

    const result = await sql<ApiKey>`
      SELECT * FROM api_keys
      WHERE key_hash = ${keyHash} AND is_active = TRUE
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting API key by hash:', error);
    // 如果表不存在，返回 null
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * 更新 API Key 的最后使用时间
 */
export async function updateApiKeyLastUsed(keyId: string): Promise<void> {
  try {
    await sql`
      UPDATE api_keys
      SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${keyId}
    `;
  } catch (error) {
    console.error('Error updating API key last used:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 获取用户的所有 API Keys
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  try {
    // 确保表存在
    await initApiKeysTable();

    const result = await sql<ApiKey>`
      SELECT * FROM api_keys
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error('Error getting user API keys:', error);
    // 如果表不存在，返回空数组而不是抛出错误
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      return [];
    }
    throw error;
  }
}

/**
 * 删除 API Key
 */
export async function deleteApiKey(keyId: string, userId: string): Promise<boolean> {
  try {
    // 确保表存在
    await initApiKeysTable();

    const result = await sql`
      DELETE FROM api_keys
      WHERE id = ${keyId} AND user_id = ${userId}
      RETURNING id
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting API key:', error);
    // 如果表不存在，返回 false
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      return false;
    }
    throw error;
  }
}
export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  google_id: string | null; // 改为可选，密码用户没有 Google ID
  password_hash: string | null; // 新增：密码哈希
  auth_provider: string; // 新增：'google' 或 'email'
  email_verified: boolean; // 新增：邮箱是否已验证
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

/**
 * 根据 ID 获取用户
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await sql<User>`
      SELECT * FROM users WHERE id = ${id}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by id:', error);
    throw error;
  }
}

// =============================================
// Projects & Content Management Tables
// =============================================

let projectsTableInitialized = false;
let projectsTableInitPromise: Promise<void> | null = null;

export async function initProjectsTable() {
  if (projectsTableInitialized) return;
  if (projectsTableInitPromise) {
    await projectsTableInitPromise;
    return;
  }

  projectsTableInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          seed_keyword VARCHAR(500),
          target_language VARCHAR(10),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC)`;

      projectsTableInitialized = true;
    } catch (error) {
      console.error('[initProjectsTable] Error:', error);
      projectsTableInitPromise = null;
      throw error;
    }
  })();

  await projectsTableInitPromise;
}

let keywordsTableInitialized = false;
let keywordsTableInitPromise: Promise<void> | null = null;

export async function initKeywordsTable() {
  if (keywordsTableInitialized) return;
  if (keywordsTableInitPromise) {
    await keywordsTableInitPromise;
    return;
  }

  keywordsTableInitPromise = (async () => {
    try {
      await initProjectsTable(); // Ensure projects table exists first

      await sql`
        CREATE TABLE IF NOT EXISTS keywords (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          keyword VARCHAR(500) NOT NULL,
          translation VARCHAR(500),
          intent VARCHAR(50),
          volume INTEGER,
          probability VARCHAR(20),
          is_selected BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_keywords_project ON keywords(project_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_keywords_selected ON keywords(is_selected)`;

      keywordsTableInitialized = true;
    } catch (error) {
      console.error('[initKeywordsTable] Error:', error);
      keywordsTableInitPromise = null;
      throw error;
    }
  })();

  await keywordsTableInitPromise;
}

let contentDraftsTableInitialized = false;
let contentDraftsTableInitPromise: Promise<void> | null = null;

export async function initContentDraftsTable() {
  if (contentDraftsTableInitialized) return;
  if (contentDraftsTableInitPromise) {
    await contentDraftsTableInitPromise;
    return;
  }

  contentDraftsTableInitPromise = (async () => {
    try {
      await initProjectsTable(); // Ensure projects table exists first
      await initKeywordsTable(); // Ensure keywords table exists first

      await sql`
        CREATE TABLE IF NOT EXISTS content_drafts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
          title VARCHAR(500),
          content TEXT,
          meta_description TEXT,
          url_slug VARCHAR(500),
          version INTEGER DEFAULT 1,
          status VARCHAR(50) DEFAULT 'draft',
          quality_score INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_content_drafts_project ON content_drafts(project_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_content_drafts_keyword ON content_drafts(keyword_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_content_drafts_version ON content_drafts(project_id, keyword_id, version)`;

      contentDraftsTableInitialized = true;
    } catch (error) {
      console.error('[initContentDraftsTable] Error:', error);
      contentDraftsTableInitPromise = null;
      throw error;
    }
  })();

  await contentDraftsTableInitPromise;
}

let imagesTableInitialized = false;
let imagesTableInitPromise: Promise<void> | null = null;

export async function initImagesTable() {
  if (imagesTableInitialized) return;
  if (imagesTableInitPromise) {
    await imagesTableInitPromise;
    return;
  }

  imagesTableInitPromise = (async () => {
    try {
      await initContentDraftsTable(); // Ensure content_drafts table exists first

      await sql`
        CREATE TABLE IF NOT EXISTS images (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content_draft_id UUID REFERENCES content_drafts(id) ON DELETE CASCADE,
          prompt TEXT,
          image_url VARCHAR(1000),
          alt_text VARCHAR(500),
          position INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_images_content_draft ON images(content_draft_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_images_position ON images(content_draft_id, position)`;

      imagesTableInitialized = true;
    } catch (error) {
      console.error('[initImagesTable] Error:', error);
      imagesTableInitPromise = null;
      throw error;
    }
  })();

  await imagesTableInitPromise;
}

let publicationsTableInitialized = false;
let publicationsTableInitPromise: Promise<void> | null = null;

export async function initPublicationsTable() {
  if (publicationsTableInitialized) return;
  if (publicationsTableInitPromise) {
    await publicationsTableInitPromise;
    return;
  }

  publicationsTableInitPromise = (async () => {
    try {
      await initContentDraftsTable(); // Ensure content_drafts table exists first

      await sql`
        CREATE TABLE IF NOT EXISTS publications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content_draft_id UUID REFERENCES content_drafts(id) ON DELETE CASCADE,
          platform VARCHAR(100) NOT NULL,
          platform_post_id VARCHAR(255),
          post_url VARCHAR(1000),
          status VARCHAR(50) DEFAULT 'pending',
          published_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_publications_content_draft ON publications(content_draft_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_publications_platform ON publications(platform)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_publications_status ON publications(status)`;

      publicationsTableInitialized = true;
    } catch (error) {
      console.error('[initPublicationsTable] Error:', error);
      publicationsTableInitPromise = null;
      throw error;
    }
  })();

  await publicationsTableInitPromise;
}

// Initialize all content management tables
export async function initContentManagementTables() {
  await initProjectsTable();
  await initKeywordsTable();
  await initContentDraftsTable();
  await initImagesTable();
  await initPublicationsTable();
}

// =============================================
// Content Management Database Operations
// =============================================

export interface Project {
  id: string;
  user_id: number;
  name: string;
  seed_keyword: string | null;
  target_language: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Keyword {
  id: string;
  project_id: string;
  keyword: string;
  translation: string | null;
  intent: string | null;
  volume: number | null;
  probability: string | null;
  is_selected: boolean;
  created_at: Date;
}

export interface ContentDraft {
  id: string;
  project_id: string;
  keyword_id: string | null;
  title: string | null;
  content: string | null;
  meta_description: string | null;
  url_slug: string | null;
  version: number;
  status: string;
  quality_score: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Image {
  id: string;
  content_draft_id: string;
  prompt: string | null;
  image_url: string | null;
  alt_text: string | null;
  position: number;
  metadata: any;
  created_at: Date;
}

export interface Publication {
  id: string;
  content_draft_id: string;
  platform: string;
  platform_post_id: string | null;
  post_url: string | null;
  status: string;
  published_at: Date | null;
  created_at: Date;
}

/**
 * 创建或获取项目
 */
export async function createOrGetProject(
  userId: number,
  name: string,
  seedKeyword?: string,
  targetLanguage?: string
): Promise<Project> {
  try {
    await initProjectsTable();

    // Try to find existing project with same name and user
    const existing = await sql<Project>`
      SELECT * FROM projects
      WHERE user_id = ${userId} AND name = ${name}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new project
    const result = await sql<Project>`
      INSERT INTO projects (user_id, name, seed_keyword, target_language, created_at, updated_at)
      VALUES (${userId}, ${name}, ${seedKeyword || null}, ${targetLanguage || null}, NOW(), NOW())
      RETURNING *
    `;

    return result.rows[0];
  } catch (error) {
    console.error('Error creating/getting project:', error);
    throw error;
  }
}

/**
 * 创建或获取关键词
 */
export async function createOrGetKeyword(
  projectId: string,
  keyword: string,
  translation?: string,
  intent?: string,
  volume?: number,
  probability?: string
): Promise<Keyword> {
  try {
    await initKeywordsTable();

    // Try to find existing keyword
    const existing = await sql<Keyword>`
      SELECT * FROM keywords
      WHERE project_id = ${projectId} AND keyword = ${keyword}
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new keyword
    const result = await sql<Keyword>`
      INSERT INTO keywords (project_id, keyword, translation, intent, volume, probability, created_at)
      VALUES (${projectId}, ${keyword}, ${translation || null}, ${intent || null}, ${volume || null}, ${probability || null}, NOW())
      RETURNING *
    `;

    return result.rows[0];
  } catch (error) {
    console.error('Error creating/getting keyword:', error);
    throw error;
  }
}

/**
 * 保存内容草稿
 */
export async function saveContentDraft(
  projectId: string,
  keywordId: string | null,
  title: string,
  content: string,
  metaDescription?: string,
  urlSlug?: string,
  qualityScore?: number
): Promise<ContentDraft> {
  try {
    await initContentDraftsTable();

    // Get next version number
    const versionResult = await sql<{ max_version: number }>`
      SELECT COALESCE(MAX(version), 0) + 1 as max_version
      FROM content_drafts
      WHERE project_id = ${projectId} AND (keyword_id = ${keywordId} OR (keyword_id IS NULL AND ${keywordId} IS NULL))
    `;
    const nextVersion = versionResult.rows[0]?.max_version || 1;

    const result = await sql<ContentDraft>`
      INSERT INTO content_drafts (
        project_id, keyword_id, title, content, meta_description, url_slug,
        version, status, quality_score, created_at, updated_at
      )
      VALUES (
        ${projectId}, ${keywordId}, ${title}, ${content},
        ${metaDescription || null}, ${urlSlug || null},
        ${nextVersion}, 'draft', ${qualityScore || null}, NOW(), NOW()
      )
      RETURNING *
    `;

    return result.rows[0];
  } catch (error) {
    console.error('Error saving content draft:', error);
    throw error;
  }
}

/**
 * 保存图片
 */
export async function saveImage(
  contentDraftId: string,
  imageUrl: string,
  prompt?: string,
  altText?: string,
  position?: number,
  metadata?: any
): Promise<Image> {
  try {
    await initImagesTable();

    const result = await sql<Image>`
      INSERT INTO images (
        content_draft_id, prompt, image_url, alt_text, position, metadata, created_at
      )
      VALUES (
        ${contentDraftId}, ${prompt || null}, ${imageUrl}, ${altText || null},
        ${position || 0}, ${metadata ? JSON.stringify(metadata) : '{}'}::jsonb, NOW()
      )
      RETURNING *
    `;

    return result.rows[0];
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}

/**
 * 批量保存图片
 */
export async function saveImages(
  contentDraftId: string,
  images: Array<{
    imageUrl: string;
    prompt?: string;
    altText?: string;
    position?: number;
    metadata?: any;
  }>
): Promise<Image[]> {
  const savedImages: Image[] = [];
  for (const img of images) {
    const saved = await saveImage(
      contentDraftId,
      img.imageUrl,
      img.prompt,
      img.altText,
      img.position,
      img.metadata
    );
    savedImages.push(saved);
  }
  return savedImages;
}

/**
 * 创建发布记录
 */
export async function createPublication(
  contentDraftId: string,
  platform: string,
  platformPostId?: string,
  postUrl?: string,
  status: string = 'pending'
): Promise<Publication> {
  try {
    await initPublicationsTable();

    const result = await sql<Publication>`
      INSERT INTO publications (
        content_draft_id, platform, platform_post_id, post_url, status, created_at
      )
      VALUES (
        ${contentDraftId}, ${platform}, ${platformPostId || null}, ${postUrl || null}, ${status}, NOW()
      )
      RETURNING *
    `;

    return result.rows[0];
  } catch (error) {
    console.error('Error creating publication:', error);
    throw error;
  }
}