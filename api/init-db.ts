import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initPSEOPublishTables } from './lib/database.js';

/**
 * 数据库初始化 API
 *
 * 用于创建或更新数据库表结构，特别是添加新的唯一索引
 *
 * GET /api/init-db
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Init DB] Starting database initialization...');

    await initPSEOPublishTables();

    console.log('[Init DB] ✅ Database initialized successfully');

    return res.status(200).json({
      success: true,
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Init DB] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize database',
      details: error.stack
    });
  }
}
