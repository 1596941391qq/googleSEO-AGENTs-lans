import { Client, QueryResultRow } from 'pg';

// 数据库连接字符串
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[db] Database connection string not found. Please set POSTGRES_URL or DATABASE_URL environment variable.');
  // 在生产环境中，如果没有连接字符串，应该抛出错误
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('Database connection string (POSTGRES_URL or DATABASE_URL) is required in production');
  }
}

// 导出 SQL 查询函数 (tagged template 语法)
export const sql = async <T extends QueryResultRow = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<{ rows: T[]; rowCount: number }> => {
  if (!connectionString) {
    const error = new Error('Database connection string not configured. Please set POSTGRES_URL or DATABASE_URL environment variable.');
    console.error('[sql]', error.message);
    throw error;
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || connectionString.includes('ssl=true') || connectionString.includes('vercel') ? {
      rejectUnauthorized: false
    } : undefined
  });

  try {
    await client.connect();

    // 构建参数化查询
    let queryText = '';
    const params: any[] = [];
    let paramIndex = 1;

    for (let i = 0; i < strings.length; i++) {
      queryText += strings[i];
      if (i < values.length) {
        queryText += `$${paramIndex}`;
        params.push(values[i]);
        paramIndex++;
      }
    }

    console.log('[sql] Executing query:', queryText.substring(0, 200) + (queryText.length > 200 ? '...' : ''));
    console.log('[sql] Values:', params.map(v => typeof v === 'string' ? v.substring(0, 50) : v));

    // 执行查询
    const result = await client.query<T>(queryText, params);

    console.log('[sql] Query successful, rowCount:', result.rowCount);

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
  } finally {
    await client.end();
  }
};

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
      console.log('[initWorkflowConfigsTable] Initializing table (first time only)...');

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
      console.log('[initWorkflowConfigsTable] Table initialized successfully');
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
      console.log('[initApiKeysTable] Initializing table (first time only)...');

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
      console.log('[initApiKeysTable] Table initialized successfully');
    } catch (error) {
      console.error('[initApiKeysTable] Error initializing table:', error);
      apiKeysTableInitPromise = null; // 重置，允许重试
      throw error;
    }
  })();

  await apiKeysTableInitPromise;
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