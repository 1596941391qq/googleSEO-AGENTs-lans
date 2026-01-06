/**
 * Agent 2: SEO研究员
 * 
 * 职责：深度SEO研究（搜索引擎偏好、竞争对手分析）
 * 使用：Deep Dive模式 Step 1-5
 */

import { callGeminiAPI } from '../gemini.js';
import { fetchSerpResults, type SerpData } from '../tools/serp-search.js';
import { getSEOResearcherPrompt } from '../../../services/prompts/index.js';
import { KeywordData, TargetLanguage, ProbabilityLevel, SEOStrategyReport } from '../types.js';
import { fetchKeywordData } from '../tools/dataforseo.js';

/**
 * 搜索引擎偏好分析结果（Markdown格式）
 */
export interface SearchPreferencesResult {
  markdown: string;  // Markdown格式的完整分析
  // 保留向后兼容的字段（可选）
  semantic_landscape?: string;
  engine_strategies?: {
    google?: {
      ranking_logic?: string;
      content_gap?: string;
      action_item?: string;
    };
    perplexity?: {
      citation_logic?: string;
      structure_hint?: string;
    };
    generative_ai?: {
      llm_preference?: string;
    };
  };
  searchPreferences?: {
    google?: {
      rankingFactors?: string[];
      contentPreferences?: string;
      optimizationStrategy?: string;
    };
    chatgpt?: {
      rankingFactors?: string[];
      contentPreferences?: string;
      optimizationStrategy?: string;
    };
    claude?: {
      rankingFactors?: string[];
      contentPreferences?: string;
      optimizationStrategy?: string;
    };
    perplexity?: {
      rankingFactors?: string[];
      contentPreferences?: string;
      optimizationStrategy?: string;
    };
  };
}

/**
 * 竞争对手分析结果（Markdown格式）
 */
export interface CompetitorAnalysisResult {
  markdown: string;  // Markdown格式的完整分析
  // 保留向后兼容的字段（可选）
  competitor_benchmark?: Array<{
    domain?: string;
    content_angle?: string;
    weakness?: string;
  }>;
  winning_formula?: string;
  recommended_structure?: string[];
  competitorAnalysis?: {
    top10?: Array<{
      url?: string;
      title?: string;
      structure?: string[];
      wordCount?: number;
      contentGaps?: string[];
    }>;
    commonPatterns?: string[];
    contentGaps?: string[];
    recommendations?: string[];
  };
}

/**
 * 提取JSON内容
 */
function extractJSON(text: string): string {
  if (!text) return '{}';

  // 移除 Markdown 代码块标记
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // 移除可能的 Markdown 格式标记（如 ** 等）
  // 但保留 JSON 内部的字符串内容
  // 先尝试找到 JSON 对象或数组
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    let extracted = jsonMatch[1];
    // 如果提取的内容前后还有 Markdown 标记，尝试清理
    // 但要注意不要破坏 JSON 内部的字符串
    return extracted.trim();
  }

  // 如果没有找到 JSON，尝试移除开头的 Markdown 标记
  // 查找第一个 { 或 [
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  if (firstBrace !== -1 || firstBracket !== -1) {
    const startIdx = firstBrace !== -1 && firstBracket !== -1
      ? Math.min(firstBrace, firstBracket)
      : (firstBrace !== -1 ? firstBrace : firstBracket);

    // 从第一个 { 或 [ 开始，找到匹配的 } 或 ]
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;

        if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
          return text.substring(startIdx, i + 1).trim();
        }
      }
    }
  }

  return text.trim() || '{}';
}

/**
 * 分析搜索引擎偏好
 * 
 * 分析目标关键词在不同搜索引擎（Google、ChatGPT、Claude、Perplexity）中的排名机制和优化策略
 * 
 * @param keyword - 目标关键词
 * @param language - 语言代码（'zh' | 'en'）
 * @param targetLanguage - 目标语言（用于SERP搜索）
 * @returns 搜索引擎偏好分析结果
 */
export async function analyzeSearchPreferences(
  keyword: string,
  language: 'zh' | 'en' = 'en',
  targetLanguage: TargetLanguage = 'en',
  targetMarket: string = 'global',
  onSearchResults?: (results: Array<{ title: string; url: string; snippet?: string }>) => void
): Promise<SearchPreferencesResult> {
  try {
    // 构建市场标签
    const marketLabel = targetMarket === 'global'
      ? (language === 'zh' ? '全球市场' : 'Global Market')
      : targetMarket.toUpperCase();

    // 从 prompts 文件获取 system instruction 和 prompt
    const systemInstruction = getSEOResearcherPrompt('searchPreferences', language) as string;
    const prompt = getSEOResearcherPrompt('searchPreferences', language, {
      keyword,
      targetLanguage,
      marketLabel
    }) as string;

    // 调用 Gemini API（使用 JSON 模式）
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          semantic_landscape: { type: 'string' },
          engine_strategies: {
            type: 'object',
            properties: {
              google: {
                type: 'object',
                properties: {
                  ranking_logic: { type: 'string' },
                  content_gap: { type: 'string' },
                  action_item: { type: 'string' }
                }
              },
              perplexity: {
                type: 'object',
                properties: {
                  citation_logic: { type: 'string' },
                  structure_hint: { type: 'string' }
                }
              },
              generative_ai: {
                type: 'object',
                properties: {
                  llm_preference: { type: 'string' }
                }
              }
            }
          },
          geo_recommendations: { type: 'string' },
          searchPreferences: {
            type: 'object',
            properties: {
              google: {
                type: 'object',
                properties: {
                  rankingFactors: { type: 'array', items: { type: 'string' } },
                  contentPreferences: { type: 'string' },
                  optimizationStrategy: { type: 'string' }
                }
              },
              chatgpt: {
                type: 'object',
                properties: {
                  rankingFactors: { type: 'array', items: { type: 'string' } },
                  contentPreferences: { type: 'string' },
                  optimizationStrategy: { type: 'string' }
                }
              },
              claude: {
                type: 'object',
                properties: {
                  rankingFactors: { type: 'array', items: { type: 'string' } },
                  contentPreferences: { type: 'string' },
                  optimizationStrategy: { type: 'string' }
                }
              },
              perplexity: {
                type: 'object',
                properties: {
                  rankingFactors: { type: 'array', items: { type: 'string' } },
                  contentPreferences: { type: 'string' },
                  optimizationStrategy: { type: 'string' }
                }
              }
            }
          },
          markdown: { type: 'string' }
        },
        required: ['markdown']
      }
    });

    // 提取并解析 JSON
    let text = response?.text || '{}';
    text = extractJSONRobust(text);

    try {
      const parsed = JSON.parse(text);
      // 确保 markdown 字段存在，如果没有则从其他字段生成
      if (!parsed.markdown) {
        parsed.markdown = JSON.stringify(parsed, null, 2);
      }
      return parsed as SearchPreferencesResult;
    } catch (parseError: any) {
      console.error('[Agent 2] Failed to parse search preferences JSON:', parseError);
      console.error('[Agent 2] Response text:', text.substring(0, 500));
      // 返回默认结构
      return {
        markdown: text || `Search preferences analysis for "${keyword}" in ${marketLabel} market.`
      };
    }
  } catch (error: any) {
    console.error('Analyze Search Preferences Error:', error);
    throw new Error(`Failed to analyze search preferences: ${error.message}`);
  }
}

