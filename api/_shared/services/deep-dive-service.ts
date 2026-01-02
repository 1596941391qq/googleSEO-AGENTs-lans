/**
 * Deep Dive 服务
 * 
 * 职责：编排 Deep Dive 完整流程（8步）
 * 
 * 设计原则：每个步骤都是独立函数，可以单独测试
 */

import { analyzeSearchPreferences, analyzeCompetitors, SearchPreferencesResult, CompetitorAnalysisResult } from '../agents/agent-2-seo-researcher.js';
import { generateContent, ContentGenerationResult } from '../agents/agent-3-content-writer.js';
import { reviewQuality, QualityReviewResult } from '../agents/agent-4-quality-reviewer.js';
import { extractVisualThemes, generateImagePrompts, generateImages, VisualThemesResult, ImagePromptResult } from '../agents/agent-5-image-creative.js';
import { generateDeepDiveStrategy, extractCoreKeywords } from '../agents/agent-2-seo-researcher.js';
import { fetchSerpResults } from '../tools/serp-search.js';
import { fetchSErankingData } from '../tools/se-ranking.js';
import { KeywordData, SEOStrategyReport, TargetLanguage, ProbabilityLevel } from '../types.js';

/**
 * Deep Dive 选项
 */
export interface DeepDiveOptions {
  keyword: KeywordData;
  uiLanguage: 'zh' | 'en';
  targetLanguage: TargetLanguage;
  strategyPrompt?: string;
  generateImages?: boolean;
  onProgress?: (step: number, message: string) => void;
  stopAfterStrategy?: boolean;
}

/**
 * Deep Dive 结果
 */
export interface DeepDiveResult {
  // Step 1-2: SEO 研究
  searchPreferences?: SearchPreferencesResult;
  competitorAnalysis?: CompetitorAnalysisResult;

  // Step 3-5: SEO 策略报告
  seoStrategyReport: SEOStrategyReport;
  coreKeywords: string[];
  serpCompetitionData?: SerpCompetitionData[];
  rankingProbability?: ProbabilityLevel;
  rankingAnalysis?: string;
  searchIntent?: string;
  intentMatch?: string;

  // Step 6: 生成的内容
  generatedContent?: ContentGenerationResult;

  // Step 7: 质量审查
  qualityReview?: QualityReviewResult;

  // Step 8: 图像（可选）
  visualThemes?: VisualThemesResult;
  imagePrompts?: ImagePromptResult[];
  generatedImages?: Array<{ theme: string; imageUrl?: string; error?: string }>;

  // HTML 内容
  htmlContent?: string;
}

/**
 * SERP 竞争数据
 */
export interface SerpCompetitionData {
  keyword: string;
  serpResults: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  serankingData?: {
    volume?: number;
    difficulty?: number;
    cpc?: number;
    competition?: number;
  };
  error?: string;
}

/**
 * 搜索意图和排名概率分析结果
 */
export interface IntentAndProbabilityResult {
  searchIntent: string;
  intentMatch: string;
  probability: ProbabilityLevel;
  analysis: string;
}

// ============================================================================
// 独立步骤函数（可单独测试）
// ============================================================================

/**
 * Step 1: 分析搜索引擎偏好
 * 可单独测试
 */
export async function analyzeSearchEnginePreferences(
  keyword: string,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage
): Promise<SearchPreferencesResult> {
  return await analyzeSearchPreferences(keyword, uiLanguage, targetLanguage);
}

/**
 * Step 2: 分析竞争对手
 * 可单独测试
 */
export async function analyzeCompetitorsForDeepDive(
  keyword: string,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage
): Promise<CompetitorAnalysisResult> {
  const serpData = await fetchSerpResults(keyword, targetLanguage);
  return await analyzeCompetitors(keyword, serpData, uiLanguage, targetLanguage);
}

/**
 * Step 3: 生成 SEO 策略报告
 * 可单独测试
 */
export async function generateSEOStrategyReport(
  keyword: KeywordData,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage,
  strategyPrompt?: string
): Promise<SEOStrategyReport> {
  return await generateDeepDiveStrategy(keyword, uiLanguage, targetLanguage, strategyPrompt);
}

/**
 * Step 4: 从策略报告中提取核心关键词
 * 可单独测试
 */
export async function extractCoreKeywordsFromReport(
  seoStrategyReport: SEOStrategyReport,
  targetLanguage: TargetLanguage,
  uiLanguage: 'zh' | 'en'
): Promise<string[]> {
  return await extractCoreKeywords(seoStrategyReport, targetLanguage, uiLanguage);
}

