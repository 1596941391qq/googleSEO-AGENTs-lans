/**
 * Firecrawl API 工具
 * 
 * 职责：抓取网站内容和结构
 * 特点：纯数据获取，无AI逻辑
 */

const FIRECRAWL_BASE_URL = process.env.FIRECRAWL_BASE_URL || 'https://api.302.ai';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!FIRECRAWL_API_KEY || FIRECRAWL_API_KEY.trim() === '') {
  console.warn('FIRECRAWL_API_KEY is not configured');
}

export interface ScrapeResult {
  markdown: string;
  images: string[];
  screenshot?: string; // Base64 encoded screenshot
  title?: string; // Page title
}

/**
 * Scrape a website and return its content in markdown format
 * @param url - The URL to scrape
 * @param includeScreenshot - Whether to capture a screenshot (default: false)
 * @returns The scraped content in markdown format
 */
export async function scrapeWebsite(url: string, includeScreenshot: boolean = false): Promise<ScrapeResult> {
  try {
    console.log(`[Firecrawl] Scraping website: ${url} (screenshot: ${includeScreenshot})`);

    const formats = ['markdown'];
    if (includeScreenshot) {
      formats.push('screenshot');
    }

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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Firecrawl] API error:', response.status, errorText);
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Firecrawl] Response structure:', JSON.stringify(data, null, 2).substring(0, 500));

    // Handle different response formats
    let markdown = '';
    let images: string[] = [];
    let screenshot: string | undefined;
    let title: string | undefined;

    // Standard Firecrawl format (most common)
    if (data.success && data.data) {
      markdown = data.data.markdown || '';
      images = data.data.images || [];
      screenshot = data.data.screenshot;
      title = data.data.title || data.data.metadata?.title;
    }
    // Alternative format with pages array (older API version)
    else if (data.pages && data.pages.length > 0) {
      const page = data.pages[0];
      markdown = page.markdown || '';
      images = page.images || [];
      screenshot = page.screenshot;
      title = page.title || page.metadata?.title;
    }
    // Direct format (some proxies return this)
    else if (data.markdown) {
      markdown = data.markdown;
      images = data.images || [];
      screenshot = data.screenshot;
      title = data.title || data.metadata?.title;
    }
    // Nested data format
    else if (data.data && data.data.markdown) {
      markdown = data.data.markdown;
      images = data.data.images || [];
      screenshot = data.data.screenshot;
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

    return {
      markdown,
      images,
      screenshot,
      title,
    };
  } catch (error: any) {
    console.error('[Firecrawl] Scraping failed:', error);
    throw error;
  }
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
