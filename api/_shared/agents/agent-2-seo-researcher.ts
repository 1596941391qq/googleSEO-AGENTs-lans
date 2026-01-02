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
import { fetchSErankingData } from '../tools/se-ranking.js';

/**
 * 搜索引擎偏好分析结果
 */
export interface SearchPreferencesResult {
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
 * 竞争对手分析结果
 */
export interface CompetitorAnalysisResult {
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
  // Try to find JSON object or array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  return text.trim();
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
  targetLanguage: TargetLanguage = 'en'
): Promise<SearchPreferencesResult> {
  try {
    // 获取 SEO Researcher prompt
    const systemInstruction = getSEOResearcherPrompt('searchPreferences', language);

    // 构建分析提示
    const prompt = language === 'zh'
      ? `请分析关键词 "${keyword}" 在不同搜索引擎中的优化策略。

关键词：${keyword}
目标语言：${targetLanguage}

请提供详细的搜索引擎偏好分析和优化建议。`
      : `Please analyze optimization strategies for the keyword "${keyword}" across different search engines.

Keyword: ${keyword}
Target Language: ${targetLanguage}

Please provide detailed search engine preference analysis and optimization recommendations.`;

    // 调用 Gemini API
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: 'application/json'
    });

    let text = response.text || '{}';
    text = extractJSON(text);

