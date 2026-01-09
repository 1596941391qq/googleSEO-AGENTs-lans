/**
 * Keyword Mining 服务
 * 
 * 职责：编排 Keyword Mining 流程
 * 
 * 设计原则：每个步骤都是独立函数，可以单独测试
 */

import { generateKeywords } from '../agents/agent-1-keyword-mining.js';
import { fetchDataForSEOData, fetchKeywordData } from '../tools/dataforseo.js';
import { analyzeRankingProbability } from '../agents/agent-2-seo-researcher.js';
import { KeywordData, TargetLanguage } from '../types.js';

/**
 * Keyword Mining 选项
 */
export interface KeywordMiningOptions {
  seedKeyword: string;
  targetLanguage: TargetLanguage;
  systemInstruction: string;
  existingKeywords?: string[];
  roundIndex?: number;
  wordsPerRound?: number;
  miningStrategy?: 'horizontal' | 'vertical';
  userSuggestion?: string;
  uiLanguage?: 'zh' | 'en';
  industry?: string;
  additionalSuggestions?: string;
  analyzeRanking?: boolean;
  analyzePrompt?: string;
  websiteUrl?: string;
  websiteDR?: number;
  searchEngine?: 'google' | 'baidu' | 'bing' | 'yandex';
  onProgress?: (message: string) => void;
}

/**
 * Keyword Mining 结果
 */
export interface KeywordMiningResult {
  keywords: KeywordData[];
  count: number;
  seedKeyword: string;
  targetLanguage: TargetLanguage;
  roundIndex: number;
  rawResponse?: string;
}

// ============================================================================
// 独立步骤函数（可单独测试）
// ============================================================================

/**
 * Step 1: 生成关键词
 * 可单独测试
 */
export async function generateKeywordsForMining(
  seedKeyword: string,
  targetLanguage: TargetLanguage,
  systemInstruction: string,
  existingKeywords: string[] = [],
  roundIndex: number = 1,
  wordsPerRound: number = 10,
  miningStrategy: 'horizontal' | 'vertical' = 'horizontal',
  userSuggestion: string = '',
  uiLanguage: 'zh' | 'en' = 'en',
  industry?: string,
  additionalSuggestions?: string,
  onProgress?: (message: string) => void
): Promise<{ keywords: KeywordData[]; rawResponse: string }> {
  return await generateKeywords(
    seedKeyword,
    targetLanguage,
    systemInstruction,
    existingKeywords,
    roundIndex,
    wordsPerRound,
    miningStrategy,
    userSuggestion,
    uiLanguage,
    industry,
    additionalSuggestions,
    onProgress
  );
}

/**
 * Step 2: 丰富关键词的 DataForSEO 数据
 * 可单独测试
 */
export async function enrichKeywordsWithDataForSEOForMining(
  keywords: KeywordData[],
  onProgress?: (message: string) => void,
  uiLanguage: 'zh' | 'en' = 'en'
): Promise<KeywordData[]> {
  try {
    const keywordStrings = keywords.map(k => k.keyword);
    onProgress?.(uiLanguage === 'zh' ? `📊 正在从 DataForSEO 获取 ${keywords.length} 个关键词的搜索量和难度数据...` : `📊 Fetching volume and difficulty for ${keywords.length} keywords from DataForSEO...`);
    
    const dataForSEOResults = await fetchKeywordData(keywordStrings, 2840, 'en');

    // 创建 DataForSEO 数据映射
    const dataForSEOMap = new Map<string, typeof dataForSEOResults[0]>();
    dataForSEOResults.forEach(data => {
      if (data.keyword) {
        dataForSEOMap.set(data.keyword.toLowerCase(), data);
      }
    });

    // 合并 DataForSEO 数据到关键词
    return keywords.map(keyword => {
      const dataForSEOData = dataForSEOMap.get(keyword.keyword.toLowerCase());
      return {
        ...keyword,
        dataForSEOData: dataForSEOData || undefined,
        serankingData: dataForSEOData || undefined // 保留向后兼容
      };
    });
  } catch (error: any) {
    console.warn(`[Keyword Mining Service] DataForSEO API call failed: ${error.message}. Continuing without DataForSEO data.`);
    // 返回原始关键词，不包含 DataForSEO 数据
    return keywords;
  }
}

// 保留别名以兼容旧代码
export const enrichKeywordsWithSERankingForMining = enrichKeywordsWithDataForSEOForMining;

