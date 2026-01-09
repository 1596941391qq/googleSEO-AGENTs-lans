/**
 * API: 存量拓新 - 分析现有网站，发现未被利用的流量空间
 * 
 * 端点: /api/website-audit
 * 方法: POST
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { auditWebsiteForKeywords } from './_shared/agents/agent-1-website-audit.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';

// Main app URL for credits API
const MAIN_APP_URL = process.env.MAIN_APP_URL || process.env.VITE_MAIN_APP_URL || 'https://niche-mining-web.vercel.app';

/**
 * Check user credits balance
 */
async function checkCreditsBalance(token: string): Promise<{ remaining: number; total: number; used: number }> {
  const response = await fetch(`${MAIN_APP_URL}/api/user/dashboard`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch credits' }));
    throw new Error(error.error || 'Failed to fetch credits');
  }

  const data = await response.json();
  return {
    remaining: data.credits?.remaining || 0,
    total: data.credits?.total || 0,
    used: data.credits?.used || 0,
  };
}

/**
 * Consume credits
 */
async function consumeCredits(
  token: string,
  modeId: string,
  description: string,
  amount: number
): Promise<{ remaining: number; used: number }> {
  const response = await fetch(`${MAIN_APP_URL}/api/credits/consume`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credits: amount,
      description,
      relatedEntity: 'seo_agent_website_audit',
      modeId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to consume credits' }));

    if (error.error === 'Insufficient credits') {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    throw new Error(error.error || 'Failed to consume credits');
  }

  const result = await response.json();
  return {
    remaining: result.remaining,
    used: result.used,
  };
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: VercelRequest): string | null {
  const authHeaderRaw = req.headers.authorization || req.headers.Authorization;
  const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;
  
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract and validate token
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization token required for credits consumption'
      });
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
      skipCreditsCheck = false
    } = body;

    if (!websiteId || !websiteUrl || !websiteDomain) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        requiredFields: ['websiteId', 'websiteUrl', 'websiteDomain']
      });
    }

    // Check credits balance (estimated 30 credits for initial audit)
    if (!skipCreditsCheck) {
      try {
        const credits = await checkCreditsBalance(token);
        const requiredCredits = 30;

        if (credits.remaining < requiredCredits) {
          return res.status(402).json({
            error: 'Insufficient credits',
            message: `This operation requires ${requiredCredits} credits, but you only have ${credits.remaining} credits remaining`,
            required: requiredCredits,
            remaining: credits.remaining,
            rechargeUrl: `${MAIN_APP_URL}/console/pricing`
          });
        }
      } catch (creditsError: any) {
        console.error('Credits check error:', creditsError);
      }
    }

    console.log(`[Website Audit API] Starting audit for website: ${websiteUrl}`);

    // Set up Server-Sent Events for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event: any) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
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
        onEvent: (event) => {
          sendEvent({ type: 'event', data: event });
        }
      });

      sendEvent({ 
        type: 'done', 
        data: {
          success: true, // 添加 success 字段
          analysisReport: result.analysisReport,
          keywords: result.keywords, // 添加关键词列表
          rawResponse: result.rawResponse,
          analysis: result.analysis,
        }
      });

      // Consume credits after successful audit
      if (!skipCreditsCheck && token) {
        try {
          const keywordCount = result.keywords.length;
          const creditsAmount = Math.ceil(keywordCount / 10) * 30;
          await consumeCredits(
            token,
            'website_audit',
            `Website Audit - "${websiteUrl}" (${keywordCount} keywords, ${targetLanguage.toUpperCase()})`,
            creditsAmount
          );
        } catch (creditsError: any) {
          console.error('Failed to consume credits for website audit:', creditsError);
        }
      }

      res.end();
    } catch (error: any) {
      console.error('[Website Audit API] Error:', error);
      sendEvent({ type: 'error', message: error?.message || String(error) });
      res.end();
    }
  } catch (error: any) {
    console.error('[Website Audit API] Handler Error:', error);
    
    if (res.headersSent) {
      try {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error?.message || String(error) })}\n\n`);
      } catch {
        // Ignore streaming write errors
      }
      res.end();
      return;
    }

    return sendErrorResponse(res, error, 'Failed to audit website');
  }
}

