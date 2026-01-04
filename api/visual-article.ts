
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateVisualArticle } from './_shared/services/visual-article-service.js';
import { parseRequestBody, setCorsHeaders, handleOptions } from './_shared/request-handler.js';
import { scrapeWebsite } from './_shared/tools/firecrawl.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseRequestBody(req);
  const { keyword, tone, visualStyle, targetAudience, targetMarket, uiLanguage, targetLanguage, reference } = body;

  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword' });
  }

  // 检测关键词的语言（中文或英文）
  const detectKeywordLanguage = (keyword: string): 'zh' | 'en' => {
    // 检测中文字符
    const chineseCharCount = (keyword.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 检测英文单词
    const englishWordCount = (keyword.match(/[a-zA-Z]+/g) || []).length;
    
    // 如果中文字符数量大于英文单词数量的30%，则认为是中文
    // 否则默认为英文
    return chineseCharCount > englishWordCount * 0.3 ? 'zh' : 'en';
  };

  // 根据目标市场自动设置输出语言（如果未提供）
  const getTargetLanguageFromMarket = (market: string, keyword?: string): string => {
    // 如果设置了目标市场且不是global，优先使用目标市场对应的语言
    if (market && market !== 'global') {
      const marketToLanguage: Record<string, string> = {
        'us': 'en',
        'uk': 'en',
        'ca': 'en',
        'au': 'en',
        'de': 'de',
        'fr': 'fr',
        'jp': 'ja',
        'cn': 'zh',
      };
      
      if (marketToLanguage[market]) {
        return marketToLanguage[market];
      }
    }
    
    // 如果没有设置目标市场或目标市场是global，则根据关键词语言推断
    if (keyword) {
      const detectedLang = detectKeywordLanguage(keyword);
      return detectedLang === 'zh' ? 'zh' : 'en';
    }
    
    // 默认返回英文
    return 'en';
  };

  // 确定最终的目标语言：
  // 1. 如果明确提供了 targetLanguage，使用它
  // 2. 否则根据目标市场和关键词推断
  const finalTargetLanguage = targetLanguage || getTargetLanguageFromMarket(targetMarket || 'global', keyword);

  // Process reference if provided
  let processedReference = reference;
  if (reference?.type === 'url' && reference.url?.url) {
    try {
      console.log('[visual-article] Processing reference URL:', reference.url.url);
      // Scrape URL with screenshot
      const scrapeResult = await scrapeWebsite(reference.url.url, true);
      
      processedReference = {
        type: 'url',
        url: {
          url: reference.url.url,
          content: scrapeResult.markdown || '',
          screenshot: scrapeResult.screenshot || undefined,
          title: scrapeResult.title || undefined,
        },
      };
      console.log('[visual-article] URL scraped successfully, content length:', scrapeResult.markdown?.length || 0);
    } catch (error: any) {
      console.error('[visual-article] Failed to scrape reference URL:', error);
      // Continue without reference if scraping fails
      processedReference = undefined;
    }
  }

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
      reference: processedReference,
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