import { scrapeWebsite } from '../tools/firecrawl.js';

// Helper to truncate content and extract headers
function processScrapedContent(markdown: string, maxLength: number = 8000): string {
  if (!markdown) return '';

  // Simple truncation for now, can be smarter later
  let content = markdown.substring(0, maxLength);

  // Make sure we don't cut in the middle of a line
  const lastNewline = content.lastIndexOf('\n');
  if (lastNewline > 0) {
    content = content.substring(0, lastNewline);
  }

  return content;
}

/**
 * 分析竞争对手
 * 
 * 通过分析SERP结果，识别Top 10竞争对手的内容结构、弱点和机会
 * 升级：使用 Firecrawl 抓取 Top 3 页面的实际内容进行深度分析
 * 
 * @param keyword - 目标关键词
 * @param serpData - SERP搜索结果数据（可选，如果不提供会自动获取）
 * @param language - 语言代码（'zh' | 'en'）
 * @param targetLanguage - 目标语言（用于SERP搜索）
 * @returns 竞争对手分析结果
 */
export async function analyzeCompetitors(
  keyword: string,
  serpData?: SerpData,
  language: 'zh' | 'en' = 'en',
  targetLanguage: TargetLanguage = 'en',
  targetMarket: string = 'global',
  onSearchResults?: (results: Array<{ title: string; url: string; snippet?: string }>) => void
): Promise<CompetitorAnalysisResult> {
  try {
    // 如果没有提供 SERP 数据，则获取
    let serpResults = serpData;
    if (!serpResults) {
      console.log(`Fetching SERP results for competitor analysis: ${keyword}`);
      serpResults = await fetchSerpResults(keyword, targetLanguage);
    }

    // 1. 构建 SERP 结果上下文 (Snippet based)
    const serpSnippetsContext = serpResults.results && serpResults.results.length > 0
      ? serpResults.results.slice(0, 10).map((r, i) =>
        `${i + 1}. [${r.title}](${r.url})\n   Snippet: ${r.snippet}`
      ).join('\n\n')
      : 'No SERP results available.';

    // 2. Firecrawl: 抓取 Top 3 页面的深度内容
    // 跳过失败的URL，继续抓取下一个可抓取的结果
    let deepContentContext = '';
    const allResults = serpResults.results || [];
    const targetScrapeCount = 3; // 目标抓取数量
    const scrapedData: Array<{ rank: number; title: string; url: string; content: string }> = [];

    if (allResults.length > 0) {
      console.log(`[Agent 2] Attempting to scrape ${targetScrapeCount} competitors for deep analysis...`);

      try {
        // 逐个尝试抓取，跳过失败的URL，直到获取到足够的成功结果
        for (let i = 0; i < allResults.length && scrapedData.length < targetScrapeCount; i++) {
          const r = allResults[i];
          if (!r.url) continue;

          try {
            console.log(`[Agent 2] Attempting to scrape [${i + 1}/${allResults.length}]: ${r.url}`);
            const result = await scrapeWebsite(r.url, false);
            const processedContent = processScrapedContent(result.markdown || '');

            // 检查抓取的内容是否有效（不是错误页面）
            if (processedContent && processedContent.length > 100) {
              scrapedData.push({
                rank: scrapedData.length + 1,
                title: r.title,
                url: r.url,
                content: processedContent
              });
              console.log(`[Agent 2] Successfully scraped ${r.url} (${scrapedData.length}/${targetScrapeCount})`);
            } else {
              console.warn(`[Agent 2] Scraped content from ${r.url} is too short or invalid, skipping...`);
            }
          } catch (e: any) {
            console.warn(`[Agent 2] Failed to scrape ${r.url}:`, e.message);
            // 继续尝试下一个URL，不中断流程
            continue;
          }
        }

        if (scrapedData.length > 0) {
          deepContentContext = `\n\n=== DEEP DIVE: TOP COMPETITOR CONTENT ===\nI have scraped the full content of the top ${scrapedData.length} ranking pages. Use this for structural analysis:\n\n` +
            scrapedData.map(page =>
              `--- COMPETITOR #${page.rank}: ${page.title} ---\nURL: ${page.url}\nCONTENT START:\n${page.content}\nCONTENT END\n`
            ).join('\n\n');
          console.log(`[Agent 2] Successfully scraped ${scrapedData.length} competitor pages for deep analysis`);
        } else {
          console.warn(`[Agent 2] No competitor pages could be scraped successfully, falling back to snippets only`);
        }
      } catch (err) {
        console.error('[Agent 2] Firecrawl scraping failed, falling back to snippets only', err);
      }
    }

    // 构建市场标签
    const marketLabel = targetMarket === 'global'
      ? (language === 'zh' ? '全球市场' : 'Global Market')
      : targetMarket.toUpperCase();

    // 从 prompts 文件获取 system instruction 和 prompt
    const systemInstruction = getSEOResearcherPrompt('competitorAnalysis', language) as string;
    const prompt = getSEOResearcherPrompt('competitorAnalysis', language, {
      keyword,
      targetLanguage,
      marketLabel,
      serpSnippetsContext,
      deepContentContext
    }) as string;

    // 调用 Gemini API（使用 JSON 模式）
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          winning_formula: { type: 'string' },
          recommended_structure: { type: 'array', items: { type: 'string' } },
          competitor_benchmark: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                domain: { type: 'string' },
                content_angle: { type: 'string' },
                weakness: { type: 'string' }
              }
            }
          },
          competitorAnalysis: {
            type: 'object',
            properties: {
              top10: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    title: { type: 'string' },
                    structure: { type: 'array', items: { type: 'string' } },
                    wordCount: { type: 'number' },
                    contentGaps: { type: 'array', items: { type: 'string' } }
                  }
                }
              },
              commonPatterns: { type: 'array', items: { type: 'string' } },
              contentGaps: { type: 'array', items: { type: 'string' } },
              recommendations: { type: 'array', items: { type: 'string' } }
            }
          },
          markdown: { type: 'string' }
        },
        required: ['markdown']
      }
    });

    // 提取并解析 JSON
    let text = response?.text || '{}';
    text = extractJSONRobust(text);

    try {
      const parsed = JSON.parse(text);
      // 确保 markdown 字段存在，如果没有则从其他字段生成
      if (!parsed.markdown) {
        parsed.markdown = JSON.stringify(parsed, null, 2);
      }
      return parsed as CompetitorAnalysisResult;
    } catch (parseError: any) {
      console.error('[Agent 2] Failed to parse competitor analysis JSON:', parseError);
      console.error('[Agent 2] Response text:', text.substring(0, 500));
      // 返回默认结构
      return {
        markdown: text || `Competitor analysis for "${keyword}" in ${marketLabel} market.`
      };
    }
  } catch (error: any) {
    console.error('Analyze Competitors Error:', error);
    throw new Error(`Failed to analyze competitors: ${error.message}`);
  }
}

