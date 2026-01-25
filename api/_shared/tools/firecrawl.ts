/**
 * Firecrawl API 工具
 * 
 * 职责：抓取网站内容和结构
 * 特点：纯数据获取，无AI逻辑
 */

const FIRECRAWL_BASE_URL = process.env.GEMINI_PROXY_URL || 'https://api.302.ai';
const FIRECRAWL_API_KEY = process.env.GEMINI_API_KEY;

if (!FIRECRAWL_API_KEY || FIRECRAWL_API_KEY.trim() === '') {
  console.warn('FIRECRAWL_API_KEY is not configured');
}

export interface ScrapeResult {
  markdown: string;
  images: string[];
  screenshot?: string; // Base64 encoded screenshot
  title?: string; // Page title
}

async function fetchScreenshotAsBase64(
  url: string,
  maxRetries: number = 2
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        headers: {
          // Some storage URLs require a UA to avoid 403
          "User-Agent": "Mozilla/5.0 (compatible; NicheDiggerBot/1.0)",
          "Accept": "image/*,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "image/png";
      if (!contentType.startsWith("image/")) {
        throw new Error(`Unexpected content-type: ${contentType}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch (error: any) {
      clearTimeout(timeoutId);
      const isLastAttempt = attempt >= maxRetries;
      if (isLastAttempt) {
        console.warn(
          `[Firecrawl] Screenshot Base64 conversion failed after ${attempt + 1} attempts: ${error?.message || String(error)}`
        );
        return null;
      }

      const delay = 500 * (attempt + 1);
      console.warn(
        `[Firecrawl] Screenshot fetch failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return null;
}

/**
 * 清理抓取到的 Markdown 内容，移除脏数据并减少 token 消耗
 */
export function cleanMarkdown(markdown: string, maxLength: number = 12000): string {
  if (!markdown) return '';

  let cleaned = markdown;

  // 1. 移除脚本和样式块（Firecrawl 转换 markdown 时有时会留下这些）
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');

  // 2. 移除常见的导航、页脚、侧边栏关键词所在的行
  // 这些通常包含大量的链接，对内容分析干扰大
  const boilerplatePatterns = [
    /nav/i, /footer/i, /sidebar/i, /menu/i, /social/i, /login/i, /signin/i, /signup/i,
    /privacy policy/i, /terms of service/i, /copyright/i, /all rights reserved/i,
    /cookie/i, /newsletter/i, /subscribe/i, /follow us/i, /contact us/i, /about us/i
  ];

  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();

    // 过滤掉太短的行（可能是菜单项或无效字符）
    if (trimmed.length < 5 && !trimmed.startsWith('#')) return false;

    // 过滤掉包含过多链接或特殊字符的行
    const linkCount = (trimmed.match(/\[.*?\]\(.*?\)/g) || []).length;
    if (linkCount > 3 && trimmed.length < 100) return false;

    // 过滤掉明显的样板内容行（仅限长度较短的行，避免误删正文）
    if (trimmed.length < 100 && boilerplatePatterns.some(p => p.test(trimmed))) {
      return false;
    }

    return true;
  });

  cleaned = filteredLines.join('\n');

  // 3. 合并过多的连续换行
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 4. 移除或简化图片标记（通常对 SEO 关键词分析没用，但占 token）
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '[Image]');

  // 5. 限制最大长度
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
    // 确保在完整的行处截断
    const lastNewline = cleaned.lastIndexOf('\n');
    if (lastNewline > maxLength * 0.8) {
      cleaned = cleaned.substring(0, lastNewline);
    }
    cleaned += '\n\n[... Content truncated for length ...]';
  }

  return cleaned.trim();
}

/**
 * Scrape a website and return its content in markdown format
 * @param url - The URL to scrape
 * @param includeScreenshot - Whether to capture a screenshot (default: false)
 * @param maxRetries - Maximum number of retries (default: 2)
 * @returns The scraped content in markdown format
 */
