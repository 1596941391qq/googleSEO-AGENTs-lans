import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/database.js';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { authenticateRequest } from '../_shared/auth.js';

/**
 * POST /api/keywords/manage
 * 管理关键词：添加、更新、删除、收藏
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;

    const { action, keyword, keywords: keywordsList } = req.body;

    // 批量添加关键词
    if (action === 'add_batch' && keywordsList && Array.isArray(keywordsList)) {
      const results = [];
      
      for (const kw of keywordsList) {
        try {
          const result = await sql`
            INSERT INTO keywords (
              user_id, project_id, website_id, keyword, translation, intent,
              volume, difficulty, cpc, probability, reasoning, 
              top_domain_type, top_serp_snippets, source, status
            ) VALUES (
              ${userId},
              ${kw.project_id || null},
              ${kw.website_id || null},
              ${kw.keyword},
              ${kw.translation || null},
              ${kw.intent || 'Informational'},
              ${kw.volume || null},
              ${kw.difficulty || null},
              ${kw.cpc || null},
              ${kw.probability || 'Medium'},
              ${kw.reasoning || null},
              ${kw.top_domain_type || null},
              ${kw.top_serp_snippets ? JSON.stringify(kw.top_serp_snippets) : null},
              ${kw.source || 'manual'},
              ${kw.status || 'pending'}
            )
            ON CONFLICT (user_id, keyword) 
            DO UPDATE SET
              volume = EXCLUDED.volume,
              difficulty = EXCLUDED.difficulty,
              cpc = EXCLUDED.cpc,
              probability = EXCLUDED.probability,
              reasoning = EXCLUDED.reasoning,
              top_domain_type = EXCLUDED.top_domain_type,
              top_serp_snippets = EXCLUDED.top_serp_snippets,
              updated_at = NOW()
            RETURNING id
          `;
          results.push({ keyword: kw.keyword, success: true, id: result.rows[0].id });
        } catch (error: any) {
          results.push({ keyword: kw.keyword, success: false, error: error.message });
        }
      }

      return res.json({
        success: true,
        data: { results }
      });
    }

    // 单个关键词操作
    if (!keyword || !keyword.id) {
      return sendErrorResponse(res, null, 'keyword.id is required', 400);
    }

    // 更新收藏状态
    if (action === 'toggle_favorite') {
      await sql`
        UPDATE keywords
        SET is_favorited = NOT is_favorited, updated_at = NOW()
        WHERE id = ${keyword.id} AND user_id = ${userId}
      `;

      return res.json({
        success: true,
        message: 'Favorite status updated'
      });
    }

    // 更新关键词
    if (action === 'update') {
      await sql`
        UPDATE keywords
        SET
          keyword = ${keyword.keyword || sql`keyword`},
          translation = ${keyword.translation !== undefined ? keyword.translation : sql`translation`},
          intent = ${keyword.intent || sql`intent`},
          volume = ${keyword.volume !== undefined ? keyword.volume : sql`volume`},
          difficulty = ${keyword.difficulty !== undefined ? keyword.difficulty : sql`difficulty`},
          cpc = ${keyword.cpc !== undefined ? keyword.cpc : sql`cpc`},
          probability = ${keyword.probability || sql`probability`},
          status = ${keyword.status || sql`status`},
          updated_at = NOW()
        WHERE id = ${keyword.id} AND user_id = ${userId}
      `;

      return res.json({
        success: true,
        message: 'Keyword updated'
      });
    }

    // 删除关键词
    if (action === 'delete') {
      await sql`
        DELETE FROM keywords
        WHERE id = ${keyword.id} AND user_id = ${userId}
      `;

      return res.json({
        success: true,
        message: 'Keyword deleted'
      });
    }

    // 批量删除
    if (action === 'delete_batch' && keywordsList && Array.isArray(keywordsList)) {
      const ids = keywordsList.map(k => k.id).filter(Boolean);
      
      await sql`
        DELETE FROM keywords
        WHERE id = ANY(${ids}) AND user_id = ${userId}
      `;

      return res.json({
        success: true,
        message: `${ids.length} keywords deleted`
      });
    }

    return sendErrorResponse(res, null, 'Invalid action', 400);

  } catch (error: any) {
    console.error('[Keywords Manage] Error:', error);
    return sendErrorResponse(res, error, 'Failed to manage keywords', 500);
  }
}

