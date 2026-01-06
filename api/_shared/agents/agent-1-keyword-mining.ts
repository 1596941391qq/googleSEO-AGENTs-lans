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
 * 清理 JSON 响应中的 Google 搜索引用标记
 */
function cleanSearchReferences(text: string): string {
  if (!text) return text;
  
  // 移除常见的搜索引用格式
  // 1. 移除方括号引用，如 [1], [2], [source]
  text = text.replace(/\[\d+\]/g, '');
  text = text.replace(/\[source\]/gi, '');
  text = text.replace(/\[citation\]/gi, '');
  
  // 2. 移除括号引用，如 (source: url), (from: ...)
  text = text.replace(/\(source[^)]*\)/gi, '');
  text = text.replace(/\(from[^)]*\)/gi, '');
  text = text.replace(/\(citation[^)]*\)/gi, '');
  
  // 3. 移除独立出现的 URL（不在引号内的）
  text = text.replace(/(?<!["'])\bhttps?:\/\/[^\s)]+(?!["'])/g, '');
  
  // 4. 移除引用前缀
  text = text.replace(/^(根据|基于|来自).{0,20}(搜索结果|搜索|资料)[:：]\s*/i, '');
  text = text.replace(/^(According to|Based on|From).{0,30}(search results|search|sources)[:：]\s*/i, '');
  
  // 5. 移除 Markdown 标题和思考过程
  text = text.replace(/^\*\*[^*]+\*\*\s*/gm, ''); // 移除 **标题** 格式
  text = text.replace(/^#+\s+.*$/gm, ''); // 移除 Markdown 标题
  text = text.replace(/^(Alright|Okay|Right|So|Let's|I'm|My|The|This|We're|Given|As|With).*$/gmi, ''); // 移除常见的思考过程开头
  
  // 6. 移除引用标记行
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (/^(\[\d+\]|\(source|\(from|\(citation|来源|参考)/i.test(trimmed)) return false;
    if (/^https?:\/\/.+$/.test(trimmed)) return false;
    if (/^\*\*[^*]+\*\*/.test(trimmed)) return false; // 移除 Markdown 粗体标题行
    return true;
  });
  
  return cleanedLines.join('\n').trim();
}

/**
 * 提取JSON内容（支持Markdown格式和搜索引用清理）
 */
function extractJSON(text: string): string {
  if (!text) return '[]';

  // 0. 先清理搜索引用标记和思考过程
  text = cleanSearchReferences(text);

  // 1. 移除 Markdown 代码块标记
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // 2. 尝试找到 JSON 数组或对象
  const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    let extracted = jsonMatch[1];
    
    // 使用更精确的方法提取完整的 JSON
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

          if (braceCount === 0 && bracketCount === 0 && i > startIdx) {
            return extracted.substring(startIdx, i + 1);
          }
        }
      }
    }

    return extracted;
  }

  return text.trim() || '[]';
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

  // Check if this is website audit mode (based on additionalSuggestions containing website audit report)
  const isWebsiteAuditMode = additionalSuggestions && additionalSuggestions.includes('--- Website Audit Analysis Report ---');
  
  // Add additional suggestions from mining config
  let websiteAuditReport = '';
  let regularAdditionalSuggestions = '';
  
  if (additionalSuggestions && additionalSuggestions.trim()) {
    if (isWebsiteAuditMode) {
      // Extract the website audit report
      const reportMatch = additionalSuggestions.match(/--- Website Audit Analysis Report ---\n([\s\S]*?)\n--- End of Report ---/);
      if (reportMatch) {
        websiteAuditReport = reportMatch[1].trim();
      } else {
        // Fallback: use the entire additionalSuggestions as report
        websiteAuditReport = additionalSuggestions.replace(/--- Website Audit Analysis Report ---\n?/g, '').replace(/\n?--- End of Report ---/g, '').trim();
      }
    } else {
      regularAdditionalSuggestions = additionalSuggestions;
      userGuidance += `

ADDITIONAL USER SUGGESTIONS:
${regularAdditionalSuggestions}

Please incorporate these additional requirements into your keyword generation.`;
    }
  }

  let promptContext = "";

  // Website Audit Mode: Generate keywords based on analysis report, no seed keyword needed
  if (isWebsiteAuditMode && roundIndex === 1 && websiteAuditReport) {
    promptContext = `You are generating SEO keywords based on a Website Audit Analysis Report. This report contains a detailed analysis of an existing website's content, competitor keywords, and identified opportunities.

WEBSITE AUDIT ANALYSIS REPORT:
${websiteAuditReport}

TASK: Based on the above analysis report, generate ${wordsPerRound} high-potential ${targetLangName} SEO keywords that align with the opportunities identified in the report.

KEY REQUIREMENTS:
1. Focus on keywords that address the content gaps, optimization opportunities, and expansion directions mentioned in the report
2. Prioritize keywords with commercial and informational intent
3. Ensure keywords are relevant to the website's existing content themes${industry ? ` and the ${industry} industry` : ''}
4. Consider the competitor analysis and identified opportunities
5. ${miningStrategy === 'horizontal' ? 'Use horizontal mining: explore parallel or related broad topic areas to existing content themes' : 'Use vertical mining: explore long-tail variations and specific use cases of existing themes'}
${industryGuidance}

IMPORTANT: 
- Extract keywords directly from the opportunities mentioned in the report
- Focus on actionable keywords that the website can realistically target
- Consider search volume and competition level when generating keywords

CRITICAL: Return ONLY a valid JSON array. Do NOT include any explanations, thoughts, or markdown formatting. Return ONLY the JSON array.

Return a JSON array with objects containing:
- keyword: The keyword in ${targetLangName}
- translation: Meaning in ${translationLang} (must be in ${translationLang} language)
- intent: One of "Informational", "Transactional", "Local", "Commercial"
- volume: Estimated monthly searches (number)

Example format:
${uiLanguage === 'zh' ? '[{"keyword": "example", "translation": "示例", "intent": "Informational", "volume": 1000}]' : '[{"keyword": "example", "translation": "example meaning", "intent": "Informational", "volume": 1000}]'}`;
  } else if (roundIndex === 1) {
    // Regular mode: Use seed keyword
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
