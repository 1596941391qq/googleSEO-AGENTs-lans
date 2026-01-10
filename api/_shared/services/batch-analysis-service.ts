/**
 * Batch Analysis 服务
 * 
 * 职责：编排批量翻译和分析流程
 * 
 * 设计原则：每个步骤都是独立函数，可以单独测试
 */

import { translateKeywordToTarget } from '../gemini.js';
import { fetchKeywordData, getDataForSEOLocationAndLanguage } from '../tools/dataforseo.js';
import { analyzeRankingProbability } from '../agents/agent-2-seo-researcher.js';
import { KeywordData, TargetLanguage, IntentType, ProbabilityLevel } from '../types.js';

/**
 * Batch Analysis 选项
 */
export interface BatchAnalysisOptions {
  keywords: string | string[];
  targetLanguage: TargetLanguage;
  systemInstruction?: string;
  uiLanguage?: 'zh' | 'en';
  analyzeRanking?: boolean;
  analyzePrompt?: string;
}

/**
 * Batch Analysis 结果
 */
export interface BatchAnalysisResult {
  keywords: KeywordData[];
  translationResults: Array<{
    original: string;
    translated: string;
    translationBack: string;
  }>;
  total: number;
  targetLanguage: TargetLanguage;
}

/**
 * 翻译结果
 */
export interface TranslationResult {
  original: string;
  translated: string;
  translationBack: string;
}

// ============================================================================
// 独立步骤函数（可单独测试）
// ============================================================================

/**
 * Step 1: 解析关键词列表
 * 可单独测试
 */
export function parseKeywords(keywords: string | string[]): string[] {
  const keywordList = typeof keywords === 'string'
    ? keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    : Array.isArray(keywords)
      ? keywords.filter(k => k && typeof k === 'string' && k.trim().length > 0)
      : [];

  if (keywordList.length === 0) {
    throw new Error('No valid keywords provided');
  }

  return keywordList;
}

/**
 * Step 2: 批量翻译关键词
 * 可单独测试
 */
