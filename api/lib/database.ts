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
  strings: TemplateStringsArray | RawSQL,
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

  if (strings instanceof RawSQL) {
    // 如果直接传递 RawSQL 对象 (作为普通函数调用)
    queryText = strings.value;
    params.push(...values);
  } else {
    // 处理模板字符串
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
  nodes: any // Support both array and object (for miningSettings storage)
): Promise<WorkflowConfig> {
  try {
    await initWorkflowConfigsTable();

    // 将 userId 标准化为有效的 UUID 格式（开发模式下处理测试用户）
    const normalizedUserId = normalizeUserIdForQuery(userId);
    
    // 在生产环境下，验证 userId 是否是有效的 UUID 格式
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
    if (!isDevelopment && !isValidUUID(normalizedUserId)) {
      const error: any = new Error(`Invalid UUID format for userId: ${userId}. Please ensure you are using a valid user ID.`);
      error.code = 'INVALID_USER_ID';
      throw error;
    }

    const configId = `${workflowId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await sql`
      INSERT INTO workflow_configs (id, user_id, workflow_id, name, nodes, created_at, updated_at)
      VALUES (${configId}, ${normalizedUserId}, ${workflowId}, ${name.trim()}, ${JSON.stringify(nodes)}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
    // 如果是 UUID 格式错误，提供更友好的错误信息
    if (error && typeof error === 'object' && 'code' in error && (error.code === '22P02' || error.code === 'INVALID_USER_ID')) {
      const friendlyError: any = new Error(`Invalid user ID format. The system requires a UUID format user ID. Please refresh your session or re-login to get a valid token.`);
      friendlyError.code = 'INVALID_USER_ID';
      throw friendlyError;
    }
    throw error;
  }
}

let paymentTablesInitialized = false;
let paymentTablesInitPromise: Promise<void> | null = null;

export async function initPaymentTables() {
  if (paymentTablesInitialized) {
    return;
  }

  if (paymentTablesInitPromise) {
    await paymentTablesInitPromise;
    return;
  }

  paymentTablesInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS subscription_plans (
          plan_id VARCHAR(50) PRIMARY KEY,
          name_en VARCHAR(100) NOT NULL,
          name_cn VARCHAR(100) NOT NULL,
          name_zh TEXT,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          credits_monthly INTEGER NOT NULL DEFAULT 0,
          credits_rollover BOOLEAN NOT NULL DEFAULT FALSE,
          api_keys_limit INTEGER NOT NULL DEFAULT 0,
          team_members_limit INTEGER NOT NULL DEFAULT 0,
          features JSONB DEFAULT '{}'::jsonb,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS name_zh TEXT
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS credits_monthly INTEGER NOT NULL DEFAULT 0
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD'
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS credits_rollover BOOLEAN NOT NULL DEFAULT FALSE
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS api_keys_limit INTEGER NOT NULL DEFAULT 0
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS team_members_limit INTEGER NOT NULL DEFAULT 0
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS description TEXT
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
      `;
      await sql`
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS payment_orders (
          checkout_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          plan_id TEXT REFERENCES subscription_plans(plan_id) ON DELETE SET NULL,
          amount NUMERIC(10,2) NOT NULL,
          request_id TEXT UNIQUE NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          payment_url TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          paid_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id)`;

      await sql`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          plan_id TEXT REFERENCES subscription_plans(plan_id),
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          billing_period VARCHAR(50) NOT NULL DEFAULT 'monthly',
          current_period_start TIMESTAMP,
          current_period_end TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS user_credits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT UNIQUE NOT NULL,
          total_credits INTEGER NOT NULL DEFAULT 0,
          used_credits INTEGER NOT NULL DEFAULT 0,
          bonus_credits INTEGER NOT NULL DEFAULT 0,
          last_reset_at TIMESTAMP,
          next_reset_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id)`;

      await sql`
        CREATE TABLE IF NOT EXISTS credits_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          type VARCHAR(50) NOT NULL,
          credits_delta INTEGER NOT NULL,
          credits_before INTEGER,
          credits_after INTEGER,
          description TEXT,
          related_entity VARCHAR(100),
          related_entity_id TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Remove hardcoded plan insertion to prevent "dirty data"
      /*
      await sql`
        INSERT INTO subscription_plans (
          plan_id, name_en, name_cn, name_zh, price, currency,
          credits_monthly, credits_rollover, api_keys_limit, team_members_limit,
          features, description, is_active, sort_order
        )
        VALUES
          (
            'domination',
            'Domination',
            '统治者',
            '统治者',
            30,
            'USD',
            2000,
            FALSE,
            4,
            5,
            ${JSON.stringify([
              'Priority queue',
              'AIO/GEO optimization',
              'Visual fingerprint',
              'Priority support',
            ])}::jsonb,
            'Priority queue, AIO/GEO optimization, visual fingerprint, priority support.',
            TRUE,
            1
          ),
          (
            'professional',
            'Professional',
            '专业版',
            '专业版',
            150,
            'USD',
            10000,
            FALSE,
            10,
            10,
            ${JSON.stringify([
              'Dedicated compute lane',
              'Deep market scan',
              'Unlimited assets',
              'One-on-one expert',
            ])}::jsonb,
            'Dedicated compute lane, deep-market scanning, unlimited assets, white-glove consultants.',
            TRUE,
            2
          )
        ON CONFLICT (plan_id) DO UPDATE SET
          name_en = EXCLUDED.name_en,
          name_cn = EXCLUDED.name_cn,
          name_zh = EXCLUDED.name_zh,
          price = EXCLUDED.price,
          currency = EXCLUDED.currency,
          credits_monthly = EXCLUDED.credits_monthly,
          credits_rollover = EXCLUDED.credits_rollover,
          api_keys_limit = EXCLUDED.api_keys_limit,
          team_members_limit = EXCLUDED.team_members_limit,
          features = EXCLUDED.features,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `;
      */

      paymentTablesInitialized = true;
    } catch (error) {
      console.error('[initPaymentTables] Error initializing payment tables:', error);
      paymentTablesInitPromise = null;
      throw error;
    }
  })();

  await paymentTablesInitPromise;
}

/**
 * 验证字符串是否是有效的 UUID 格式
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * 将测试用户 ID 转换为有效的 UUID（仅开发模式）
 * 开发模式下，测试用户 ID "12345" 会被映射到一个固定的测试 UUID
 * 这样测试用户可以正常使用所有功能，包括创建和保存工作流配置
 */
