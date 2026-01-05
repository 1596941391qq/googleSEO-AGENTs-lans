
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
import { fetchKeywordData, getDataForSEOLocationAndLanguage } from '../tools/dataforseo.js';
import { KeywordData, SEOStrategyReport, TargetLanguage } from '../types.js';
import { AgentStreamEvent } from '../../../types.js';
import {
  initContentManagementTables,
  createOrGetProject,
  createOrGetKeyword,
  saveContentDraft,
  saveImages,
  ContentDraft
} from '../../lib/database.js';

export interface VisualArticleOptions {
  keyword: string;
  tone: string;
  visualStyle: string;
  targetAudience: 'beginner' | 'expert';
  targetMarket: string;
  uiLanguage: 'zh' | 'en';
  targetLanguage: TargetLanguage;
  userId?: number;
  projectId?: string;
  projectName?: string;
  reference?: {
    type: 'document' | 'url';
    document?: {
      filename: string;
      content: string;
    };
    url?: {
      url: string;
      content?: string;
      screenshot?: string;
      title?: string;
    };
  };
  onEvent: (event: AgentStreamEvent) => void;
}

export async function generateVisualArticle(options: VisualArticleOptions) {
  const { keyword, tone, visualStyle, targetAudience, targetMarket, uiLanguage, targetLanguage, userId, projectId, projectName, reference, onEvent } = options;

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
    
    // Emit search preferences analysis results
    if (searchPrefs) {
      emit('researcher', 'card', undefined, 'search-preferences', {
        semantic_landscape: searchPrefs.semantic_landscape,
        engine_strategies: searchPrefs.engine_strategies,
        geo_recommendations: searchPrefs.geo_recommendations,
        searchPreferences: searchPrefs.searchPreferences
      });
    }

    const competitorAnalysis = await analyzeCompetitors(keyword, serpData, uiLanguage, targetLanguage, targetMarket);

    // Emit competitor analysis results
    if (competitorAnalysis) {
      emit('researcher', 'card', undefined, 'competitor-analysis', {
        winning_formula: competitorAnalysis.winning_formula,
        contentGaps: competitorAnalysis.competitorAnalysis?.contentGaps || [],
        competitor_benchmark: competitorAnalysis.competitor_benchmark || []
      });
    }

    // Get DataForSEO data for the data card
    emit('researcher', 'log', uiLanguage === 'zh' ? '正在获取关键词指标数据...' : 'Fetching keyword metrics data...');
    try {
      const { locationCode, languageCode } = getDataForSEOLocationAndLanguage(targetLanguage);
      const dataForSEOResults = await fetchKeywordData([keyword], locationCode, languageCode);
      if (dataForSEOResults && dataForSEOResults.length > 0 && dataForSEOResults[0].is_data_found) {
        emit('researcher', 'log', `✓ ${uiLanguage === 'zh' ? `关键词数据获取成功` : `Keyword metrics retrieved`} - Volume: ${dataForSEOResults[0].volume || 0}, Difficulty: ${dataForSEOResults[0].difficulty || 0}`);
        emit('researcher', 'card', undefined, 'data', {
          volume: dataForSEOResults[0].volume || 0,
          difficulty: dataForSEOResults[0].difficulty || 0
        });
      } else {
        emit('researcher', 'log', `⚠️ ${uiLanguage === 'zh' ? '未找到关键词数据，将使用估算值' : 'No keyword data found, using estimates'}`);
      }
    } catch (e) {
      console.warn('Failed to fetch SE Ranking data for visual article', e);
      emit('researcher', 'log', `⚠️ ${uiLanguage === 'zh' ? '关键词数据获取失败，将继续执行' : 'Failed to fetch keyword data, proceeding anyway'}`);
    }

    // 2. Strategy phase
    emit('strategist', 'log', uiLanguage === 'zh' ? `正在为 ${targetMarket === 'global' ? '全球' : targetMarket.toUpperCase()} 市场制定超越前3名的内容策略...` : `Designing content strategy for ${targetMarket === 'global' ? 'Global' : targetMarket.toUpperCase()} market to beat Top 3...`);

    // Prepare reference context for strategist
    let referenceContext = '';
    if (reference) {
      if (reference.type === 'document' && reference.document) {
        emit('strategist', 'log', uiLanguage === 'zh' ? `正在处理参考文档: ${reference.document.filename} (${reference.document.content.length} 字符)` : `Processing reference document: ${reference.document.filename} (${reference.document.content.length} chars)`);
        // For document, provide summary (first 2000 chars)
        const docSummary = reference.document.content.length > 2000
          ? reference.document.content.substring(0, 2000) + '...'
          : reference.document.content;
        referenceContext = `\n\nUser Reference Document (${reference.document.filename}):\n${docSummary}`;
        emit('strategist', 'log', `✓ ${uiLanguage === 'zh' ? `文档已整合到策略 (截取至 ${docSummary.length} 字符)` : `Document integrated into strategy (truncated to ${docSummary.length} chars)`}`);
      } else if (reference.type === 'url' && reference.url?.content) {
        emit('strategist', 'log', uiLanguage === 'zh' ? `正在处理参考URL: ${reference.url.url}` : `Processing reference URL: ${reference.url.url}`);
        // For URL, provide summary (first 2000 chars)
        const urlSummary = reference.url.content.length > 2000
          ? reference.url.content.substring(0, 2000) + '...'
          : reference.url.content;
        referenceContext = `\n\nUser Reference URL (${reference.url.url}):\n${urlSummary}`;
        emit('strategist', 'log', `✓ ${uiLanguage === 'zh' ? `URL内容已抓取 (${reference.url.content.length} 字符)，截图: ${reference.url.screenshot ? '是' : '否'}` : `URL scraped (${reference.url.content.length} chars), Screenshot: ${reference.url.screenshot ? 'Yes' : 'No'}`}`);
      }
    }

    emit('strategist', 'log', uiLanguage === 'zh' ? '正在生成综合SEO策略报告...' : 'Generating comprehensive SEO strategy report...');
    const strategyReport = await generateDeepDiveStrategy(
      keywordData,
      uiLanguage,
      targetLanguage,
      `Tone: ${tone}, Audience: ${targetAudience}, Target Market: ${targetMarket === 'global' ? 'Global' : targetMarket.toUpperCase()}. Ensure visual opportunities are highlighted and content is tailored for the target market.${referenceContext}`,
      searchPrefs,
      competitorAnalysis,
      targetMarket,
      reference
    );

    emit('strategist', 'log', `✓ ${uiLanguage === 'zh' ? `策略报告生成完成: ${strategyReport.contentStructure?.length || 0} 个主要章节` : `Strategy report complete: ${strategyReport.contentStructure?.length || 0} main sections`}`);
    emit('strategist', 'card', undefined, 'outline', {
      h1: strategyReport.pageTitleH1,
      structure: strategyReport.contentStructure
    });

    // 3. Visual phase (Extract themes and start generation)
    // We do this BEFORE writing so we can potentially reference images or just show progress
    emit('artist', 'log', uiLanguage === 'zh' ? '正在分析结构以寻找视觉机会...' : 'Analyzing structure for visual opportunities...');

    // Check if we have URL reference with screenshot
    const hasUrlScreenshot = reference?.type === 'url' && reference.url?.screenshot;
    
    // We'll use the strategy report to extract themes early or wait for content?
    // Let's use strategy report as a proxy for content to get themes early.
    const visualThemes = await extractVisualThemes(strategyReport.pageTitleH1 + "\n" + strategyReport.contentStructure.map(s => s.header).join("\n"), uiLanguage);

    let generatedImages: any[] = [];
    if (visualThemes.themes && visualThemes.themes.length > 0) {
      // If we have URL screenshot, generate 1 AI image instead of 2
      const imageCount = hasUrlScreenshot ? 1 : 2;
      const selectedThemes = visualThemes.themes.slice(0, imageCount);
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

      // Generate images (parallel processing)
      emit('artist', 'log', uiLanguage === 'zh' ? `正在生成 ${prompts.length} 张图片...` : `Generating ${prompts.length} images...`);
      const imageResults = await generateImages(prompts);

      const successCount = imageResults.filter(r => r.imageUrl).length;
      const failCount = imageResults.filter(r => r.error).length;
      emit('artist', 'log', `✓ ${uiLanguage === 'zh' ? `图片生成完成: ${successCount} 成功, ${failCount} 失败` : `Image generation complete: ${successCount} succeeded, ${failCount} failed`}`);

      generatedImages = imageResults.filter(r => r.imageUrl).map(r => ({
        url: r.imageUrl,
        prompt: r.theme,
        placement: 'inline'
      }));
      
      // If we have URL screenshot, add it as the second image
      if (hasUrlScreenshot && reference.url?.screenshot) {
        generatedImages.push({
          url: reference.url.screenshot,
          prompt: reference.url.title || reference.url.url,
          placement: 'inline',
          isScreenshot: true
        });
        emit('artist', 'card', 
          uiLanguage === 'zh' ? `已添加参考页面截图` : `Reference page screenshot added`, 
          'image-gen', 
          { 
            theme: reference.url.title || 'Reference Screenshot',
            prompt: reference.url.url,
            imageUrl: reference.url.screenshot,
            status: 'completed',
            progress: 100,
            isScreenshot: true
          }
        );
      }

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
      targetLanguage,
      reference
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

    // Auto-save to database if userId is provided
    let savedDraft: ContentDraft | null = null;
    if (userId) {
      try {
        await initContentManagementTables();

        // Create or get project
        const project = await createOrGetProject(
          userId,
          projectName || `Project: ${keyword}`,
          keyword,
          targetLanguage
        );

        // Create or get keyword
        const keywordRecord = await createOrGetKeyword(
          project.id,
          keyword,
          keyword,
          keywordData.intent,
          keywordData.volume || undefined,
          undefined
        );

        // Save content draft
        savedDraft = await saveContentDraft(
          project.id,
          keywordRecord.id,
          finalArticle.title,
          finalArticle.content,
          strategyReport.metaDescription,
          undefined, // url_slug
          undefined // quality_score
        );

        // Save images if any
        if (generatedImages && generatedImages.length > 0 && savedDraft) {
          await saveImages(
            savedDraft.id,
            generatedImages.map((img, index) => ({
              imageUrl: img.url,
              prompt: img.prompt,
              altText: img.prompt,
              position: index,
              metadata: {
                placement: img.placement,
                isScreenshot: img.isScreenshot || false
              }
            }))
          );
        }

        emit('tracker', 'log', uiLanguage === 'zh' ? '内容已自动保存到数据库' : 'Content automatically saved to database');
      } catch (dbError: any) {
        console.error('[VisualArticle] Error saving to database:', dbError);
        // Don't throw error, just log it - the article generation succeeded
        emit('tracker', 'log', uiLanguage === 'zh' ? '警告: 保存到数据库失败，但内容已生成' : 'Warning: Failed to save to database, but content was generated');
      }
    }

    // Add draftId and projectId to result if saved
    const finalResult: any = { ...finalArticle };
    if (savedDraft && userId) {
      finalResult.draftId = savedDraft.id;
      const project = await createOrGetProject(
        userId,
        projectName || `Project: ${keyword}`,
        keyword,
        targetLanguage
      );
      finalResult.projectId = project.id;
    }
    
    return finalResult;

  } catch (error: any) {
    emit('tracker', 'error', `Mission failed: ${error.message}`);
    throw error;
  }
}
