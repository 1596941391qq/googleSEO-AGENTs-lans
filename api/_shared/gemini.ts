// Shared Gemini API service for Vercel serverless functions
import { KeywordData, ProbabilityLevel, SEOStrategyReport, TargetLanguage } from "../../types.js";

const PROXY_BASE_URL = process.env.GEMINI_PROXY_URL || 'https://api.302.ai';
const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

interface GeminiConfig {
  model?: string;
  responseMimeType?: string;
  responseSchema?: any;
}

async function callGeminiAPI(prompt: string, systemInstruction?: string, config?: GeminiConfig) {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
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
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

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
    throw error;
  }
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
    text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    const rawData = JSON.parse(text);

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
  systemInstruction: string
): Promise<KeywordData[]> => {
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

Return a JSON object:
{
  "serpResultCount": number (estimated, use -1 if unknown/many),
  "topDomainType": "Big Brand" | "Niche Site" | "Forum/Social" | "Weak Page" | "Gov/Edu" | "Unknown",
  "probability": "High" | "Medium" | "Low",
  "reasoning": "explanation string",
  "topSerpSnippets": [{"title": "string", "url": "string", "snippet": "string"}]
}`;

    try {
      const response = await callGeminiAPI(
        `Analyze SEO competition for: ${keywordData.keyword}`,
        fullSystemInstruction,
        { responseMimeType: "application/json" }
      );

      let text = response.text || "{}";
      text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch (e) {
        console.error("JSON Parse Error:", text);
        throw new Error("Invalid JSON response from model");
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
  const BATCH_SIZE = 3;

  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    const batch = keywords.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(k => analyzeSingleKeyword(k)));
    results.push(...batchResults);

    if (i + BATCH_SIZE < keywords.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    return JSON.parse(text);
  } catch (error) {
    console.error("Deep Dive Error:", error);
    throw new Error("Failed to generate strategy report.");
  }
};