    // 解析 JSON
    try {
      const result = JSON.parse(text);
      return result as SearchPreferencesResult;
    } catch (e: any) {
      console.error('JSON Parse Error in analyzeSearchPreferences:', e.message);
      console.error('Extracted text (first 500 chars):', text.substring(0, 500));

      // 返回默认结构
      return {
        semantic_landscape: text.substring(0, 500),
        engine_strategies: {}
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
  targetLanguage: TargetLanguage = 'en'
): Promise<CompetitorAnalysisResult> {
  try {
    // 如果没有提供 SERP 数据，则获取
    let serpResults = serpData;
    if (!serpResults) {
      console.log(`Fetching SERP results for competitor analysis: ${keyword}`);
      serpResults = await fetchSerpResults(keyword, targetLanguage);
    }

    // 获取 SEO Researcher prompt
    const systemInstruction = getSEOResearcherPrompt('competitorAnalysis', language);

    // 1. 构建 SERP 结果上下文 (Snippet based)
    const serpSnippetsContext = serpResults.results && serpResults.results.length > 0
      ? serpResults.results.slice(0, 10).map((r, i) =>
        `${i + 1}. [${r.title}](${r.url})\n   Snippet: ${r.snippet}`
      ).join('\n\n')
      : 'No SERP results available.';

    // 2. Firecrawl: 抓取 Top 3 页面的深度内容
    let deepContentContext = '';
    const topResults = serpResults.results?.slice(0, 3) || [];

    if (topResults.length > 0) {
      console.log(`[Agent 2] Scraping Top ${topResults.length} competitors for deep analysis...`);

      try {
        const scrapePromises = topResults.map(async (r, index) => {
          if (!r.url) return null;
          try {
            // Limit fetch time and allow failure without breaking everything
            const result = await scrapeWebsite(r.url, false);
            const processedContent = processScrapedContent(result.markdown || '');
            return {
              rank: index + 1,
              title: r.title,
              url: r.url,
              content: processedContent
            };
          } catch (e: any) {
            console.warn(`[Agent 2] Failed to scrape ${r.url}:`, e.message);
            return null;
          }
        });

        const scrapedData = (await Promise.all(scrapePromises)).filter(item => item !== null);

        if (scrapedData.length > 0) {
          deepContentContext = `\n\n=== DEEP DIVE: TOP COMPETITOR CONTENT ===\nI have scraped the full content of the top ${scrapedData.length} ranking pages. Use this for structural analysis:\n\n` +
            scrapedData.map(page =>
              `--- COMPETITOR #${page!.rank}: ${page!.title} ---\nURL: ${page!.url}\nCONTENT START:\n${page!.content}\nCONTENT END\n`
            ).join('\n\n');
        }
      } catch (err) {
        console.error('[Agent 2] Firecrawl scraping failed, falling back to snippets only', err);
      }
    }

    // 构建分析提示
    const prompt = language === 'zh'
      ? `请分析关键词 "${keyword}" 的 Top 10 竞争对手。
由于我已经为你抓取了前几名竞争对手的详细网页内容，请根据这些详细内容进行深度的结构化分析。

关键词：${keyword}
目标语言：${targetLanguage}

=== SERP 概览 (Top 10) ===
${serpSnippetsContext}
${deepContentContext}

任务要求：
1. **结构分析**：基于抓取的详细内容，分析 Top 页面的 H2/H3 结构。
2. **内容缺口 (Content Gap)**：找出他们遗漏了什么关键话题。
3. **字数与类型**：预估他们的字数和页面类型（博客、产品页、工具等）。
4. **制胜策略**：总结他们为什么能排在第一。

请提供详细的 JSON 输出。`
      : `Please analyze the Top 10 competitors for the keyword "${keyword}".
I have scraped the detailed web content of the top competitors for you. Please use this valid data for deep structural analysis.

Keyword: ${keyword}
Target Language: ${targetLanguage}

=== SERP OVERVIEW (Top 10) ===
${serpSnippetsContext}
${deepContentContext}

Task Requirements:
1. **Structure Analysis**: Analyze the H2/H3 structure based on the scraped deep content.
2. **Content Gap**: Identify key topics they are missing.
3. **Word Count & Type**: Estimate word count and page type (Blog, Product, Tool, etc.).
4. **Winning Formula**: Summarize why they are ranking #1.

Please provide detailed JSON output.`;

    // 调用 Gemini API
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: 'application/json'
    });

    let text = response.text || '{}';
    text = extractJSON(text);

    // 解析 JSON
    try {
      const result = JSON.parse(text);
      return result as CompetitorAnalysisResult;
    } catch (e: any) {
      console.error('JSON Parse Error in analyzeCompetitors:', e.message);
      console.error('Extracted text (first 500 chars):', text.substring(0, 500));

      // 返回默认结构
      return {
        competitor_benchmark: [],
        winning_formula: text.substring(0, 500),
        recommended_structure: []
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
  text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) return jsonMatch[1];
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

    // Add SE Ranking data context if available
    const serankingContext = keywordData.serankingData && keywordData.serankingData.is_data_found
      ? `\n\nSE RANKING KEYWORD DATA FOR "${keywordData.keyword}":
- Search Volume: ${keywordData.serankingData.volume || 'N/A'} monthly searches
- Keyword Difficulty (KD): ${keywordData.serankingData.difficulty || 'N/A'} (0-100 scale, higher = more competitive)
- CPC: $${keywordData.serankingData.cpc || 'N/A'}
- Competition: ${keywordData.serankingData.competition ? (keywordData.serankingData.competition * 100).toFixed(1) + '%' : 'N/A'}

IMPORTANT: Consider the SE Ranking Keyword Difficulty (KD) score in your analysis:
- KD 0-20: Very low competition (favors HIGH probability)
- KD 21-40: Low to moderate competition (consider MEDIUM to HIGH)
- KD 41-60: Moderate to high competition (likely MEDIUM to LOW)
- KD 61-80: High competition (likely LOW)
- KD 81-100: Very high competition (definitely LOW)

Combine the KD score with your SERP analysis to make a final judgment.`
      : keywordData.serankingData
        ? `\n\nSE RANKING KEYWORD DATA FOR "${keywordData.keyword}":
⚠️ NO DATA FOUND

**CRITICAL**: Do NOT automatically treat "no SE Ranking data" as a blue ocean signal!

When SE Ranking has no data for a keyword, it could mean:
1. **For non-English languages (${targetLanguage})**: SE Ranking's database may not have comprehensive coverage for this language. This is NORMAL and does NOT indicate a blue ocean opportunity.
2. Very low or zero search volume in their database (possible but not guaranteed)
3. New, emerging, or highly niche keyword (possible but not guaranteed)
4. Little to no advertising competition (possible but not guaranteed)

**IMPORTANT ANALYSIS RULES**:
- **For non-English target languages**: SE Ranking "no data" is often due to limited database coverage, NOT because it's a blue ocean keyword. Do NOT give bonus points for this.
- **For English keywords**: SE Ranking "no data" MIGHT indicate a blue ocean, but you MUST verify with SERP results first.
- **ALWAYS prioritize SERP analysis over SE Ranking data absence**: If SERP shows strong competition (authoritative sites, optimized content), the keyword is NOT a blue ocean regardless of SE Ranking data.
- **Only consider it a positive signal if**: SERP results ALSO show weak competition (forums, low-quality content) AND the target language is English.

ACTION: Analyze SERP results first. Do NOT automatically assign HIGH probability just because SE Ranking has no data.`
        : `\n\nNote: SE Ranking keyword data not available for this keyword (API call failed or not attempted).`;

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
${serankingContext}

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
  * **BONUS**: SE Ranking shows NO DATA - BUT ONLY if target language is English AND SERP also shows weak competition (do NOT assume blue ocean for non-English languages)

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
- **CRITICAL**: For non-English target languages (${targetLanguage}), SE Ranking "no data" is often due to limited database coverage, NOT a blue ocean signal. Do NOT treat it as positive. Always verify with SERP results first.
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
      const response = await callGeminiAPI(
        `Analyze SEO competition for: ${keywordData.keyword}`,
        fullSystemInstruction,
        { responseMimeType: "application/json" }
      );

      let text = response.text || "{}";
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
        throw new Error(`Invalid JSON response from model: ${e.message}`);
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

      return { ...keywordData, ...analysis, rawResponse: response.text };

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

  const prompt = `Extract 5-8 core keywords from this SEO content strategy that are most important for ranking verification.

Target Keyword: ${report.targetKeyword}
Page Title: ${report.pageTitleH1}
Content Structure Headers:
${report.contentStructure.map((s: any) => `- ${s.header}`).join('\n')}
Long-tail Keywords: ${report.longTailKeywords?.join(', ')}

Return ONLY a JSON array of keywords, like: ["keyword1", "keyword2", "keyword3"]
These should be in ${targetLangName} language.
Focus on:
1. The main target keyword
2. Important keywords from H2 headers
3. High-value long-tail keywords

CRITICAL: Return ONLY the JSON array, nothing else. No explanations.`;

  try {
    const response = await callGeminiAPI(prompt);
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
  competitorAnalysis?: CompetitorAnalysisResult
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

  const systemInstruction = (customPrompt || `
You are a Strategic SEO Content Manager for Google ${targetLangName}.
Your mission: Design a comprehensive content strategy that BEATS the competition.

Content Strategy Requirements:
1. **Page Title (H1)**: Compelling, keyword-rich title that matches search intent
2. **Meta Description**: 150-160 characters, persuasive, includes target keyword
3. **URL Slug**: Clean, readable, keyword-focused URL structure
4. **User Intent**: Detailed analysis of what users expect when searching this keyword
5. **Content Structure**: Logical H2 sections that cover the topic comprehensively
6. **Long-tail Keywords**: Semantic variations and related queries to include
7. **Recommended Word Count**: Based on SERP analysis and topic complexity

STRATEGIC INSTRUCTIONS:
- Review the provided COMPETITOR ANALYSIS carefully.
- Identify CONTENT GAPS and ensure your structure covers them.
- If competitors have weak content, outline a "Skyscraper" strategy.
- If competitors are strong, find a unique angle or "Blue Ocean" sub-topic.
- Your goal is to be 10x better than the current top result.
`) + analysisContext;

  const prompt = `
Create a detailed Content Strategy Report for the keyword: "${keyword.keyword}".

Target Language: ${targetLangName}
User Interface Language: ${uiLangName}

Your goal is to outline a page that WILL rank #1 on Google by exploiting competitor weaknesses found in the analysis.

CRITICAL: Return ONLY a valid JSON object. Do NOT include any explanations, thoughts, or markdown formatting. Return ONLY the JSON object.

Return a JSON object:
{
  "targetKeyword": "string",
  "pageTitleH1": "H1 in ${targetLangName}",
  "pageTitleH1_trans": "translation in ${uiLangName}",
  "metaDescription": "160 chars max in ${targetLangName}",
  "metaDescription_trans": "translation in ${uiLangName}",
  "urlSlug": "seo-friendly-slug",
  "userIntentSummary": "string",
  "contentStructure": [
    {"header": "H2 in ${targetLangName}", "header_trans": "trans", "description": "guide", "description_trans": "trans"}
  ],
  "longTailKeywords": ["keyword1", "keyword2"],
  "longTailKeywords_trans": ["trans1", "trans2"],
  "recommendedWordCount": 2000
}`;

  try {
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: "application/json"
    });

    let text = response.text || "{}";
    text = extractJSONRobust(text);

    if (!text || text.trim() === '') {
      throw new Error("Empty JSON response from model");
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      console.error("JSON Parse Error in generateDeepDiveStrategy:", e.message);
      console.error("Extracted text (first 500 chars):", text.substring(0, 500));
      throw new Error(`Invalid JSON response from model: ${e.message}`);
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error("Response is not a valid JSON object");
    }

    return parsed;
  } catch (error: any) {
    console.error("Deep Dive Error:", error);
    throw new Error(`Failed to generate strategy report: ${error.message || error}`);
  }
};


