
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateVisualArticle } from './_shared/services/visual-article-service.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { scrapeWebsite, cleanMarkdown } from './_shared/tools/firecrawl.js';

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
      relatedEntity: 'seo_agent_visual_article',
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

    let body: any;
    try {
      body = parseRequestBody(req);
    } catch (error: any) {
      console.error('[visual-article] Failed to parse request body:', error);
      return res.status(400).json({ error: 'Invalid request body', details: error.message });
    }

    const { 
      keyword, 
      tone, 
      visualStyle, 
      targetAudience, 
      targetMarket, 
      uiLanguage, 
      targetLanguage, 
      reference, 
      promotedWebsites,
      promotionIntensity,
      userId, 
      projectId, 
      projectName,
      skipCreditsCheck = false
    } = body;

    // Validate keyword
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
      return res.status(400).json({ error: 'Missing or invalid keyword' });
    }

    // Check credits balance (fixed 100 credits for article generation)
    if (!skipCreditsCheck) {
      try {
        const credits = await checkCreditsBalance(token);
        const requiredCredits = 100;

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
        // Continue but log warning
      }
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
              content: cleanMarkdown(scrapeResult.markdown || '', 20000), // 为文章生成保留更多内容
              screenshot: scrapeResult.screenshot || undefined,
              title: scrapeResult.title || undefined,
            },
          };
          console.log('[visual-article] URL scraped and cleaned successfully, content length:', processedReference.url.content.length);
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
        promotedWebsites: (Array.isArray(promotedWebsites)) ? promotedWebsites : undefined,
        promotionIntensity: (promotionIntensity === 'strong' ? 'strong' : 'natural') as 'natural' | 'strong',
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

      // Consume credits after successful generation
      if (!skipCreditsCheck && token) {
        try {
          await consumeCredits(
            token,
            'article_generator',
            `Visual Article - "${keywordString}" (${finalTargetLanguage.toUpperCase()})`,
            100
          );
        } catch (creditsError: any) {
          console.error('Failed to consume credits for visual article:', creditsError);
        }
      }

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
