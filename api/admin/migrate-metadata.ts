import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { verifyAdminToken } from './auth.js';
import { sql } from '../lib/database.js';

/**
 * 数据库迁移：添加 metadata 字段到 platform_tokens 表
 *
 * GET /api/admin/migrate-metadata - 执行迁移
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  const authResult = verifyAdminToken(req);
  if (!authResult.valid) {
    return sendErrorResponse(res, null, authResult.error || 'Unauthorized', 401);
  }

  if (req.method === 'GET') {
    try {
      console.log('[Migrate] Checking if metadata column exists...');

      // 检查 metadata 列是否存在
      const checkResult = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'platform_tokens'
        AND column_name = 'metadata'
      `;

      if (checkResult.rows.length > 0) {
        console.log('[Migrate] metadata column already exists');
        return res.json({
          success: true,
          message: 'metadata column already exists',
          alreadyExists: true
        });
      }

      console.log('[Migrate] Adding metadata column...');

      // 添加 metadata 列
      await sql`
        ALTER TABLE platform_tokens
        ADD COLUMN metadata JSONB
      `;

      console.log('[Migrate] ✅ metadata column added successfully');

      return res.json({
        success: true,
        message: 'metadata column added successfully',
        alreadyExists: false
      });
    } catch (error: any) {
      console.error('[Migrate] Error:', error);
      return sendErrorResponse(res, error, 'Failed to migrate database', 500);
    }
  }

  return sendErrorResponse(res, null, 'Method not allowed', 405);
}