function getLanguageName(code: TargetLanguage): string {
  switch (code) {
    case 'en': return 'English';
    case 'fr': return 'French';
    case 'ru': return 'Russian';
    case 'ja': return 'Japanese';
    case 'ko': return 'Korean';
    case 'pt': return 'Portuguese';
    case 'id': return 'Indonesian';
    case 'es': return 'Spanish';
    case 'ar': return 'Arabic';
    case 'zh': return 'Chinese';
    default: return 'English';
  }
}

function extractJSONRobust(text: string): string {
  if (!text) return '{}';

  // 移除 Markdown 代码块标记
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // 移除可能的 Markdown 格式标记（如 ** 等）在 JSON 外部
  // 先尝试找到 JSON 对象或数组
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    let extracted = jsonMatch[1];

    // 使用更精确的方法提取完整的 JSON
    // 查找第一个 { 或 [
    const firstBrace = extracted.indexOf('{');
    const firstBracket = extracted.indexOf('[');

    if (firstBrace !== -1 || firstBracket !== -1) {
      const startIdx = firstBrace !== -1 && firstBracket !== -1
        ? Math.min(firstBrace, firstBracket)
        : (firstBrace !== -1 ? firstBrace : firstBracket);

      // 从第一个 { 或 [ 开始，找到匹配的 } 或 ]
      let braceCount = 0;
      let bracketCount = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = startIdx; i < extracted.length; i++) {
        const char = extracted[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;

          if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
            return extracted.substring(startIdx, i + 1).trim();
          }
        }
      }
    }

    return extracted.trim();
  }

  return text.trim() || '{}';
}

/**
 * Analyze Ranking Probability
 * Moved from gemini.ts
 */