/**
 * Step 3: 分析关键词排名概率
 * 可单独测试
 */
export async function analyzeKeywordsRanking(
  keywords: KeywordData[],
  analyzePrompt: string,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage,
  websiteUrl?: string,
  websiteDR?: number,
  searchEngine: 'google' | 'baidu' | 'bing' | 'yandex' = 'google',
  onProgress?: (message: string) => void
): Promise<KeywordData[]> {
  return await analyzeRankingProbability(
    keywords,
    analyzePrompt,
    uiLanguage,
    targetLanguage,
    websiteUrl,
    websiteDR,
    searchEngine,
    onProgress
  );
}

// ============================================================================
// 组合函数（调用上述独立函数）
// ============================================================================

/**
 * 执行完整的 Keyword Mining 流程
 * 
 * 这是一个组合函数，内部调用上述所有独立步骤函数
 * 如果需要单独测试某个步骤，可以直接调用对应的独立函数
 */
export async function executeKeywordMining(
  options: KeywordMiningOptions
): Promise<KeywordMiningResult> {
  const {
    seedKeyword,
    targetLanguage,
    systemInstruction,
    existingKeywords = [],
    roundIndex = 1,
    wordsPerRound = 10,
    miningStrategy = 'horizontal',
    userSuggestion = '',
    uiLanguage = 'en',
    industry,
    additionalSuggestions,
    analyzeRanking = true,
    analyzePrompt,
    websiteUrl,
    websiteDR,
    searchEngine = 'google',
    onProgress
  } = options;

  try {
    console.log(`[Keyword Mining Service] Starting keyword mining for: "${seedKeyword}" (${targetLanguage})`);

    // Step 1: 调用 Agent 1 生成关键词
    onProgress?.(uiLanguage === 'zh' ? `🚀 步骤 1: 正在生成关键词...` : `🚀 Step 1: Generating keywords...`);
    const { keywords: generatedKeywords, rawResponse } = await generateKeywordsForMining(
      seedKeyword,
      targetLanguage,
      systemInstruction,
      existingKeywords,
      roundIndex,
      wordsPerRound,
      miningStrategy,
      userSuggestion,
      uiLanguage,
      industry,
      additionalSuggestions,
      onProgress
    );

    console.log(`[Keyword Mining Service] Generated ${generatedKeywords.length} keywords`);

    // Step 2: 调用 DataForSEO 工具获取数据
    onProgress?.(uiLanguage === 'zh' ? `📊 步骤 2: 获取基础 SEO 数据...` : `📊 Step 2: Fetching base SEO data...`);
    const keywordsWithDataForSEO = await enrichKeywordsWithDataForSEOForMining(generatedKeywords, onProgress, uiLanguage);
    onProgress?.(uiLanguage === 'zh' ? `✅ 基础数据获取完成` : `✅ Base data fetched`);

    // Step 3: 使用快速排名分析工具做快速筛选（如果启用）
    let finalKeywords = keywordsWithDataForSEO;
    if (analyzeRanking) {
      console.log(`[Keyword Mining Service] Step 3: Analyzing ranking probability...`);
      try {
        const analysisPromptToUse = analyzePrompt || systemInstruction || 'Analyze SEO ranking opportunities.';
        finalKeywords = await analyzeKeywordsRanking(
          keywordsWithDataForSEO,
          analysisPromptToUse,
          uiLanguage,
          targetLanguage,
          websiteUrl,
          websiteDR,
          searchEngine
        );
        console.log(`[Keyword Mining Service] Completed ranking analysis for ${finalKeywords.length} keywords`);
      } catch (analysisError: any) {
        console.warn(`[Keyword Mining Service] Ranking analysis failed: ${analysisError.message}. Returning keywords without analysis.`);
        // 继续执行，返回未分析的关键词
      }
    } else {
      console.log(`[Keyword Mining Service] Ranking analysis skipped (analyzeRanking=false)`);
    }

    // 返回结果
    const result: KeywordMiningResult = {
      keywords: finalKeywords,
      count: finalKeywords.length,
      seedKeyword,
      targetLanguage,
      roundIndex,
      rawResponse
    };

    console.log(`[Keyword Mining Service] Completed. Returning ${result.count} keywords.`);
    return result;
  } catch (error: any) {
    console.error(`[Keyword Mining Service] Error:`, error);
    throw new Error(`Keyword Mining failed: ${error.message}`);
  }
}
