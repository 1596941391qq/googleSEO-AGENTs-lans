/**
 * Agent 1: 关键词挖掘
 * 
 * 职责：生成关键词列表
 * 使用：Keyword Mining模式、Batch Analysis模式
 */

import { callGeminiAPI } from '../gemini.js';
import { KeywordData, TargetLanguage } from '../types.js';

/**
 * 获取语言名称
 */
function getLanguageName(language: TargetLanguage): string {
  const languageMap: Record<TargetLanguage, string> = {
    'en': 'English',
    'zh': 'Chinese',
    'ko': 'Korean',
    'ja': 'Japanese',
    'fr': 'French',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'id': 'Indonesian',
    'es': 'Spanish',
    'ar': 'Arabic',
  };
  return languageMap[language] || 'English';
}

/**
 * 提取JSON内容
 */
function extractJSON(text: string): string {
  // Try to find JSON array or object
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  return text.trim();
}

/**
 * 生成关键词
 * 
 * @param seedKeyword - 种子关键词
 * @param targetLanguage - 目标语言
 * @param systemInstruction - 系统指令（prompt）
 * @param existingKeywords - 已有关键词列表
 * @param roundIndex - 轮次索引
 * @param wordsPerRound - 每轮生成数量
 * @param miningStrategy - 挖掘策略（horizontal/vertical）
 * @param userSuggestion - 用户建议
 * @param uiLanguage - UI语言
 * @param industry - 行业（可选）
 * @param additionalSuggestions - 额外建议（可选）
 * @returns 关键词数据数组
 */
export async function generateKeywords(
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
): Promise<{ keywords: KeywordData[]; rawResponse: string }> {
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
      responseMimeType: "application/json",
      enableGoogleSearch: true  // 启用联网搜索以获取最新关键词趋势
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

    return { 
      keywords, 
      rawResponse: originalResponse,
      searchResults: response.searchResults 
    };
  } catch (error: any) {
    console.error("Generate Keywords Error:", error);
    return { keywords: [], rawResponse: "Error: " + error.message };
  }
}
