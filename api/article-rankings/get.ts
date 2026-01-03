// Get article rankings data
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { initWebsiteDataTables, sql } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    await initWebsiteDataTables();

    const { websiteId, userId, websiteUrl } = parseRequestBody(req);

    if (!websiteId && !websiteUrl) {
      return sendErrorResponse(res, null, 'websiteId or websiteUrl is required', 400);
    }

    // Get website ID
    let website;
    if (websiteId) {
      const result = userId
        ? await sql`
            SELECT id FROM user_websites 
            WHERE id = ${websiteId} AND user_id = ${userId}
          `
        : await sql`
            SELECT id FROM user_websites 
            WHERE id = ${websiteId}
          `;
      if (result.rows.length === 0) {
        return sendErrorResponse(res, null, 'Website not found', 404);
      }
      website = result.rows[0];
    } else if (websiteUrl) {
      const result = userId
        ? await sql`
            SELECT id FROM user_websites 
            WHERE website_url = ${websiteUrl} AND user_id = ${userId}
          `
        : await sql`
            SELECT id FROM user_websites 
            WHERE website_url = ${websiteUrl}
          `;
      if (result.rows.length === 0) {
        return sendErrorResponse(res, null, 'Website not found', 404);
      }
      website = result.rows[0];
    }

    // Get rankings with keyword info
    const rankingsResult = await sql`
      SELECT 
        ar.*,
        wk.keyword,
        wk.translation,
        wk.seranking_volume,
        wk.seranking_difficulty
      FROM article_rankings ar
      JOIN website_keywords wk ON ar.keyword_id = wk.id
      WHERE ar.website_id = ${website.id}
        AND ar.is_tracking = true
      ORDER BY ar.current_position ASC NULLS LAST, wk.keyword ASC
    `;

    // Calculate overview statistics
    const rankings = rankingsResult.rows;
    const totalKeywords = rankings.length;
    const rankedKeywords = rankings.filter((r: any) => r.current_position && r.current_position <= 100).length;
    const top10Keywords = rankings.filter((r: any) => r.current_position && r.current_position <= 10).length;
    const top3Keywords = rankings.filter((r: any) => r.current_position && r.current_position <= 3).length;

    // Calculate average position
    const positions = rankings
      .map((r: any) => r.current_position)
      .filter((p: any) => p !== null && p <= 100);
    const avgPosition = positions.length > 0
      ? positions.reduce((sum: number, p: number) => sum + p, 0) / positions.length
      : null;

    // Calculate position changes
    const improved = rankings.filter((r: any) => r.position_change && r.position_change > 0).length;
    const declined = rankings.filter((r: any) => r.position_change && r.position_change < 0).length;
    const stable = rankings.filter((r: any) => r.position_change === 0 || r.position_change === null).length;

    // Format rankings for frontend
    const formattedRankings = rankings.map((r: any) => ({
      id: r.id,
      keyword: r.keyword,
      translation: r.translation,
      currentPosition: r.current_position,
      previousPosition: r.previous_position,
      positionChange: r.position_change,
      searchEngine: r.search_engine,
      searchLocation: r.search_location,
      searchDevice: r.search_device,
      rankingHistory: r.ranking_history,
      volume: r.seranking_volume,
      difficulty: r.seranking_difficulty,
      lastTrackedAt: r.last_tracked_at,
    }));

    return res.json({
      success: true,
      data: {
        overview: {
          totalKeywords,
          rankedKeywords,
          top10Keywords,
          top3Keywords,
          avgPosition: avgPosition ? Math.round(avgPosition * 10) / 10 : null,
          improved,
          declined,
          stable,
        },
        rankings: formattedRankings,
      },
    });
  } catch (error: any) {
    console.error('[Get Article Rankings] Error:', error);
    return sendErrorResponse(res, error, 'Failed to get article rankings', 500);
  }
}

