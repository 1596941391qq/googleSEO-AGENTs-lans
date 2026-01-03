
import {
  analyzeSearchPreferences,
  analyzeCompetitors,
  generateDeepDiveStrategy,
  SearchPreferencesResult,
  CompetitorAnalysisResult
} from '../agents/agent-2-seo-researcher.js';
import { generateContent, ContentGenerationResult } from '../agents/agent-3-content-writer.js';
import {
  extractVisualThemes,
  generateImagePrompts,
  generateImages,
  VisualThemesResult,
  ImagePromptResult
} from '../agents/agent-5-image-creative.js';
import { fetchSerpResults } from '../tools/serp-search.js';
import { fetchSErankingData } from '../tools/se-ranking.js';
import { KeywordData, SEOStrategyReport, TargetLanguage } from '../types.js';
import { AgentStreamEvent } from '../../../types.js';

export interface VisualArticleOptions {
  keyword: string;
  tone: string;
  visualStyle: string;
  targetAudience: 'beginner' | 'expert';
  targetMarket: string;
  uiLanguage: 'zh' | 'en';
  targetLanguage: TargetLanguage;
  onEvent: (event: AgentStreamEvent) => void;
}

export async function generateVisualArticle(options: VisualArticleOptions) {
  const { keyword, tone, visualStyle, targetAudience, targetMarket, uiLanguage, targetLanguage, onEvent } = options;

  const emit = (agentId: AgentStreamEvent['agentId'], type: AgentStreamEvent['type'], message?: string, cardType?: AgentStreamEvent['cardType'], data?: any) => {
    onEvent({
      id: Math.random().toString(36).substring(7),
      agentId,
      type,
      timestamp: Date.now(),
      message,
      cardType,
      data
    });
  };

  const keywordData: KeywordData = {
    id: `kw-${Date.now()}`,
    keyword,
    translation: keyword,
    intent: 'Informational' as any,
    volume: 0
  };

  try {
    // 1. Research phase
    emit('tracker', 'log', uiLanguage === 'zh' ? `正在初始化关于 "${keyword}" 的任务...` : `Initializing mission for "${keyword}"...`);

    emit('researcher', 'log', uiLanguage === 'zh' ? `正在分析 ${targetMarket === 'global' ? '全球' : targetMarket.toUpperCase()} 市场的 SERP 和竞争对手...` : `Analyzing SERP and Competitors for ${targetMarket === 'global' ? 'Global' : targetMarket.toUpperCase()} market...`);
    // Map targetMarket to country code for SERP search
    const countryCodeMap: Record<string, string> = {
      'global': 'us',
      'us': 'us',
      'uk': 'uk',
      'ca': 'ca',
      'au': 'au',
      'de': 'de',
      'fr': 'fr',
      'jp': 'jp',
      'cn': 'cn',
    };
    const serpCountryCode = countryCodeMap[targetMarket] || 'us';
    const serpData = await fetchSerpResults(keyword, targetLanguage, serpCountryCode);
    emit('researcher', 'card', undefined, 'serp', { results: serpData.results });

    const searchPrefs = await analyzeSearchPreferences(keyword, uiLanguage, targetLanguage, targetMarket);
    // Optionally emit data card for prefs

    const competitorAnalysis = await analyzeCompetitors(keyword, serpData, uiLanguage, targetLanguage, targetMarket);

    // Emit competitor analysis results
    if (competitorAnalysis) {
      emit('researcher', 'card', undefined, 'competitor-analysis', {
        winning_formula: competitorAnalysis.winning_formula,
        contentGaps: competitorAnalysis.competitorAnalysis?.contentGaps || [],
        competitor_benchmark: competitorAnalysis.competitor_benchmark || []
      });
    }

    // Get SE Ranking data for the data card
    try {
      const seRankingCountryCode = countryCodeMap[targetMarket] || 'us';
      const seRanking = await fetchSErankingData([keyword], seRankingCountryCode);
      if (seRanking && seRanking.length > 0) {
        emit('researcher', 'card', undefined, 'data', {
          volume: seRanking[0].volume || 0,
          difficulty: seRanking[0].difficulty || 0
        });
      }
    } catch (e) {
      console.warn('Failed to fetch SE Ranking data for visual article', e);
    }

    // 2. Strategy phase
    emit('strategist', 'log', uiLanguage === 'zh' ? `正在为 ${targetMarket === 'global' ? '全球' : targetMarket.toUpperCase()} 市场制定超越前3名的内容策略...` : `Designing content strategy for ${targetMarket === 'global' ? 'Global' : targetMarket.toUpperCase()} market to beat Top 3...`);
    const strategyPrompt = `Tone: ${tone}, Audience: ${targetAudience}, Target Market: ${targetMarket === 'global' ? 'Global' : targetMarket.toUpperCase()}. Ensure visual opportunities are highlighted and content is tailored for the target market.`;
    const strategyReport = await generateDeepDiveStrategy(
      keywordData,
      uiLanguage,
      targetLanguage,
      strategyPrompt,
      searchPrefs,
      competitorAnalysis,
      targetMarket
    );

    emit('strategist', 'card', undefined, 'outline', {
      h1: strategyReport.pageTitleH1,
      structure: strategyReport.contentStructure
    });

    // 3. Visual phase (Extract themes and start generation)
    // We do this BEFORE writing so we can potentially reference images or just show progress
    emit('artist', 'log', uiLanguage === 'zh' ? '正在分析结构以寻找视觉机会...' : 'Analyzing structure for visual opportunities...');

    // We'll use the strategy report to extract themes early or wait for content?
    // Let's use strategy report as a proxy for content to get themes early.
    const visualThemes = await extractVisualThemes(strategyReport.pageTitleH1 + "\n" + strategyReport.contentStructure.map(s => s.header).join("\n"), uiLanguage);

    let generatedImages: any[] = [];
    if (visualThemes.themes && visualThemes.themes.length > 0) {
      const selectedThemes = visualThemes.themes.slice(0, 2); // Limit to 2 for speed/cost
      const prompts = await generateImagePrompts(selectedThemes, uiLanguage);

      // Emit image-gen cards as "loading" with theme info
      prompts.forEach((p, i) => {
        const theme = selectedThemes[i];
        emit('artist', 'card', undefined, 'image-gen', { 
          theme: theme?.title || theme?.id || `Theme ${i + 1}`,
          prompt: p.prompt, 
          description: p.description,
          imageUrl: null,
          status: 'extracting',
          progress: 0
        });
      });

      // Generate images (could be parallel)
      const imageResults = await generateImages(prompts);
      generatedImages = imageResults.filter(r => r.imageUrl).map(r => ({
        url: r.imageUrl,
        prompt: r.theme,
        placement: 'inline'
      }));

      // Update cards with results and progress
      imageResults.forEach((res, i) => {
        const theme = selectedThemes[i];
        if (res.imageUrl) {
          emit('artist', 'card', 
            uiLanguage === 'zh' ? `视觉效果已生成: ${res.theme}` : `Visual generated: ${res.theme}`, 
            'image-gen', 
            { 
              theme: theme?.title || theme?.id || res.theme,
              prompt: prompts[i]?.prompt || res.theme,
              description: prompts[i]?.description,
              imageUrl: res.imageUrl,
              status: 'completed',
              progress: 100
            }
          );
        } else if (res.error) {
          emit('artist', 'card', 
            uiLanguage === 'zh' ? `图像生成失败: ${res.theme}` : `Image generation failed: ${res.theme}`, 
            'image-gen', 
            { 
              theme: theme?.title || theme?.id || res.theme,
              prompt: prompts[i]?.prompt || res.theme,
              description: prompts[i]?.description,
              imageUrl: null,
              status: 'failed',
              error: res.error,
              progress: 0
            }
          );
        }
      });
    }

    // 4. Writing phase
    emit('writer', 'log', uiLanguage === 'zh' ? `正在为 ${targetMarket === 'global' ? '全球' : targetMarket.toUpperCase()} 市场撰写包含视觉元素的精细内容...` : `Drafting content with integrated visuals for ${targetMarket === 'global' ? 'Global' : targetMarket.toUpperCase()} market...`);
    
    // Emit streaming text card
    emit('writer', 'card', undefined, 'streaming-text', {
      content: '',
      speed: 3,
      interval: 50
    });

    const contentResult = await generateContent(
      strategyReport,
      searchPrefs,
      competitorAnalysis,
      uiLanguage,
      targetMarket,
      targetLanguage
    );

    // Update streaming text with final content
    if (contentResult.content || contentResult.article_body) {
      emit('writer', 'card', undefined, 'streaming-text', {
        content: contentResult.content || contentResult.article_body || '',
        speed: 3,
        interval: 50
      });
    }

    // Final result assembly
    const finalArticle = {
      title: contentResult.title || strategyReport.pageTitleH1,
      content: contentResult.content || contentResult.article_body || '',
      images: generatedImages
    };

    return finalArticle;

  } catch (error: any) {
    emit('tracker', 'error', `Mission failed: ${error.message}`);
    throw error;
  }
}
