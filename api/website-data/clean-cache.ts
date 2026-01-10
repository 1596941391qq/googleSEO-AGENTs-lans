/**
 * API: 清理关键词缓存中的乱码数据
 * 
 * 功能：
 * - 清理 domain_keywords_cache 和 ranked_keywords_cache 中的乱码关键词
 * - 移除带数字前缀的关键词（如 "001-xxx-3342555957", "051 keyword" 等）
 * - 移除纯数字关键词（如 "050", "069"）
 * 
 * 方法: POST
 * 端点: /api/website-data/clean-cache
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

interface CleanCacheRequestBody {
  websiteId: string;
  userId?: string | number; // 向后兼容，但优先使用 JWT 认证
}

// 清理关键词函数（与 dataforseo-domain.ts 中的逻辑一致）
function cleanKeyword(rawKeyword: string): string {
  if (!rawKeyword) return '';
  let cleaned = rawKeyword.trim();
  // 1. 移除类似 "001-qk7yulqsx9esalil5mxjkg-3342555957" 的完整ID格式
  cleaned = cleaned.replace(/^\d{1,3}-[a-z0-9-]+-\d+(\s+|$)/i, '');
  // 2. 移除开头的数字编号（如 "051 "、"0 "、"09 "）
  cleaned = cleaned.replace(/^\d{1,3}\s+(?=[a-zA-Z\u4e00-\u9fa5])/, '');
  // 3. 移除纯数字开头的项
  cleaned = cleaned.replace(/^\d+\s+/, '');
  // 4. 如果清理后只剩下纯数字，返回空字符串
  if (/^\d+$/.test(cleaned)) {
    return '';
  }
  // 5. 移除末尾的数字后缀
  cleaned = cleaned.replace(/\s+\d{1,3}$/, '');
  return cleaned.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 权限校验 - 使用 JWT token 认证
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authResult.userId;

    const body = req.body as CleanCacheRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    await initWebsiteDataTables();

    // 验证权限
    const websiteResult = await sql`
      SELECT user_id FROM user_websites WHERE id = ${body.websiteId}
    `;

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    if (String(websiteResult.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Website does not belong to user' });
    }

    // 获取所有需要清理的关键词
    const domainKeywordsResult = await sql`
      SELECT keyword FROM domain_keywords_cache
      WHERE website_id = ${body.websiteId}
    `;

    const rankedKeywordsResult = await sql`
      SELECT keyword FROM ranked_keywords_cache
      WHERE website_id = ${body.websiteId}
    `;

    let cleanedCount = 0;
    let deletedCount = 0;

    // 清理 domain_keywords_cache
    for (const row of domainKeywordsResult.rows) {
      const originalKeyword = row.keyword;
      const cleanedKeyword = cleanKeyword(originalKeyword);

      if (cleanedKeyword !== originalKeyword) {
        if (cleanedKeyword && cleanedKeyword.length > 0 && !/^\d+$/.test(cleanedKeyword)) {
          // 更新为清理后的关键词
          await sql`
            UPDATE domain_keywords_cache
            SET keyword = ${cleanedKeyword}
            WHERE website_id = ${body.websiteId} AND keyword = ${originalKeyword}
          `;
          cleanedCount++;
        } else {
          // 如果清理后为空或纯数字，删除该记录
          await sql`
            DELETE FROM domain_keywords_cache
            WHERE website_id = ${body.websiteId} AND keyword = ${originalKeyword}
          `;
          deletedCount++;
        }
      }
    }

    // 清理 ranked_keywords_cache
    for (const row of rankedKeywordsResult.rows) {
      const originalKeyword = row.keyword;
      const cleanedKeyword = cleanKeyword(originalKeyword);

      if (cleanedKeyword !== originalKeyword) {
        if (cleanedKeyword && cleanedKeyword.length > 0 && !/^\d+$/.test(cleanedKeyword)) {
          // 检查是否已存在清理后的关键词（避免重复）
          const existing = await sql`
            SELECT 1 FROM ranked_keywords_cache
            WHERE website_id = ${body.websiteId} AND keyword = ${cleanedKeyword}
          `;

          if (existing.rows.length === 0) {
            // 更新为清理后的关键词
            await sql`
              UPDATE ranked_keywords_cache
              SET keyword = ${cleanedKeyword}
              WHERE website_id = ${body.websiteId} AND keyword = ${originalKeyword}
            `;
            cleanedCount++;
          } else {
            // 如果已存在，删除旧记录
            await sql`
              DELETE FROM ranked_keywords_cache
              WHERE website_id = ${body.websiteId} AND keyword = ${originalKeyword}
            `;
            deletedCount++;
          }
        } else {
          // 如果清理后为空或纯数字，删除该记录
          await sql`
            DELETE FROM ranked_keywords_cache
            WHERE website_id = ${body.websiteId} AND keyword = ${originalKeyword}
          `;
          deletedCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Cache cleaned successfully',
      stats: {
        cleaned: cleanedCount,
        deleted: deletedCount,
        total: cleanedCount + deletedCount,
      },
    });

  } catch (error: any) {
    console.error('[API: website-data/clean-cache] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clean cache',
      details: error.message
    });
  }
}
