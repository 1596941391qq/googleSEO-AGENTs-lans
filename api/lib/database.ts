import { Pool, QueryResultRow } from 'pg';

// 数据库连接字符串
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// 调试：显示实际使用的连接字符串（隐藏密码）
if (!connectionString) {
  console.error('[db] Database connection string not found. Please set POSTGRES_URL or DATABASE_URL environment variable.');
}

if (!connectionString) {
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

// 判断是否为本地数据库
const isLocalDB = connectionString && (
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('localhost') ||
  connectionString.includes('::1')
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
  max: parseInt(process.env.DB_POOL_MAX || (isLocalDB ? '20' : '10'), 10), // 本地数据库可以更多连接
  min: parseInt(process.env.DB_POOL_MIN || (isLocalDB ? '5' : '2'), 10),  // 本地数据库保持更多连接
  idleTimeoutMillis: isLocalDB ? 60000 : 30000, // 本地数据库：60秒，远程：30秒
  connectionTimeoutMillis: isLocalDB ? 15000 : (process.env.DB_CONNECTION_TIMEOUT ? parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) : 20000), // 增加超时时间：本地15秒，远程20秒
  // 本地数据库不需要查询超时
  statement_timeout: isLocalDB ? undefined : 60000, // 远程数据库：60秒查询超时（从30秒增加到60秒）
}) : null;

// 监听连接池错误
if (pool) {
  pool.on('error', (err) => {
    console.error('[db] Unexpected error on idle client', err);
  });

  // 预热连接池：在模块加载时建立最小连接数
  // 这样可以避免第一次请求时的冷启动延迟
  if (process.env.NODE_ENV !== 'development') {
    pool.connect()
      .then(client => {
        client.release();
      })
      .catch(err => {
        // 不抛出错误，让后续请求自行建立连接
      });
  }
}

// 原始 SQL 标记类，用于标记不应该参数化的值
class RawSQL {
  constructor(public value: string) { }
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
    const isConnectionError = error.message?.includes('timeout') ||
      error.message?.includes('Connection terminated') ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED';