function normalizeUserIdForQuery(userId: string | number): string {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
  const userIdStr = userId.toString();
  
  // 开发模式下的测试用户特殊处理
  if (isDevelopment && (userIdStr === '12345' || userIdStr === 'NaN')) {
    // 使用固定的测试用户 UUID: b61cbbf9-15b0-4353-8d49-89952042cf75
    // 这样可以将 "12345" 映射到一个有效的 UUID 格式，允许测试用户正常使用系统
    // 所有使用此 UUID 的数据都可以被测试用户访问
    const testUUID = 'b61cbbf9-15b0-4353-8d49-89952042cf75';
    return testUUID;
  }
  
  // 如果是有效的 UUID，直接返回
  if (isValidUUID(userIdStr)) {
    return userIdStr;
  }
  
  // 如果既不是测试用户也不是有效 UUID，在开发模式下也使用测试 UUID
  if (isDevelopment) {
    const testUUID = 'b61cbbf9-15b0-4353-8d49-89952042cf75';
    return testUUID;
  }
  
  // 生产环境返回原值（会由调用者处理）
  return userIdStr;
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

    // 将 userId 标准化为有效的 UUID 格式（开发模式下处理测试用户）
    const normalizedUserId = normalizeUserIdForQuery(userId);
    
    // 在生产环境下，如果仍然不是有效的 UUID，返回空数组
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
    if (!isDevelopment && !isValidUUID(normalizedUserId)) {
      console.warn(`[getUserWorkflowConfigs] Invalid UUID format for userId: ${userId}. Returning empty array.`);
      return [];
    }

    let result;
    if (workflowId) {
      result = await sql`
        SELECT * FROM workflow_configs
        WHERE user_id = ${normalizedUserId} AND workflow_id = ${workflowId}
        ORDER BY updated_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM workflow_configs
        WHERE user_id = ${normalizedUserId}
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
    // 如果是 UUID 格式错误，返回空数组而不是抛出错误
    if (error && typeof error === 'object' && 'code' in error && error.code === '22P02') {
      console.warn(`[getUserWorkflowConfigs] UUID format error for userId: ${userId}. Returning empty array.`);
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

    // 如果提供了 userId，将其标准化为有效的 UUID 格式（开发模式下处理测试用户）
    const normalizedUserId = userId ? normalizeUserIdForQuery(userId) : undefined;
    
    // 在生产环境下，如果仍然不是有效的 UUID，返回 null
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
    if (userId && !isDevelopment && !isValidUUID(normalizedUserId!)) {
      console.warn(`[getWorkflowConfigById] Invalid UUID format for userId: ${userId}. Returning null.`);
      return null;
    }

    let result;
    if (normalizedUserId) {
      result = await sql`
        SELECT * FROM workflow_configs
        WHERE id = ${configId} AND user_id = ${normalizedUserId}
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
    // 如果是 UUID 格式错误，返回 null 而不是抛出错误
    if (error && typeof error === 'object' && 'code' in error && error.code === '22P02') {
      console.warn(`[getWorkflowConfigById] UUID format error for userId: ${userId}. Returning null.`);
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

    // 将 userId 标准化为有效的 UUID 格式（开发模式下处理测试用户）
    const normalizedUserId = normalizeUserIdForQuery(userId);
    
    // 在生产环境下，如果仍然不是有效的 UUID，返回 null
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
    if (!isDevelopment && !isValidUUID(normalizedUserId)) {
      console.warn(`[updateWorkflowConfig] Invalid UUID format for userId: ${userId}. Returning null.`);
      return null;
    }

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
      return await getWorkflowConfigById(configId, normalizedUserId);
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
      WHERE id = ${configId} AND user_id = ${normalizedUserId}
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
    // 如果是 UUID 格式错误，返回 null 而不是抛出错误
    if (error && typeof error === 'object' && 'code' in error && error.code === '22P02') {
      console.warn(`[updateWorkflowConfig] UUID format error for userId: ${userId}. Returning null.`);
      return null;
    }
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

    // 将 userId 标准化为有效的 UUID 格式（开发模式下处理测试用户）
    const normalizedUserId = normalizeUserIdForQuery(userId);
    
    // 在生产环境下，如果仍然不是有效的 UUID，返回 false
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
    if (!isDevelopment && !isValidUUID(normalizedUserId)) {
      console.warn(`[deleteWorkflowConfig] Invalid UUID format for userId: ${userId}. Returning false.`);
      return false;
    }

    const result = await sql`
      DELETE FROM workflow_configs
      WHERE id = ${configId} AND user_id = ${normalizedUserId}
      RETURNING id
    `;

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting workflow config:', error);
    // 如果表不存在，返回 false
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      return false;
    }
    // 如果是 UUID 格式错误，返回 false 而不是抛出错误
    if (error && typeof error === 'object' && 'code' in error && error.code === '22P02') {
      console.warn(`[deleteWorkflowConfig] UUID format error for userId: ${userId}. Returning false.`);
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
          user_id UUID NOT NULL,
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

      // 迁移：如果表已存在且 user_id 是 INTEGER 或不存在，确保它是 UUID
      try {
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_websites'
          )
        `;
        
        if (tableCheck.rows[0].exists) {
          const columnCheck = await sql`
            SELECT data_type
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'user_websites' 
            AND column_name = 'user_id'
          `;
          
          // 如果列不存在，直接添加
          if (columnCheck.rows.length === 0) {
            await sql`ALTER TABLE user_websites ADD COLUMN user_id UUID NOT NULL`;
            await sql`ALTER TABLE user_websites ADD CONSTRAINT unique_user_website UNIQUE (user_id, website_url)`;
            console.log('[Database] ✅ Added missing user_id UUID column to user_websites');
          } 
          // 如果列存在但是 INTEGER 类型，需要迁移
          else if (columnCheck.rows[0].data_type === 'integer') {
            // 检查是否有数据
            const dataCheck = await sql`SELECT COUNT(*) as count FROM user_websites`;
            const rowCount = parseInt(dataCheck.rows[0].count || '0', 10);
            
            if (rowCount === 0) {
              // 如果没有数据，删除约束、删除列、重新添加列和约束
              await sql`ALTER TABLE user_websites DROP CONSTRAINT IF EXISTS unique_user_website`;
              await sql`ALTER TABLE user_websites DROP COLUMN IF EXISTS user_id`;
              await sql`ALTER TABLE user_websites ADD COLUMN user_id UUID NOT NULL`;
              // 重新添加唯一约束
              await sql`ALTER TABLE user_websites ADD CONSTRAINT unique_user_website UNIQUE (user_id, website_url)`;
              console.log('[Database] ✅ Migrated user_websites.user_id from INTEGER to UUID (empty table)');
            } else {
              // 如果有数据，需要更复杂的迁移策略
              console.warn('[Database] ⚠️  user_websites table has existing INTEGER user_id data. Migration requires manual intervention.');
              if (process.env.NODE_ENV !== 'production') {
                console.warn('[Database] In development mode, clearing existing data and migrating...');
                await sql`DELETE FROM user_websites`;
                await sql`ALTER TABLE user_websites DROP CONSTRAINT IF EXISTS unique_user_website`;
                await sql`ALTER TABLE user_websites DROP COLUMN IF EXISTS user_id`;
                await sql`ALTER TABLE user_websites ADD COLUMN user_id UUID NOT NULL`;
                await sql`ALTER TABLE user_websites ADD CONSTRAINT unique_user_website UNIQUE (user_id, website_url)`;
                console.log('[Database] ✅ Migrated user_websites.user_id from INTEGER to UUID (data cleared in dev)');
              } else {
                throw new Error('Cannot migrate user_websites.user_id from INTEGER to UUID: table contains data. Please manually migrate or clear data first.');
              }
            }
          }
          // 如果列已经是 UUID 类型，检查约束是否存在
          else if (columnCheck.rows[0].data_type === 'uuid') {
            // 检查约束是否存在
            const constraintCheck = await sql`
              SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_schema = 'public' 
                AND table_name = 'user_websites' 
                AND constraint_name = 'unique_user_website'
              )
            `;
            if (!constraintCheck.rows[0].exists) {
              await sql`ALTER TABLE user_websites ADD CONSTRAINT unique_user_website UNIQUE (user_id, website_url)`;
              console.log('[Database] ✅ Added missing unique_user_website constraint');
            }
          }
        }
      } catch (error: any) {
        console.error('[Database] Could not migrate user_websites.user_id:', error.message);
        throw error; // 重新抛出错误，因为这是一个关键迁移
      }

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
          user_id UUID PRIMARY KEY,
          default_website_id UUID REFERENCES user_websites(id) ON DELETE SET NULL,
          last_selected_website_id UUID REFERENCES user_websites(id) ON DELETE SET NULL,
          ui_settings JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 迁移：如果表已存在且 user_id 是 INTEGER 或不存在，确保它是 UUID
      try {
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_preferences'
          )
        `;
        
        if (tableCheck.rows[0].exists) {
          const columnCheck = await sql`
            SELECT data_type
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'user_preferences' 
            AND column_name = 'user_id'
          `;
          
          // 辅助函数：删除现有的主键约束
          const dropExistingPrimaryKey = async () => {
            const existingPkCheck = await sql`
              SELECT constraint_name
              FROM information_schema.table_constraints 
              WHERE table_schema = 'public' 
              AND table_name = 'user_preferences' 
              AND constraint_type = 'PRIMARY KEY'
              LIMIT 1
            `;
            if (existingPkCheck.rows.length > 0) {
              const pkName = existingPkCheck.rows[0].constraint_name;
              await sql`ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS ${raw(pkName)}`;
              console.log(`[Database] ✅ Dropped existing PRIMARY KEY constraint: ${pkName}`);
            }
          };
          
          // 如果列不存在，直接添加
          if (columnCheck.rows.length === 0) {
            // 先删除已存在的主键（如果有）
            await dropExistingPrimaryKey();
            await sql`ALTER TABLE user_preferences ADD COLUMN user_id UUID PRIMARY KEY`;
            console.log('[Database] ✅ Added missing user_id UUID column to user_preferences');
          } 
          // 如果列存在但是 INTEGER 类型，需要迁移
          else if (columnCheck.rows[0].data_type === 'integer') {
            // 检查是否有数据
            const dataCheck = await sql`SELECT COUNT(*) as count FROM user_preferences`;
            const rowCount = parseInt(dataCheck.rows[0].count || '0', 10);
            
            if (rowCount === 0) {
              // 如果没有数据，删除并重新添加列（CASCADE 会自动删除相关约束）
              await dropExistingPrimaryKey();
              await sql`ALTER TABLE user_preferences DROP COLUMN IF EXISTS user_id CASCADE`;
              await sql`ALTER TABLE user_preferences ADD COLUMN user_id UUID PRIMARY KEY`;
              console.log('[Database] ✅ Migrated user_preferences.user_id from INTEGER to UUID (empty table)');
            } else {
              // 如果有数据，需要更复杂的迁移策略
              console.warn('[Database] ⚠️  user_preferences table has existing INTEGER user_id data. Migration requires manual intervention.');
              if (process.env.NODE_ENV !== 'production') {
                console.warn('[Database] In development mode, clearing existing data and migrating...');
                await sql`DELETE FROM user_preferences`;
                await dropExistingPrimaryKey();
                await sql`ALTER TABLE user_preferences DROP COLUMN IF EXISTS user_id CASCADE`;
                await sql`ALTER TABLE user_preferences ADD COLUMN user_id UUID PRIMARY KEY`;
                console.log('[Database] ✅ Migrated user_preferences.user_id from INTEGER to UUID (data cleared in dev)');
              } else {
                throw new Error('Cannot migrate user_preferences.user_id from INTEGER to UUID: table contains data. Please manually migrate or clear data first.');
              }
            }
          }
          // 如果列已经是 UUID 类型，确保它是主键
          else if (columnCheck.rows[0].data_type === 'uuid') {
            // 检查 user_id 是否是主键
            const pkCheck = await sql`
              SELECT EXISTS (
                SELECT 1 
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                  ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public' 
                AND tc.table_name = 'user_preferences' 
                AND tc.constraint_type = 'PRIMARY KEY'
                AND kcu.column_name = 'user_id'
              )
            `;
            if (!pkCheck.rows[0].exists) {
              // 如果 user_id 不是主键，先删除现有的主键（如果有），然后添加新的主键
              await dropExistingPrimaryKey();
              await sql`ALTER TABLE user_preferences ADD PRIMARY KEY (user_id)`;
              console.log('[Database] ✅ Added missing PRIMARY KEY constraint on user_preferences.user_id');
            }
          }
        }
      } catch (error: any) {
        console.error('[Database] Could not migrate user_preferences.user_id:', error.message);
        throw error; // 重新抛出错误，因为这是一个关键迁移
      }

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
      // 1. 创建基础表 (IF NOT EXISTS)
      await sql`
        CREATE TABLE IF NOT EXISTS domain_overview_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          location_code INTEGER DEFAULT 2840,
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
          UNIQUE(website_id, data_date, location_code)
        )
      `;

      // 2. 确保 domain_overview_cache 中存在 location_code 字段并更新唯一约束
      try {
        await sql`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'domain_overview_cache' AND column_name = 'location_code'
            ) THEN
              ALTER TABLE domain_overview_cache ADD COLUMN location_code INTEGER DEFAULT 2840;
              -- 更新唯一约束
              ALTER TABLE domain_overview_cache DROP CONSTRAINT IF EXISTS domain_overview_cache_website_id_data_date_key;
              ALTER TABLE domain_overview_cache ADD CONSTRAINT domain_overview_cache_website_id_data_date_location_key UNIQUE(website_id, data_date, location_code);
            END IF;
          END $$;
        `;
      } catch (error: any) {
        console.warn('[Database] Could not migrate domain_overview_cache:', error.message);
      }

      // 3. 现在可以安全地创建索引了
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_overview_website ON domain_overview_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_overview_location ON domain_overview_cache(location_code)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_overview_date ON domain_overview_cache(data_date)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_overview_expires ON domain_overview_cache(cache_expires_at)`;

      // 4. 其他迁移 (流量精度等)
      try {
        const tableCheck = await sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'domain_overview_cache')`;
        if (tableCheck.rows[0].exists) {
          const columnCheck = await sql`SELECT data_type FROM information_schema.columns WHERE table_name = 'domain_overview_cache' AND column_name = 'organic_traffic'`;
          if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'integer') {
            await sql`ALTER TABLE domain_overview_cache ALTER COLUMN organic_traffic TYPE NUMERIC(20,2)`;
            await sql`ALTER TABLE domain_overview_cache ALTER COLUMN paid_traffic TYPE NUMERIC(20,2)`;
            await sql`ALTER TABLE domain_overview_cache ALTER COLUMN total_traffic TYPE NUMERIC(20,2)`;
          }
          const costCheck = await sql`SELECT numeric_precision FROM information_schema.columns WHERE table_name = 'domain_overview_cache' AND column_name = 'traffic_cost'`;
          if (costCheck.rows.length > 0 && (costCheck.rows[0].numeric_precision || 0) < 20) {
            await sql`ALTER TABLE domain_overview_cache ALTER COLUMN traffic_cost TYPE DECIMAL(20,2)`;
          }
          const backlinksCheck = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'domain_overview_cache' AND column_name = 'backlinks_info'`;
          if (backlinksCheck.rows.length === 0) {
            await sql`ALTER TABLE domain_overview_cache ADD COLUMN backlinks_info JSONB`;
          }
        }
      } catch (error: any) {
        console.warn('[Database] Could not migrate domain_overview_cache columns:', error.message);
      }

      // --- 域名关键词表 ---
      await sql`
        CREATE TABLE IF NOT EXISTS domain_keywords_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          location_code INTEGER DEFAULT 2840,
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
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(website_id, keyword, location_code)
        )
      `;

      // 确保 location_code 存在
      try {
        await sql`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'domain_keywords_cache' AND column_name = 'location_code'
            ) THEN
              ALTER TABLE domain_keywords_cache ADD COLUMN location_code INTEGER DEFAULT 2840;
              ALTER TABLE domain_keywords_cache DROP CONSTRAINT IF EXISTS domain_keywords_cache_website_id_keyword_key;
              ALTER TABLE domain_keywords_cache ADD CONSTRAINT domain_keywords_cache_website_id_keyword_location_key UNIQUE(website_id, keyword, location_code);
            END IF;
          END $$;
        `;
      } catch (error: any) {
        console.warn('[Database] Could not add location_code to domain_keywords_cache:', error.message);
      }

      await sql`CREATE INDEX IF NOT EXISTS idx_domain_keywords_website ON domain_keywords_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_keywords_location ON domain_keywords_cache(location_code)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_keywords_keyword ON domain_keywords_cache(keyword)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_keywords_position ON domain_keywords_cache(current_position)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_keywords_expires ON domain_keywords_cache(cache_expires_at)`;

      // --- 竞争对手表 ---
      await sql`
        CREATE TABLE IF NOT EXISTS domain_competitors_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          location_code INTEGER DEFAULT 2840,
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
          UNIQUE(website_id, competitor_domain, location_code)
        )
      `;

      // 确保 location_code 存在
      try {
        await sql`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'domain_competitors_cache' AND column_name = 'location_code'
            ) THEN
              ALTER TABLE domain_competitors_cache ADD COLUMN location_code INTEGER DEFAULT 2840;
              ALTER TABLE domain_competitors_cache DROP CONSTRAINT IF EXISTS domain_competitors_cache_website_id_competitor_domain_key;
              ALTER TABLE domain_competitors_cache ADD CONSTRAINT domain_competitors_cache_website_id_competitor_location_key UNIQUE(website_id, competitor_domain, location_code);
            END IF;
          END $$;
        `;
      } catch (error: any) {
        console.warn('[Database] Could not add location_code to domain_competitors_cache:', error.message);
      }

      await sql`CREATE INDEX IF NOT EXISTS idx_domain_competitors_website ON domain_competitors_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_competitors_domain ON domain_competitors_cache(competitor_domain)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_domain_competitors_expires ON domain_competitors_cache(cache_expires_at)`;

      // --- 排名关键词表 ---
      await sql`
        CREATE TABLE IF NOT EXISTS ranked_keywords_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          location_code INTEGER DEFAULT 2840,
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
          UNIQUE(website_id, keyword, location_code)
        )
      `;

      // 确保 location_code 存在
      try {
        await sql`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ranked_keywords_cache' AND column_name = 'location_code'
            ) THEN
              ALTER TABLE ranked_keywords_cache ADD COLUMN location_code INTEGER DEFAULT 2840;
              ALTER TABLE ranked_keywords_cache DROP CONSTRAINT IF EXISTS ranked_keywords_cache_website_id_keyword_key;
              ALTER TABLE ranked_keywords_cache ADD CONSTRAINT ranked_keywords_cache_website_id_keyword_location_key UNIQUE(website_id, keyword, location_code);
            END IF;
          END $$;
        `;
      } catch (error: any) {
        console.warn('[Database] Could not add location_code to ranked_keywords_cache:', error.message);
      }

      await sql`CREATE INDEX IF NOT EXISTS idx_ranked_keywords_website ON ranked_keywords_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_ranked_keywords_keyword ON ranked_keywords_cache(keyword)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_ranked_keywords_position ON ranked_keywords_cache(current_position)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_ranked_keywords_expires ON ranked_keywords_cache(cache_expires_at)`;

      // --- 相关页面表 ---
      await sql`
        CREATE TABLE IF NOT EXISTS relevant_pages_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          location_code INTEGER DEFAULT 2840,
          page_url TEXT NOT NULL,
          organic_traffic NUMERIC(20,2),
          keywords_count INTEGER,
          avg_position DECIMAL(10,2),
          top_keywords JSONB,
          data_updated_at TIMESTAMP,
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(website_id, page_url, location_code)
        )
      `;

      // 确保 location_code 存在
      try {
        await sql`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'relevant_pages_cache' AND column_name = 'location_code'
            ) THEN
              ALTER TABLE relevant_pages_cache ADD COLUMN location_code INTEGER DEFAULT 2840;
              ALTER TABLE relevant_pages_cache DROP CONSTRAINT IF EXISTS relevant_pages_cache_website_id_page_url_key;
              ALTER TABLE relevant_pages_cache ADD CONSTRAINT relevant_pages_cache_website_id_page_url_location_key UNIQUE(website_id, page_url, location_code);
            END IF;
          END $$;
        `;
      } catch (error: any) {
        console.warn('[Database] Could not add location_code to relevant_pages_cache:', error.message);
      }

      await sql`CREATE INDEX IF NOT EXISTS idx_relevant_pages_website ON relevant_pages_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_relevant_pages_url ON relevant_pages_cache(page_url)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_relevant_pages_expires ON relevant_pages_cache(cache_expires_at)`;

      // --- 历史排名概览 (无需 location_code) ---
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

      // --- 域名重合度分析 ---
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

      // --- 关键词分析缓存表（优化工作流3和4的冗余）---
      await sql`
        CREATE TABLE IF NOT EXISTS keyword_analysis_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID REFERENCES user_websites(id) ON DELETE CASCADE,
          keyword VARCHAR(500) NOT NULL,
          location_code INTEGER DEFAULT 2840,
          search_engine VARCHAR(50) DEFAULT 'google',
          
          -- DataForSEO 数据
          dataforseo_volume INTEGER,
          dataforseo_difficulty INTEGER,
          dataforseo_cpc DECIMAL(10,2),
          dataforseo_competition DECIMAL(10,2),
          dataforseo_history_trend JSONB,
          dataforseo_is_data_found BOOLEAN DEFAULT false,
          
          -- Agent 2 分析结果
          agent2_probability VARCHAR(20),
          agent2_search_intent TEXT,
          agent2_intent_analysis TEXT,
          agent2_reasoning TEXT,
          agent2_top_domain_type VARCHAR(100),
          agent2_serp_result_count INTEGER,
          agent2_top_serp_snippets JSONB,
          agent2_blue_ocean_score DECIMAL(5,2),
          agent2_blue_ocean_breakdown JSONB,
          
          -- DR 相关（存量拓新模式）
          website_dr INTEGER,
          competitor_drs JSONB,
          top3_probability VARCHAR(20),
          top10_probability VARCHAR(20),
          can_outrank_positions JSONB,
          
          -- 元数据
          source VARCHAR(50) DEFAULT 'website-audit',
          data_updated_at TIMESTAMP DEFAULT NOW(),
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 创建部分唯一索引：website_id 为 NULL 时，keyword + location_code + search_engine 唯一
      try {
        await sql`
          CREATE UNIQUE INDEX IF NOT EXISTS keyword_analysis_cache_null_website_unique 
          ON keyword_analysis_cache (keyword, location_code, search_engine)
          WHERE website_id IS NULL
        `;
      } catch (error: any) {
        console.warn('[Database] Could not create null website unique index:', error.message);
      }

      // 创建唯一索引：website_id 不为 NULL 时，keyword + location_code + search_engine + website_id 唯一
      try {
        await sql`
          CREATE UNIQUE INDEX IF NOT EXISTS keyword_analysis_cache_website_unique 
          ON keyword_analysis_cache (keyword, location_code, search_engine, website_id)
          WHERE website_id IS NOT NULL
        `;
      } catch (error: any) {
        console.warn('[Database] Could not create website unique index:', error.message);
      }

      await sql`CREATE INDEX IF NOT EXISTS idx_keyword_analysis_keyword ON keyword_analysis_cache(keyword)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_keyword_analysis_location ON keyword_analysis_cache(location_code)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_keyword_analysis_engine ON keyword_analysis_cache(search_engine)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_keyword_analysis_website ON keyword_analysis_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_keyword_analysis_expires ON keyword_analysis_cache(cache_expires_at)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_keyword_analysis_composite ON keyword_analysis_cache(keyword, location_code, search_engine, website_id)`;

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
          user_id UUID NOT NULL,
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
          updated_at TIMESTAMP DEFAULT NOW(),
          url_slug VARCHAR(500)
        )
      `;

      // 迁移：确保 user_id 是 UUID 类型
      try {
        const columnCheck = await sql`
          SELECT data_type
          FROM information_schema.columns 
          WHERE table_name = 'published_articles' 
          AND column_name = 'user_id'
        `;
        
        if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'integer') {
          console.warn('[Database] ⚠️ Migrating published_articles.user_id from INTEGER to UUID');
          if (process.env.NODE_ENV !== 'production') {
            await sql`DELETE FROM published_articles`;
            await sql`ALTER TABLE published_articles ALTER COLUMN user_id TYPE UUID USING NULL`;
            console.log('[Database] ✅ Migrated published_articles.user_id to UUID (data cleared in dev)');
          } else {
            await sql`ALTER TABLE published_articles ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid`;
          }
        }
      } catch (e) {
        console.error('[Database] Could not migrate published_articles.user_id:', e);
      }

      // 添加 published_at 和 url_slug 字段（如果表已存在但没有这些字段）
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

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'published_articles' 
            AND column_name = 'url_slug'
          ) THEN
            ALTER TABLE published_articles ADD COLUMN url_slug VARCHAR(500);
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

// Execution Tasks Table (Agent Execution State)
let tasksTableInitialized = false;
let tasksTableInitPromise: Promise<void> | null = null;

export async function initTasksTable() {
  if (tasksTableInitialized) return;
  if (tasksTableInitPromise) {
    await tasksTableInitPromise;
    return;
  }

  tasksTableInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS execution_tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL, -- mining, batch, article-generator, deep-dive
          name VARCHAR(255),
          status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, failed
          params JSONB DEFAULT '{}'::jsonb,
          state JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 迁移：确保 user_id 是 UUID 类型
      try {
        const columnCheck = await sql`
          SELECT data_type
          FROM information_schema.columns 
          WHERE table_name = 'execution_tasks' 
          AND column_name = 'user_id'
        `;
        
        if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type !== 'uuid') {
          console.warn(`[Database] ⚠️ Migrating execution_tasks.user_id from ${columnCheck.rows[0].data_type} to UUID`);
          if (process.env.NODE_ENV !== 'production') {
            await sql`DELETE FROM execution_tasks`;
            await sql`ALTER TABLE execution_tasks ALTER COLUMN user_id TYPE UUID USING NULL`;
            console.log('[Database] ✅ Migrated execution_tasks.user_id to UUID (data cleared in dev)');
          } else {
            await sql`ALTER TABLE execution_tasks ALTER COLUMN user_id TYPE UUID USING user_id::uuid`;
          }
        }
      } catch (e) {
        console.error('[Database] Could not migrate execution_tasks.user_id:', e);
      }

      await sql`CREATE INDEX IF NOT EXISTS idx_execution_tasks_user ON execution_tasks(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_execution_tasks_status ON execution_tasks(status)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_execution_tasks_type ON execution_tasks(type)`;

      tasksTableInitialized = true;
    } catch (error) {
      console.error('[initTasksTable] Error:', error);
      tasksTableInitPromise = null;
      throw error;
    }
  })();

  await tasksTableInitPromise;
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
  await initTasksTable();
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
/**
 * 关键词分析缓存接口
 */
export interface KeywordAnalysisCache {
  id: string;
  website_id?: string;
  keyword: string;
  location_code: number;
  search_engine: string;
  dataforseo_volume?: number;
  dataforseo_difficulty?: number;
  dataforseo_cpc?: number;
  dataforseo_competition?: number;
  dataforseo_history_trend?: any;
  dataforseo_is_data_found?: boolean;
  agent2_probability?: string;
  agent2_search_intent?: string;
  agent2_intent_analysis?: string;
  agent2_reasoning?: string;
  agent2_top_domain_type?: string;
  agent2_serp_result_count?: number;
  agent2_top_serp_snippets?: any;
  agent2_blue_ocean_score?: number;
  agent2_blue_ocean_breakdown?: any;
  website_dr?: number;
  competitor_drs?: any;
  top3_probability?: string;
  top10_probability?: string;
  can_outrank_positions?: any;
  source?: string;
  data_updated_at?: Date;
  cache_expires_at?: Date;
  created_at?: Date;
}

/**
 * 查询关键词分析缓存
 */
export async function getKeywordAnalysisCache(
  keyword: string,
  locationCode: number,
  searchEngine: string,
  websiteId?: string
): Promise<KeywordAnalysisCache | null> {
  try {
    await initDomainCacheTables();
    
    let query;
    if (websiteId) {
      query = sql<KeywordAnalysisCache>`
        SELECT * FROM keyword_analysis_cache
        WHERE keyword = ${keyword}
          AND location_code = ${locationCode}
          AND search_engine = ${searchEngine}
          AND (website_id = ${websiteId} OR website_id IS NULL)
          AND cache_expires_at > NOW()
        ORDER BY website_id DESC NULLS LAST
        LIMIT 1
      `;
    } else {
      query = sql<KeywordAnalysisCache>`
        SELECT * FROM keyword_analysis_cache
        WHERE keyword = ${keyword}
          AND location_code = ${locationCode}
          AND search_engine = ${searchEngine}
          AND website_id IS NULL
          AND cache_expires_at > NOW()
        LIMIT 1
      `;
    }
    
    const result = await query;
    return result.rows[0] || null;
  } catch (error) {
    console.error('[getKeywordAnalysisCache] Error:', error);
    return null;
  }
}

/**
 * 批量查询关键词分析缓存
 */
export async function getKeywordAnalysisCacheBatch(
  keywords: string[],
  locationCode: number,
  searchEngine: string,
  websiteId?: string
): Promise<Map<string, KeywordAnalysisCache>> {
  const cacheMap = new Map<string, KeywordAnalysisCache>();
  
  if (keywords.length === 0) return cacheMap;
  
  try {
    await initDomainCacheTables();
    
    let query;
    if (websiteId) {
      query = sql<KeywordAnalysisCache>`
        SELECT * FROM keyword_analysis_cache
        WHERE keyword = ANY(${keywords})
          AND location_code = ${locationCode}
          AND search_engine = ${searchEngine}
          AND (website_id = ${websiteId} OR website_id IS NULL)
          AND cache_expires_at > NOW()
      `;
    } else {
      query = sql<KeywordAnalysisCache>`
        SELECT * FROM keyword_analysis_cache
        WHERE keyword = ANY(${keywords})
          AND location_code = ${locationCode}
          AND search_engine = ${searchEngine}
          AND website_id IS NULL
          AND cache_expires_at > NOW()
      `;
    }
    
    const result = await query;
    
    // 对于每个关键词，优先使用 website_id 匹配的缓存，否则使用通用缓存
    const processedKeywords = new Set<string>();
    for (const row of result.rows) {
      if (!processedKeywords.has(row.keyword) || (websiteId && row.website_id === websiteId)) {
        cacheMap.set(row.keyword.toLowerCase(), row);
        processedKeywords.add(row.keyword);
      }
    }
    
    return cacheMap;
  } catch (error) {
    console.error('[getKeywordAnalysisCacheBatch] Error:', error);
    return cacheMap;
  }
}

/**
 * 保存关键词分析缓存
 */
export async function saveKeywordAnalysisCache(
  cache: Partial<KeywordAnalysisCache>
): Promise<void> {
  try {
    await initDomainCacheTables();
    
    // 先删除可能存在的旧记录（处理唯一约束）
    if (cache.keyword) {
      await sql`
        DELETE FROM keyword_analysis_cache
        WHERE keyword = ${cache.keyword}
          AND location_code = ${cache.location_code || 2840}
          AND search_engine = ${cache.search_engine || 'google'}
          AND (website_id = ${cache.website_id || null} OR (website_id IS NULL AND ${cache.website_id || null} IS NULL))
      `;
    }
    
    // 插入新记录
    await sql`
      INSERT INTO keyword_analysis_cache (
        website_id,
        keyword,
        location_code,
        search_engine,
        dataforseo_volume,
        dataforseo_difficulty,
        dataforseo_cpc,
        dataforseo_competition,
        dataforseo_history_trend,
        dataforseo_is_data_found,
        agent2_probability,
        agent2_search_intent,
        agent2_intent_analysis,
        agent2_reasoning,
        agent2_top_domain_type,
        agent2_serp_result_count,
        agent2_top_serp_snippets,
        agent2_blue_ocean_score,
        agent2_blue_ocean_breakdown,
        website_dr,
        competitor_drs,
        top3_probability,
        top10_probability,
        can_outrank_positions,
        source,
        data_updated_at,
        cache_expires_at
      ) VALUES (
        ${cache.website_id || null},
        ${cache.keyword},
        ${cache.location_code || 2840},
        ${cache.search_engine || 'google'},
        ${cache.dataforseo_volume || null},
        ${cache.dataforseo_difficulty || null},
        ${cache.dataforseo_cpc || null},
        ${cache.dataforseo_competition || null},
        ${cache.dataforseo_history_trend ? JSON.stringify(cache.dataforseo_history_trend) : null},
        ${cache.dataforseo_is_data_found || false},
        ${cache.agent2_probability || null},
        ${cache.agent2_search_intent || null},
        ${cache.agent2_intent_analysis || null},
        ${cache.agent2_reasoning || null},
        ${cache.agent2_top_domain_type || null},
        ${cache.agent2_serp_result_count || null},
        ${cache.agent2_top_serp_snippets ? JSON.stringify(cache.agent2_top_serp_snippets) : null},
        ${cache.agent2_blue_ocean_score || null},
        ${cache.agent2_blue_ocean_breakdown ? JSON.stringify(cache.agent2_blue_ocean_breakdown) : null},
        ${cache.website_dr || null},
        ${cache.competitor_drs ? JSON.stringify(cache.competitor_drs) : null},
        ${cache.top3_probability || null},
        ${cache.top10_probability || null},
        ${cache.can_outrank_positions ? JSON.stringify(cache.can_outrank_positions) : null},
        ${cache.source || 'website-audit'},
        NOW(),
        ${cache.cache_expires_at || sql`NOW() + INTERVAL '7 days'`}
      )
    `;
  } catch (error) {
    console.error('[saveKeywordAnalysisCache] Error:', error);
    // 不抛出错误，避免影响主流程
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
          user_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          seed_keyword VARCHAR(500),
          target_language VARCHAR(10),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 迁移：确保 user_id 是 UUID 类型
      try {
        const columnCheck = await sql`
          SELECT data_type
          FROM information_schema.columns 
          WHERE table_name = 'projects' 
          AND column_name = 'user_id'
        `;
        
        if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'integer') {
          console.warn('[Database] ⚠️ Migrating projects.user_id from INTEGER to UUID');
          if (process.env.NODE_ENV !== 'production') {
            await sql`DELETE FROM projects`;
            await sql`ALTER TABLE projects ALTER COLUMN user_id TYPE UUID USING NULL`;
            console.log('[Database] ✅ Migrated projects.user_id to UUID (data cleared in dev)');
          } else {
            // 生产环境下尝试直接转换，如果失败则需要手动处理
            await sql`ALTER TABLE projects ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid`;
          }
        }
      } catch (e) {
        console.error('[Database] Could not migrate projects.user_id:', e);
      }

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
          status VARCHAR(50) DEFAULT 'selected',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_keywords_project ON keywords(project_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_keywords_selected ON keywords(is_selected)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_keywords_project_status ON keywords(project_id, status)`;

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
  userId: string | number,
  name: string,
  seedKeyword?: string,
  targetLanguage?: string
): Promise<Project> {
  try {
    await initProjectsTable();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    // Try to find existing project with same name and user
    const existing = await sql<Project>`
      SELECT * FROM projects
      WHERE user_id = ${normalizedUserId} AND name = ${name}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new project
    const result = await sql<Project>`
      INSERT INTO projects (user_id, name, seed_keyword, target_language, created_at, updated_at)
      VALUES (${normalizedUserId}, ${name}, ${seedKeyword || null}, ${targetLanguage || null}, NOW(), NOW())
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
 * 获取内容草稿的所有版本
 */
export async function getContentDraftVersions(
  projectId: string,
  keywordId: string
): Promise<ContentDraft[]> {
  try {
    await initContentDraftsTable();

    const result = await sql<ContentDraft>`
      SELECT * FROM content_drafts
      WHERE project_id = ${projectId} AND keyword_id = ${keywordId}
      ORDER BY version DESC
    `;

    return result.rows;
  } catch (error) {
    console.error('Error fetching content draft versions:', error);
    return [];
  }
}

/**
 * 获取最新的内容草稿
 */
export async function getLatestContentDraft(
  projectId: string,
  keywordId: string
): Promise<ContentDraft | null> {
  try {
    await initContentDraftsTable();

    const result = await sql<ContentDraft>`
      SELECT * FROM content_drafts
      WHERE project_id = ${projectId} AND keyword_id = ${keywordId}
      ORDER BY version DESC
      LIMIT 1
    `;

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching latest content draft:', error);
    return null;
  }
}

/**
 * 获取特定版本的内容草稿
 */
export async function getContentDraftById(draftId: string): Promise<ContentDraft | null> {
  try {
    await initContentDraftsTable();

    const result = await sql<ContentDraft>`
      SELECT * FROM content_drafts
      WHERE id = ${draftId}
    `;

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching content draft by id:', error);
    return null;
  }
}

/**
 * 获取草稿关联的所有图片
 */
export async function getContentDraftImages(draftId: string): Promise<Image[]> {
  try {
    await initImagesTable();

    const result = await sql<Image>`
      SELECT * FROM images
      WHERE content_draft_id = ${draftId}
      ORDER BY position ASC
    `;

    return result.rows;
  } catch (error) {
    console.error('Error fetching content draft images:', error);
    return [];
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

/**
 * 获取用户所有项目及其统计信息
 */
export async function getUserProjects(userId: string | number): Promise<any[]> {
  try {
    await initContentManagementTables();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql`
      SELECT 
        p.*,
        COUNT(DISTINCT k.id) as keyword_count,
        COUNT(DISTINCT cd.id) as draft_count,
        COUNT(DISTINCT pub.id) FILTER (WHERE pub.status = 'published') as published_count
      FROM projects p
      LEFT JOIN keywords k ON p.id = k.project_id
      LEFT JOIN content_drafts cd ON p.id = cd.project_id
      LEFT JOIN publications pub ON cd.id = pub.content_draft_id
      WHERE p.user_id = ${normalizedUserId}
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;

    return result.rows;
  } catch (error) {
    console.error('Error getting user projects:', error);
    throw error;
  }
}

/**
 * 根据 ID 获取项目详情
 */
export async function getProjectById(projectId: string, userId: string | number): Promise<Project | null> {
  try {
    await initProjectsTable();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql<Project>`
      SELECT * FROM projects WHERE id = ${projectId} AND user_id = ${normalizedUserId}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting project by id:', error);
    throw error;
  }
}

/**
 * 更新项目信息
 */
export async function updateProject(
  projectId: string, 
  userId: string | number, 
  updates: { name?: string; seed_keyword?: string; target_language?: string }
): Promise<Project | null> {
  try {
    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const setParts: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (updates.name) {
      setParts.push(`name = $${i++}`);
      values.push(updates.name);
    }
    if (updates.seed_keyword) {
      setParts.push(`seed_keyword = $${i++}`);
      values.push(updates.seed_keyword);
    }
    if (updates.target_language) {
      setParts.push(`target_language = $${i++}`);
      values.push(updates.target_language);
    }

    if (setParts.length === 0) return null;

    values.push(projectId, normalizedUserId);
    const result = await sql(
      raw(`UPDATE projects SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = $${i++} AND user_id = $${i++} RETURNING *`),
      ...values
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

/**
 * 删除项目
 */
export async function deleteProject(projectId: string, userId: string | number): Promise<boolean> {
  try {
    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql`
      DELETE FROM projects WHERE id = ${projectId} AND user_id = ${normalizedUserId} RETURNING id
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

/**
 * 获取项目关键词
 */
export async function getProjectKeywords(projectId: string): Promise<Keyword[]> {
  try {
    await initContentManagementTables();
    const result = await sql<Keyword>`
      SELECT k.*, 
        (SELECT status FROM content_drafts WHERE keyword_id = k.id ORDER BY updated_at DESC LIMIT 1) as content_status
      FROM keywords k
      WHERE k.project_id = ${projectId}
      ORDER BY k.created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error('Error getting project keywords:', error);
    throw error;
  }
}

/**
 * 更新关键词状态
 */
export async function updateKeywordStatus(keywordId: string, status: string): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE keywords SET status = ${status} WHERE id = ${keywordId} RETURNING id
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error updating keyword status:', error);
    throw error;
  }
}

/**
 * 获取项目统计数据
 */
export async function getProjectStats(projectId: string, userId: string | number): Promise<any> {
  try {
    await initContentManagementTables();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'selected') as selected,
        COUNT(*) FILTER (WHERE status = 'generating') as generating,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM keywords
      JOIN projects ON projects.id = keywords.project_id
      WHERE keywords.project_id = ${projectId} AND projects.user_id = ${normalizedUserId}
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error getting project stats:', error);
    throw error;
  }
}

// =============================================
// Execution Task Operations
// =============================================

export interface ExecutionTask {
  id: string;
  user_id: string;
  type: string;
  name: string;
  status: string;
  params: any;
  state: any;
  created_at: Date;
  updated_at: Date;
}

/**
 * 创建执行任务
 */
export async function createExecutionTask(
  userId: string | number,
  type: string,
  name: string,
  params: any = {}
): Promise<ExecutionTask> {
  try {
    await initTasksTable();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql<ExecutionTask>`
      INSERT INTO execution_tasks (user_id, type, name, params, status, created_at, updated_at)
      VALUES (${normalizedUserId}, ${type}, ${name}, ${JSON.stringify(params)}::jsonb, 'in_progress', NOW(), NOW())
      RETURNING *
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error creating execution task:', error);
    throw error;
  }
}

/**
 * 更新执行任务状态或内容
 */
export async function updateExecutionTask(
  taskId: string,
  userId: string | number,
  updates: { status?: string; state?: any; name?: string }
): Promise<ExecutionTask | null> {
  try {
    await initTasksTable();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const setParts: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (updates.status) {
      setParts.push(`status = $${i++}`);
      values.push(updates.status);
    }
    if (updates.state) {
      setParts.push(`state = $${i++}`);
      values.push(JSON.stringify(updates.state));
    }
    if (updates.name) {
      setParts.push(`name = $${i++}`);
      values.push(updates.name);
    }

    if (setParts.length === 0) return null;

    values.push(taskId, normalizedUserId);
    const result = await sql(
      raw(`UPDATE execution_tasks SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = $${i++} AND user_id = $${i++} RETURNING *`),
      ...values
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating execution task:', error);
    throw error;
  }
}

/**
 * 获取用户的任务列表
 */
export async function getUserExecutionTasks(userId: string | number, limit: number = 20): Promise<ExecutionTask[]> {
  try {
    await initTasksTable();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql<ExecutionTask>`
      SELECT * FROM execution_tasks 
      WHERE user_id = ${normalizedUserId} 
      ORDER BY updated_at DESC 
      LIMIT ${limit}
    `;
    return result.rows;
  } catch (error) {
    console.error('Error getting user execution tasks:', error);
    throw error;
  }
}

/**
 * 根据 ID 获取任务
 */
export async function getExecutionTaskById(taskId: string, userId: string | number): Promise<ExecutionTask | null> {
  try {
    await initTasksTable();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql<ExecutionTask>`
      SELECT * FROM execution_tasks WHERE id = ${taskId} AND user_id = ${normalizedUserId}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting execution task by id:', error);
    throw error;
  }
}

/**
 * 删除任务
 */
export async function deleteExecutionTask(taskId: string, userId: string | number): Promise<boolean> {
  try {
    await initTasksTable();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql`
      DELETE FROM execution_tasks WHERE id = ${taskId} AND user_id = ${normalizedUserId} RETURNING id
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting execution task:', error);
    throw error;
  }
}