export async function translateKeywordsBatch(
  keywordList: string[],
  targetLanguage: TargetLanguage,
  batchSize: number = 5,
  delayBetweenBatches: number = 200
): Promise<TranslationResult[]> {
  const translatedResults: TranslationResult[] = [];

  for (let i = 0; i < keywordList.length; i += batchSize) {
    const batch = keywordList.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(keyword => translateKeywordToTarget(keyword, targetLanguage))
    );
    translatedResults.push(...batchResults);

    // 小延迟避免限流
    if (i + batchSize < keywordList.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return translatedResults;
}

/**
 * Step 3: 将翻译结果转换为 KeywordData 格式
 * 可单独测试
 */
export function convertToKeywordData(
  translatedResults: TranslationResult[]
): KeywordData[] {
  return translatedResults.map((result, index) => ({
    id: `bt-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    keyword: result.translated,
    translation: result.original,
    intent: IntentType.INFORMATIONAL,
    volume: 0,
  }));
}

/**
 * Step 4: 获取 DataForSEO 数据并合并到关键词
 * 可单独测试
 */
export async function enrichKeywordsWithDataForSEO(
  keywords: KeywordData[],
  targetLanguage: TargetLanguage = 'en'
): Promise<{
  enrichedKeywords: KeywordData[];
  skippedKeywords: KeywordData[];
}> {
  const enrichedKeywords: KeywordData[] = [];
  const skippedKeywords: KeywordData[] = [];
  const dataForSEODataMap = new Map<string, any>();

  try {
    const keywordStrings = keywords.map(k => k.keyword);

    // 将语言代码转换为 DataForSEO 的 location_code 和 language_code
    const { locationCode, languageCode } = getDataForSEOLocationAndLanguage(targetLanguage);

    const dataForSEOResults = await fetchKeywordData(keywordStrings, locationCode, languageCode);

    dataForSEOResults.forEach(data => {
      if (data.keyword) {
        dataForSEODataMap.set(data.keyword.toLowerCase(), data);
      }
    });

    for (const keyword of keywords) {
      const dataForSEOData = dataForSEODataMap.get(keyword.keyword.toLowerCase());

      if (dataForSEOData) {
        keyword.dataForSEOData = dataForSEOData;
        keyword.serankingData = {
          is_data_found: dataForSEOData.is_data_found,
          volume: dataForSEOData.volume,
          cpc: dataForSEOData.cpc,
          competition: dataForSEOData.competition,
          difficulty: dataForSEOData.difficulty,
          history_trend: dataForSEOData.history_trend,
        };

        if (dataForSEOData.volume) {
          keyword.volume = dataForSEOData.volume;
        }
      }
      // 删除预筛选逻辑：所有关键词都应进行完整 SERP 分析，而不是基于单一 KD 值预筛选
      enrichedKeywords.push(keyword);
    }
  } catch (error: any) {
    console.warn(`[Batch Analysis Service] DataForSEO API call failed: ${error.message}. Proceeding with all keywords.`);
    enrichedKeywords.push(...keywords);
  }

  return { enrichedKeywords, skippedKeywords };
}

// 保留别名以兼容旧代码
export const enrichKeywordsWithSERanking = enrichKeywordsWithDataForSEO;

/**
 * Step 5: 分析排名概率
 * 可单独测试
 */
export async function analyzeRankingForBatch(
  keywords: KeywordData[],
  analyzePrompt: string,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage
): Promise<KeywordData[]> {
  if (keywords.length === 0) {
    return [];
  }

  try {
    return await analyzeRankingProbability(
      keywords,
      analyzePrompt,
      uiLanguage,
      targetLanguage
    );
  } catch (error: any) {
    console.warn(`[Batch Analysis Service] Ranking analysis failed: ${error.message}. Returning keywords without analysis.`);
    return keywords;
  }
}

// ============================================================================
// 组合函数（调用上述独立函数）
// ============================================================================

/**
 * 执行完整的 Batch Analysis 流程
 * 
 * 这是一个组合函数，内部调用上述所有独立步骤函数
 * 如果需要单独测试某个步骤，可以直接调用对应的独立函数
 */
export async function executeBatchAnalysis(
  options: BatchAnalysisOptions
): Promise<BatchAnalysisResult> {
  const {
    keywords,
    targetLanguage,
    systemInstruction = 'Analyze SEO ranking opportunities.',
    uiLanguage = 'en',
    analyzeRanking = true,
    analyzePrompt
  } = options;

  try {
    console.log(`[Batch Analysis Service] Starting batch analysis for ${Array.isArray(keywords) ? keywords.length : 'multiple'} keywords (${targetLanguage})`);

    // Step 1: 解析关键词列表
    const keywordList = parseKeywords(keywords);
    console.log(`[Batch Analysis Service] Parsed ${keywordList.length} keywords`);

    // Step 2: 批量翻译关键词
    console.log(`[Batch Analysis Service] Step 1: Translating keywords to ${targetLanguage}...`);
    const translatedResults = await translateKeywordsBatch(keywordList, targetLanguage);
    console.log(`[Batch Analysis Service] Translated ${translatedResults.length} keywords`);

    // Step 3: 转换为 KeywordData 格式
    const keywordsForAnalysis = convertToKeywordData(translatedResults);

    // Step 4: 获取 DataForSEO 数据
    console.log(`[Batch Analysis Service] Step 2: Fetching DataForSEO data...`);
    const { enrichedKeywords, skippedKeywords } = await enrichKeywordsWithSERanking(keywordsForAnalysis);

    // Step 5: 分析排名概率（如果启用）
    let analyzedKeywords: KeywordData[] = [];
    if (analyzeRanking && enrichedKeywords.length > 0) {
      console.log(`[Batch Analysis Service] Step 3: Analyzing ranking probability for ${enrichedKeywords.length} keywords...`);
      const analysisPromptToUse = analyzePrompt || systemInstruction;
      analyzedKeywords = await analyzeRankingForBatch(
        enrichedKeywords,
        analysisPromptToUse,
        uiLanguage,
        targetLanguage
      );
      console.log(`[Batch Analysis Service] Completed ranking analysis`);
    } else {
      analyzedKeywords = enrichedKeywords;
    }

    const allKeywords = [...analyzedKeywords, ...skippedKeywords];

    // 返回结果
    const result: BatchAnalysisResult = {
      keywords: allKeywords,
      translationResults: translatedResults,
      total: allKeywords.length,
      targetLanguage
    };

    console.log(`[Batch Analysis Service] Completed. Returning ${result.total} keywords.`);
    return result;
  } catch (error: any) {
    console.error(`[Batch Analysis Service] Error:`, error);
    throw new Error(`Batch Analysis failed: ${error.message}`);
  }
}
