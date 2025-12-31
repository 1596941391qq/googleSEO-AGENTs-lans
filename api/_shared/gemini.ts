// Shared Gemini API service for Vercel serverless functions
import { KeywordData, ProbabilityLevel, SEOStrategyReport, TargetLanguage, SerpSnippet } from "./types.js";
import { fetchSerpResults } from "./serp.js";

const PROXY_BASE_URL = process.env.GEMINI_PROXY_URL || 'https://api.302.ai';
const API_KEY = process.env.GEMINI_API_KEY || 'sk-BMlZyFmI7p2DVrv53P0WOiigC4H6fcgYTevils2nXkW0Wv9s';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

interface GeminiConfig {
  model?: string;
  responseMimeType?: string;
  responseSchema?: any;
}

export async function callGeminiAPI(prompt: string, systemInstruction?: string, config?: GeminiConfig) {
  if (!API_KEY || API_KEY.trim() === '') {
    console.error('GEMINI_API_KEY is not configured');
    throw new Error('GEMINI_API_KEY is not configured. Please set it in Vercel environment variables.');
  }

  const url = `${PROXY_BASE_URL}/v1/v1beta/models/${config?.model || MODEL}:generateContent`;

  const contents: any[] = [];
  if (systemInstruction) {
    contents.push({
      role: 'user',
      parts: [{ text: systemInstruction }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I will follow these instructions.' }]
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const requestBody: any = {
    contents: contents,
    generationConfig: {
      maxOutputTokens: 8192
    }
  };

  if (config?.responseMimeType === 'application/json') {
    if (!prompt.includes('JSON') && !prompt.includes('json')) {
      contents[contents.length - 1].parts[0].text += '\n\nPlease respond with valid JSON only, no markdown formatting.';
    }
    if (config?.responseSchema) {
      requestBody.generationConfig.responseSchema = config.responseSchema;
      requestBody.generationConfig.responseMimeType = 'application/json';
    }
  }

  try {
    // Add timeout for fetch (600 seconds per request - increased to avoid premature timeouts)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 600 seconds = 10 minutes

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('API request timeout (600s)');
      }
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 响应错误:', response.status, errorText);
      throw new Error(`API 请求失败: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    let content = '';

    if (data.error) {
      console.error('API 返回错误:', data.error);
      throw new Error(`API 错误: ${data.error}`);
    }

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        content = candidate.content.parts[0].text || '';
      }
    }

    if (!content && data.output) {
      content = data.output;
    }

    if (!content) {
      console.warn('⚠️  API 响应中没有找到文本内容');
      throw new Error('API 响应中没有找到文本内容');
    }

    return {
      text: content,
      raw: data,
    };
  } catch (error: any) {
    console.error('调用 Gemini API 失败:', error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.substring(0, 500)
    });
    throw error;
  } finally {
    // Ensure function completes even if there's an error
  }
}

/**
 * Extract JSON from text that may contain thinking process or markdown
 */
function extractJSON(text: string): string {
  if (!text) return '{}';

  // Remove markdown code blocks
  text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  // Try to find JSON object or array
  // Look for first { or [ and last } or ]
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');

  let startIdx = -1;
  let endIdx = -1;
  let isArray = false;

  if (firstBrace !== -1 && firstBracket !== -1) {
    // Both found, use the one that comes first
    if (firstBrace < firstBracket) {
      startIdx = firstBrace;
      endIdx = lastBrace;
      isArray = false;
    } else {
      startIdx = firstBracket;
      endIdx = lastBracket;
      isArray = true;
    }
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
    endIdx = lastBrace;
    isArray = false;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = lastBracket;
    isArray = true;
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const extracted = text.substring(startIdx, endIdx + 1).trim();
    // Basic validation: check if it starts and ends correctly
    if ((isArray && extracted.startsWith('[') && extracted.endsWith(']')) ||
      (!isArray && extracted.startsWith('{') && extracted.endsWith('}'))) {
      return extracted;
    }
  }

  // If no valid JSON found, return default based on context
  // For analyze-ranking, we expect an object, so return {}
  // For generate-keywords, we expect an array, but we can't know context here
  // So we'll return the cleaned text and let the caller handle it
  return text.trim() || '{}';
}

const getLanguageName = (code: TargetLanguage): string => {
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
    default: return 'English';
  }
};

export const translatePromptToSystemInstruction = async (userPrompt: string): Promise<string> => {
  const response = await callGeminiAPI(
    `Translate and optimize the following prompt into a high-quality System Instruction for an AI SEO Agent targeting Google Search. Keep the instruction in English for better model performance:\n\n"${userPrompt}"`
  );
  return response.text || userPrompt;
};

export const translateText = async (text: string, targetLanguage: 'zh' | 'en'): Promise<string> => {
  const langName = targetLanguage === 'zh' ? 'Chinese' : 'English';
  const response = await callGeminiAPI(
    `Translate the following system instruction text into ${langName} for reference purposes. Preserve the original meaning and formatting:\n\n${text}`
  );
  return response.text || text;
};

/**
 * Translate a keyword to target market language
 * Used for batch translation and analysis feature
 */
export const translateKeywordToTarget = async (
  keyword: string,
  targetLanguage: TargetLanguage
): Promise<{ original: string; translated: string; translationBack: string }> => {
  const targetLangName = getLanguageName(targetLanguage);

  const prompt = `Translate the following keyword into ${targetLangName} for SEO purposes.
Provide ONLY the translated keyword that would be commonly searched by users in that market.
Do not explain, just provide the direct translation.

Keyword: "${keyword}"

Respond with ONLY the translated keyword in ${targetLangName}.`;

  try {
    const response = await callGeminiAPI(prompt);
    const translated = response.text.trim();

    return {
      original: keyword,
      translated: translated,
      translationBack: keyword // We can keep the original as the "back translation" for reference
    };
  } catch (error: any) {
    console.error(`Translation failed for keyword "${keyword}":`, error);
    // Return original if translation fails
    return {
      original: keyword,
      translated: keyword,
      translationBack: keyword
    };
  }
};

export const generateKeywords = async (
  seedKeyword: string,
  targetLanguage: TargetLanguage,
  systemInstruction: string,
  existingKeywords: string[] = [],
  roundIndex: number = 1,
  wordsPerRound: number = 10,
  miningStrategy: 'horizontal' | 'vertical' = 'horizontal',
  userSuggestion: string = '',
  uiLanguage: 'en' | 'zh' = 'en',
  industry?: string,
  additionalSuggestions?: string
): Promise<KeywordData[]> => {
  const targetLangName = getLanguageName(targetLanguage);
  const translationLang = uiLanguage === 'zh' ? 'Chinese' : 'English';

  // Build strategy-specific guidance
  let strategyGuidance = '';
  if (miningStrategy === 'horizontal') {
    strategyGuidance = `
HORIZONTAL MINING STRATEGY (Broad Topics):
- Explore DIFFERENT topics related to the seed keyword
- Think about PARALLEL markets, adjacent industries, complementary products
- Find RELATED but DISTINCT niches
- Example: If seed is "dog food", explore "pet accessories", "pet training", "pet health"`;
  } else {
    strategyGuidance = `
VERTICAL MINING STRATEGY (Deep Dive):
- Go DEEPER into the SAME topic as the seed keyword
- Find long-tail variations, specific use cases, detailed sub-categories
- Target more specific audience segments within the same niche
- Example: If seed is "dog food", explore "grain-free dog food", "senior dog nutrition", "large breed puppy food"`;
  }

  // Add industry-specific guidance if provided
  let industryGuidance = '';
  if (industry && industry.trim()) {
    industryGuidance = `

USER INDUSTRY CONTEXT:
The user is focusing on the "${industry}" industry.
This is an excellent choice! The ${industry} industry shows tremendous potential and growth opportunities.

Please tailor keyword suggestions specifically for this industry by considering:
- Industry-specific terminology and jargon
- Common pain points and challenges in this industry
- Long-tail question keywords relevant to this industry
- Competitor comparison terms
- Industry trends and emerging topics

This is crucial for generating highly relevant and targeted keywords.`;
  }

  // Add user suggestion if provided
  let userGuidance = '';
  if (userSuggestion && userSuggestion.trim()) {
    userGuidance = `

USER GUIDANCE FOR THIS ROUND:
${userSuggestion}

Please incorporate the user's guidance into your keyword generation.`;
  }

  // Add additional suggestions from mining config
  if (additionalSuggestions && additionalSuggestions.trim()) {
    userGuidance += `

ADDITIONAL USER SUGGESTIONS:
${additionalSuggestions}

Please incorporate these additional requirements into your keyword generation.`;
  }

  let promptContext = "";

  if (roundIndex === 1) {
    promptContext = `Generate ${wordsPerRound} high-potential ${targetLangName} SEO keywords for the seed term: "${seedKeyword}". Focus on commercial and informational intent.
${strategyGuidance}${industryGuidance}${userGuidance}

CRITICAL: Return ONLY a valid JSON array. Do NOT include any explanations, thoughts, or markdown formatting. Return ONLY the JSON array.

Return a JSON array with objects containing:
- keyword: The keyword in ${targetLangName}
- translation: Meaning in ${translationLang} (must be in ${translationLang} language)
- intent: One of "Informational", "Transactional", "Local", "Commercial"
- volume: Estimated monthly searches (number)

Example format:
${uiLanguage === 'zh' ? '[{"keyword": "example", "translation": "示例", "intent": "Informational", "volume": 1000}]' : '[{"keyword": "example", "translation": "example meaning", "intent": "Informational", "volume": 1000}]'}`;
  } else {
    promptContext = `
The user is looking for "Blue Ocean" opportunities in the ${targetLangName} market.
We have already generated these: ${existingKeywords.slice(-20).join(', ')}.

CRITICAL: Do NOT generate similar words.
Think LATERALLY. Use the "SCAMPER" method.
Example: If seed is "AI Pet Photos", think "Pet ID Cards", "Fake Dog Passport", "Cat Genealogy".
${strategyGuidance}${industryGuidance}${userGuidance}

Generate ${wordsPerRound} NEW, UNEXPECTED, but SEARCHABLE keywords related to "${seedKeyword}" in ${targetLangName}.

CRITICAL: Return ONLY a valid JSON array. Do NOT include any explanations, thoughts, or markdown formatting. Return ONLY the JSON array.

Return a JSON array with objects containing:
- keyword: The keyword in ${targetLangName}
- translation: Meaning in ${translationLang} (must be in ${translationLang} language)
- intent: One of "Informational", "Transactional", "Local", "Commercial"
- volume: Estimated monthly searches (number)`;
  }

  try {
    const response = await callGeminiAPI(promptContext, systemInstruction, {
      responseMimeType: "application/json"
    });

    let text = response.text || "[]";

    // Save original response before extraction
    const originalResponse = text;

    text = extractJSON(text);

    // Validate extracted JSON
    if (!text || text.trim() === '') {
      console.error("Empty JSON response from model");
      return { keywords: [], rawResponse: originalResponse };
    }

    let rawData;
    try {
      rawData = JSON.parse(text);
    } catch (e: any) {
      console.error("JSON Parse Error in generateKeywords:", e.message);
      console.error("Extracted text (first 500 chars):", text.substring(0, 500));
      return { keywords: [], rawResponse: originalResponse };
    }

    // Validate it's an array
    if (!Array.isArray(rawData)) {
      console.error("Response is not a JSON array:", typeof rawData);
      return { keywords: [], rawResponse: originalResponse };
    }

    const keywords = rawData.map((item: any, index: number) => ({
      ...item,
      id: `kw-${Date.now()}-${index}`,
    }));

    return { keywords, rawResponse: originalResponse };
  } catch (error: any) {
    console.error("Generate Keywords Error:", error);
    return { keywords: [], rawResponse: "Error: " + error.message };
  }
};

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
      // Continue with empty SERP data - analysis will proceed with estimation
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
⚠️ NO DATA FOUND - This is a BLUE OCEAN SIGNAL!

When SE Ranking has no data for a keyword, it typically means:
1. Very low or zero search volume in their database
2. New, emerging, or highly niche keyword
3. Little to no advertising competition
4. **This is a POSITIVE indicator for ranking probability**

ACTION: Give this keyword a BONUS toward HIGH probability, as it indicates low competition and untapped opportunity.`
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
  * **BONUS**: SE Ranking shows NO DATA (blue ocean signal)

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
- Consider SE Ranking's "no data" as a strong positive signal
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
      text = extractJSON(text);

      // Validate extracted JSON
      if (!text || text.trim() === '') {
        throw new Error("Empty JSON response from model");
      }

      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch (e: any) {
        console.error("JSON Parse Error for keyword:", keywordData.keyword);
        console.error("Extracted text (first 500 chars):", text.substring(0, 500));
        console.error("Parse error:", e.message);
        throw new Error(`Invalid JSON response from model: ${e.message}`);
      }

      // Validate required fields
      if (typeof analysis !== 'object' || analysis === null) {
        throw new Error("Response is not a valid JSON object");
      }

      // Use real SERP data if available, otherwise use analysis results
      if (serpResults.length > 0) {
        // Override with real SERP data
        analysis.topSerpSnippets = serpResults.slice(0, 3).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet
        }));
        if (serpResultCount > 0) {
          analysis.serpResultCount = serpResultCount;
        }
      }

      // Ensure required fields exist with defaults
      if (typeof analysis.serpResultCount !== 'number') {
        analysis.serpResultCount = serpResultCount > 0 ? serpResultCount : -1;
      }
      if (!analysis.topDomainType) {
        analysis.topDomainType = 'Unknown';
      }
      if (!analysis.probability) {
        analysis.probability = ProbabilityLevel.MEDIUM;
      }
      if (!analysis.reasoning) {
        analysis.reasoning = 'Analysis completed';
      }
      if (!analysis.searchIntent) {
        analysis.searchIntent = 'Unknown search intent';
      }
      if (!analysis.intentAnalysis) {
        analysis.intentAnalysis = 'Intent analysis not available';
      }
      if (!Array.isArray(analysis.topSerpSnippets)) {
        analysis.topSerpSnippets = serpResults.length > 0
          ? serpResults.slice(0, 3).map(r => ({ title: r.title, url: r.url, snippet: r.snippet }))
          : [];
      }

      if (analysis.serpResultCount === 0) {
        analysis.topSerpSnippets = [];
      }

      // Only auto-assign HIGH for truly zero results (Blue Ocean opportunity)
      if (typeof analysis.serpResultCount === 'number' && analysis.serpResultCount === 0) {
        analysis.probability = ProbabilityLevel.HIGH;
        analysis.reasoning = `Blue Ocean! Zero indexed results found - this is a completely untapped keyword.`;
        analysis.topDomainType = 'Weak Page';
      }

      return { ...keywordData, ...analysis };

    } catch (error) {
      console.error(`Analysis failed for ${keywordData.keyword}:`, error);
      return {
        ...keywordData,
        probability: ProbabilityLevel.LOW,
        reasoning: "API Analysis Failed (Timeout or Rate Limit).",
        topDomainType: "Unknown",
        serpResultCount: -1
      };
    }
  };

  const results: KeywordData[] = [];
  const BATCH_SIZE = 5; // Increased batch size to reduce total processing time
  const BATCH_DELAY = 300; // Reduced delay between batches (300ms)

  // Process keywords in batches with timeout protection
  const startTime = Date.now();
  // maxDuration is set to 900 seconds in vercel.json (Enterprise plan max)
  // Use 880 seconds as safe buffer (leave 20s for cleanup and response)
  const MAX_EXECUTION_TIME = 880000; // 880 seconds (safe buffer for 900s limit)

  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    // Check if we're approaching timeout
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_EXECUTION_TIME) {
      console.warn(`Approaching timeout, processed ${i}/${keywords.length} keywords`);
      // Return partial results with error markers for remaining keywords
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

    // Process batch with individual timeout protection
    const batchResults = await Promise.allSettled(
      batch.map(k => analyzeSingleKeyword(k))
    );

    // Extract results, handling both fulfilled and rejected promises
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

    // Reduced delay between batches, only if not the last batch
    if (i + BATCH_SIZE < keywords.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  return results;
};

/**
 * Extract core keywords from SEO strategy report for SERP verification
 */
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

    // Try to parse JSON
    const jsonMatch = text.match(/\[.*?\]/s);
    if (jsonMatch) {
      const keywords = JSON.parse(jsonMatch[0]);
      return keywords.filter((k: string) => k && k.trim().length > 0).slice(0, 8);
    }

    // Fallback: extract from text
    const extracted = text.split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').replace(/["\[\],]/g, '').trim())
      .filter(line => line.length > 0 && line.length < 50)
      .slice(0, 8);

    if (extracted.length > 0) {
      return extracted;
    }

    // Ultimate fallback
    return [report.targetKeyword];
  } catch (error: any) {
    console.error('Failed to extract core keywords:', error);
    // Return target keyword as fallback
    return [report.targetKeyword];
  }
};

export const generateDeepDiveStrategy = async (
  keyword: KeywordData,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage,
  customPrompt?: string
): Promise<SEOStrategyReport> => {
  const uiLangName = uiLanguage === 'zh' ? 'Chinese' : 'English';
  const targetLangName = getLanguageName(targetLanguage);

  // Use custom prompt if provided, otherwise use default
  const systemInstruction = customPrompt || `
You are a Strategic SEO Content Manager for Google ${targetLangName}.
Your mission: Design a comprehensive content strategy for this keyword.

Content Strategy Requirements:
1. **Page Title (H1)**: Compelling, keyword-rich title that matches search intent
2. **Meta Description**: 150-160 characters, persuasive, includes target keyword
3. **URL Slug**: Clean, readable, keyword-focused URL structure
4. **User Intent**: Detailed analysis of what users expect when searching this keyword
5. **Content Structure**: Logical H2 sections that cover the topic comprehensively
6. **Long-tail Keywords**: Semantic variations and related queries to include
7. **Recommended Word Count**: Based on SERP analysis and topic complexity

Focus on creating content that:
- Directly answers user search intent
- Covers the topic more thoroughly than current top-ranking pages
- Includes natural keyword variations
- Provides genuine value to readers`;

  const prompt = `
Create a detailed Content Strategy Report for the keyword: "${keyword.keyword}".

Target Language: ${targetLangName}
User Interface Language: ${uiLangName}

Your goal is to outline a page that WILL rank #1 on Google.

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
    text = extractJSON(text);

    // Validate extracted JSON
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

    // Validate it's an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error("Response is not a valid JSON object");
    }

    return parsed;
  } catch (error: any) {
    console.error("Deep Dive Error:", error);
    throw new Error(`Failed to generate strategy report: ${error.message || error}`);
  }
};

/**
 * Search Google SERP for a keyword (wrapper for fetchSerpResults)
 * Returns SERP snippets in a simple array format
 */
export const searchGoogleSerp = async (
  keyword: string,
  targetLanguage: TargetLanguage
): Promise<SerpSnippet[]> => {
  try {
    const serpData = await fetchSerpResults(keyword, targetLanguage);
    return serpData.results.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet
    }));
  } catch (error: any) {
    console.error(`SERP search failed for "${keyword}":`, error.message);
    return []; // Return empty array on failure
  }
};