export const analyzeRankingProbability = async (
  keywords: KeywordData[],
  systemInstruction: string,
  uiLanguage: 'zh' | 'en' = 'en',
  targetLanguage: TargetLanguage = 'en'
): Promise<KeywordData[]> => {
  const uiLangName = uiLanguage === 'zh' ? 'Chinese' : 'English';

  const analyzeSingleKeyword = async (keywordData: KeywordData): Promise<KeywordData> => {
    // Step 1: Fetch real Google SERP results
    let serpData;
    let serpResults: any[] = [];
    let serpResultCount = -1;

    try {
      console.log(`Fetching SERP for keyword: ${keywordData.keyword}`);
      serpData = await fetchSerpResults(keywordData.keyword, targetLanguage);
      serpResults = serpData.results || [];
      serpResultCount = serpData.totalResults || -1;
      console.log(`Fetched ${serpResults.length} search results for "${keywordData.keyword}" (analyzing all for competition)`);
    } catch (error: any) {
      console.warn(`Failed to fetch SERP for ${keywordData.keyword}:`, error.message);
    }

    // Step 2: Build system instruction with real SERP data
    const serpContext = serpResults.length > 0
      ? `\n\nTOP GOOGLE SEARCH RESULTS FOR REFERENCE (analyzing "${keywordData.keyword}"):\nNote: These are the TOP ranking results provided to you for competition analysis, NOT all search results.\n\n${serpResults.map((r, i) => `${i + 1}. Title: ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`).join('\n\n')}\n\nEstimated Total Results on Google: ${serpResultCount > 0 ? serpResultCount.toLocaleString() : 'Unknown (Likely Many)'}\n\n⚠️ IMPORTANT: The results shown above are only the TOP-RANKING pages from Google's first page. There may be thousands of other lower-ranking results not shown here. Use these top results to assess the QUALITY of competition you need to beat.`
      : `\n\nNote: Real SERP data could not be fetched. Analyze based on your knowledge.`;

    // Add DataForSEO data context if available (use dataForSEOData or serankingData for backward compatibility)
    const dataForSEOData = (keywordData as any).dataForSEOData || keywordData.serankingData;
    const dataForSEOContext = dataForSEOData && dataForSEOData.is_data_found
      ? `\n\nDATAFORSEO KEYWORD DATA FOR "${keywordData.keyword}":
- Search Volume: ${dataForSEOData.volume || 'N/A'} monthly searches
- Keyword Difficulty (KD): ${dataForSEOData.difficulty || 'N/A'} (0-100 scale, higher = more competitive)
- CPC: $${dataForSEOData.cpc || 'N/A'}
- Competition: ${dataForSEOData.competition ? (dataForSEOData.competition * 100).toFixed(1) + '%' : 'N/A'}

IMPORTANT: Consider the DataForSEO Keyword Difficulty (KD) score in your analysis:
- KD 0-20: Very low competition (favors HIGH probability)
- KD 21-40: Low to moderate competition (consider MEDIUM to HIGH)
- KD 41-60: Moderate to high competition (likely MEDIUM to LOW)
- KD 61-80: High competition (likely LOW)
- KD 81-100: Very high competition (definitely LOW)

Combine the KD score with your SERP analysis to make a final judgment.`
      : dataForSEOData
        ? `\n\nDATAFORSEO KEYWORD DATA FOR "${keywordData.keyword}":
⚠️ NO DATA FOUND

**CRITICAL**: Do NOT automatically treat "no DataForSEO data" as a blue ocean signal!

When DataForSEO has no data for a keyword, it could mean:
1. **For non-English languages (${targetLanguage})**: DataForSEO's database may not have comprehensive coverage for this language. This is NORMAL and does NOT indicate a blue ocean opportunity.
2. Very low or zero search volume in their database (possible but not guaranteed)
3. New, emerging, or highly niche keyword (possible but not guaranteed)
4. Little to no advertising competition (possible but not guaranteed)

**IMPORTANT ANALYSIS RULES**:
- **For non-English target languages**: DataForSEO "no data" is often due to limited database coverage, NOT because it's a blue ocean keyword. Do NOT give bonus points for this.
- **For English keywords**: DataForSEO "no data" MIGHT indicate a blue ocean, but you MUST verify with SERP results first.
- **ALWAYS prioritize SERP analysis over DataForSEO data absence**: If SERP shows strong competition (authoritative sites, optimized content), the keyword is NOT a blue ocean regardless of DataForSEO data.
- **Only consider it a positive signal if**: SERP results ALSO show weak competition (forums, low-quality content) AND the target language is English.

ACTION: Analyze SERP results first. Do NOT automatically assign HIGH probability just because DataForSEO has no data.`
        : `\n\nNote: DataForSEO keyword data not available for this keyword (API call failed or not attempted).`;

    const topSerpSnippetsJson = serpResults.length > 0
      ? JSON.stringify(serpResults.slice(0, 3).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet
      })))
      : '[]';

    const fullSystemInstruction = `
${systemInstruction}

TASK: Analyze the Google SERP competition for the keyword: "${keywordData.keyword}".
${serpContext}
${dataForSEOContext}

**STEP 1: PREDICT SEARCH INTENT**
First, predict what the user's search intent is when they type this keyword. Consider:
- What problem are they trying to solve?
- What information are they seeking?
- Are they looking to buy, learn, compare, or find a specific resource?
- What stage of the buyer's journey are they in?

**STEP 2: ANALYZE SERP COMPETITION**
Based on the REAL SERP results provided above (if available), analyze:
1. How many competing pages exist for this keyword (use the actual count if provided, otherwise estimate)
2. What type of sites are ranking (Big Brand, Niche Site, Forum/Social, Weak Page, Gov/Edu) - analyze the actual URLs and domains
3. **CRITICAL: Evaluate RELEVANCE of each result** - Does the page content match the keyword topic?
4. The probability of ranking on page 1 (High, Medium, Low) - based on BOTH competition quality AND relevance

STRICT SCORING CRITERIA (Be conservative and strict):

🟢 **HIGH PROBABILITY** - Assign when ALL of the following are met:
  * Top 3 results are ALL weak competitors (Forums like Reddit/Quora, Social Media, PDFs, low-quality blogs, OR off-topic/irrelevant content)
  * NO highly relevant authoritative sites in top 5
  * Content quality of top results is clearly poor, outdated, or doesn't match user intent
  * **BONUS**: DataForSEO shows NO DATA - BUT ONLY if target language is English AND SERP also shows weak competition (do NOT assume blue ocean for non-English languages)

  **RELEVANCE CHECK**: If you see Wikipedia/.gov/.edu in top results:
    ├─ Are they HIGHLY RELEVANT to the keyword topic? → Competition is strong → NOT HIGH
    └─ Are they OFF-TOPIC or weakly related? → They're just filling space → Still consider HIGH

🟡 **MEDIUM PROBABILITY** - Assign when:
  * Moderate competition exists (3-10 relevant results)
  * Mix of weak and moderate competitors
  * Some authoritative sites present BUT not all are highly relevant
  * Top results partially satisfy user intent but have gaps
  * Niche sites rank but aren't dominant market leaders

🔴 **LOW PROBABILITY** - Assign when ANY of the following apply:
  * Top 3 results include HIGHLY RELEVANT Big Brands (Amazon, major corporations for product keywords)
  * HIGHLY RELEVANT Government/Educational sites (.gov, .edu) with exact topic match
  * Multiple HIGHLY RELEVANT, high-quality niche authority sites with exact match content
  * Strong competition with 10+ relevant, well-optimized results
  * Top results clearly and comprehensively satisfy user intent

**CRITICAL RELEVANCE PRINCIPLE**:
- **Authority WITHOUT Relevance = Opportunity (not threat)**
- **Authority WITH High Relevance = Strong Competition (threat)**
- Example 1: Wikipedia page about "general topic" for keyword "specific product" → WEAK competitor
- Example 2: Wikipedia page with exact match for keyword → STRONG competitor
- Example 3: .gov site about unrelated topic → IGNORE, doesn't affect ranking
- Example 4: .gov site with exact topic match → STRONG competitor

IMPORTANT ANALYSIS RULES:
- **Prioritize RELEVANCE over AUTHORITY** - A highly relevant blog beats an irrelevant Wikipedia page
- If authoritative sites are present but OFF-TOPIC, treat it as a blue ocean opportunity
- Analyze the actual quality and relevance of top results, not just domain names
- Use the REAL SERP results provided above for your analysis
- **CRITICAL**: For non-English target languages (${targetLanguage}), DataForSEO "no data" is often due to limited database coverage, NOT a blue ocean signal. Do NOT treat it as positive. Always verify with SERP results first.
- Output all text fields (reasoning, searchIntent, intentAnalysis, topSerpSnippets titles/snippets) in ${uiLangName}
- The user interface language is ${uiLanguage === 'zh' ? '中文' : 'English'}, so all explanations and descriptions must be in ${uiLangName}
- For topSerpSnippets, use the ACTUAL results from the SERP data above (first 3 results)

CRITICAL: Return ONLY a valid JSON object. Do NOT include any explanations, thoughts, reasoning process, or markdown formatting. Return ONLY the JSON object.

Return a JSON object:
{
  "searchIntent": "Brief description of predicted user search intent in ${uiLangName}",
  "intentAnalysis": "Analysis of whether SERP results match the intent in ${uiLangName}",
  "serpResultCount": ${serpResultCount > 0 ? serpResultCount : -1},
  "topDomainType": "Big Brand" | "Niche Site" | "Forum/Social" | "Weak Page" | "Gov/Edu" | "Unknown",
  "probability": "High" | "Medium" | "Low",
  "reasoning": "explanation string in ${uiLangName} based on the real SERP results",
  "topSerpSnippets": ${topSerpSnippetsJson}
}`;

    try {
      let response;
      try {
        response = await callGeminiAPI(
          `Analyze SEO competition for: ${keywordData.keyword}

CRITICAL: Return ONLY a valid JSON object in the exact format specified. No markdown, no explanations, no thinking process, just the JSON object starting with {`,
          fullSystemInstruction,
          {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                searchIntent: { type: 'string' },
                intentAnalysis: { type: 'string' },
                serpResultCount: { type: 'number' },
                topDomainType: { type: 'string' },
                probability: { type: 'string', enum: ['High', 'Medium', 'Low'] },
                reasoning: { type: 'string' },
                topSerpSnippets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      url: { type: 'string' },
                      snippet: { type: 'string' }
                    }
                  }
                }
              },
              required: ['probability', 'reasoning']
            },
            // 禁用 Google 搜索以避免 JSON 解析错误（联网模式会导致返回非纯 JSON 格式）
            enableGoogleSearch: false
          }
        );
      } catch (apiError: any) {
        // 如果API调用失败（如400错误），使用默认值并继续
        console.error(`API call failed for keyword ${keywordData.keyword}:`, apiError.message);
        // 返回默认分析结果
        return {
          ...keywordData,
          probability: ProbabilityLevel.MEDIUM,
          reasoning: `API调用失败: ${apiError.message}. 使用默认分析结果。`,
          searchIntent: "Unable to determine intent due to API error",
          intentAnalysis: "Analysis skipped due to API error",
          serpResultCount: serpResultCount > 0 ? serpResultCount : -1,
          topDomainType: "Unknown",
          topSerpSnippets: serpResults.slice(0, 3).map((r: any) => ({
            title: r.title || '',
            url: r.url || '',
            snippet: r.snippet || ''
          }))
        };
      }

      let text = response.text || "{}";

      // 如果响应以 Markdown 格式开头（如 "**Refining..."），先清理
      // 移除 Markdown 格式标记和思考过程
      if (text && typeof text === 'string') {
        const trimmedText = text.trim();
        if (trimmedText && (trimmedText.startsWith('**') || trimmedText.startsWith('*'))) {
          // 查找第一个 { 之前的所有内容，可能是思考过程
          const firstBrace = text.indexOf('{');
          if (firstBrace > 0) {
            // 移除 { 之前的所有 Markdown 和思考过程
            text = text.substring(firstBrace);
          }
          // 移除所有 Markdown 格式标记
          text = text.replace(/^\*\*[^*]+\*\*/gm, ''); // 移除 **text** 格式
          text = text.replace(/^\*[^*]+/gm, ''); // 移除 * text 格式
          text = text.replace(/^#+\s+/gm, ''); // 移除 # 标题格式
          text = text.trim();
        }
      }

      // Enhanced JSON extraction - try to find JSON even if wrapped in markdown
      text = extractJSONRobust(text);

      if (!text || text.trim() === '') {
        throw new Error("Empty JSON response from model");
      }

      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch (e: any) {
        console.error("JSON Parse Error for keyword:", keywordData.keyword);
        console.error("Extracted text (first 500 chars):", text.substring(0, 500));

        // Enhanced fallback: try multiple strategies to extract JSON
        let recovered = false;

        // Strategy 0: 尝试修复常见的 JSON 截断问题
        let fixedText = text.trim();
        const openBraces = (fixedText.match(/\{/g) || []).length;
        const closeBraces = (fixedText.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          // 添加缺失的闭合括号和可能的数组闭合
          const missingBraces = openBraces - closeBraces;
          // 检查是否有未闭合的数组
          const openBrackets = (fixedText.match(/\[/g) || []).length;
          const closeBrackets = (fixedText.match(/\]/g) || []).length;
          if (openBrackets > closeBrackets) {
            fixedText += ']'.repeat(openBrackets - closeBrackets);
          }
          // 添加缺失的闭合大括号
          fixedText += '}'.repeat(missingBraces);

          try {
            analysis = JSON.parse(fixedText);
            console.log("✓ Fixed truncated JSON by adding missing braces");
            recovered = true;
          } catch (fixError) {
            // 继续使用其他恢复策略
          }
        }

        if (!recovered) {

          // Enhanced fallback: try multiple strategies to extract JSON
          let recovered = false;

          // Strategy 0.5: 尝试修复截断的 JSON（在尝试其他策略之前）
          let fixedText = text.trim();
          const openBraces = (fixedText.match(/\{/g) || []).length;
          const closeBraces = (fixedText.match(/\}/g) || []).length;
          if (openBraces > closeBraces) {
            // 添加缺失的闭合括号和可能的数组闭合
            const missingBraces = openBraces - closeBraces;
            // 检查是否有未闭合的数组
            const openBrackets = (fixedText.match(/\[/g) || []).length;
            const closeBrackets = (fixedText.match(/\]/g) || []).length;
            if (openBrackets > closeBrackets) {
              fixedText += ']'.repeat(openBrackets - closeBrackets);
            }
            // 添加缺失的闭合大括号
            fixedText += '}'.repeat(missingBraces);

            try {
              analysis = JSON.parse(fixedText);
              console.log("✓ Fixed truncated JSON by adding missing braces");
              recovered = true;
            } catch (fixError) {
              // 继续使用其他恢复策略
            }
          }

          // Strategy 1: Try to find JSON object with "probability" field
          if (!recovered) {
            const jsonMatch1 = response.text.match(/\{[\s\S]*?"probability"[\s\S]*?\}/);
            if (jsonMatch1) {
              try {
                analysis = JSON.parse(jsonMatch1[0]);
                console.log("✓ Recovered JSON using probability field match");
                recovered = true;
              } catch (recoveryError) {
                // Continue to next strategy
              }
            }
          }

          // Strategy 2: Try to find any JSON object that looks complete (使用清理后的文本)
          if (!recovered) {
            // 先清理 Markdown，再查找 JSON
            let cleanedText = response.text;
            // 移除 Markdown 格式标记
            cleanedText = cleanedText.replace(/^\*\*[^*]+\*\*/gm, '');
            cleanedText = cleanedText.replace(/^\*[^*]+/gm, '');
            cleanedText = cleanedText.replace(/^#+\s+/gm, '');
            cleanedText = cleanedText.replace(/^```[\s\S]*?```/gm, '');

            // Find the first { and try to extract complete JSON
            const firstBrace = cleanedText.indexOf('{');
            if (firstBrace !== -1) {
              // Try to find matching closing brace
              let braceCount = 0;
              let inString = false;
              let escapeNext = false;

              for (let i = firstBrace; i < cleanedText.length; i++) {
                const char = cleanedText[i];

                if (escapeNext) {
                  escapeNext = false;
                  continue;
                }

                if (char === '\\') {
                  escapeNext = true;
                  continue;
                }

                if (char === '"' && !escapeNext) {
                  inString = !inString;
                  continue;
                }

                if (!inString) {
                  if (char === '{') braceCount++;
                  if (char === '}') braceCount--;

                  if (braceCount === 0 && char === '}') {
                    const candidate = cleanedText.substring(firstBrace, i + 1);
                    try {
                      analysis = JSON.parse(candidate);
                      console.log("✓ Recovered JSON using brace matching");
                      recovered = true;
                      break;
                    } catch (recoveryError) {
                      // Continue searching
                    }
                  }
                }
              }
            }
          }

          if (!recovered) {
            // 如果所有恢复策略都失败，使用默认值并记录错误
            console.error("All JSON recovery strategies failed. Using default values.");
            analysis = {
              searchIntent: "Unable to determine intent",
              intentAnalysis: "Analysis failed due to invalid JSON response",
              serpResultCount: serpResultCount > 0 ? serpResultCount : -1,
              topDomainType: "Unknown",
              probability: "Medium", // 默认中等概率
              reasoning: `Failed to parse AI response. Original error: ${e.message}. Response preview: ${text.substring(0, 200)}`,
              topSerpSnippets: []
            };
            // 不抛出错误，而是使用默认值继续处理
          }
        }

        if (typeof analysis !== 'object' || analysis === null) {
          throw new Error("Response is not a valid JSON object");
        }

        if (serpResults.length > 0) {
          analysis.topSerpSnippets = serpResults.slice(0, 3).map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet
          }));
          if (serpResultCount > 0) {
            analysis.serpResultCount = serpResultCount;
          }
        }

        if (typeof analysis.serpResultCount !== 'number') {
          analysis.serpResultCount = serpResultCount > 0 ? serpResultCount : -1;
        }
        if (!analysis.topDomainType) analysis.topDomainType = 'Unknown';
        if (!analysis.probability) analysis.probability = ProbabilityLevel.MEDIUM;
        if (!analysis.reasoning) analysis.reasoning = 'Analysis completed';
        if (!analysis.searchIntent) analysis.searchIntent = 'Unknown search intent';
        if (!analysis.intentAnalysis) analysis.intentAnalysis = 'Intent analysis not available';
        if (!Array.isArray(analysis.topSerpSnippets)) {
          analysis.topSerpSnippets = serpResults.length > 0
            ? serpResults.slice(0, 3).map(r => ({ title: r.title, url: r.url, snippet: r.snippet }))
            : [];
        }

        if (typeof analysis.serpResultCount === 'number' && analysis.serpResultCount === 0) {
          analysis.probability = ProbabilityLevel.HIGH;
          analysis.reasoning = `Blue Ocean! Zero indexed results found - this is a completely untapped keyword.`;
          analysis.topDomainType = 'Weak Page';
        }

        return {
          ...keywordData,
          ...analysis,
          rawResponse: response.text,
          searchResults: response.searchResults // 添加联网搜索结果
        };

      } catch (error) {
        console.error(`Analysis failed for ${keywordData.keyword}:`, error);
        return {
          ...keywordData,
          probability: ProbabilityLevel.LOW,
          reasoning: "API Analysis Failed (Timeout or Rate Limit).",
          topDomainType: "Unknown",
          serpResultCount: -1,
          rawResponse: "Error: " + error.message
        };
      }
    };

    const results: KeywordData[] = [];
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 300;
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 880000;

    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        console.warn(`Approaching timeout, processed ${i}/${keywords.length} keywords`);
        const remaining = keywords.slice(i).map(k => ({
          ...k,
          probability: ProbabilityLevel.LOW,
          reasoning: "Analysis timeout - too many keywords to process",
          topDomainType: "Unknown" as const,
          serpResultCount: -1
        }));
        results.push(...remaining);
        break;
      }

      const batch = keywords.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(k => analyzeSingleKeyword(k))
      );

      const processedResults = batchResults.map((result, idx) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Analysis failed for keyword ${batch[idx].keyword}:`, result.reason);
          return {
            ...batch[idx],
            probability: ProbabilityLevel.LOW,
            reasoning: "Analysis failed due to timeout or error",
            topDomainType: "Unknown" as const,
            serpResultCount: -1
          };
        }
      });

      results.push(...processedResults);

      if (i + BATCH_SIZE < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    return results;
  };

  export const extractCoreKeywords = async (
    report: any,
    targetLanguage: TargetLanguage,
    uiLanguage: 'zh' | 'en'
  ): Promise<string[]> => {
    const targetLangName = getLanguageName(targetLanguage);

    // 从 prompts 文件获取 prompt
    const prompt = getSEOResearcherPrompt('extractCoreKeywords', uiLanguage, {
      targetLangName,
      report
    }) as string;

    try {
      const response = await callGeminiAPI(prompt, undefined, {
      });
      const text = response.text.trim();
      const jsonMatch = text.match(/\[.*?\]/s);
      if (jsonMatch) {
        const keywords = JSON.parse(jsonMatch[0]);
        return keywords.filter((k: string) => k && k.trim().length > 0).slice(0, 8);
      }
      const extracted = text.split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').replace(/["\[\],]/g, '').trim())
        .filter(line => line.length > 0 && line.length < 50)
        .slice(0, 8);
      if (extracted.length > 0) return extracted;
      return [report.targetKeyword];
    } catch (error: any) {
      console.error('Failed to extract core keywords:', error);
      return [report.targetKeyword];
    }
  };

  export const generateDeepDiveStrategy = async (
    keyword: KeywordData,
    uiLanguage: 'zh' | 'en',
    targetLanguage: TargetLanguage,
    customPrompt?: string,
    searchPreferences?: SearchPreferencesResult,
    competitorAnalysis?: CompetitorAnalysisResult,
    targetMarket: string = 'global',
    reference?: {
      type: 'document' | 'url';
      document?: {
        filename: string;
        content: string;
      };
      url?: {
        url: string;
        content?: string;
        screenshot?: string;
        title?: string;
      };
    }
  ): Promise<SEOStrategyReport> => {
    const uiLangName = uiLanguage === 'zh' ? 'Chinese' : 'English';
    const targetLangName = getLanguageName(targetLanguage);

    // Construct context from analysis results
    let analysisContext = '';

    if (searchPreferences) {
      analysisContext += `\n\n=== SEARCH ENGINE PREFERENCES ===\n${JSON.stringify(searchPreferences, null, 2)}`;
    }

    if (competitorAnalysis) {
      analysisContext += `\n\n=== COMPETITOR ANALYSIS (Based on Deep Scrape) ===\n${JSON.stringify(competitorAnalysis, null, 2)}`;

      if (competitorAnalysis.winning_formula) {
        analysisContext += `\n\nWINNING FORMULA: ${competitorAnalysis.winning_formula}`;
      }

      if (competitorAnalysis.competitorAnalysis?.contentGaps) {
        analysisContext += `\n\nCONTENT GAPS TO FILL: ${competitorAnalysis.competitorAnalysis.contentGaps.join(', ')}`;
      }
    }

    // Add reference context
    let referenceContext = '';
    if (reference) {
      if (reference.type === 'document' && reference.document) {
        // Provide summary for strategist (first 2000 chars)
        const docSummary = reference.document.content.length > 2000
          ? reference.document.content.substring(0, 2000) + '...'
          : reference.document.content;
        referenceContext = `\n\n=== USER REFERENCE DOCUMENT ===\nFilename: ${reference.document.filename}\nContent Summary:\n${docSummary}\n\nIMPORTANT: While the user provided this reference document, your primary focus must be on the keyword "${keyword.keyword}". Extract relevant information from the document that relates to the keyword, but ensure the content strategy is centered around "${keyword.keyword}". If the document content is not relevant to the keyword, use it only as a style reference.`;
      } else if (reference.type === 'url' && reference.url?.content && reference.url?.url) {
        // Provide summary for strategist (first 2000 chars)
        const urlSummary = reference.url.content.length > 2000
          ? reference.url.content.substring(0, 2000) + '...'
          : reference.url.content;
        const urlString = typeof reference.url.url === 'string' ? reference.url.url : 'N/A';
        const titleString = reference.url.title && typeof reference.url.title === 'string' ? reference.url.title : '';
        referenceContext = `\n\n=== USER REFERENCE URL ===\nURL: ${urlString}\n${titleString ? `Title: ${titleString}\n` : ''}Content Summary:\n${urlSummary}\n\nIMPORTANT: While the user provided this reference URL, your primary focus must be on the keyword "${keyword.keyword}". Extract relevant information from the URL that relates to the keyword, but ensure the content strategy is centered around "${keyword.keyword}". If the URL content is not relevant to the keyword, use it only as a style reference.`;
      }
    }

    const marketLabel = targetMarket === 'global'
      ? 'Global'
      : targetMarket.toUpperCase();

    // 从 prompts 文件获取 system instruction 和 prompt
    const promptConfig = getSEOResearcherPrompt('deepDiveStrategy', uiLanguage, {
      keyword: keyword.keyword,
      targetLangName,
      uiLangName,
      marketLabel,
      analysisContext,
      referenceContext
    }) as { systemInstruction: string; prompt: string };

    const systemInstruction = customPrompt || (promptConfig.systemInstruction + analysisContext + referenceContext);
    const prompt = promptConfig.prompt;

    try {
      const response = await callGeminiAPI(prompt, systemInstruction, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            targetKeyword: { type: 'string' },
            pageTitleH1: { type: 'string' },
            pageTitleH1_trans: { type: 'string' },
            metaDescription: { type: 'string' },
            metaDescription_trans: { type: 'string' },
            urlSlug: { type: 'string' },
            userIntentSummary: { type: 'string' },
            contentStructure: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  header: { type: 'string' },
                  header_trans: { type: 'string' },
                  description: { type: 'string' },
                  description_trans: { type: 'string' }
                },
                required: ['header', 'description']
              }
            },
            longTailKeywords: { type: 'array', items: { type: 'string' } },
            longTailKeywords_trans: { type: 'array', items: { type: 'string' } },
            recommendedWordCount: { type: 'number' },
            markdown: { type: 'string' }
          },
          required: ['pageTitleH1', 'metaDescription', 'contentStructure', 'markdown']
        }
      });

      // 提取并解析 JSON
      let text = response?.text || '{}';
      text = extractJSONRobust(text);

      try {
        const parsed = JSON.parse(text);
        // 确保 markdown 字段存在，如果没有则从其他字段生成
        if (!parsed.markdown) {
          // 从结构化数据生成 Markdown
          const mdParts: string[] = [];
          mdParts.push(`# Content Strategy: ${parsed.pageTitleH1 || keyword.keyword}\n\n`);
          mdParts.push(`## Page Title (H1)\n${parsed.pageTitleH1 || ''}\n*Translation: ${parsed.pageTitleH1_trans || ''}*\n\n`);
          mdParts.push(`## Meta Description\n${parsed.metaDescription || ''}\n*Translation: ${parsed.metaDescription_trans || ''}*\n\n`);
          if (parsed.urlSlug) mdParts.push(`## URL Slug\n${parsed.urlSlug}\n\n`);
          if (parsed.userIntentSummary) mdParts.push(`## User Intent Analysis\n${parsed.userIntentSummary}\n\n`);
          if (parsed.contentStructure && Array.isArray(parsed.contentStructure)) {
            mdParts.push(`## Content Structure\n`);
            parsed.contentStructure.forEach((section: any, idx: number) => {
              mdParts.push(`### H2 ${idx + 1}: ${section.header || ''}\n*Translation: ${section.header_trans || ''}*\n\n`);
              mdParts.push(`**Description**: ${section.description || ''}\n\n`);
              if (section.description_trans) {
                mdParts.push(`*Translation: ${section.description_trans}*\n\n`);
              }
            });
          }
          if (parsed.longTailKeywords && Array.isArray(parsed.longTailKeywords)) {
            mdParts.push(`## Long-tail Keywords\n${parsed.longTailKeywords.join(', ')}\n\n`);
          }
          if (parsed.recommendedWordCount) {
            mdParts.push(`## Recommended Word Count\n${parsed.recommendedWordCount} words\n\n`);
          }
          parsed.markdown = mdParts.join('');
        }
        return parsed as SEOStrategyReport;
      } catch (parseError: any) {
        console.error('[Agent 2] Failed to parse strategy report JSON:', parseError);
        console.error('[Agent 2] Response text:', text.substring(0, 500));
        // 返回默认结构
        return {
          targetKeyword: keyword.keyword,
          pageTitleH1: keyword.keyword,
          contentStructure: [],
          markdown: text || `Content strategy for "${keyword.keyword}" in ${marketLabel} market.`
        };
      }
    } catch (error: any) {
      console.error("Deep Dive Error:", error);
      throw new Error(`Failed to generate strategy report: ${error.message || error}`);
    }
  };


