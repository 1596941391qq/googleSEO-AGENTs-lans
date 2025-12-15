import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Starting database initialization...');

    // 1. 创建 users 表 (如果不存在)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created/verified');

    // 2. 创建 sessions 表 (如果不存在)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        token_hash VARCHAR(64) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Sessions table created/verified');

    // 3. 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash
      ON sessions(token_hash)
    `);
    console.log('✓ Index on token_hash created/verified');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions(user_id)
    `);
    console.log('✓ Index on user_id created/verified');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
      ON sessions(expires_at)
    `);
    console.log('✓ Index on expires_at created/verified');

    // 4. 验证表结构
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'sessions')
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('Available tables:', tables);

    // 5. 统计数据
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const sessionsCount = await pool.query('SELECT COUNT(*) as count FROM sessions');

    await pool.end();

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      tables: tables,
      stats: {
        users: parseInt(usersCount.rows[0].count),
        sessions: parseInt(sessionsCount.rows[0].count),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Database initialization error:', error);
    await pool.end();

    return res.status(500).json({
      success: false,
      error: 'Database initialization failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
