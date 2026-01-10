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
        // 删除延迟：Gemini API 支持并发，不需要批次间延迟
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

    // Step 2: 优先使用缓存，仅补充缺失的 DataForSEO 数据
    console.log(`[Batch Translate-Analyze] Step 2: Checking cache and fetching DataForSEO data for ${keywordsForAnalysis.length} keywords`);
    
    // 将语言代码转换为 DataForSEO 的 location_code 和 language_code
    const { getDataForSEOLocationAndLanguage } = await import('./_shared/tools/dataforseo.js');
    const { locationCode, languageCode } = getDataForSEOLocationAndLanguage(targetLanguage);
    
    // 优化：先从缓存查询
    const { getKeywordAnalysisCacheBatch } = await import('./lib/database.js');
    const cacheMap = await getKeywordAnalysisCacheBatch(
      keywordsForAnalysis.map(k => k.keyword),
      locationCode,
      targetSearchEngine,
      body.websiteId // 如果有 websiteId，优先使用网站特定的缓存
    );
    
    console.log(`[Cache] Found ${cacheMap.size} cached keyword analysis results`);
    
    let dataForSEODataMap = new Map<string, any>();
    const keywordsToAnalyze: KeywordData[] = [];
    const skippedKeywords: KeywordData[] = [];
    const keywordsNeedingDataForSEO: string[] = [];
    const keywordsFromCache: KeywordData[] = [];

    // 处理缓存中的数据
    for (const keyword of keywordsForAnalysis) {
      const cached = cacheMap.get(keyword.keyword.toLowerCase());
      
      if (cached && cached.dataforseo_is_data_found) {
        // 使用缓存中的 DataForSEO 数据
        keyword.dataForSEOData = {
          volume: cached.dataforseo_volume || 0,
          difficulty: cached.dataforseo_difficulty || null,
          cpc: cached.dataforseo_cpc || null,
          competition: cached.dataforseo_competition || null,
          history_trend: cached.dataforseo_history_trend || null,
          is_data_found: cached.dataforseo_is_data_found,
        };
        keyword.serankingData = {
          is_data_found: cached.dataforseo_is_data_found,
          volume: cached.dataforseo_volume || 0,
          cpc: cached.dataforseo_cpc || null,
          competition: cached.dataforseo_competition || null,
          difficulty: cached.dataforseo_difficulty || null,
          history_trend: cached.dataforseo_history_trend || null,
        };
        keyword.volume = cached.dataforseo_volume || keyword.volume || 0;
        
        // 如果缓存中有完整的 Agent 2 分析结果（相同市场/引擎），直接使用
        if (cached.agent2_probability && cached.agent2_reasoning) {
          keyword.probability = cached.agent2_probability as any;
          keyword.searchIntent = cached.agent2_search_intent;
          keyword.intentAnalysis = cached.agent2_intent_analysis;
          keyword.reasoning = cached.agent2_reasoning;
          keyword.topDomainType = cached.agent2_top_domain_type as any;
          keyword.serpResultCount = cached.agent2_serp_result_count;
          keyword.topSerpSnippets = cached.agent2_top_serp_snippets || [];
          (keyword as any).blueOceanScore = cached.agent2_blue_ocean_score;
          (keyword as any).blueOceanScoreBreakdown = cached.agent2_blue_ocean_breakdown;
          (keyword as any).websiteDR = cached.website_dr;
          (keyword as any).competitorDRs = cached.competitor_drs;
          (keyword as any).top3Probability = cached.top3_probability;
          (keyword as any).top10Probability = cached.top10_probability;
          (keyword as any).canOutrankPositions = cached.can_outrank_positions;
          
          keywordsFromCache.push(keyword);
          console.log(`[Cache] Using cached analysis for "${keyword.keyword}"`);
          continue; // 跳过后续的 DataForSEO 和 Agent 2 分析
        }
        
        keywordsToAnalyze.push(keyword);
      } else {
        // 缓存中没有，需要调用 DataForSEO API
        keywordsNeedingDataForSEO.push(keyword.keyword);
        keywordsToAnalyze.push(keyword);
      }
    }
    
    console.log(`[Cache] ${keywordsFromCache.length} keywords loaded from cache, ${keywordsNeedingDataForSEO.length} keywords need DataForSEO API call`);

    // 只对缓存中没有的关键词调用 DataForSEO API
    if (keywordsNeedingDataForSEO.length > 0) {
      try {
        console.log(`[DataForSEO] Fetching data for ${keywordsNeedingDataForSEO.length} keywords (location: ${locationCode}, language: ${languageCode}, engine: ${targetSearchEngine})`);
        
        const dataForSEOResults = await fetchKeywordData(keywordsNeedingDataForSEO, locationCode, languageCode, targetSearchEngine);

        // Create a map for quick lookup
        dataForSEOResults.forEach(data => {
          if (data.keyword) {
            dataForSEODataMap.set(data.keyword.toLowerCase(), data);
          }
        });

        (dataForSEODataMap as any).apiSucceeded = true;
        console.log(`[DataForSEO] Successfully fetched data for ${dataForSEOResults.length}/${keywordsNeedingDataForSEO.length} keywords`);

        // Process keywords that needed DataForSEO data
        for (const keyword of keywordsToAnalyze) {
          if (keywordsNeedingDataForSEO.includes(keyword.keyword)) {
            const dataForSEOData = dataForSEODataMap.get(keyword.keyword.toLowerCase());

            if ((dataForSEODataMap as any).apiSucceeded && dataForSEOData) {
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
          }
        }

      } catch (dataForSEOError: any) {
        console.warn(`[DataForSEO] API call failed: ${dataForSEOError.message}. Proceeding with SERP analysis for keywords without cached data.`);
      }
    }

    console.log(`[DataForSEO] ${keywordsToAnalyze.length} keywords will proceed to SERP analysis (${keywordsFromCache.length} already completed from cache)`);

    // Step 3: 排名概率分析（仅对缓存中没有完整分析结果的关键词）
    console.log(`[Batch Translate-Analyze] Step 3: Starting ranking probability analysis for ${keywordsToAnalyze.length} keywords (${keywordsFromCache.length} already completed from cache)`);

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
      
      // 保存新分析的结果到缓存（优化：供后续使用）
      try {
        const { saveKeywordAnalysisCache } = await import('./lib/database.js');
        const savePromises = analyzedKeywords.map(async (keyword) => {
          await saveKeywordAnalysisCache({
            website_id: body.websiteId,
            keyword: keyword.keyword,
            location_code: locationCode,
            search_engine: targetSearchEngine,
            dataforseo_volume: keyword.volume || keyword.dataForSEOData?.volume,
            dataforseo_difficulty: keyword.dataForSEOData?.difficulty,
            dataforseo_cpc: keyword.dataForSEOData?.cpc,
            dataforseo_competition: keyword.dataForSEOData?.competition,
            dataforseo_history_trend: keyword.serankingData?.history_trend || keyword.dataForSEOData?.history_trend,
            dataforseo_is_data_found: keyword.dataForSEOData?.is_data_found || keyword.serankingData?.is_data_found || false,
            agent2_probability: keyword.probability,
            agent2_search_intent: keyword.searchIntent,
            agent2_intent_analysis: keyword.intentAnalysis,
            agent2_reasoning: keyword.reasoning,
            agent2_top_domain_type: keyword.topDomainType,
            agent2_serp_result_count: keyword.serpResultCount,
            agent2_top_serp_snippets: keyword.topSerpSnippets,
            agent2_blue_ocean_score: (keyword as any).blueOceanScore,
            agent2_blue_ocean_breakdown: (keyword as any).blueOceanScoreBreakdown,
            website_dr: (keyword as any).websiteDR,
            competitor_drs: (keyword as any).competitorDRs,
            top3_probability: (keyword as any).top3Probability,
            top10_probability: (keyword as any).top10Probability,
            can_outrank_positions: (keyword as any).canOutrankPositions,
            source: source,
          });
        });
        await Promise.all(savePromises);
        console.log(`[Cache] Saved ${analyzedKeywords.length} new analysis results to cache`);
      } catch (cacheError: any) {
        console.warn(`[Cache] Failed to save analysis results to cache: ${cacheError.message}`);
        // 不中断流程
      }
    }

    // Combine: 缓存中的关键词 + 新分析的关键词 + 跳过的关键词
    const allKeywords = [...keywordsFromCache, ...analyzedKeywords, ...skippedKeywords];

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