export async function scrapeWebsite(
  url: string, 
  includeScreenshot: boolean = false,
  maxRetries: number = 2
): Promise<ScrapeResult> {
  const formats = ['markdown'];
  if (includeScreenshot) {
    formats.push('screenshot');
  }

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // 重试前增加延迟（首次不延迟）
    if (attempt > 0) {
      const delay = 1500 * attempt; // 1.5s, 3s 递增延迟
      console.log(`[Firecrawl] 重试 ${attempt}/${maxRetries}，延迟 ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 添加 AbortController 超时控制（45秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      console.log(`[Firecrawl] Scraping website: ${url} (screenshot: ${includeScreenshot}, attempt: ${attempt + 1})`);

      const response = await fetch(`${FIRECRAWL_BASE_URL}/firecrawl/v1/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats,
          onlyMainContent: true,
          timeout: 30000,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Firecrawl] API error:', response.status, errorText);
        throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // 只在首次成功时打印详细日志
      if (attempt === 0) {
        console.log('[Firecrawl] Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
      }

      // Handle different response formats
      let markdown = '';
      let images: string[] = [];
      let screenshot: string | undefined;
      let title: string | undefined;

      // Standard Firecrawl format (most common)
      if (data.success && data.data) {
        markdown = data.data.markdown || '';
        images = data.data.images || [];
        screenshot = typeof data.data.screenshot === 'object' ? data.data.screenshot?.url : data.data.screenshot;
        title = data.data.title || data.data.metadata?.title;
      }
      // Alternative format with pages array (older API version)
      else if (data.pages && data.pages.length > 0) {
        const page = data.pages[0];
        markdown = page.markdown || '';
        images = page.images || [];
        screenshot = typeof page.screenshot === 'object' ? page.screenshot?.url : page.screenshot;
        title = page.title || page.metadata?.title;
      }
      // Direct format (some proxies return this)
      else if (data.markdown) {
        markdown = data.markdown;
        images = data.images || [];
        screenshot = typeof data.screenshot === 'object' ? data.screenshot?.url : data.screenshot;
        title = data.title || data.metadata?.title;
      }
      // Nested data format
      else if (data.data && data.data.markdown) {
        markdown = data.data.markdown;
        images = data.data.images || [];
        screenshot = typeof data.data.screenshot === 'object' ? data.data.screenshot?.url : data.data.screenshot;
        title = data.data.title || data.data.metadata?.title;
      }
      else {
        console.error('[Firecrawl] Unexpected response format:', data);
        throw new Error('No content returned from Firecrawl API');
      }

      if (!markdown || markdown.trim() === '') {
        throw new Error('Empty content returned from Firecrawl API');
      }

      console.log(`[Firecrawl] Successfully scraped ${markdown.length} characters of markdown${screenshot ? ' + screenshot' : ''}`);

      // If screenshot is a URL, convert it to Base64 to make it permanent
      if (screenshot && typeof screenshot === 'string' && screenshot.trim().toLowerCase().startsWith('http')) {
        console.log(`[Firecrawl] Converting screenshot URL to Base64: ${screenshot.substring(0, 50)}...`);
        const base64Screenshot = await fetchScreenshotAsBase64(screenshot, 2);
        if (base64Screenshot) {
          screenshot = base64Screenshot;
          console.log(`[Firecrawl] Successfully converted screenshot to Base64 (${screenshot.length} chars)`);
        } else {
          console.warn(`[Firecrawl] Keeping screenshot URL as fallback`);
        }
      }

      return {
        markdown,
        images,
        screenshot,
        title,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      const isTimeout = error.name === 'AbortError' || 
                        error.message?.includes('timeout') ||
                        error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';

      if (isTimeout) {
        console.warn(`[Firecrawl] 请求超时 (45s): "${url}" (尝试 ${attempt + 1}/${maxRetries + 1})`);
      } else {
        console.error(`[Firecrawl] API 调用失败: "${url}"`, error.message);
      }

      // 继续重试
      if (attempt < maxRetries) continue;
    }
  }

  // 所有重试都失败
  console.error(`[Firecrawl] 所有重试都失败: "${url}"`, lastError?.message);
  throw lastError || new Error('Firecrawl API 调用失败');
}

export interface WebsitePage {
  url: string;
  title?: string;
  description?: string;
  type?: string;
}

export interface TopicCluster {
  name: string;
  pages: string[]; // URLs in this cluster
  priority: number;
}

export interface WebsiteMapResult {
  pages: WebsitePage[];
  topicClusters: TopicCluster[];
}

/**
 * Get website sitemap and topic clusters using Firecrawl /map endpoint
 * @param url - The website URL to map
 * @returns Website pages and topic clusters
 */
export async function getWebsiteMap(url: string): Promise<WebsiteMapResult> {
  try {
    console.log(`[Firecrawl] Getting website map: ${url}`);

    const response = await fetch(`${FIRECRAWL_BASE_URL}/firecrawl/v1/map`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        includeSubdomains: true,
        limit: 1000, // Maximum 1000 pages
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Firecrawl] /map API error:', response.status, errorText);
      throw new Error(`Firecrawl /map API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Firecrawl] /map response received');

    // Parse response - Firecrawl /map returns different formats
    let pages: WebsitePage[] = [];
    let topicClusters: TopicCluster[] = [];

    // Standard format with data.pages
    if (data.success && data.data) {
      if (data.data.pages && Array.isArray(data.data.pages)) {
        pages = data.data.pages.map((page: any) => ({
          url: page.url || page.link,
          title: page.title || page.metadata?.title,
          description: page.description || page.metadata?.description,
          type: page.type || 'page',
        }));
      }
      if (data.data.topicClusters && Array.isArray(data.data.topicClusters)) {
        topicClusters = data.data.topicClusters.map((cluster: any) => ({
          name: cluster.name || cluster.topic,
          pages: cluster.pages || cluster.urls || [],
          priority: cluster.priority || 0,
        }));
      }
    }
    // Alternative format
    else if (data.pages && Array.isArray(data.pages)) {
      pages = data.pages.map((page: any) => ({
        url: page.url || page.link,
        title: page.title || page.metadata?.title,
        description: page.description || page.metadata?.description,
        type: page.type || 'page',
      }));
    }
    // Links format (simple list of URLs)
    else if (data.links && Array.isArray(data.links)) {
      pages = data.links.map((link: string) => ({
        url: link,
        type: 'page',
      }));
    }

    console.log(`[Firecrawl] Found ${pages.length} pages and ${topicClusters.length} topic clusters`);

    return {
      pages,
      topicClusters,
    };
  } catch (error: any) {
    console.error('[Firecrawl] /map failed:', error);
    throw error;
  }
}