/**
 * Step 5.1: 获取 SE Ranking 和 SERP 竞争数据
 * 可单独测试
 */
export async function fetchSERankingAndSERPData(
  coreKeywords: string[],
  targetLanguage: TargetLanguage,
  maxKeywords: number = 5
): Promise<{
  serankingDataMap: Map<string, any>;
  serpCompetitionData: SerpCompetitionData[];
}> {
  const serankingDataMap = new Map<string, any>();

  // 获取 SE Ranking 数据
  try {
    const serankingResults = await fetchSErankingData(coreKeywords, 'us');
    serankingResults.forEach(data => {
      if (data.keyword) {
        serankingDataMap.set(data.keyword.toLowerCase(), data);
      }
    });
    (serankingDataMap as any).apiSucceeded = true;
  } catch (error: any) {
    console.warn(`[Deep Dive Service] SE Ranking API call failed: ${error.message}`);
  }

  // 获取 SERP 竞争数据（限制数量）
  const serpCompetitionData: SerpCompetitionData[] = [];
  for (const coreKeyword of coreKeywords.slice(0, maxKeywords)) {
    try {
      const serpData = await fetchSerpResults(coreKeyword, targetLanguage);
      const serpResults = serpData.results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet
      }));

      const serankingData = serankingDataMap.get(coreKeyword.toLowerCase());
      serpCompetitionData.push({
        keyword: coreKeyword,
        serpResults: serpResults.slice(0, 3),
        serankingData: (serankingDataMap as any).apiSucceeded && serankingData && serankingData.is_data_found ? {
          volume: serankingData.volume,
          difficulty: serankingData.difficulty,
          cpc: serankingData.cpc,
          competition: serankingData.competition
        } : undefined
      });

      // 小延迟避免限流
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error(`[Deep Dive Service] Error fetching SERP for "${coreKeyword}":`, error);
      serpCompetitionData.push({
        keyword: coreKeyword,
        serpResults: [],
        error: error.message
      });
    }
  }

  return { serankingDataMap, serpCompetitionData };
}

/**
 * Step 5.2: 分析搜索意图和排名概率
 * 可单独测试
 */
export async function analyzeSearchIntentAndProbability(
  keyword: string,
  seoStrategyReport: SEOStrategyReport,
  serpCompetitionData: SerpCompetitionData[],
  uiLanguage: 'zh' | 'en'
): Promise<IntentAndProbabilityResult> {
  const { callGeminiAPI } = await import('../gemini.js');

  const intentAndProbabilityPrompt = `Based on the following SEO strategy and SERP competition analysis,
estimate the probability of this content ranking on Google's first page.

Target Keyword: ${keyword}
Page Title: ${seoStrategyReport.pageTitleH1}
Meta Description: ${seoStrategyReport.metaDescription}

Content Structure:
${seoStrategyReport.contentStructure.map(s => `- ${s.header}`).join('\n')}

SERP Competition for Core Keywords:
${serpCompetitionData.map(d => `
Keyword: ${d.keyword}
Top Results: ${d.serpResults.length > 0 ? d.serpResults.map(r => r.title).join(', ') : 'None found'}
`).join('\n')}

IMPORTANT: Respond in ${uiLanguage === 'zh' ? 'Chinese (中文)' : 'English'}.

Provide:
1. Search Intent: What are users looking for when they search this keyword?
2. Intent Match: Does the proposed content structure match this intent?
3. Ranking Probability: High/Medium/Low
4. Detailed analysis explaining why

Return ONLY valid JSON without markdown formatting:
{
  "searchIntent": "user search intent description",
  "intentMatch": "analysis of whether content matches intent",
  "probability": "High" | "Medium" | "Low",
  "analysis": "detailed ranking probability explanation"
}`;

  const probabilityResponse = await callGeminiAPI(intentAndProbabilityPrompt);
  let jsonText = probabilityResponse.text;
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonText);
  return {
    searchIntent: parsed.searchIntent || '',
    intentMatch: parsed.intentMatch || '',
    probability: parsed.probability || ProbabilityLevel.MEDIUM,
    analysis: parsed.analysis || 'No analysis provided'
  };
}

/**
 * Step 6: 生成内容
 * 可单独测试
 */
