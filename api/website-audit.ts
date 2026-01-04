/**
 * API: 存量拓新 - 分析现有网站，发现未被利用的流量空间
 * 
 * 端点: /api/website-audit
 * 方法: POST
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { auditWebsiteForKeywords } from './_shared/agents/agent-1-website-audit.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseRequestBody(req);
    const {
      websiteId,
      websiteUrl,
      websiteDomain,
      targetLanguage = 'en',
      uiLanguage = 'en',
      industry,
      wordsPerRound = 10,
      miningStrategy = 'horizontal',
      additionalSuggestions,
    } = body;

    if (!websiteId || !websiteUrl || !websiteDomain) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        requiredFields: ['websiteId', 'websiteUrl', 'websiteDomain']
      });
    }

    console.log(`[Website Audit API] Starting audit for website: ${websiteUrl}`);

    const result = await auditWebsiteForKeywords({
      websiteId,
      websiteUrl,
      websiteDomain,
      targetLanguage,
      uiLanguage,
      industry,
      wordsPerRound,
      miningStrategy,
      additionalSuggestions,
    });

    return res.json({
      success: true,
      keywords: result.keywords,
      rawResponse: result.rawResponse,
      analysis: result.analysis,
    });
  } catch (error: any) {
    console.error('[Website Audit API] Error:', error);
    return sendErrorResponse(res, error, 'Failed to audit website');
  }
}

