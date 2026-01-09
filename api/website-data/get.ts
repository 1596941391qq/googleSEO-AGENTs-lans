// Get website data for Website Data Tab
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { fetchKeywordData } from '../_shared/tools/dataforseo.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;

    await initWebsiteDataTables();

    const { websiteId, websiteUrl } = parseRequestBody(req);

    if (!websiteId && !websiteUrl) {
      return sendErrorResponse(res, null, 'websiteId or websiteUrl is required', 400);
    }

    // Get website data
    let website;
    if (websiteId) {
      const result = await sql`
            SELECT * FROM user_websites 
            WHERE id = ${websiteId} AND user_id = ${userId}
          `;
      if (result.rows.length === 0) {
        return sendErrorResponse(res, null, 'Website not found or access denied', 404);
      }
      website = result.rows[0];
    } else if (websiteUrl) {
      const result = await sql`
            SELECT * FROM user_websites 
            WHERE website_url = ${websiteUrl} AND user_id = ${userId}
          `;
      if (result.rows.length === 0) {
        return sendErrorResponse(res, null, 'Website not found or access denied', 404);
      }
      website = result.rows[0];
    }

    // Get keywords
    const keywordsResult = await sql`
      SELECT * FROM website_keywords
      WHERE website_id = ${website.id}
      ORDER BY created_at DESC
    `;

    // Get DataForSEO data for keywords that don't have it yet
    const keywordsNeedingData = keywordsResult.rows.filter(
      (k: any) => !k.seranking_data_found || !k.seranking_updated_at
    );

    if (keywordsNeedingData.length > 0) {
      try {
        const keywordStrings = keywordsNeedingData.map((k: any) => k.keyword);
        const dataForSEOResults = await fetchKeywordData(keywordStrings, 2840, 'en'); // US location

        // Update keywords with DataForSEO data
        for (const dataForSEOData of dataForSEOResults) {
          if (dataForSEOData.is_data_found) {
            await sql`
              UPDATE website_keywords
              SET
                seranking_volume = ${dataForSEOData.volume || null},
                seranking_cpc = ${dataForSEOData.cpc || null},
                seranking_competition = ${dataForSEOData.competition || null},
                seranking_difficulty = ${dataForSEOData.difficulty || null},
                seranking_history_trend = ${dataForSEOData.history_trend ? JSON.stringify(dataForSEOData.history_trend) : null}::jsonb,
                seranking_data_found = true,
                seranking_updated_at = NOW(),
                updated_at = NOW()
              WHERE website_id = ${website.id} AND keyword = ${dataForSEOData.keyword}
            `;
          }
        }
      } catch (error) {
        console.error('[Get Website Data] DataForSEO API error:', error);
        // Continue without DataForSEO data
      }
    }

    // Get updated keywords
    const updatedKeywordsResult = await sql`
      SELECT * FROM website_keywords
      WHERE website_id = ${website.id}
      ORDER BY ranking_opportunity_score DESC NULLS LAST, created_at DESC
    `;

    // Get pages
    const pagesResult = await sql`
      SELECT * FROM website_pages
      WHERE website_id = ${website.id}
      ORDER BY cluster_priority ASC, created_at ASC
    `;

    // Group pages by topic cluster
    const pagesByCluster: { [key: string]: any[] } = {};
    const pagesWithoutCluster: any[] = [];

    pagesResult.rows.forEach((page: any) => {
      if (page.topic_cluster) {
        if (!pagesByCluster[page.topic_cluster]) {
          pagesByCluster[page.topic_cluster] = [];
        }
        pagesByCluster[page.topic_cluster].push(page);
      } else {
        pagesWithoutCluster.push(page);
      }
    });

    return res.json({
      success: true,
      data: {
        website: {
          id: website.id,
          url: website.website_url,
          domain: website.website_domain,
          title: website.website_title,
          description: website.website_description,
          screenshot: website.website_screenshot,
          rawContent: website.raw_content,
          industry: website.industry,
          monthlyVisits: website.monthly_visits,
          monthlyRevenue: website.monthly_revenue,
          marketingTools: website.marketing_tools,
          boundAt: website.bound_at,
        },
        keywords: updatedKeywordsResult.rows.map((k: any) => ({
          id: k.id,
          keyword: k.keyword,
          translation: k.translation,
          intent: k.intent,
          estimatedVolume: k.estimated_volume,
          serankingData: k.seranking_data_found ? {
            volume: k.seranking_volume,
            cpc: k.seranking_cpc,
            competition: k.seranking_competition,
            difficulty: k.seranking_difficulty,
            historyTrend: k.seranking_history_trend,
          } : null,
          rankingOpportunityScore: k.ranking_opportunity_score,
          opportunityReasoning: k.opportunity_reasoning,
          suggestedOptimization: k.suggested_optimization,
        })),
        pages: {
          byCluster: pagesByCluster,
          withoutCluster: pagesWithoutCluster,
        },
        totalPages: pagesResult.rows.length,
        totalKeywords: updatedKeywordsResult.rows.length,
      },
    });
  } catch (error: any) {
    console.error('[Get Website Data] Error:', error);
    return sendErrorResponse(res, error, 'Failed to get website data', 500);
  }
}