export async function generateContentForDeepDive(
  seoStrategyReport: SEOStrategyReport,
  searchPreferences?: SearchPreferencesResult,
  competitorAnalysis?: CompetitorAnalysisResult,
  uiLanguage: 'zh' | 'en' = 'en'
): Promise<ContentGenerationResult> {
  return await generateContent(
    seoStrategyReport,
    searchPreferences,
    competitorAnalysis,
    uiLanguage
  );
}

/**
 * Step 7: 审查内容质量
 * 可单独测试
 */
export async function reviewContentQualityForDeepDive(
  content: ContentGenerationResult | string,
  targetKeyword: string,
  uiLanguage: 'zh' | 'en' = 'en'
): Promise<QualityReviewResult> {
  return await reviewQuality(content, targetKeyword, uiLanguage);
}

/**
 * Step 8: 生成图像
 * 可单独测试
 */
export async function generateImagesForDeepDive(
  content: ContentGenerationResult | string,
  uiLanguage: 'zh' | 'en' = 'en'
): Promise<{
  visualThemes: VisualThemesResult;
  imagePrompts: ImagePromptResult[];
  generatedImages: Array<{ theme: string; imageUrl?: string; error?: string }>;
}> {
  // 提取视觉主题
  const visualThemes = await extractVisualThemes(content, uiLanguage);

  // 生成图像提示词
  let imagePrompts: ImagePromptResult[] = [];
  if (visualThemes.themes && visualThemes.themes.length > 0) {
    imagePrompts = await generateImagePrompts(visualThemes.themes, uiLanguage);
  }

  // 生成图像
  const generatedImages = await generateImages(imagePrompts);

  return {
    visualThemes,
    imagePrompts,
    generatedImages
  };
}

/**
 * 生成 HTML 内容
 * 可单独测试
 */
export function generateHTMLContentFromReport(
  report: SEOStrategyReport,
  uiLanguage: string
): string {
  return `<!DOCTYPE html>
<html lang="${uiLanguage === 'zh' ? 'zh-CN' : 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${report.metaDescription}">
    <title>${report.pageTitleH1}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f9fafb;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #1a202c;
            line-height: 1.2;
        }
        .meta-description {
            font-size: 1.1rem;
            color: #4a5568;
            margin-bottom: 30px;
            padding-bottom: 30px;
            border-bottom: 2px solid #e2e8f0;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 40px;
            margin-bottom: 15px;
            color: #2d3748;
        }
        p {
            margin-bottom: 20px;
            color: #4a5568;
            font-size: 1.05rem;
        }
        .long-tail-keywords {
            background: #edf2f7;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .long-tail-keywords h3 {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: #2d3748;
        }
        .keyword-tag {
            display: inline-block;
            background: #4299e1;
            color: white;
            padding: 6px 12px;
            margin: 5px;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #a0aec0;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${report.pageTitleH1}</h1>
        <div class="meta-description">${report.metaDescription}</div>

        ${report.contentStructure.map(section => `
        <h2>${section.header}</h2>
        <p>${section.description}</p>
        `).join('')}

        ${report.longTailKeywords && report.longTailKeywords.length > 0 ? `
        <div class="long-tail-keywords">
            <h3>${uiLanguage === 'zh' ? '相关关键词' : 'Related Keywords'}</h3>
            <div>
                ${report.longTailKeywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}
            </div>
        </div>
        ` : ''}

        <footer>
            <p>${uiLanguage === 'zh' ? '基于 AI 生成的 SEO 优化内容' : 'AI-Generated SEO Optimized Content'}</p>
            <p>${uiLanguage === 'zh' ? '推荐字数' : 'Recommended Word Count'}: ${report.recommendedWordCount}</p>
        </footer>
    </div>
</body>
</html>`;
}

// ============================================================================
// 组合函数（调用上述独立函数）
// ============================================================================

/**
 * 执行完整的 Deep Dive 流程
 * 
 * 这是一个组合函数，内部调用上述所有独立步骤函数
 * 如果需要单独测试某个步骤，可以直接调用对应的独立函数
 */
