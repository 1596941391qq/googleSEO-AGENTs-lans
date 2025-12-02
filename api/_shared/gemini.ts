// Shared Gemini API service for Vercel serverless functions
import { KeywordData, ProbabilityLevel, SEOStrategyReport, TargetLanguage } from "./types.js";

const PROXY_BASE_URL = process.env.GEMINI_PROXY_URL || 'https://api.302.ai';
const API_KEY = process.env.GEMINI_API_KEY || 'sk-BMlZyFmI7p2DVrv53P0WOiigC4H6fcgYTevils2nXkW0Wv9s';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

interface GeminiConfig {
  model?: string;
  responseMimeType?: string;
  responseSchema?: any;
}

async function callGeminiAPI(prompt: string, systemInstruction?: string, config?: GeminiConfig) {
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
    // Add timeout for fetch (25 seconds per request)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

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
        throw new Error('API request timeout (25s)');
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

export const generateKeywords = async (
  seedKeyword: string,
  targetLanguage: TargetLanguage,
  systemInstruction: string,
  existingKeywords: string[] = [],
  roundIndex: number = 1
): Promise<KeywordData[]> => {
  const targetLangName = getLanguageName(targetLanguage);

  let promptContext = "";

  if (roundIndex === 1) {
    promptContext = `Generate 10 high-potential ${targetLangName} SEO keywords for the seed term: "${seedKeyword}". Focus on commercial and informational intent.

CRITICAL: Return ONLY a valid JSON array. Do NOT include any explanations, thoughts, or markdown formatting. Return ONLY the JSON array.

Return a JSON array with objects containing:
- keyword: The keyword in ${targetLangName}
- translation: Meaning in English/Chinese
- intent: One of "Informational", "Transactional", "Local", "Commercial"
- volume: Estimated monthly searches (number)

Example format:
[{"keyword": "example", "translation": "示例", "intent": "Informational", "volume": 1000}]`;
  } else {
    promptContext = `
The user is looking for "Blue Ocean" opportunities in the ${targetLangName} market. 
We have already generated these: ${existingKeywords.slice(-20).join(', ')}.

CRITICAL: Do NOT generate similar words.
Think LATERALLY. Use the "SCAMPER" method.
Example: If seed is "AI Pet Photos", think "Pet ID Cards", "Fake Dog Passport", "Cat Genealogy".

Generate 10 NEW, UNEXPECTED, but SEARCHABLE keywords related to "${seedKeyword}" in ${targetLangName}.

CRITICAL: Return ONLY a valid JSON array. Do NOT include any explanations, thoughts, or markdown formatting. Return ONLY the JSON array.

Return a JSON array with objects containing:
- keyword: The keyword in ${targetLangName}
- translation: Meaning in English/Chinese
- intent: One of "Informational", "Transactional", "Local", "Commercial"
- volume: Estimated monthly searches (number)`;
  }

  try {
    const response = await callGeminiAPI(promptContext, systemInstruction, {
      responseMimeType: "application/json"
    });

    let text = response.text || "[]";
    text = extractJSON(text);

    // Validate extracted JSON
    if (!text || text.trim() === '') {
      console.error("Empty JSON response from model");
      return [];
    }

    let rawData;
    try {
      rawData = JSON.parse(text);
    } catch (e: any) {
      console.error("JSON Parse Error in generateKeywords:", e.message);
      console.error("Extracted text (first 500 chars):", text.substring(0, 500));
      return [];
    }

    // Validate it's an array
    if (!Array.isArray(rawData)) {
      console.error("Response is not a JSON array:", typeof rawData);
      return [];
    }

    return rawData.map((item: any, index: number) => ({
      ...item,
      id: `kw-${Date.now()}-${index}`,
    }));
  } catch (error: any) {
    console.error("Generate Keywords Error:", error);
    return [];
  }
};

export const analyzeRankingProbability = async (
  keywords: KeywordData[],
  systemInstruction: string,
  uiLanguage: 'zh' | 'en' = 'en'
): Promise<KeywordData[]> => {
  const uiLangName = uiLanguage === 'zh' ? 'Chinese' : 'English';

  const analyzeSingleKeyword = async (keywordData: KeywordData): Promise<KeywordData> => {
    const fullSystemInstruction = `
${systemInstruction}

TASK: Analyze the Google SERP competition for the keyword: "${keywordData.keyword}".

Based on your knowledge, estimate:
1. How many competing pages exist for this keyword
2. What type of sites typically rank for this (Big Brand, Niche Site, Forum/Social, Weak Page, Gov/Edu)
3. The probability of ranking on page 1 (High, Medium, Low)

SCORING:
- **HIGH**: Likely < 20 strong results, Top results are Weak (Forums, Reddit, Quora, PDF, Social Media) OR Irrelevant.
- **MEDIUM**: Moderate competition, some opportunity exists.
- **LOW**: Top results are Big Brands, Wikipedia, Gov/Edu, or Exact Match Niche Sites.

IMPORTANT: Output all text fields (reasoning, topSerpSnippets titles/snippets) in ${uiLangName}. The user interface language is ${uiLanguage === 'zh' ? '中文' : 'English'}, so all explanations and descriptions must be in ${uiLangName}.

CRITICAL: Return ONLY a valid JSON object. Do NOT include any explanations, thoughts, reasoning process, or markdown formatting. Return ONLY the JSON object.

Return a JSON object:
{
  "serpResultCount": number (estimated, use -1 if unknown/many),
  "topDomainType": "Big Brand" | "Niche Site" | "Forum/Social" | "Weak Page" | "Gov/Edu" | "Unknown",
  "probability": "High" | "Medium" | "Low",
  "reasoning": "explanation string in ${uiLangName}",
  "topSerpSnippets": [{"title": "string in ${uiLangName}", "url": "string", "snippet": "string in ${uiLangName}"}]
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

      // Ensure required fields exist with defaults
      if (typeof analysis.serpResultCount !== 'number') {
        analysis.serpResultCount = -1;
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
      if (!Array.isArray(analysis.topSerpSnippets)) {
        analysis.topSerpSnippets = [];
      }

      if (analysis.serpResultCount === 0) {
        analysis.topSerpSnippets = [];
      }

      if (typeof analysis.serpResultCount === 'number' && analysis.serpResultCount >= 0 && analysis.serpResultCount < 20) {
        analysis.probability = ProbabilityLevel.HIGH;
        analysis.reasoning = `Blue Ocean! Only ${analysis.serpResultCount} indexed results found.`;
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
  // Use conservative timeout: 55s for free plan (60s limit) or 250s for Pro plan (300s limit)
  // If Pro plan is configured in vercel.json with 300s, we can use more time
  // For now, use 55s to be safe for both plans
  const MAX_EXECUTION_TIME = 55000; // 55 seconds (safe buffer for 60s limit)

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

export const generateDeepDiveStrategy = async (
  keyword: KeywordData,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage
): Promise<SEOStrategyReport> => {
  const uiLangName = uiLanguage === 'zh' ? 'Chinese' : 'English';
  const targetLangName = getLanguageName(targetLanguage);

  const prompt = `
You are a Strategic SEO Content Manager for Google ${targetLangName}. 
Create a detailed Content Strategy Report for the keyword: "${keyword.keyword}".

Target Language: ${targetLangName}
User Interface Language: ${uiLangName}

Your goal is to outline a page that WILL rank #1 on Google.

Requirements:
1. Page Title (H1): Optimized for CTR and SEO in ${targetLangName}. Provide ${uiLangName} translation.
2. URL Slug: SEO friendly (English characters preferred).
3. User Intent Summary: What is the user looking for? (Write in ${uiLangName})
4. Content Structure: List 3-5 H2 headers (${targetLangName}). Provide ${uiLangName} translations.
5. Long-tail Keywords: Generate 5 specific long-tail variations (${targetLangName}). Provide ${uiLangName} translations.
6. Word Count: Recommended length.

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
    const response = await callGeminiAPI(prompt, undefined, {
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