/**
 * Call SE Ranking API to get keyword research data
 * Returns keyword difficulty, volume, CPC, competition, and trends
 */
const SERANKING_API_KEY = 'a3eefe61-1e2b-0939-f0c9-d01d9a957852';
const SERANKING_ENDPOINT = 'https://api.seranking.com/v1/keywords/export';

interface SErankingResponse {
  is_data_found: boolean;
  keyword: string;
  volume?: number;
  cpc?: number;
  competition?: number;
  difficulty?: number;
  history_trend?: { [date: string]: number };
}

export const fetchSErankingData = async (
  keywords: string[],
  source: string = 'us'
): Promise<SErankingResponse[]> => {
  try {
    console.log(`[SE Ranking] Fetching data for ${keywords.length} keywords: ${keywords.join(', ')}`);

    // Build multipart/form-data body manually
    // SE Ranking API requires keywords to be quoted: keywords[]="keyword"
    const boundary = `----FormBoundary${Math.random().toString(36).substr(2)}`;
    const formParts: string[] = [];

    // Add each keyword with quotes
    keywords.forEach(keyword => {
      formParts.push(`--${boundary}\r\n`);
      formParts.push(`Content-Disposition: form-data; name="keywords[]"\r\n\r\n`);
      formParts.push(`"${keyword}"\r\n`);
    });

    // Add cols field with quotes
    formParts.push(`--${boundary}\r\n`);
    formParts.push(`Content-Disposition: form-data; name="cols"\r\n\r\n`);
    formParts.push(`"keyword,volume,cpc,competition,difficulty,history_trend"\r\n`);

    // End boundary
    formParts.push(`--${boundary}--\r\n`);

    const body = formParts.join('');

    const response = await fetch(`${SERANKING_ENDPOINT}?source=${source}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${SERANKING_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SE Ranking] API error:', response.status, errorText);
      throw new Error(`SE Ranking API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[SE Ranking] Successfully retrieved data for ${data.length} keywords`);
    return data;
  } catch (error: any) {
    console.error('[SE Ranking] API call failed:', error);
    throw error;
  }
};