export async function executeDeepDive(
  options: DeepDiveOptions
): Promise<DeepDiveResult> {
  const {
    keyword,
    uiLanguage,
    targetLanguage,
    strategyPrompt,
    generateImages: shouldGenerateImages = false,
    onProgress,
    stopAfterStrategy = false
  } = options;

  const result: DeepDiveResult = {
    seoStrategyReport: {} as SEOStrategyReport,
    coreKeywords: []
  };

  try {
    const progress = (step: number, message: string) => {
      console.log(`[Deep Dive Service] Step ${step}: ${message}`);
      onProgress?.(step, message);
    };

    // Step 1: 分析搜索引擎偏好
    progress(1, 'Analyzing search engine preferences...');
    try {
      result.searchPreferences = await analyzeSearchEnginePreferences(
        keyword.keyword,
        uiLanguage,
        targetLanguage
      );
    } catch (error: any) {
      console.warn(`[Deep Dive Service] Search preferences analysis failed: ${error.message}`);
    }

    // Step 2: 分析竞争对手
    progress(2, 'Analyzing competitors...');
    try {
      result.competitorAnalysis = await analyzeCompetitorsForDeepDive(
        keyword.keyword,
        uiLanguage,
        targetLanguage
      );
    } catch (error: any) {
      console.warn(`[Deep Dive Service] Competitor analysis failed: ${error.message}`);
    }

    // Step 3: 生成 SEO 策略报告
    progress(3, 'Generating SEO strategy report...');
    result.seoStrategyReport = await generateSEOStrategyReport(
      keyword,
      uiLanguage,
      targetLanguage,
      strategyPrompt
    );

    // Step 4: 提取核心关键词
    progress(4, 'Extracting core keywords...');
    result.coreKeywords = await extractCoreKeywordsFromReport(
      result.seoStrategyReport,
      targetLanguage,
      uiLanguage
    );
    console.log(`[Deep Dive Service] Extracted ${result.coreKeywords.length} core keywords`);

    // Step 5: 获取数据和分析意图
    progress(5, 'Fetching SE Ranking and SERP data...');
    const { serpCompetitionData } = await fetchSERankingAndSERPData(
      result.coreKeywords,
      targetLanguage,
      5
    );
    result.serpCompetitionData = serpCompetitionData;

    progress(5, 'Analyzing search intent and ranking probability...');
    try {
      const intentResult = await analyzeSearchIntentAndProbability(
        keyword.keyword,
        result.seoStrategyReport,
        serpCompetitionData,
        uiLanguage
      );
      result.rankingProbability = intentResult.probability;
      result.rankingAnalysis = intentResult.analysis;
      result.searchIntent = intentResult.searchIntent;
      result.intentMatch = intentResult.intentMatch;
    } catch (error: any) {
      console.warn(`[Deep Dive Service] Intent and probability analysis failed: ${error.message}`);
    }

    // Check if we should stop after strategy phase
    if (stopAfterStrategy) {
      progress(5, 'Generating strategy HTML content...');
      result.htmlContent = generateHTMLContentFromReport(result.seoStrategyReport, uiLanguage);
      console.log(`[Deep Dive Service] Completed strategy phase successfully`);
      return result;
    }

    // Step 6: 生成内容
    progress(6, 'Generating content...');
    try {
      result.generatedContent = await generateContentForDeepDive(
        result.seoStrategyReport,
        result.searchPreferences,
        result.competitorAnalysis,
        uiLanguage
      );
    } catch (error: any) {
      console.error(`[Deep Dive Service] Content generation failed: ${error.message}`);
      throw error;
    }

    // Step 7: 质量审查
    progress(7, 'Reviewing content quality...');
    try {
      if (result.generatedContent) {
        result.qualityReview = await reviewContentQualityForDeepDive(
          result.generatedContent,
          keyword.keyword,
          uiLanguage
        );
      }
    } catch (error: any) {
      console.warn(`[Deep Dive Service] Quality review failed: ${error.message}`);
    }

    // Step 8: 生成图像（可选）
    if (shouldGenerateImages) {
      progress(8, 'Generating images...');
      try {
        if (result.generatedContent) {
          const imageResult = await generateImagesForDeepDive(
            result.generatedContent,
            uiLanguage
          );
          result.visualThemes = imageResult.visualThemes;
          result.imagePrompts = imageResult.imagePrompts;
          result.generatedImages = imageResult.generatedImages;
        }
      } catch (error: any) {
        console.warn(`[Deep Dive Service] Image generation failed: ${error.message}`);
      }
    }

    // 生成 HTML 内容
    progress(8, 'Generating HTML content...');
    result.htmlContent = generateHTMLContentFromReport(result.seoStrategyReport, uiLanguage);

    console.log(`[Deep Dive Service] Completed successfully`);
    return result;
  } catch (error: any) {
    console.error(`[Deep Dive Service] Error:`, error);
    throw new Error(`Deep Dive failed: ${error.message}`);
  }
}
