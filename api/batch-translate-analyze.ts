import type { VercelRequest, VercelResponse } from '@vercel/node';
import { translateKeywordToTarget } from './_shared/gemini.js';
import { analyzeRankingProbability } from './_shared/agents/agent-2-seo-researcher.js';
import { fetchKeywordData } from './_shared/tools/dataforseo.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { KeywordData, IntentType, ProbabilityLevel } from './_shared/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseRequestBody(req);
    const { 
      keywords, 
      keywordsFromAudit, 
      targetLanguage, 
      systemInstruction, 
      uiLanguage,
      targetSearchEngine = 'google', // 新增：目标搜索引擎
      websiteUrl, // 可选：用于存量拓新模式的DR对比
      websiteDR // 可选：预计算的DR
    } = body;

    // 支持两种输入方式：
    // 1. keywords (字符串): 手动输入的关键词，需要翻译
    // 2. keywordsFromAudit (数组): 来自存量拓新的关键词，已经是目标语言，跳过翻译
    let keywordList: string[] = [];
    let source: 'manual' | 'website-audit' = 'manual';

    if (keywordsFromAudit && Array.isArray(keywordsFromAudit) && keywordsFromAudit.length > 0) {
      // 方式1：来自存量拓新的关键词（已经是目标语言）
      keywordList = keywordsFromAudit.map((k: any) => {
        // 支持字符串或对象格式
        if (typeof k === 'string') return k.trim();
        if (k && typeof k === 'object' && k.keyword) return k.keyword.trim();
        return '';
      }).filter((k: string) => k.length > 0);
      source = 'website-audit';
      console.log(`[Batch Translate-Analyze] Processing ${keywordList.length} keywords from website audit (already in target language, skipping translation)`);
    } else if (keywords && typeof keywords === 'string') {
      // 方式2：手动输入的关键词（需要翻译）
      keywordList = keywords
        .split(',')
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);
      source = 'manual';
      console.log(`[Batch Translate-Analyze] Processing ${keywordList.length} manually entered keywords (will translate to ${targetLanguage})`);
    } else {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'Either "keywords" (string) or "keywordsFromAudit" (array) must be provided, along with "targetLanguage"'
      });
    }

    if (keywordList.length === 0) {
      return res.status(400).json({ error: 'No valid keywords provided' });
    }

    // Step 1: 翻译处理
    // 如果关键词来自存量拓新（已经是目标语言）→ 跳过翻译
    // 如果是手动输入 → 批量翻译这些关键词
    let keywordsForAnalysis: KeywordData[] = [];
    let translatedResults: Array<{ original: string; translated: string; translationBack: string }> = [];

    if (source === 'website-audit') {
      // 存量拓新：关键词已经是目标语言，跳过翻译
      console.log(`[Batch Translate-Analyze] Step 1: Skipping translation (keywords already in target language)`);
      
      // 如果 keywordsFromAudit 是对象数组，提取更多信息
      if (Array.isArray(keywordsFromAudit) && keywordsFromAudit[0] && typeof keywordsFromAudit[0] === 'object') {
        keywordsForAnalysis = keywordsFromAudit.map((kw: any, index: number) => ({
          id: kw.id || `audit-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          keyword: kw.keyword || '',
          translation: kw.translation || kw.keyword,
          intent: (kw.intent || IntentType.INFORMATIONAL) as IntentType,
          volume: kw.volume || 0,
          reasoning: kw.reasoning || '',
          source: 'website-audit' as const,
        })).filter((kw: KeywordData) => kw.keyword && kw.keyword.trim() !== '');
      } else {
        // 如果只是字符串数组
        keywordsForAnalysis = keywordList.map((keyword, index) => ({
          id: `audit-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          keyword: keyword,
          translation: keyword, // 已经是目标语言，translation 等于 keyword
          intent: IntentType.INFORMATIONAL,
          volume: 0,
          source: 'website-audit' as const,
        }));
      }
    } else {
      // 手动输入：需要翻译
      console.log(`[Batch Translate-Analyze] Step 1: Translating ${keywordList.length} keywords to ${targetLanguage}...`);
      
      const TRANSLATION_BATCH_SIZE = 5;

      for (let i = 0; i < keywordList.length; i += TRANSLATION_BATCH_SIZE) {
        const batch = keywordList.slice(i, i + TRANSLATION_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map((keyword: string) => translateKeywordToTarget(keyword, targetLanguage))
        );
        translatedResults.push(...batchResults);

        // Small delay between translation batches
        if (i + TRANSLATION_BATCH_SIZE < keywordList.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`[Batch Translate-Analyze] Translated ${translatedResults.length} keywords`);

      // Convert translated keywords to KeywordData format
      keywordsForAnalysis = translatedResults.map((result, index) => ({
        id: `bt-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        keyword: result.translated,
        translation: result.original, // Store original as translation for reference
        intent: IntentType.INFORMATIONAL,
        volume: 0,
        source: 'manual' as const,
      }));
    }

    // Step 2: DataForSEO 数据获取
    // 与手动输入模式相同，批量获取搜索量、难度、CPC 等数据
    console.log(`[Batch Translate-Analyze] Step 2: Fetching DataForSEO data for ${keywordsForAnalysis.length} keywords`);

    let dataForSEODataMap = new Map<string, any>();
    const keywordsToAnalyze: KeywordData[] = [];
    const skippedKeywords: KeywordData[] = [];

    try {
      const translatedKeywordsList = keywordsForAnalysis.map(k => k.keyword);
      
      // 将语言代码转换为 DataForSEO 的 location_code 和 language_code
      const { getDataForSEOLocationAndLanguage } = await import('./_shared/tools/dataforseo.js');
      const { locationCode, languageCode } = getDataForSEOLocationAndLanguage(targetLanguage);
      
      console.log(`[DataForSEO] Fetching data for ${translatedKeywordsList.length} keywords (location: ${locationCode}, language: ${languageCode}, engine: ${targetSearchEngine})`);
      
      const dataForSEOResults = await fetchKeywordData(translatedKeywordsList, locationCode, languageCode, targetSearchEngine);

      // Create a map for quick lookup (保持向后兼容性)
      dataForSEOResults.forEach(data => {
        if (data.keyword) {
          dataForSEODataMap.set(data.keyword.toLowerCase(), data);
        }
      });

      // Flag to indicate that DataForSEO API call succeeded (even if some keywords have no data)
      // This is used to distinguish between "API failure" vs "API returned data (which might have is_data_found=false)"
      (dataForSEODataMap as any).apiSucceeded = true;

      console.log(`[DataForSEO] Successfully fetched data for ${dataForSEOResults.length}/${keywordsForAnalysis.length} keywords`);

      // Log DataForSEO data for each keyword
      dataForSEOResults.forEach(data => {
        if (data.is_data_found) {
          console.log(`[DataForSEO] "${data.keyword}": Volume=${data.volume}, KD=${data.difficulty}, CPC=$${data.cpc}, Competition=${data.competition}`);
        }
      });

      // Process each keyword with DataForSEO data
      for (const keyword of keywordsForAnalysis) {
        const dataForSEOData = dataForSEODataMap.get(keyword.keyword.toLowerCase());

        if ((dataForSEODataMap as any).apiSucceeded && dataForSEOData) {
          // Only attach DataForSEO data if API succeeded
          // This distinguishes between "API failure" vs "API returned data (which might have is_data_found=false)"
          keyword.dataForSEOData = dataForSEOData;
          keyword.serankingData = {
            is_data_found: dataForSEOData.is_data_found,
            volume: dataForSEOData.volume,
            cpc: dataForSEOData.cpc,
            competition: dataForSEOData.competition,
            difficulty: dataForSEOData.difficulty,
            history_trend: dataForSEOData.history_trend,
          };

          // Update volume if DataForSEO has better data
          if (dataForSEOData.volume) {
            keyword.volume = dataForSEOData.volume;
          }
        }

        // Add to keywords that need SERP analysis
        keywordsToAnalyze.push(keyword);
      }

      console.log(`[DataForSEO] ${keywordsToAnalyze.length} keywords will proceed to SERP analysis`);

    } catch (dataForSEOError: any) {
      console.warn(`[DataForSEO] API call failed: ${dataForSEOError.message}. Proceeding with SERP analysis for all keywords.`);
      // On DataForSEO failure, analyze all keywords normally
      keywordsToAnalyze.push(...keywordsForAnalysis);
    }

    // Step 3: 排名概率分析
    // 与手动输入模式相同，使用 analyzeRankingProbability 分析每个关键词
    console.log(`[Batch Translate-Analyze] Step 3: Starting ranking probability analysis for ${keywordsToAnalyze.length} keywords`);

    let analyzedKeywords: KeywordData[] = [];

    if (keywordsToAnalyze.length > 0) {
      analyzedKeywords = await analyzeRankingProbability(
        keywordsToAnalyze,
        systemInstruction || 'You are an SEO expert analyzing keyword ranking opportunities.',
        uiLanguage || 'en',
        targetLanguage,
        websiteUrl,
        websiteDR,
        targetSearchEngine
      );
    }

    // Combine analyzed keywords with skipped keywords
    const allKeywords = [...analyzedKeywords, ...skippedKeywords];

    console.log(`[Batch Translate-Analyze] Analysis complete for ${allKeywords.length} keywords (${analyzedKeywords.length} analyzed, ${skippedKeywords.length} skipped)`);
    console.log(`[Batch Translate-Analyze] Source breakdown: ${allKeywords.filter(k => k.source === 'website-audit').length} from website-audit, ${allKeywords.filter(k => k.source === 'manual').length} from manual input`);

    return res.json({
      success: true,
      total: allKeywords.length,
      keywords: allKeywords,
      // 保留 translationResults 以兼容旧代码（仅手动输入模式）
      translationResults: translatedResults,
    });

  } catch (error: any) {
    console.error('Batch translate-analyze error:', error);
    return sendErrorResponse(res, error, 'Failed to process batch translation and analysis');
  }
}