    if (isConnectionError) {
      const maskedUrl = connectionString?.replace(/:([^:@]+)@/, ':****@') || 'unknown';
      console.error('[sql] Database connection error:', {
        message: error.message,
        code: error.code,
        connectionString: maskedUrl,
        isLocal: isLocalDB,
        hint: isLocalDB
          ? 'Check if PostgreSQL service is running: "Get-Service postgresql*" or check port 5432'
          : 'Check network connection and database server status'
      });
    } else {
      console.error('[sql] Query error:', error);
      console.error('[sql] Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position
      });
    }
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
export function isValidUUID(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
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

      // --- 网站内容缓存表（用于策略模式和图文工厂，避免重复抓取网站内容）---
      await sql`
        CREATE TABLE IF NOT EXISTS website_content_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          content_type VARCHAR(50) NOT NULL DEFAULT 'scraped_content',
          content TEXT,
          content_length INTEGER DEFAULT 0,
          title VARCHAR(500),
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          cache_expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
          CONSTRAINT website_content_cache_unique UNIQUE(website_id, content_type)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_website_content_website ON website_content_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_website_content_type ON website_content_cache(content_type)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_website_content_expires ON website_content_cache(cache_expires_at)`;

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

      // 添加 published_at, url_slug, website_id, content_type 字段（如果表已存在但没有这些字段）
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

          -- 新增：website_id 列（关联用户网站）
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'published_articles' 
            AND column_name = 'website_id'
          ) THEN
            ALTER TABLE published_articles ADD COLUMN website_id UUID;
          END IF;

          -- 新增：content_type 列（信息型/商业型）
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'published_articles' 
            AND column_name = 'content_type'
          ) THEN
            ALTER TABLE published_articles ADD COLUMN content_type VARCHAR(20);
          END IF;

          -- 新增：site_id 列（发布到的站点 ID）
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'published_articles'
            AND column_name = 'site_id'
          ) THEN
            ALTER TABLE published_articles ADD COLUMN site_id UUID;
          END IF;

          -- 不再使用 platform_project_id - 改为通过 Netlify API 动态查询
          -- -- 新增：platform_project_id 列（Netlify site ID，用��触发构建）
          -- IF NOT EXISTS (
          --   SELECT 1 FROM information_schema.columns
          --   WHERE table_name = 'published_articles'
          --   AND column_name = 'platform_project_id'
          -- ) THEN
          --   ALTER TABLE published_articles ADD COLUMN platform_project_id VARCHAR(200);
          -- END IF;
        END $$;
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_published_articles_user ON published_articles(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_published_articles_status ON published_articles(status)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_published_articles_created ON published_articles(created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_published_articles_website ON published_articles(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_published_articles_content_type ON published_articles(content_type)`;

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

      // 迁移：添加 deleted_at 列支持软删除
      try {
        const deletedAtCheck = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'execution_tasks' 
          AND column_name = 'deleted_at'
        `;
        if (deletedAtCheck.rows.length === 0) {
          await sql`ALTER TABLE execution_tasks ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL`;
          await sql`CREATE INDEX IF NOT EXISTS idx_execution_tasks_deleted ON execution_tasks(deleted_at)`;
          console.log('[Database] ✅ Added deleted_at column to execution_tasks');
        }
      } catch (e) {
        console.error('[Database] Could not add deleted_at column:', e);
      }

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
    if (websiteId && isValidUUID(websiteId)) {
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

// ==================== 网站内容缓存 ====================

/**
 * 获取网站内容缓存（通过 websiteId）
 * 用于策略模式挖词和图文工厂，避免重复抓取网站内容
 */
export async function getWebsiteContentCache(
  websiteId: string,
  contentType: string = 'scraped_content'
): Promise<{ content: string; title: string | null; metadata: any; updatedAt: Date } | null> {
  try {
    await initDomainCacheTables();

    const result = await sql`
      SELECT content, title, metadata, updated_at
      FROM website_content_cache
      WHERE website_id = ${websiteId}
        AND content_type = ${contentType}
        AND cache_expires_at > NOW()
    `;

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        content: row.content,
        title: row.title,
        metadata: row.metadata,
        updatedAt: row.updated_at
      };
    }
    return null;
  } catch (error) {
    console.error('[getWebsiteContentCache] Error:', error);
    return null;
  }
}

/**
 * 保存网站内容到缓存
 * @param websiteId - 网站ID
 * @param content - 网站内容（清洗后的 markdown）
 * @param contentType - 内容类型，默认 'scraped_content'
 * @param title - 网站标题
 * @param metadata - 额外元数据（如 images、scrapedAt 等）
 * @param expiresInHours - 缓存有效期（小时），默认 24 小时
 */
export async function saveWebsiteContentCache(
  websiteId: string,
  content: string,
  contentType: string = 'scraped_content',
  title?: string,
  metadata?: any,
  expiresInHours: number = 24
): Promise<boolean> {
  try {
    await initDomainCacheTables();

    // 计算过期时间
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await sql`
      INSERT INTO website_content_cache (
        website_id, content_type, content, content_length, title, metadata, cache_expires_at, updated_at
      ) VALUES (
        ${websiteId},
        ${contentType},
        ${content},
        ${content.length},
        ${title || null},
        ${metadata ? JSON.stringify(metadata) : null},
        ${expiresAt},
        NOW()
      )
      ON CONFLICT (website_id, content_type) DO UPDATE SET
        content = EXCLUDED.content,
        content_length = EXCLUDED.content_length,
        title = EXCLUDED.title,
        metadata = EXCLUDED.metadata,
        cache_expires_at = EXCLUDED.cache_expires_at,
        updated_at = NOW()
    `;

    console.log(`[saveWebsiteContentCache] Saved cache for website ${websiteId}, type: ${contentType}, length: ${content.length}`);
    return true;
  } catch (error) {
    console.error('[saveWebsiteContentCache] Error:', error);
    return false;
  }
}

/**
 * 删除网站内容缓存（用于强制刷新）
 */
export async function deleteWebsiteContentCache(
  websiteId: string,
  contentType?: string
): Promise<boolean> {
  try {
    await initDomainCacheTables();

    if (contentType) {
      await sql`
        DELETE FROM website_content_cache
        WHERE website_id = ${websiteId} AND content_type = ${contentType}
      `;
    } else {
      await sql`
        DELETE FROM website_content_cache
        WHERE website_id = ${websiteId}
      `;
    }

    return true;
  } catch (error) {
    console.error('[deleteWebsiteContentCache] Error:', error);
    return false;
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
    if (websiteId && isValidUUID(websiteId)) {
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
    const sortedRows = result.rows.sort((a, b) => {
      // website_id 不为 null 的优先级更高
      if (a.website_id && !b.website_id) return -1;
      if (!a.website_id && b.website_id) return 1;
      // 都是或者都不是，则按更新时间排序，最新的优先
      return new Date(b.data_updated_at || 0).getTime() - new Date(a.data_updated_at || 0).getTime();
    });

    for (const row of sortedRows) {
      const key = row.keyword.toLowerCase();
      if (!cacheMap.has(key)) {
        cacheMap.set(key, row);
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
      let websiteId = cache.website_id;
      if (websiteId && !isValidUUID(websiteId as string)) {
        websiteId = null as any;
      }
      const finalWebsiteId = websiteId || null;

      await sql`
        DELETE FROM keyword_analysis_cache
        WHERE keyword = ${cache.keyword}
          AND location_code = ${cache.location_code || 2840}
          AND search_engine = ${cache.search_engine || 'google'}
          AND (
            (website_id IS NULL AND (${finalWebsiteId}::UUID IS NULL)) OR 
            (website_id = ${finalWebsiteId}::UUID)
          )
      `;
    }

    // 验证并清理 website_id
    let finalInsertWebsiteId = cache.website_id;
    if (finalInsertWebsiteId && !isValidUUID(finalInsertWebsiteId as string)) {
      finalInsertWebsiteId = null as any;
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
        ${finalInsertWebsiteId || null}::UUID,
        ${cache.keyword},
        ${cache.location_code || 2840},
        ${cache.search_engine || 'google'},
        ${cache.dataforseo_volume !== undefined ? cache.dataforseo_volume : null}::INTEGER,
        ${cache.dataforseo_difficulty !== undefined ? cache.dataforseo_difficulty : null}::INTEGER,
        ${cache.dataforseo_cpc !== undefined ? cache.dataforseo_cpc : null}::DECIMAL,
        ${cache.dataforseo_competition !== undefined ? cache.dataforseo_competition : null}::DECIMAL,
        ${cache.dataforseo_history_trend ? JSON.stringify(cache.dataforseo_history_trend) : null}::JSONB,
        ${cache.dataforseo_is_data_found || false},
        ${cache.agent2_probability || null},
        ${cache.agent2_search_intent || null},
        ${cache.agent2_intent_analysis || null},
        ${cache.agent2_reasoning || null},
        ${cache.agent2_top_domain_type || null},
        ${cache.agent2_serp_result_count !== undefined ? cache.agent2_serp_result_count : null}::INTEGER,
        ${cache.agent2_top_serp_snippets ? JSON.stringify(cache.agent2_top_serp_snippets) : null}::JSONB,
        ${cache.agent2_blue_ocean_score !== undefined ? cache.agent2_blue_ocean_score : null}::DECIMAL,
        ${cache.agent2_blue_ocean_breakdown ? JSON.stringify(cache.agent2_blue_ocean_breakdown) : null}::JSONB,
        ${cache.website_dr !== undefined ? cache.website_dr : null}::INTEGER,
        ${cache.competitor_drs ? JSON.stringify(cache.competitor_drs) : null}::JSONB,
        ${cache.top3_probability || null},
        ${cache.top10_probability || null},
        ${cache.can_outrank_positions ? JSON.stringify(cache.can_outrank_positions) : null}::JSONB,
        ${cache.source || 'website-audit'},
        NOW(),
        ${cache.cache_expires_at ? cache.cache_expires_at : raw("NOW() + INTERVAL '7 days'")}
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
// High Performer Keywords (from execution_tasks)
// =============================================

/**
 * 获取网站关联的所有高表现关键词（通过 execution_tasks 查找）
 */
export async function getHighPerformerKeywordsByWebsiteId(
  websiteId: string,
  userId: string | number
): Promise<string[]> {
  try {
    await initTasksTable();

    // 从 execution_tasks 中查找与该网站关联的任务
    const tasks = await sql`
      SELECT state FROM execution_tasks
      WHERE user_id = ${userId}
      AND (params->>'websiteId' = ${websiteId} OR state->'miningState'->>'websiteId' = ${websiteId})
      AND status IN ('completed', 'running')
    `;

    const highPerformerKeywords: string[] = [];

    // 从每个任务的 state 中提取标记为 isHighPerformer 的关键词
    for (const task of tasks.rows) {
      const state = task.state || {};
      const miningState = state.miningState || state;
      const keywords = miningState.keywords || [];

      keywords.forEach((kw: any) => {
        if (kw.isHighPerformer && kw.keyword) {
          if (!highPerformerKeywords.includes(kw.keyword)) {
            highPerformerKeywords.push(kw.keyword);
          }
        }
      });
    }

    return highPerformerKeywords;
  } catch (error) {
    console.error('Error getting high performer keywords by website:', error);
    return [];
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
  deleted_at: Date | null;
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
 * @param userId 用户ID
 * @param limit 返回数量限制
 * @param options.includeDeleted 是否包含已删除的任务
 * @param options.onlyDeleted 是否只返回已删除的任务
 */
export async function getUserExecutionTasks(
  userId: string | number,
  limit: number = 20,
  options: { includeDeleted?: boolean; onlyDeleted?: boolean } = {}
): Promise<ExecutionTask[]> {
  try {
    await initTasksTable();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    let result;
    if (options.onlyDeleted) {
      // 只返回已删除的任务
      result = await sql<ExecutionTask>`
        SELECT * FROM execution_tasks 
        WHERE user_id = ${normalizedUserId} 
        AND deleted_at IS NOT NULL
        ORDER BY deleted_at DESC 
        LIMIT ${limit}
      `;
    } else if (options.includeDeleted) {
      // 返回所有任务（包括已删除）
      result = await sql<ExecutionTask>`
        SELECT * FROM execution_tasks 
        WHERE user_id = ${normalizedUserId} 
        ORDER BY updated_at DESC 
        LIMIT ${limit}
      `;
    } else {
      // 默认：只返回未删除的任务
      result = await sql<ExecutionTask>`
        SELECT * FROM execution_tasks 
        WHERE user_id = ${normalizedUserId} 
        AND deleted_at IS NULL
        ORDER BY updated_at DESC 
        LIMIT ${limit}
      `;
    }
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
 * 软删除任务（归档）
 */
export async function deleteExecutionTask(taskId: string, userId: string | number): Promise<boolean> {
  try {
    await initTasksTable();

    // 将 userId 标准化为有效的 UUID 格式
    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql`
      UPDATE execution_tasks 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${taskId} AND user_id = ${normalizedUserId} AND deleted_at IS NULL
      RETURNING id
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting execution task:', error);
    throw error;
  }
}

/**
 * 恢复已删除的任务
 */
export async function restoreExecutionTask(taskId: string, userId: string | number): Promise<boolean> {
  try {
    await initTasksTable();

    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql`
      UPDATE execution_tasks 
      SET deleted_at = NULL, updated_at = NOW()
      WHERE id = ${taskId} AND user_id = ${normalizedUserId} AND deleted_at IS NOT NULL
      RETURNING id
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error restoring execution task:', error);
    throw error;
  }
}

/**
 * 永久删除任务（从数据库彻底移除）
 */
export async function permanentlyDeleteExecutionTask(taskId: string, userId: string | number): Promise<boolean> {
  try {
    await initTasksTable();

    const normalizedUserId = normalizeUserIdForQuery(userId);

    const result = await sql`
      DELETE FROM execution_tasks 
      WHERE id = ${taskId} AND user_id = ${normalizedUserId}
      RETURNING id
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error permanently deleting execution task:', error);
    throw error;
  }
}

// ============================================================================
// PSEO 发布系统 - Admin Token 池管理（简化版 - 仅支持 Netlify）
// ============================================================================

/**
 * GitHub Token 类型 - 用于管理 GitHub 仓库
 */
export interface GitHubToken {
  id: string;
  name: string;                    // 别名，如 "GitHub Bot 1"
  token_encrypted: string;         // 加密存储
  owner_name: string;              // GitHub 用户名或组织名，用于创建仓库
  netlify_token_id: string | null; // 关联的 Netlify Token ID（1对1绑定）
  usage_count: number;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

/**
 * Netlify Token 类型 - Netlify 平台的 API Token
 * 简化版：只支持 Netlify，移除其他平台
 */
export interface NetlifyToken {
  id: string;
  name: string;                    // 别名，如 "Netlify Bot 1"
  token_encrypted: string;         // 加密存储
  github_token_id: string | null;  // 关联的 GitHub Token ID（1对1绑定）
  usage_count: number;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

/**
 * 平台 Token 数据 - 支持多平台的 API Token
 */
export interface PlatformToken {
  id: string;
  platform: 'rtd' | 'cf_pages' | 'netlify' | 'vercel';
  token_encrypted: string;
  name: string;
  metadata?: { githubOwner?: string; accountId?: string; [k: string]: unknown };
  usage_count: number;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

/**
 * 平台站点类型 - 实际的发布站点（简化版）
 */
export interface PlatformSite {
  id: string;
  github_token_id: string;         // 关联的 GitHub Token，用于推送代码
  netlify_token_id: string;        // 关联的 Netlify Token（必填）
  platform: string;                // 平台类型 (netlify, cf_pages, vercel, rtd)
  content_type: string;            // 内容类型 (informational, commercial)
  site_name: string;               // 站点名
  site_url: string;                // 站点 URL
  repo_name: string;               // GitHub 仓库名（系统自动生成）
  docs_path: string;
  branch: string;
  usage_count: number;
  status: 'pending' | 'active' | 'disabled'; // pending=等待创建
  created_at: Date;
  updated_at: Date;
  // 注意：不再存储 netlify_site_id，改为通过 Netlify API 动态查询
}

/**
 * 网站-站点绑定关系 (website_id 关联 user_websites 表)
 * 简化版：移除 content_type 分类
 */
export interface WebsiteSiteBinding {
  id: string;
  website_id: string;  // 关联 user_websites.id
  site_id: string;     // 关联 platform_sites.id
  created_at: Date;
}

// PSEO 发布系统表初始化标志
let pseoTablesInitialized = false;
let pseoTablesInitializing: Promise<void> | null = null;

/**
 * 初始化 PSEO 发布系统表 (简化版，仅支持 Netlify)
 *
 * 数据模型:
 * - github_tokens: GitHub PAT，用于创建仓库和推送代码（包含 netlify_token_id 外键）
 * - netlify_tokens: Netlify API Token（包含 github_token_id 外键）
 * - platform_sites: 发布站点，关联 GitHub Token + Netlify Token
 * - website_site_bindings: 项目和站点的绑定关系（移除 content_type）
 * 
 * 简化策略:
 * - 只支持 Netlify 平台
 * - GitHub Token 和 Netlify Token 1对1 绑定
 * - 移除内容类型分类（informational/commercial）
 *
 * 自动创建流程:
 * 1. 系统自动创建 GitHub 仓库（pseo-site-{uuid}）
 * 2. 推送 MkDocs 模板文件
 * 3. 通过 Netlify API 创建项目并连接 GitHub 仓库
 */
export async function initPSEOPublishTables() {
  if (pseoTablesInitialized) return;

  if (pseoTablesInitializing) {
    await pseoTablesInitializing;
    return;
  }

  pseoTablesInitializing = (async () => {
    try {
      // ============================================================================
      // 自动迁移：检查并重命名 v2 表（如果有）
      // ============================================================================
      console.log('[initPSEOPublishTables] 🔄 Checking for legacy v2 tables...');

      const tableCheck = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('platform_tokens_v2', 'platform_sites_v2')
      `;

      const hasV2Tables = tableCheck.rows.length > 0;

      if (hasV2Tables) {
        console.log('[initPSEOPublishTables] 📦 Found v2 tables, starting migration...');

        // 迁移 platform_sites_v2 -> platform_sites
        const hasSitesV2 = tableCheck.rows.some((r: any) => r.table_name === 'platform_sites_v2');
        if (hasSitesV2) {
          console.log('[initPSEOPublishTables] - Migrating platform_sites_v2 -> platform_sites');
          try {
            // 检查是否已存在 platform_sites 表
            const existingCheck = await sql`
              SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'platform_sites'
              ) as exists
            `;
            const hasExistingSites = existingCheck.rows[0]?.exists;

            if (hasExistingSites) {
              // 新表已存在，说明之前迁移过但 v2 表没删除，���接删除 v2 表
              console.log('[initPSEOPublishTables]   Cleaning up old v2 table...');
              await sql`DROP TABLE IF EXISTS platform_sites_v2 CASCADE`;
            } else {
              // 直接重命名
              await sql`ALTER TABLE platform_sites_v2 RENAME TO platform_sites`;
            }
            // 重命名约束
            await sql`
              DO $$
              BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_sites_v2_valid_platform' AND conrelid = 'platform_sites'::regclass) THEN
                  ALTER TABLE platform_sites RENAME CONSTRAINT platform_sites_v2_valid_platform TO platform_sites_valid_platform;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_sites_v2_valid_content_type' AND conrelid = 'platform_sites'::regclass) THEN
                  ALTER TABLE platform_sites RENAME CONSTRAINT platform_sites_v2_valid_content_type TO platform_sites_valid_content_type;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_sites_v2_valid_status' AND conrelid = 'platform_sites'::regclass) THEN
                  ALTER TABLE platform_sites RENAME CONSTRAINT platform_sites_v2_valid_status TO platform_sites_valid_status;
                END IF;
              END $$
            `;
            // 重命名索引
            await sql`
              DO $$
              BEGIN
                IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_sites_v2_github_token_id') THEN
                  ALTER INDEX idx_platform_sites_v2_github_token_id RENAME TO idx_platform_sites_github_token_id;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_sites_v2_platform_token_id') THEN
                  ALTER INDEX idx_platform_sites_v2_platform_token_id RENAME TO idx_platform_sites_platform_token_id;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_sites_v2_content_type') THEN
                  ALTER INDEX idx_platform_sites_v2_content_type RENAME TO idx_platform_sites_content_type;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_sites_v2_status') THEN
                  ALTER INDEX idx_platform_sites_v2_status RENAME TO idx_platform_sites_status;
                END IF;
              END $$
            `;
            console.log('[initPSEOPublishTables] ✅ platform_sites migrated');
          } catch (e: any) {
            console.error('[initPSEOPublishTables] ❌ Error migrating platform_sites:', e.message);
          }
        }

        // 迁移 platform_tokens_v2 -> platform_tokens
        const hasTokensV2 = tableCheck.rows.some((r: any) => r.table_name === 'platform_tokens_v2');
        if (hasTokensV2) {
          console.log('[initPSEOPublishTables] - Migrating platform_tokens_v2 -> platform_tokens');
          try {
            // 检查是否已存在 platform_tokens 表
            const existingCheck = await sql`
              SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'platform_tokens'
              ) as exists
            `;
            const hasExistingTokens = existingCheck.rows[0]?.exists;

            if (hasExistingTokens) {
              console.log('[initPSEOPublishTables]   Cleaning up old v2 table...');
              await sql`DROP TABLE IF EXISTS platform_tokens_v2 CASCADE`;
            } else {
              await sql`ALTER TABLE platform_tokens_v2 RENAME TO platform_tokens`;
            }
            // 重命名约束
            await sql`
              DO $$
              BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_tokens_v2_valid_platform' AND conrelid = 'platform_tokens'::regclass) THEN
                  ALTER TABLE platform_tokens RENAME CONSTRAINT platform_tokens_v2_valid_platform TO platform_tokens_valid_platform;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_tokens_v2_valid_status' AND conrelid = 'platform_tokens'::regclass) THEN
                  ALTER TABLE platform_tokens RENAME CONSTRAINT platform_tokens_v2_valid_status TO platform_tokens_valid_status;
                END IF;
              END $$
            `;
            // 重命名索引
            await sql`
              DO $$
              BEGIN
                IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_tokens_v2_platform') THEN
                  ALTER INDEX idx_platform_tokens_v2_platform RENAME TO idx_platform_tokens_platform;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_tokens_v2_status') THEN
                  ALTER INDEX idx_platform_tokens_v2_status RENAME TO idx_platform_tokens_status;
                END IF;
              END $$
            `;
            console.log('[initPSEOPublishTables] ✅ platform_tokens migrated');
          } catch (e: any) {
            console.error('[initPSEOPublishTables] ❌ Error migrating platform_tokens:', e.message);
          }
        }

        // 更新 website_site_bindings 的外键约束
        try {
          await sql`
            DO $$
            DECLARE
              constraint_rec RECORD;
            BEGIN
              -- 查找并删除旧的 v2 外键约束
              FOR constraint_rec IN
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'website_site_bindings'::regclass
                AND conname LIKE '%platform_sites_v2%'
              LOOP
                EXECUTE format('ALTER TABLE website_site_bindings DROP CONSTRAINT %I', constraint_rec.conname);
              END LOOP;

              -- 删除可能存在的旧外键约束
              IF EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'website_site_bindings'::regclass
                AND conname = 'website_site_bindings_site_id_fkey'
              ) THEN
                ALTER TABLE website_site_bindings DROP CONSTRAINT website_site_bindings_site_id_fkey;
              END IF;

              -- 清理孤立记录（site_id 指向不存在的记录）
              DELETE FROM website_site_bindings
              WHERE site_id NOT IN (SELECT id FROM platform_sites);

              -- 添加新的外键约束（使用 NOT VALID 避免验证现有数据）
              ALTER TABLE website_site_bindings
              ADD CONSTRAINT website_site_bindings_site_id_fkey
              FOREIGN KEY (site_id) REFERENCES platform_sites(id) ON DELETE CASCADE NOT VALID;
            END $$
          `;
          console.log('[initPSEOPublishTables] ✅ website_site_bindings foreign keys updated');
        } catch (e: any) {
          console.error('[initPSEOPublishTables] ❌ Error updating website_site_bindings:', e.message);
        }

        console.log('[initPSEOPublishTables] 🎉 Migration completed successfully!');
      } else {
        // v2 表已清理，无需迁移
      }

      // 1. GitHub Token 表 - 用于管理 GitHub 仓库
      await sql`
        CREATE TABLE IF NOT EXISTS github_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          token_encrypted TEXT NOT NULL,
          owner_name VARCHAR(100) NOT NULL,
          usage_count INT DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'github_tokens_valid_status') THEN
            ALTER TABLE github_tokens ADD CONSTRAINT github_tokens_valid_status CHECK (status IN ('active', 'disabled'));
          END IF;
        END $$
      `;

      // 2. 平台 Token 表 - 各发布平台的 API Token
      await sql`
        CREATE TABLE IF NOT EXISTS platform_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          platform VARCHAR(50) NOT NULL,
          name VARCHAR(100) NOT NULL,
          token_encrypted TEXT NOT NULL,
          usage_count INT DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_tokens_valid_platform') THEN
            ALTER TABLE platform_tokens ADD CONSTRAINT platform_tokens_valid_platform CHECK (platform IN ('rtd', 'cf_pages', 'netlify', 'vercel'));
          END IF;
        END $$
      `;

      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_tokens_valid_status') THEN
            ALTER TABLE platform_tokens ADD CONSTRAINT platform_tokens_valid_status CHECK (status IN ('active', 'disabled'));
          END IF;
        END $$
      `;

      // 迁移：添加 metadata 列（如果不存在）
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'platform_tokens' AND column_name = 'metadata'
          ) THEN
            ALTER TABLE platform_tokens ADD COLUMN metadata JSONB;
          END IF;
        END $$
      `;

      // 3. 平台站点表 - 实际的发布��点
      await sql`
        CREATE TABLE IF NOT EXISTS platform_sites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          github_token_id UUID NOT NULL REFERENCES github_tokens(id) ON DELETE CASCADE,
          platform_token_id UUID REFERENCES platform_tokens(id) ON DELETE SET NULL,
          platform VARCHAR(50) NOT NULL,
          content_type VARCHAR(20) NOT NULL,
          site_name VARCHAR(200) NOT NULL,
          site_url VARCHAR(500) DEFAULT '',
          repo_name VARCHAR(100) NOT NULL,
          docs_path VARCHAR(100) DEFAULT 'docs',
          branch VARCHAR(100) DEFAULT 'main',
          usage_count INT DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_sites_valid_platform') THEN
            ALTER TABLE platform_sites ADD CONSTRAINT platform_sites_valid_platform CHECK (platform IN ('rtd', 'cf_pages', 'netlify', 'vercel'));
          END IF;
        END $$
      `;

      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_sites_valid_content_type') THEN
            ALTER TABLE platform_sites ADD CONSTRAINT platform_sites_valid_content_type CHECK (content_type IN ('informational', 'commercial'));
          END IF;
        END $$
      `;

      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_sites_valid_status') THEN
            ALTER TABLE platform_sites ADD CONSTRAINT platform_sites_valid_status CHECK (status IN ('pending', 'active', 'disabled'));
          END IF;
        END $$
      `;

      // 4. 网站-站点绑定表 (website_id 关联 user_websites)
      await sql`
        CREATE TABLE IF NOT EXISTS website_site_bindings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL,
          content_type VARCHAR(20) NOT NULL,
          site_id UUID NOT NULL REFERENCES platform_sites(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // 使用 DO 块安全添加约束（不产生错误日志）
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'website_site_bindings_valid_content_type') THEN
            ALTER TABLE website_site_bindings ADD CONSTRAINT website_site_bindings_valid_content_type CHECK (content_type IN ('informational', 'commercial'));
          END IF;
        END $$
      `;

      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'website_site_bindings_unique') THEN
            ALTER TABLE website_site_bindings ADD CONSTRAINT website_site_bindings_unique UNIQUE (website_id, content_type);
          END IF;
        END $$
      `;

      // 5. 给 published_articles 表添加新字段
      try {
        await sql`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'published_articles' AND column_name = 'content_type') THEN
              ALTER TABLE published_articles ADD COLUMN content_type VARCHAR(20);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'published_articles' AND column_name = 'site_id') THEN
              ALTER TABLE published_articles ADD COLUMN site_id UUID;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'published_articles' AND column_name = 'website_id') THEN
              ALTER TABLE published_articles ADD COLUMN website_id UUID;
            END IF;
          END $$;
        `;
      } catch (e: any) {
        console.warn('[initPSEOPublishTables] Migration warning:', e.message);
      }

      // 不再使用 platform_project_id - 改为通过 Netlify API 动态查询
      // // 5.1 给 platform_sites 表添加 platform_project_id 字段（用于触发重新构建）
      // try {
      //   await sql`
      //     DO $$
      //     BEGIN
      //       IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_sites' AND column_name = 'platform_project_id') THEN
      //         ALTER TABLE platform_sites ADD COLUMN platform_project_id VARCHAR(200);
      //       END IF;
      //     END $$;
      //   `;
      //   console.log('[initPSEOPublishTables] ✅ Added platform_project_id column to platform_sites');
      // } catch (e: any) {
      //   console.warn('[initPSEOPublishTables] Migration warning for platform_project_id:', e.message);
      // }

      // 6. 创建索引
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_github_tokens_status ON github_tokens(status)',
        'CREATE INDEX IF NOT EXISTS idx_platform_tokens_platform ON platform_tokens(platform)',
        'CREATE INDEX IF NOT EXISTS idx_platform_tokens_status ON platform_tokens(status)',
        'CREATE INDEX IF NOT EXISTS idx_platform_sites_github_token_id ON platform_sites(github_token_id)',
        'CREATE INDEX IF NOT EXISTS idx_platform_sites_platform_token_id ON platform_sites(platform_token_id)',
        'CREATE INDEX IF NOT EXISTS idx_platform_sites_content_type ON platform_sites(content_type)',
        'CREATE INDEX IF NOT EXISTS idx_platform_sites_status ON platform_sites(status)',
        'CREATE INDEX IF NOT EXISTS idx_website_site_bindings_website_id ON website_site_bindings(website_id)',
        // 唯一索引：同一个 github_token 下的 repo_name 必须唯一
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_sites_github_repo_unique ON platform_sites(github_token_id, repo_name)'
      ];

      for (const indexSql of indexes) {
        try {
          await sql(new RawSQL(indexSql));
        } catch (e: any) { /* 忽略索引已存在的错误 */ }
      }

      pseoTablesInitialized = true;
      console.log('[initPSEOPublishTables] ✅ PSEO publish tables initialized');
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'pg_type_typname_nsp_index') {
        pseoTablesInitialized = true;
        console.log('[initPSEOPublishTables] ✅ Tables already exist');
        return;
      }
      console.error('[initPSEOPublishTables] Error:', error);
      throw error;
    } finally {
      pseoTablesInitializing = null;
    }
  })();

  await pseoTablesInitializing;
}

// ============================================================================
// GitHub Token CRUD 操作
// ============================================================================

/**
 * 检查 GitHub Token 是否已存在（按 name 或 owner_name 检查）
 */
export async function checkGitHubTokenExists(data: {
  name?: string;
  owner_name?: string;
}): Promise<{ exists: boolean; field?: string; value?: string }> {
  await initPSEOPublishTables();

  if (data.name) {
    const result = await sql`SELECT id FROM github_tokens WHERE name = ${data.name}`;
    if (result.rows.length > 0) {
      return { exists: true, field: 'name', value: data.name };
    }
  }

  if (data.owner_name) {
    const result = await sql`SELECT id FROM github_tokens WHERE owner_name = ${data.owner_name}`;
    if (result.rows.length > 0) {
      return { exists: true, field: 'owner_name', value: data.owner_name };
    }
  }

  return { exists: false };
}

/**
 * 创建 GitHub Token
 */
export async function createGitHubToken(data: {
  name: string;
  token: string;
  owner_name: string;
}): Promise<GitHubToken | { error: string }> {
  await initPSEOPublishTables();

  // 检查重复
  const existsCheck = await checkGitHubTokenExists({ name: data.name, owner_name: data.owner_name });
  if (existsCheck.exists) {
    return { error: `GitHub Token with ${existsCheck.field} "${existsCheck.value}" already exists` };
  }

  const tokenEncrypted = Buffer.from(data.token).toString('base64');

  const result = await sql<GitHubToken>`
    INSERT INTO github_tokens (name, token_encrypted, owner_name)
    VALUES (${data.name}, ${tokenEncrypted}, ${data.owner_name})
    RETURNING *
  `;
  return result.rows[0];
}

/**
 * 获取所有 GitHub Token
 */
export async function getAllGitHubTokens(): Promise<GitHubToken[]> {
  await initPSEOPublishTables();
  const result = await sql<GitHubToken>`
    SELECT * FROM github_tokens ORDER BY created_at DESC
  `;
  return result.rows;
}

/**
 * 获取单个 GitHub Token
 */
export async function getGitHubTokenById(tokenId: string): Promise<GitHubToken | null> {
  await initPSEOPublishTables();
  const result = await sql<GitHubToken>`
    SELECT * FROM github_tokens WHERE id = ${tokenId}
  `;
  return result.rows[0] || null;
}

/**
 * 更新 GitHub Token 状态
 */
export async function updateGitHubTokenStatus(
  tokenId: string,
  status: 'active' | 'disabled'
): Promise<GitHubToken | null> {
  await initPSEOPublishTables();
  const result = await sql<GitHubToken>`
    UPDATE github_tokens 
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${tokenId}
    RETURNING *
  `;
  return result.rows[0] || null;
}

/**
 * 删除 GitHub Token
 */
export async function deleteGitHubToken(tokenId: string): Promise<boolean> {
  await initPSEOPublishTables();
  const result = await sql`
    DELETE FROM github_tokens WHERE id = ${tokenId} RETURNING id
  `;
  return result.rows.length > 0;
}

/**
 * 增加 GitHub Token 使用计数
 */
export async function incrementGitHubTokenUsage(tokenId: string): Promise<void> {
  await sql`
    UPDATE github_tokens 
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = ${tokenId}
  `;
}

// ============================================================================
// Platform Token CRUD 操作 (各平台 API Token)
// ============================================================================

/**
 * 检查平台 Token 是否已存在（按 name + platform 检查）
 */
export async function checkPlatformTokenExists(data: {
  name: string;
  platform: string;
}): Promise<{ exists: boolean; message?: string }> {
  await initPSEOPublishTables();

  // 检查相同平台下是否有同名 Token
  const result = await sql`
    SELECT id FROM platform_tokens 
    WHERE name = ${data.name} AND platform = ${data.platform}
  `;
  if (result.rows.length > 0) {
    return { exists: true, message: `Platform Token "${data.name}" for ${data.platform} already exists` };
  }

  return { exists: false };
}

/**
 * 创建平台 Token
 * 
 * ⚠️ 重要：metadata.githubOwner 用于关联同一个管理员的 GitHub Token
 * 确保 Platform Token 和 GitHub Token 属于同一个账号，避免授权失败
 */
export async function createPlatformToken(data: {
  platform: PlatformToken['platform'];
  token: string;
  name: string;
  metadata?: { githubOwner?: string; accountId?: string; [k: string]: unknown };
}): Promise<PlatformToken | { error: string }> {
  await initPSEOPublishTables();

  // 检查重复
  const existsCheck = await checkPlatformTokenExists({ name: data.name, platform: data.platform });
  if (existsCheck.exists) {
    return { error: existsCheck.message || 'Token already exists' };
  }

  const tokenEncrypted = Buffer.from(data.token).toString('base64');

  const result = await sql<PlatformToken>`
    INSERT INTO platform_tokens (platform, token_encrypted, name, metadata)
    VALUES (${data.platform}, ${tokenEncrypted}, ${data.name}, ${data.metadata ? JSON.stringify(data.metadata) : null})
    RETURNING *
  `;
  return result.rows[0];
}

/**
 * 获取所有平台 Token
 */
export async function getAllPlatformTokens(): Promise<PlatformToken[]> {
  await initPSEOPublishTables();
  const result = await sql<PlatformToken>`
    SELECT * FROM platform_tokens ORDER BY created_at DESC
  `;
  return result.rows;
}

/**
 * 获取单个平台 Token
 */
export async function getPlatformTokenById(tokenId: string): Promise<PlatformToken | null> {
  await initPSEOPublishTables();
  const result = await sql<PlatformToken>`
    SELECT * FROM platform_tokens WHERE id = ${tokenId}
  `;
  return result.rows[0] || null;
}

/**
 * 更新平台 Token 状态
 */
export async function updatePlatformTokenStatus(
  tokenId: string,
  status: 'active' | 'disabled'
): Promise<PlatformToken | null> {
  await initPSEOPublishTables();
  const result = await sql<PlatformToken>`
    UPDATE platform_tokens 
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${tokenId}
    RETURNING *
  `;
  return result.rows[0] || null;
}

/**
 * 删除平台 Token
 */
export async function deletePlatformToken(tokenId: string): Promise<boolean> {
  await initPSEOPublishTables();
  const result = await sql`
    DELETE FROM platform_tokens WHERE id = ${tokenId} RETURNING id
  `;
  return result.rows.length > 0;
}

/**
 * 增加平台 Token 使用计数
 */
export async function incrementPlatformTokenUsage(tokenId: string): Promise<void> {
  await sql`
    UPDATE platform_tokens 
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = ${tokenId}
  `;
}

// ============================================================================
// Platform Site CRUD 操作
// ============================================================================

/**
 * 创建平台站点
 */
export async function createPlatformSite(data: {
  github_token_id: string;
  platform_token_id?: string | null;
  platform: PlatformSite['platform'];
  content_type: PlatformSite['content_type'];
  site_name: string;
  site_url?: string;
  repo_name: string;
  docs_path?: string;
  branch?: string;
  status?: PlatformSite['status'];
}): Promise<PlatformSite> {
  await initPSEOPublishTables();

  const result = await sql<PlatformSite>`
    INSERT INTO platform_sites (
      github_token_id, platform_token_id, platform, content_type, 
      site_name, site_url, repo_name, docs_path, branch, status
    )
    VALUES (
      ${data.github_token_id}, 
      ${data.platform_token_id || null}, 
      ${data.platform},
      ${data.content_type},
      ${data.site_name}, 
      ${data.site_url || ''}, 
      ${data.repo_name},
      ${data.docs_path || 'docs'},
      ${data.branch || 'main'},
      ${data.status || 'pending'}
    )
    RETURNING *
  `;
  return result.rows[0];
}

/**
 * 获取单个站点
 */
export async function getPlatformSiteById(siteId: string): Promise<PlatformSite | null> {
  await initPSEOPublishTables();
  const result = await sql<PlatformSite>`
    SELECT * FROM platform_sites WHERE id = ${siteId}
  `;
  return result.rows[0] || null;
}

/**
 * 获取 GitHub Token 下的所有站点
 */
export async function getSitesByGitHubTokenId(tokenId: string): Promise<PlatformSite[]> {
  await initPSEOPublishTables();
  const result = await sql<PlatformSite>`
    SELECT * FROM platform_sites WHERE github_token_id = ${tokenId} ORDER BY created_at DESC
  `;
  return result.rows;
}

/**
 * 获取所有站点（带 Token 信息）
 */
export async function getAllPlatformSites(): Promise<(PlatformSite & {
  github_token_name: string;
  github_owner: string;
  platform_token_name: string | null;
})[]> {
  await initPSEOPublishTables();
  const result = await sql<PlatformSite & {
    github_token_name: string;
    github_owner: string;
    platform_token_name: string | null;
  }>`
    SELECT 
      s.*,
      g.name as github_token_name,
      g.owner_name as github_owner,
      p.name as platform_token_name
    FROM platform_sites s
    JOIN github_tokens g ON s.github_token_id = g.id
    LEFT JOIN platform_tokens p ON s.platform_token_id = p.id
    ORDER BY s.created_at DESC
  `;
  return result.rows;
}

/**
 * 更新站点状态
 */
export async function updatePlatformSiteStatus(
  siteId: string,
  status: 'pending' | 'active' | 'disabled'
): Promise<PlatformSite | null> {
  await initPSEOPublishTables();
  const result = await sql<PlatformSite>`
    UPDATE platform_sites 
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${siteId}
    RETURNING *
  `;
  return result.rows[0] || null;
}

/**
 * 更新站点 URL
 */
export async function updatePlatformSiteUrl(
  siteId: string,
  siteUrl: string
): Promise<PlatformSite | null> {
  await initPSEOPublishTables();
  const result = await sql<PlatformSite>`
    UPDATE platform_sites
    SET site_url = ${siteUrl}, updated_at = NOW()
    WHERE id = ${siteId}
    RETURNING *
  `;
  return result.rows[0] || null;
}

/**
 * 更新站点的平台项目 ID
 * 注意：不再使用 platform_project_id - 改为通过 Netlify API 动态查询
 * 此函数保留用于更新 updated_at 时间戳
 */
export async function updatePlatformSiteProjectId(
  siteId: string,
  projectId: string
): Promise<PlatformSite | null> {
  await initPSEOPublishTables();
  const result = await sql<PlatformSite>`
    UPDATE platform_sites
    SET updated_at = NOW()
    WHERE id = ${siteId}
    RETURNING *
  `;
  return result.rows[0] || null;
}

/**
 * 更新站点的平台类型
 * 用于切换发布平台(如从 RTD 切换到 Netlify)
 */
export async function updatePlatformSitePlatform(
  siteId: string,
  platform: 'rtd' | 'cf_pages' | 'netlify' | 'vercel',
  platformTokenId: string | null = null
): Promise<PlatformSite | null> {
  await initPSEOPublishTables();
  const result = await sql<PlatformSite>`
    UPDATE platform_sites
    SET
      platform = ${platform},
      platform_token_id = ${platformTokenId},
      status = 'pending',
      updated_at = NOW()
    WHERE id = ${siteId}
    RETURNING *
  `;
  return result.rows[0] || null;
}

/**
 * 更新站点的 GitHub Token
 */
export async function updatePlatformSiteGitHubToken(
  siteId: string,
  githubTokenId: string
): Promise<PlatformSite | null> {
  await initPSEOPublishTables();
  const result = await sql<PlatformSite>`
    UPDATE platform_sites
    SET 
      github_token_id = ${githubTokenId},
      updated_at = NOW()
    WHERE id = ${siteId}
    RETURNING *
  `;
  return result.rows[0] || null;
}

/**
 * 删除站点
 */
export async function deletePlatformSite(siteId: string): Promise<boolean> {
  await initPSEOPublishTables();
  const result = await sql`
    DELETE FROM platform_sites WHERE id = ${siteId} RETURNING id
  `;
  return result.rows.length > 0;
}

/**
 * 增加站点使用计数
 */
export async function incrementSiteUsage(siteId: string): Promise<void> {
  await sql`
    UPDATE platform_sites 
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = ${siteId}
  `;
}

// ============================================================================
// 站点分配逻辑
// ============================================================================

/**
 * 获取网站已绑定的站点 (website_id 来自 user_websites 表)
 */
export async function getWebsiteSiteBindings(websiteId: string): Promise<(WebsiteSiteBinding & {
  site: PlatformSite;
  github_token: GitHubToken;
  platform_token: PlatformToken | null;
})[]> {
  await initPSEOPublishTables();
  const result = await sql<any>`
    SELECT 
      b.*,
      row_to_json(s.*) as site,
      row_to_json(g.*) as github_token,
      CASE WHEN p.id IS NOT NULL THEN row_to_json(p.*) ELSE NULL END as platform_token
    FROM website_site_bindings b
    JOIN platform_sites s ON b.site_id = s.id
    JOIN github_tokens g ON s.github_token_id = g.id
    LEFT JOIN platform_tokens p ON s.platform_token_id = p.id
    WHERE b.website_id = ${websiteId}
  `;
  return result.rows;
}

/**
 * 为用户网站分配导流站点（最少使用优先）
 * 
 * 发布策略:
 * - 信息型内容 -> RTD, CF Pages
 * - 商业型内容 -> Netlify, Vercel, CF Pages
 *
 * @param websiteId - 用户网站 ID (来自 user_websites 表)
 * @param contentType - 内容类型
 */
export async function assignSiteToWebsite(
  websiteId: string,
  contentType: 'informational' | 'commercial'
): Promise<{
  site: PlatformSite;
  github_token: GitHubToken;
  platform_token: PlatformToken | null;
  isNew: boolean;
} | null> {
  await initPSEOPublishTables();

  // 1. 检查是否已绑定
  const existingBinding = await sql<WebsiteSiteBinding>`
    SELECT * FROM website_site_bindings 
    WHERE website_id = ${websiteId} AND content_type = ${contentType}
  `;

  if (existingBinding.rows.length > 0) {
    const binding = existingBinding.rows[0];
    const siteResult = await sql<any>`
      SELECT 
        s.*,
        row_to_json(g.*) as github_token,
        CASE WHEN p.id IS NOT NULL THEN row_to_json(p.*) ELSE NULL END as platform_token
      FROM platform_sites s
      JOIN github_tokens g ON s.github_token_id = g.id
      LEFT JOIN platform_tokens p ON s.platform_token_id = p.id
      WHERE s.id = ${binding.site_id}
    `;
    if (siteResult.rows[0]) {
      return {
        site: siteResult.rows[0],
        github_token: siteResult.rows[0].github_token,
        platform_token: siteResult.rows[0].platform_token,
        isNew: false
      };
    }
  }

  // 2. 根据内容类型确定可用的平台
  const platforms = contentType === 'informational'
    ? ['rtd', 'cf_pages']
    : ['netlify', 'vercel', 'cf_pages'];

  // 3. 查找使用次数最少的可用站点（已存在的站点优先）
  const availableSite = await sql<any>`
    SELECT 
      s.*,
      row_to_json(g.*) as github_token,
      CASE WHEN p.id IS NOT NULL THEN row_to_json(p.*) ELSE NULL END as platform_token
    FROM platform_sites s
    JOIN github_tokens g ON s.github_token_id = g.id
    LEFT JOIN platform_tokens p ON s.platform_token_id = p.id
    WHERE g.status = 'active'
      AND s.status IN ('active', 'pending')
      AND s.content_type = ${contentType}
      AND s.platform = ANY(${platforms}::text[])
    ORDER BY s.usage_count ASC, s.created_at ASC
    LIMIT 1
  `;

  if (availableSite.rows.length === 0) {
    console.log(`[assignSiteToWebsite] No available site for content_type: ${contentType}, will need to create one`);
    return null;
  }

  const site = availableSite.rows[0];

  // 4. 创建绑定关系
  await sql`
    INSERT INTO website_site_bindings (website_id, content_type, site_id)
    VALUES (${websiteId}, ${contentType}, ${site.id})
    ON CONFLICT (website_id, content_type) DO NOTHING
  `;

  return {
    site: site,
    github_token: site.github_token,
    platform_token: site.platform_token,
    isNew: false
  };
}

/**
 * 获取可用的 GitHub Token 和平台 Token 用于创建新站点
 * 
 * ⚠️ 重要：确保 GitHub Token 和 Platform Token 属于同一个管理员账号
 * 因为 Netlify/Vercel/CF Pages 需要授权访问 GitHub 仓库
 */
export async function getAvailableTokensForNewSite(
  contentType: 'informational' | 'commercial'
): Promise<{
  github_token: GitHubToken;
  platform_token: PlatformToken | null;
  platform: PlatformSite['platform'];
} | null> {
  await initPSEOPublishTables();

  const platforms = contentType === 'informational'
    ? ['rtd', 'cf_pages']
    : ['netlify', 'vercel', 'cf_pages']; // 商业型优先 Netlify/Vercel，备选 CF Pages

  // ⚠️ 关键修复：需要添加 owner_email 字段来关联同一个管理员的 Token
  // 但当前表结构没有 owner_email 字段，所以我们需要通过 owner_name 来匹配
  // 
  // 策略：
  // 1. 先找到所有可用的平台 Token
  // 2. 对于每个平台 Token，查找对应的 GitHub Token（通过 owner_name 匹配）
  // 3. 选择使用次数最少的组合

  console.log(`[getAvailableTokensForNewSite] Finding token pair for ${contentType} content...`);

  // 获取所有可用的平台 Token（按使用次数排序）
  const platformTokensResult = await sql<PlatformToken>`
    SELECT * FROM platform_tokens
    WHERE status = 'active' AND platform = ANY(${platforms}::text[])
    ORDER BY usage_count ASC, created_at ASC
  `;

  if (platformTokensResult.rows.length === 0) {
    console.error(`[getAvailableTokensForNewSite] No platform token available for ${contentType} content`);
    console.error(`[getAvailableTokensForNewSite] Please add RTD, Cloudflare Pages, Netlify, or Vercel tokens in Admin panel`);
    return null;
  }

  // 尝试为每个平台 Token 找到匹配的 GitHub Token
  for (const platformToken of platformTokensResult.rows) {
    // 从平台 Token 的 metadata 中获取关联的 GitHub owner
    // 如果没有 metadata，则使用使用次数最少的 GitHub Token（向后兼容）
    let githubOwner: string | null = null;
    
    if (platformToken.metadata && typeof platformToken.metadata === 'object') {
      githubOwner = (platformToken.metadata as any).githubOwner || null;
    }

    let githubTokenResult;
    
    if (githubOwner) {
      // 精确匹配：查找同一个 owner 的 GitHub Token
      console.log(`[getAvailableTokensForNewSite] Looking for GitHub token with owner: ${githubOwner}`);
      githubTokenResult = await sql<GitHubToken>`
        SELECT * FROM github_tokens 
        WHERE status = 'active' AND owner_name = ${githubOwner}
        ORDER BY usage_count ASC, created_at ASC
        LIMIT 1
      `;
    } else {
      // 向后兼容：如果平台 Token 没有指定 githubOwner，使用使用次数最少的 GitHub Token
      console.warn(`[getAvailableTokensForNewSite] Platform token ${platformToken.name} has no githubOwner in metadata, using least-used GitHub token`);
      githubTokenResult = await sql<GitHubToken>`
        SELECT * FROM github_tokens 
        WHERE status = 'active'
        ORDER BY usage_count ASC, created_at ASC
        LIMIT 1
      `;
    }

    if (githubTokenResult.rows.length > 0) {
      console.log(`[getAvailableTokensForNewSite] ✅ Found token pair:`);
      console.log(`[getAvailableTokensForNewSite]   - GitHub: ${githubTokenResult.rows[0].name} (${githubTokenResult.rows[0].owner_name})`);
      console.log(`[getAvailableTokensForNewSite]   - Platform: ${platformToken.name} (${platformToken.platform})`);
      
      return {
        github_token: githubTokenResult.rows[0],
        platform_token: platformToken,
        platform: platformToken.platform as PlatformSite['platform']
      };
    }
  }

  // 如果没有找到匹配的 Token 对
  console.error('[getAvailableTokensForNewSite] ❌ No matching GitHub token found for any platform token');
  console.error('[getAvailableTokensForNewSite] Please ensure platform tokens have githubOwner in metadata, or add more GitHub tokens');
  return null;
}

/**
 * 解密 Token
 */
export function decryptToken(encryptedToken: string): string {
  return Buffer.from(encryptedToken, 'base64').toString('utf-8');
}

/**
 * 获取发布统计信息
 */
export async function getPSEOPublishStats(): Promise<{
  totalGitHubTokens: number;
  activeGitHubTokens: number;
  totalPlatformTokens: number;
  activePlatformTokens: number;
  totalSites: number;
  activeSites: number;
  pendingSites: number;
  totalBindings: number;
  platformBreakdown: { platform: string; count: number }[];
  contentTypeBreakdown: { content_type: string; count: number }[];
}> {
  await initPSEOPublishTables();

  const [githubTokens, platformTokens, sites, bindings, platformBreakdown, contentBreakdown] = await Promise.all([
    sql<{ total: string; active: string }>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active
      FROM github_tokens
    `,
    sql<{ total: string; active: string }>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active
      FROM platform_tokens
    `,
    sql<{ total: string; active: string; pending: string }>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM platform_sites
    `,
    sql<{ total: string }>`SELECT COUNT(*) as total FROM website_site_bindings`,
    sql<{ platform: string; count: string }>`
      SELECT platform, COUNT(*) as count
      FROM platform_sites
      GROUP BY platform
    `,
    sql<{ content_type: string; count: string }>`
      SELECT content_type, COUNT(*) as count
      FROM platform_sites
      GROUP BY content_type
    `
  ]);

  return {
    totalGitHubTokens: parseInt(githubTokens.rows[0]?.total || '0'),
    activeGitHubTokens: parseInt(githubTokens.rows[0]?.active || '0'),
    totalPlatformTokens: parseInt(platformTokens.rows[0]?.total || '0'),
    activePlatformTokens: parseInt(platformTokens.rows[0]?.active || '0'),
    totalSites: parseInt(sites.rows[0]?.total || '0'),
    activeSites: parseInt(sites.rows[0]?.active || '0'),
    pendingSites: parseInt(sites.rows[0]?.pending || '0'),
    totalBindings: parseInt(bindings.rows[0]?.total || '0'),
    platformBreakdown: platformBreakdown.rows.map(r => ({
      platform: r.platform,
      count: parseInt(r.count)
    })),
    contentTypeBreakdown: contentBreakdown.rows.map(r => ({
      content_type: r.content_type,
      count: parseInt(r.count)
    }))
  };
}
