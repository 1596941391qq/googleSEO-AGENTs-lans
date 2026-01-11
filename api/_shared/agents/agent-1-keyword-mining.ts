/**
 * Agent 1: 关键词挖掘
 * 
 * 职责：生成关键词列表
 * 使用：Keyword Mining模式、Batch Analysis模式
 */

import { callGeminiAPI } from '../gemini.js';
import { KeywordData, TargetLanguage } from '../types.js';
import { getKeywordMiningPrompt } from '../../../services/prompts/index.js';

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
  additionalSuggestions?: string,
  onProgress?: (message: string) => void
): Promise<{ keywords: KeywordData[]; rawResponse: string; searchResults?: any }> {
  const targetLangName = getLanguageName(targetLanguage);
  const translationLang = uiLanguage === 'zh' ? 'Chinese' : 'English';

  onProgress?.(uiLanguage === 'zh'
    ? `🧠 正在构思关键词挖掘策略 (${miningStrategy === 'horizontal' ? '横向' : '纵向'})...`
    : `🧠 Planning keyword mining strategy (${miningStrategy})...`);

  // Check if this is website audit mode (based on additionalSuggestions containing website audit report)
  const isWebsiteAuditMode = additionalSuggestions && additionalSuggestions.includes('--- Website Audit Analysis Report ---');

  // Extract website audit report if in audit mode
  let websiteAuditReport = '';
  if (additionalSuggestions && additionalSuggestions.trim() && isWebsiteAuditMode) {
    const reportMatch = additionalSuggestions.match(/--- Website Audit Analysis Report ---\n([\s\S]*?)\n--- End of Report ---/);
    if (reportMatch) {
      websiteAuditReport = reportMatch[1].trim();
    } else {
      // Fallback: use the entire additionalSuggestions as report
      websiteAuditReport = additionalSuggestions.replace(/--- Website Audit Analysis Report ---\n?/g, '').replace(/\n?--- End of Report ---/g, '').trim();
    }
  }

  // Use unified prompt configuration from services/prompts/index.ts
  const promptContext = getKeywordMiningPrompt(uiLanguage, {
    industry,
    seedKeyword,
    targetLangName,
    translationLang,
    uiLanguage,
    roundIndex,
    wordsPerRound,
    miningStrategy,
    userSuggestion,
    additionalSuggestions: isWebsiteAuditMode ? undefined : additionalSuggestions,
    existingKeywords,
    isWebsiteAuditMode,
    websiteAuditReport
  });

  try {
    onProgress?.(uiLanguage === 'zh'
      ? `🤖 正在调用 AI 进行关键词启发式挖掘...`
      : `🤖 Calling AI for heuristic keyword mining...`);

    const response = await callGeminiAPI(promptContext, systemInstruction, {
      responseMimeType: "application/json",
      onRetry: (attempt, error, delay) => {
        onProgress?.(uiLanguage === 'zh'
          ? `⚠️ 关键词生成连接异常 (尝试 ${attempt}/3)，正在 ${delay}ms 后重试...`
          : `⚠️ Keyword generation connection error (attempt ${attempt}/3), retrying in ${delay}ms...`);
      }
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
