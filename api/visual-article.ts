
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateVisualArticle } from './_shared/services/visual-article-service.js';
import { parseRequestBody, setCorsHeaders, handleOptions } from './_shared/request-handler.js';
import { scrapeWebsite } from './_shared/tools/firecrawl.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let body: any;
    try {
      body = parseRequestBody(req);
    } catch (error: any) {
      console.error('[visual-article] Failed to parse request body:', error);
      return res.status(400).json({ error: 'Invalid request body', details: error.message });
    }

    const { keyword, tone, visualStyle, targetAudience, targetMarket, uiLanguage, targetLanguage, reference, userId, projectId, projectName } = body;

    // Validate keyword
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
      return res.status(400).json({ error: 'Missing or invalid keyword' });
    }

    const keywordString = keyword.trim();

    // 检测关键词的语言（中文或英文）
    const detectKeywordLanguage = (keyword: string): 'zh' | 'en' => {
      try {
        // 检测中文字符
        const chineseCharCount = (keyword.match(/[\u4e00-\u9fa5]/g) || []).length;
        // 检测英文单词
        const englishWordCount = (keyword.match(/[a-zA-Z]+/g) || []).length;

        // 如果中文字符数量大于英文单词数量的30%，则认为是中文
        // 否则默认为英文
        return chineseCharCount > englishWordCount * 0.3 ? 'zh' : 'en';
      } catch (e) {
        return 'en'; // 默认返回英文
      }
    };

    // 根据目标市场自动设置输出语言（如果未提供）
    const getTargetLanguageFromMarket = (market: string | undefined, keyword?: string): string => {
      try {
        // 如果设置了目标市场且不是global，优先使用目标市场对应的语言
        if (market && typeof market === 'string' && market !== 'global') {
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
        if (keyword && typeof keyword === 'string') {
          const detectedLang = detectKeywordLanguage(keyword);
          return detectedLang === 'zh' ? 'zh' : 'en';
        }

        // 默认返回英文
        return 'en';
      } catch (e) {
        return 'en'; // 默认返回英文
      }
    };

    // 确定最终的目标语言：
    // 1. 如果明确提供了 targetLanguage，使用它
    // 2. 否则根据目标市场和关键词推断
    const finalTargetLanguage = (targetLanguage && typeof targetLanguage === 'string')
      ? targetLanguage
      : getTargetLanguageFromMarket(targetMarket, keywordString);

    // Process reference if provided
    let processedReference = reference;
    if (reference?.type === 'url' && reference.url?.url && typeof reference.url.url === 'string' && reference.url.url.trim()) {
      try {
        const urlToScrape = reference.url.url.trim();
        console.log('[visual-article] Processing reference URL:', urlToScrape);

        // Validate URL format
        try {
          new URL(urlToScrape);
        } catch (urlError) {
          console.warn('[visual-article] Invalid URL format, skipping scrape:', urlToScrape);
          processedReference = undefined;
        }

        if (processedReference) {
          // Scrape URL with screenshot
          const scrapeResult = await scrapeWebsite(urlToScrape, true);

          processedReference = {
            type: 'url',
            url: {
              url: urlToScrape,
              content: scrapeResult.markdown || '',
              screenshot: scrapeResult.screenshot || undefined,
              title: scrapeResult.title || undefined,
            },
          };
          console.log('[visual-article] URL scraped successfully, content length:', scrapeResult.markdown?.length || 0);
        }
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
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (writeError) {
        console.error('[visual-article] Failed to write event:', writeError);
      }
    };

    try {
      const finalArticle = await generateVisualArticle({
        keyword: keywordString,
        tone: (tone && typeof tone === 'string') ? tone : 'professional',
        visualStyle: (visualStyle && typeof visualStyle === 'string') ? visualStyle : 'realistic',
        targetAudience: (targetAudience === 'expert' ? 'expert' : 'beginner') as 'beginner' | 'expert',
        targetMarket: (targetMarket && typeof targetMarket === 'string') ? targetMarket : 'global',
        uiLanguage: (uiLanguage === 'zh' ? 'zh' : 'en') as 'zh' | 'en',
        targetLanguage: finalTargetLanguage as any,
        userId: userId ? (typeof userId === 'number' ? userId : parseInt(userId.toString(), 10)) : undefined,
        projectId: (projectId && typeof projectId === 'string') ? projectId : undefined,
        projectName: (projectName && typeof projectName === 'string') ? projectName : undefined,
        reference: processedReference,
        onEvent: (event) => {
          sendEvent({ type: 'event', data: event });
        }
      });

      sendEvent({
        type: 'done',
        data: {
          ...finalArticle,
          draftId: (finalArticle as any).draftId,
          projectId: (finalArticle as any).projectId
        }
      });
      res.end();
    } catch (error: any) {
      console.error('[visual-article] Visual Article Error:', error);
      console.error('[visual-article] Error stack:', error?.stack);
      try {
        sendEvent({
          type: 'error',
          message: error?.message || 'Unknown error occurred',
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
        res.end();
      } catch (sendError) {
        console.error('[visual-article] Failed to send error event:', sendError);
        // If we can't send error event, try to send a simple error response
        try {
          res.status(500).json({ error: error?.message || 'Internal server error' });
        } catch (finalError) {
          console.error('[visual-article] Failed to send error response:', finalError);
        }
      }
    }
  } catch (error: any) {
    // Catch any errors that occur before setting up the stream
    console.error('[visual-article] Handler Error:', error);
    console.error('[visual-article] Error stack:', error?.stack);
    try {
      res.status(500).json({
        error: error?.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    } catch (responseError) {
      console.error('[visual-article] Failed to send error response:', responseError);
    }
  }
}
