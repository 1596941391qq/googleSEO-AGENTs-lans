
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateVisualArticle } from './_shared/services/visual-article-service.js';
import { parseRequestBody, setCorsHeaders, handleOptions } from './_shared/request-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseRequestBody(req);
  const { keyword, tone, visualStyle, targetAudience, targetMarket, uiLanguage, targetLanguage } = body;

  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword' });
  }

  // 根据目标市场自动设置输出语言（如果未提供）
  const getTargetLanguageFromMarket = (market: string): string => {
    const marketToLanguage: Record<string, string> = {
      'global': 'en',
      'us': 'en',
      'uk': 'en',
      'ca': 'en',
      'au': 'en',
      'de': 'de',
      'fr': 'fr',
      'jp': 'ja',
      'cn': 'zh',
    };
    return marketToLanguage[market] || 'en';
  };

  const finalTargetLanguage = targetLanguage || (targetMarket ? getTargetLanguageFromMarket(targetMarket) : 'en');

  // Set up Server-Sent Events or multi-part like response for streaming
  // For simplicity but effectiveness, we'll use a custom newline-delimited JSON stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const finalArticle = await generateVisualArticle({
      keyword,
      tone: tone || 'professional',
      visualStyle: visualStyle || 'realistic',
      targetAudience: targetAudience || 'beginner',
      targetMarket: targetMarket || 'global',
      uiLanguage: uiLanguage || 'en',
      targetLanguage: finalTargetLanguage,
      onEvent: (event) => {
        sendEvent({ type: 'event', data: event });
      }
    });

    sendEvent({ type: 'done', data: finalArticle });
    res.end();
  } catch (error: any) {
    console.error('Visual Article Error:', error);
    sendEvent({ type: 'error', message: error.message });
    res.end();
  }
}
