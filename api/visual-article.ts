
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateVisualArticle, ProcessedPromotedWebsite } from './_shared/services/visual-article-service.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { scrapeWebsite, cleanMarkdown } from './_shared/tools/firecrawl.js';
import { getWebsiteContentCache, saveWebsiteContentCache } from './lib/database.js';

// Main app URL for credits API
const MAIN_APP_URL = process.env.MAIN_APP_URL || process.env.VITE_MAIN_APP_URL || 'https://niche-mining-web.vercel.app';

// Check if running in local development mode
const IS_LOCAL_DEV = process.env.NODE_ENV === 'development' ||
  process.env.ENABLE_DEV_AUTO_LOGIN === 'true' ||
  MAIN_APP_URL.includes('localhost');

/**
 * Check user credits balance
 */
async function checkCreditsBalance(token: string): Promise<{ remaining: number; total: number; used: number }> {
  // Skip credits check in local development mode
  if (IS_LOCAL_DEV) {
    console.log('[visual-article] Skipping credits check in local development mode');
    return {
      remaining: 9999,
      total: 9999,
      used: 0,
    };
  }

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
  // Skip credits consumption in local development mode
  if (IS_LOCAL_DEV) {
    console.log(`[visual-article] Skipping credits consumption in local development mode (would consume ${amount} credits)`);
    return {
      remaining: 9999,
      used: amount,
    };
  }

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
      targetMarket,
      uiLanguage,
      targetLanguage,
      reference,
      promotedWebsites,
      promotionIntensity,
      userId,
      projectId,
      projectName,
      skipCreditsCheck = false,
      websiteId,       // 关联的用户网站 ID（用于获取缓存的网站内容）
      websiteUrl,      // 网站 URL
      skipCompetitorAnalysis,  // 跳过竞对分析
      skipImageGeneration      // 跳过图片生成
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

    // Set up Server-Sent Events early to prevent timeout during scraping
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

    sendEvent({ type: 'event', data: { agentId: 'tracker', type: 'log', message: uiLanguage === 'zh' ? '正在初始化...' : 'Initializing...', timestamp: Date.now() } });

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

    // Process promoted websites - scrape content and take screenshots
    let processedPromotedWebsites: ProcessedPromotedWebsite[] = [];

    // 优先使用缓存的用户网站内容（通过 websiteId）
    if (websiteId && typeof websiteId === 'string' && websiteUrl) {
      console.log(`[visual-article] Checking cached website content for websiteId: ${websiteId}`);
      try {
        const cached = await getWebsiteContentCache(websiteId, 'scraped_content');

        if (cached && cached.content) {
          console.log(`[visual-article] Using cached website content (${cached.content.length} chars)`);

          // 从缓存的 metadata 中提取截图
          let cachedScreenshot: string | undefined;
          if (cached.metadata) {
            const metadata = typeof cached.metadata === 'string' ? JSON.parse(cached.metadata) : cached.metadata;
            cachedScreenshot = metadata.screenshot;
          }

          // 如果缓存中没有截图，尝试重新获取截图（但不重新抓取内容）
          if (!cachedScreenshot) {
            console.log(`[visual-article] Cache has no screenshot, fetching screenshot only...`);
            try {
              const scrapeResult = await scrapeWebsite(websiteUrl, true);
              cachedScreenshot = scrapeResult.screenshot;

              // 更新缓存，添加截图到 metadata
              if (cachedScreenshot) {
                const updatedMetadata = {
                  ...(cached.metadata || {}),
                  screenshot: cachedScreenshot,
                  screenshotUpdatedAt: new Date().toISOString(),
                };
                await saveWebsiteContentCache(
                  websiteId,
                  cached.content,
                  'scraped_content',
                  cached.title || undefined,
                  updatedMetadata,
                  24
                );
                console.log(`[visual-article] Updated cache with screenshot`);
              }
            } catch (screenshotError: any) {
              console.warn(`[visual-article] Failed to fetch screenshot: ${screenshotError.message}`);
            }
          }

          // 使用缓存的网站内容（包含截图）
          processedPromotedWebsites.push({
            url: websiteUrl,
            content: cached.content.substring(0, 10000), // 限制内容长度
            title: cached.title || undefined,
            screenshot: cachedScreenshot,
          });

          console.log(`[visual-article] Website info ready: content=${cached.content.length} chars, hasScreenshot=${!!cachedScreenshot}`);
        } else {
          console.log(`[visual-article] No valid cache found, will scrape website: ${websiteUrl}`);
          // 缓存不存在或已过期，抓取并缓存
          try {
            const scrapeResult = await scrapeWebsite(websiteUrl, true);
            const websiteContent = cleanMarkdown(scrapeResult.markdown || '', 15000);

            // 保存到缓存（包含截图）
            await saveWebsiteContentCache(
              websiteId,
              websiteContent,
              'scraped_content',
              scrapeResult.title,
              {
                images: scrapeResult.images || [],
                screenshot: scrapeResult.screenshot || undefined, // 保存截图到缓存
                scrapedAt: new Date().toISOString(),
                url: websiteUrl
              },
              24 // 24小时有效期
            );

            processedPromotedWebsites.push({
              url: websiteUrl,
              content: websiteContent.substring(0, 10000),
              title: scrapeResult.title || undefined,
              screenshot: scrapeResult.screenshot || undefined,
            });

            console.log(`[visual-article] Scraped and cached website content (${websiteContent.length} chars), hasScreenshot=${!!scrapeResult.screenshot}`);
          } catch (scrapeError: any) {
            console.error(`[visual-article] Failed to scrape website ${websiteUrl}:`, scrapeError.message);
          }
        }
      } catch (cacheError: any) {
        console.error('[visual-article] Error accessing website content cache:', cacheError.message);
      }
    }

    // 处理额外的 promotedWebsites（用户手动添加的推广网站）
    if (Array.isArray(promotedWebsites) && promotedWebsites.length > 0) {
      console.log(`[visual-article] Processing ${promotedWebsites.length} promoted websites for scraping and screenshots`);
      sendEvent({ type: 'event', data: { agentId: 'tracker', type: 'log', message: uiLanguage === 'zh' ? `正在分析 ${promotedWebsites.length} 个推广网站...` : `Analyzing ${promotedWebsites.length} promoted websites...`, timestamp: Date.now() } });

      // Process each promoted website in parallel (with limit)
      const scrapePromises = promotedWebsites.map(async (promWebsiteUrl: string): Promise<ProcessedPromotedWebsite | null> => {
        if (!promWebsiteUrl || typeof promWebsiteUrl !== 'string') return null;

        const urlToScrape = promWebsiteUrl.trim();

        // 如果已经通过 websiteId 处理过相同的 URL，跳过
        if (processedPromotedWebsites.some(p => p.url === urlToScrape)) {
          console.log(`[visual-article] Skipping duplicate URL: ${urlToScrape}`);
          return null;
        }

        // Validate URL format
        try {
          new URL(urlToScrape);
        } catch (urlError) {
          console.warn('[visual-article] Invalid promoted URL format, skipping:', urlToScrape);
          return null;
        }

        try {
          console.log('[visual-article] Scraping promoted website:', urlToScrape);
          const scrapeResult = await scrapeWebsite(urlToScrape, true); // true = include screenshot

          const result: ProcessedPromotedWebsite = {
            url: urlToScrape,
            content: cleanMarkdown(scrapeResult.markdown || '', 10000), // Limit content per site
          };
          if (scrapeResult.screenshot) result.screenshot = scrapeResult.screenshot;
          if (scrapeResult.title) result.title = scrapeResult.title;
          return result;
        } catch (error: any) {
          console.error(`[visual-article] Failed to scrape promoted website ${urlToScrape}:`, error.message);
          // Return partial result with just the URL
          return {
            url: urlToScrape,
            content: '',
          };
        }
      });

      const results = await Promise.all(scrapePromises);
      const additionalWebsites = results.filter((r): r is ProcessedPromotedWebsite => r !== null);
      processedPromotedWebsites = [...processedPromotedWebsites, ...additionalWebsites];

      console.log(`[visual-article] Successfully processed ${processedPromotedWebsites.length} total promoted websites`);
      console.log('[visual-article] Screenshots captured:', processedPromotedWebsites.filter(p => p.screenshot).length);
    }

    // Headers and sendEvent defined earlier


    try {
      const finalArticle = await generateVisualArticle({
        keyword: keywordString,
        tone: (tone && typeof tone === 'string') ? tone : 'professional',
        targetMarket: (targetMarket && typeof targetMarket === 'string') ? targetMarket : 'global',
        uiLanguage: (uiLanguage === 'zh' ? 'zh' : 'en') as 'zh' | 'en',
        targetLanguage: finalTargetLanguage as any,
        userId: userId ? (typeof userId === 'number' ? userId : parseInt(userId.toString(), 10)) : undefined,
        projectId: (projectId && typeof projectId === 'string') ? projectId : undefined,
        projectName: (projectName && typeof projectName === 'string') ? projectName : undefined,
        reference: processedReference,
        promotedWebsites: (Array.isArray(promotedWebsites)) ? promotedWebsites : undefined,
        processedPromotedWebsites: processedPromotedWebsites.length > 0 ? processedPromotedWebsites : undefined,
        promotionIntensity: (promotionIntensity === 'strong' ? 'strong' : 'natural') as 'natural' | 'strong',
        skipCompetitorAnalysis: skipCompetitorAnalysis === true,
        skipImageGeneration: skipImageGeneration === true,
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
      if (!res.headersSent) {
        res.status(500).json({
          error: error?.message || 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
      } else {
        // Headers already sent, try to write error event if possible
        try {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error?.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
          })}\n\n`);
        } catch (e) {
          console.error('[visual-article] Failed to write error event after headers sent', e);
        }
      }
    } catch (responseError) {
      console.error('[visual-article] Failed to send error response:', responseError);
    }
  }
}
