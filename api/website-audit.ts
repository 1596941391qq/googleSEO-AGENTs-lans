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

