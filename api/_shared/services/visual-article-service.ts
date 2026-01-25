
import {
  analyzeSearchPreferences,
  analyzeCompetitors,
  generateDeepDiveStrategy,
  SearchPreferencesResult,
  CompetitorAnalysisResult
} from '../agents/agent-2-seo-researcher.js';
import { generateContent, ContentGenerationResult, AvailableImage } from '../agents/agent-3-content-writer.js';
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
// Note: Project/content management moved to published_articles system
// Content saving is now handled by frontend calling /api/articles/save

// Processed promoted website with scraped content and screenshot
export interface ProcessedPromotedWebsite {
  url: string;
  content: string;
  screenshot?: string;
  title?: string;
}

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
  promotedWebsites?: string[];
  processedPromotedWebsites?: ProcessedPromotedWebsite[]; // Scraped content + screenshots
  promotionIntensity?: "natural" | "strong";
  onEvent: (event: AgentStreamEvent) => void;
}

export async function generateVisualArticle(options: VisualArticleOptions) {
  const {
    keyword,
    tone,
    visualStyle,
    targetAudience,
    targetMarket,
    uiLanguage,
    targetLanguage,
    userId,
    projectId,
    projectName,
    reference,
    promotedWebsites,
    processedPromotedWebsites,
    promotionIntensity,
    onEvent
  } = options;

  const emit = (
    agentId: AgentStreamEvent['agentId'],
    type: AgentStreamEvent['type'],
    message?: string,
    cardType?: AgentStreamEvent['cardType'],
    data?: any,
    eventId?: string
  ) => {
    onEvent({
      id: eventId || Math.random().toString(36).substring(7),
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

    // Emit website scrape cards for promoted/reference sources (visual agent feed)
    const websiteCardMap = new Map<string, { url: string; title?: string; content?: string; screenshot?: string }>();
    if (processedPromotedWebsites && processedPromotedWebsites.length > 0) {
      for (const site of processedPromotedWebsites) {
        if (!site?.url) continue;
        websiteCardMap.set(site.url, {
          url: site.url,
          title: site.title,
          content: site.content,
          screenshot: site.screenshot,
        });
      }
    }
    if (reference?.type === 'url' && reference.url?.url) {
      const refUrl = reference.url.url;
      if (!websiteCardMap.has(refUrl)) {
        websiteCardMap.set(refUrl, {
          url: refUrl,
          title: reference.url.title,
          content: reference.url.content,
          screenshot: reference.url.screenshot,
        });
      }
    }

    if (websiteCardMap.size > 0) {
      for (const site of websiteCardMap.values()) {
        emit('researcher', 'card', undefined, 'firecrawl-result', {
          url: site.url,
          title: site.title || site.url,
          contentLength: site.content?.length || 0,
          hasScreenshot: !!site.screenshot,
          screenshot: site.screenshot,
          images: [],
          preview: site.content
            ? site.content.substring(0, 400) + (site.content.length > 400 ? '...' : '')
            : undefined,
        });
      }
    }

    emit('researcher', 'log', uiLanguage === 'zh' ? `正在分析 ${targetMarket === 'global' ? '全球' : (targetMarket || 'global').toUpperCase()} 市场的 SERP 和竞争对手...` : `Analyzing SERP and Competitors for ${targetMarket === 'global' ? 'Global' : (targetMarket || 'global').toUpperCase()} market...`);
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
    const serpCountryCode = countryCodeMap[targetMarket || 'global'] || 'us';
    let serpData;
    try {
      // 参数顺序: keyword, language, engine (固定为 'google'), location (暂未使用)
      serpData = await fetchSerpResults(keyword, targetLanguage, 'google');
    } catch (serpError: any) {
      console.error('[VisualArticle] Failed to fetch SERP results:', serpError);
      serpData = { keyword, results: [] };
    }
    emit('researcher', 'card', undefined, 'serp', { results: serpData?.results || [] });

    let searchPrefs;
    try {
      const searchPrefsStreamId = `researcher-searchprefs-${Date.now()}`;
      emit('researcher', 'card', undefined, 'streaming-text', {
        content: '',
        speed: 3,
        interval: 50,
        live: true,
        isComplete: false
      }, searchPrefsStreamId);

      searchPrefs = await analyzeSearchPreferences(
        keyword,
        uiLanguage,
        targetLanguage,
        targetMarket,
        (searchResults) => {
        // Emit Google search results if available
        if (searchResults && searchResults.length > 0) {
          emit('researcher', 'card', undefined, 'google-search-results', { results: searchResults });
        }
      },
        (msg) => emit('researcher', 'log', msg),
        (delta, fullText, isFinal) => {
          emit('researcher', 'card', undefined, 'streaming-text', {
            content: `\`\`\`json\n${fullText}\n\`\`\``,
            speed: 3,
            interval: 50,
            live: true,
            isComplete: isFinal
          }, searchPrefsStreamId);
        }
      );
    } catch (searchPrefsError: any) {
      console.error('[VisualArticle] Failed to analyze search preferences:', searchPrefsError);
      searchPrefs = undefined;
    }

    // Emit search preferences analysis results
    if (searchPrefs) {
      // 后端现在强制返回JSON格式，直接传递结构化数据
      emit('researcher', 'card', undefined, 'search-preferences', {
        semantic_landscape: searchPrefs.semantic_landscape,
        engine_strategies: searchPrefs.engine_strategies,
        geo_recommendations: searchPrefs.geo_recommendations,
        searchPreferences: searchPrefs.searchPreferences
      });
    }

    let competitorAnalysis;
    try {
      const competitorStreamId = `researcher-competitors-${Date.now()}`;
      emit('researcher', 'card', undefined, 'streaming-text', {
        content: '',
        speed: 3,
        interval: 50,
        live: true,
        isComplete: false
      }, competitorStreamId);

      competitorAnalysis = await analyzeCompetitors(
        keyword,
        serpData,
        uiLanguage,
        targetLanguage,
        targetMarket,
        'google',
        (searchResults) => {
        // Emit Google search results if available
        if (searchResults && searchResults.length > 0) {
          emit('researcher', 'card', undefined, 'google-search-results', { results: searchResults });
        }
      },
        (msg) => emit('researcher', 'log', msg),
        (delta, fullText, isFinal) => {
          emit('researcher', 'card', undefined, 'streaming-text', {
            content: `\`\`\`json\n${fullText}\n\`\`\``,
            speed: 3,
            interval: 50,
            live: true,
            isComplete: isFinal
          }, competitorStreamId);
        }
      );
    } catch (competitorError: any) {
      console.error('[VisualArticle] Failed to analyze competitors:', competitorError);
      competitorAnalysis = undefined;
    }

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
      } else if (reference.type === 'url' && reference.url?.content && reference.url?.url) {
        const urlString = typeof reference.url.url === 'string' ? reference.url.url : 'N/A';
        emit('strategist', 'log', uiLanguage === 'zh' ? `正在处理参考URL: ${urlString}` : `Processing reference URL: ${urlString}`);
        // For URL, provide summary (first 2000 chars)
        const urlSummary = reference.url.content.length > 2000
          ? reference.url.content.substring(0, 2000) + '...'
          : reference.url.content;
        referenceContext = `\n\nUser Reference URL (${urlString}):\n${urlSummary}`;
        emit('strategist', 'log', `✓ ${uiLanguage === 'zh' ? `URL内容已抓取 (${reference.url.content.length} 字符)，截图: ${reference.url.screenshot ? '是' : '否'}` : `URL scraped (${reference.url.content.length} chars), Screenshot: ${reference.url.screenshot ? 'Yes' : 'No'}`}`);
      }
    }

    emit('strategist', 'log', uiLanguage === 'zh' ? '正在生成综合SEO策略报告...' : 'Generating comprehensive SEO strategy report...');
    let strategyReport;
    try {
      const strategyStreamId = `strategist-strategy-${Date.now()}`;
      emit('strategist', 'card', undefined, 'streaming-text', {
        content: '',
        speed: 3,
        interval: 50,
        live: true,
        isComplete: false
      }, strategyStreamId);

      strategyReport = await generateDeepDiveStrategy(
        keywordData,
        uiLanguage,
        targetLanguage,
        `Tone: ${tone}, Audience: ${targetAudience}, Target Market: ${targetMarket === 'global' ? 'Global' : (targetMarket || 'global').toUpperCase()}. Ensure visual opportunities are highlighted and content is tailored for the target market.${referenceContext}`,
        searchPrefs,
        competitorAnalysis,
        targetMarket,
        reference,
        (msg) => emit('strategist', 'log', msg),
        (delta, fullText, isFinal) => {
          emit('strategist', 'card', undefined, 'streaming-text', {
            content: `\`\`\`json\n${fullText}\n\`\`\``,
            speed: 3,
            interval: 50,
            live: true,
            isComplete: isFinal
          }, strategyStreamId);
        }
      );
    } catch (strategyError: any) {
      console.error('[VisualArticle] Failed to generate strategy report:', strategyError);
      // Create a fallback strategy report
      strategyReport = {
        pageTitleH1: keyword,
        contentStructure: [],
        metaDescription: '',
        targetKeyword: keyword
      };
      emit('strategist', 'log', uiLanguage === 'zh' ? '警告: 策略生成失败，使用默认策略' : 'Warning: Strategy generation failed, using default strategy');
    }

    const structureLength = Array.isArray(strategyReport.contentStructure) ? strategyReport.contentStructure.length : 0;
    emit('strategist', 'log', `✓ ${uiLanguage === 'zh' ? `策略报告生成完成: ${structureLength} 个主要章节` : `Strategy report complete: ${structureLength} main sections`}`);
    emit('strategist', 'card', undefined, 'outline', {
      h1: strategyReport.pageTitleH1 || keyword,
      structure: Array.isArray(strategyReport.contentStructure) ? strategyReport.contentStructure : []
    });

    // 3. Visual phase (Extract themes and start generation)
    // We do this BEFORE writing so we can potentially reference images or just show progress
    emit('artist', 'log', uiLanguage === 'zh' ? '正在分析结构以寻找视觉机会...' : 'Analyzing structure for visual opportunities...');

    // Count promoted websites with screenshots
    const promotedScreenshots = processedPromotedWebsites?.filter(p => p.screenshot) || [];
    const promotedScreenshotCount = promotedScreenshots.length;
    
    console.log(`[VisualArticle] Image generation strategy: ${promotedScreenshotCount} promoted URLs with screenshots`);
    console.log(`[VisualArticle] processedPromotedWebsites:`, processedPromotedWebsites?.map(p => ({
      url: p.url,
      hasContent: !!p.content,
      hasScreenshot: !!p.screenshot,
      title: p.title
    })));

    // Image generation logic:
    // - 0 promoted URLs → 2 AI images
    // - 1 promoted URL → 1 AI image + 1 screenshot
    // - 2+ promoted URLs → 0 AI images + N screenshots
    
    // Safely extract content structure with defensive checks
    const pageTitle = strategyReport.pageTitleH1 || '';
    const contentStructure = Array.isArray(strategyReport.contentStructure)
      ? strategyReport.contentStructure
      : [];
    const structureText = contentStructure
      .map((s: any) => s?.header || '')
      .filter((h: string) => h)
      .join("\n");
    const contentForThemes = pageTitle + (structureText ? "\n" + structureText : "");

    let generatedImages: any[] = [];
    
    // Determine how many AI images to generate based on promoted URL count
    const aiImageCount = promotedScreenshotCount === 0 ? 2 : (promotedScreenshotCount === 1 ? 1 : 0);
    
    emit('artist', 'log', uiLanguage === 'zh' 
      ? `图片策略: ${promotedScreenshotCount} 个推广链接截图 + ${aiImageCount} 张 AI 生成图`
      : `Image strategy: ${promotedScreenshotCount} promotion screenshots + ${aiImageCount} AI generated images`);

    // Generate AI images if needed (with error handling to ensure article generation continues)
    if (aiImageCount > 0) {
      try {
      const visualThemes = await extractVisualThemes(contentForThemes || keyword, uiLanguage, (msg) => emit('artist', 'log', msg));
      
      if (visualThemes.themes && visualThemes.themes.length > 0) {
        const selectedThemes = visualThemes.themes.slice(0, aiImageCount);
        // 传递关键词和文章标题以增强图像与主题的相关性
        const prompts = await generateImagePrompts(
          selectedThemes,
          uiLanguage,
          keyword,
          pageTitle || undefined
        );

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
        emit('artist', 'log', uiLanguage === 'zh' ? `正在生成 ${prompts.length} 张 AI 图片...` : `Generating ${prompts.length} AI images...`);
        const imageResults = await generateImages(prompts);

        const successCount = imageResults.filter(r => r.imageUrl).length;
        const failCount = imageResults.filter(r => r.error).length;
        emit('artist', 'log', `✓ ${uiLanguage === 'zh' ? `AI 图片生成完成: ${successCount} 成功, ${failCount} 失败` : `AI image generation complete: ${successCount} succeeded, ${failCount} failed`}`);

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
      } catch (aiImageError: any) {
        // AI 图片生成失败不应阻止文章生成
        console.error('[VisualArticle] AI image generation failed:', aiImageError.message);
        emit('artist', 'log', uiLanguage === 'zh' 
          ? `⚠️ AI 图片生成失败: ${aiImageError.message}，将继续生成文章`
          : `⚠️ AI image generation failed: ${aiImageError.message}, continuing with article generation`);
      }
    } else {
      emit('artist', 'log', uiLanguage === 'zh' 
        ? '检测到多个推广链接，跳过 AI 生图，使用推广页面截图'
        : 'Multiple promotion URLs detected, skipping AI image generation, using promotion screenshots');
    }

    // Add promoted website screenshots
    if (promotedScreenshots.length > 0) {
      emit('artist', 'log', uiLanguage === 'zh' 
        ? `正在添加 ${promotedScreenshots.length} 张推广网站截图...`
        : `Adding ${promotedScreenshots.length} promotion website screenshots...`);
      
      for (const promotedSite of promotedScreenshots) {
        if (promotedSite.screenshot) {
          generatedImages.push({
            url: promotedSite.screenshot,
            prompt: promotedSite.title || promotedSite.url,
            placement: 'inline',
            isScreenshot: true,
            sourceUrl: promotedSite.url
          });
          
          emit('artist', 'card',
            uiLanguage === 'zh' ? `已添加推广页面截图: ${promotedSite.title || promotedSite.url}` : `Promotion screenshot added: ${promotedSite.title || promotedSite.url}`,
            'image-gen',
            {
              theme: promotedSite.title || 'Promotion Screenshot',
              prompt: promotedSite.url,
              imageUrl: promotedSite.screenshot,
              status: 'completed',
              progress: 100,
              isScreenshot: true
            }
          );
        }
      }
      
      emit('artist', 'log', `✓ ${uiLanguage === 'zh' 
        ? `已添加 ${promotedScreenshots.length} 张推广网站截图`
        : `Added ${promotedScreenshots.length} promotion website screenshots`}`);
    }
    
    // Also add reference URL screenshot if available and not already covered by promoted websites
    const hasUrlScreenshot = reference?.type === 'url' && reference.url?.screenshot;
    if (hasUrlScreenshot && reference.url?.screenshot) {
      // Check if this URL is not already in promotedScreenshots
      const refUrl = reference.url.url;
      const alreadyIncluded = promotedScreenshots.some(p => p.url === refUrl);
      
      if (!alreadyIncluded) {
        const urlString = reference.url.url && typeof reference.url.url === 'string' ? reference.url.url : 'Reference Screenshot';
        const titleString = reference.url.title && typeof reference.url.title === 'string' ? reference.url.title : undefined;
        generatedImages.push({
          url: reference.url.screenshot,
          prompt: titleString || urlString,
          placement: 'inline',
          isScreenshot: true
        });
        emit('artist', 'card',
          uiLanguage === 'zh' ? `已添加参考页面截图` : `Reference page screenshot added`,
          'image-gen',
          {
            theme: titleString || 'Reference Screenshot',
            prompt: urlString,
            imageUrl: reference.url.screenshot,
            status: 'completed',
            progress: 100,
            isScreenshot: true
          }
        );
      }
    }
    
    console.log(`[VisualArticle] Total images: ${generatedImages.length} (AI: ${generatedImages.filter(i => !i.isScreenshot).length}, Screenshots: ${generatedImages.filter(i => i.isScreenshot).length})`);
    emit('artist', 'log', `✓ ${uiLanguage === 'zh' 
      ? `图片准备完成: 共 ${generatedImages.length} 张`
      : `Images ready: ${generatedImages.length} total`}`);

    // 4. Writing phase
    emit('writer', 'log', uiLanguage === 'zh' ? `正在为 ${targetMarket === 'global' ? '全球' : (targetMarket || 'global').toUpperCase()} 市场撰写包含视觉元素的精细内容...` : `Drafting content with integrated visuals for ${targetMarket === 'global' ? 'Global' : (targetMarket || 'global').toUpperCase()} market...`);

    // Emit streaming text card
    const streamingEventId = `writer-stream-${Date.now()}`;
    emit('writer', 'card', undefined, 'streaming-text', {
      content: '',
      speed: 3,
      interval: 50,
      live: true,
      isComplete: false
    }, streamingEventId);

    // 将生成的图片转换为写手可用的格式
    const availableImagesForWriter: AvailableImage[] = generatedImages.map((img: any) => ({
      url: img.url,
      theme: img.prompt || img.theme || 'Image',
      description: img.description || img.prompt || '',
      isScreenshot: img.isScreenshot || false,
      sourceUrl: img.sourceUrl || undefined
    }));

    // 详细日志：记录传递给写手的图片信息
    console.log(`[VisualArticle] availableImagesForWriter:`, availableImagesForWriter.map(img => ({
      theme: img.theme,
      isScreenshot: img.isScreenshot,
      hasUrl: !!img.url,
      urlPreview: img.url?.substring(0, 50) + '...'
    })));

    if (availableImagesForWriter.length > 0) {
      emit('writer', 'log', uiLanguage === 'zh' 
        ? `📷 将 ${availableImagesForWriter.length} 张图片传递给写手，用于嵌入文章...（AI生成: ${availableImagesForWriter.filter(i => !i.isScreenshot).length}，截图: ${availableImagesForWriter.filter(i => i.isScreenshot).length}）`
        : `📷 Passing ${availableImagesForWriter.length} images to writer for embedding... (AI: ${availableImagesForWriter.filter(i => !i.isScreenshot).length}, Screenshots: ${availableImagesForWriter.filter(i => i.isScreenshot).length})`);
    } else {
      emit('writer', 'log', uiLanguage === 'zh' 
        ? `⚠️ 没有可用图片传递给写手，文章将不包含嵌入图片`
        : `⚠️ No images available for writer, article will not contain embedded images`);
    }

    let contentResult: ContentGenerationResult;
    try {
      contentResult = await generateContent(
        strategyReport,
        searchPrefs,
        competitorAnalysis,
        uiLanguage,
        targetMarket,
        targetLanguage,
        reference,
        promotedWebsites,
        promotionIntensity,
        processedPromotedWebsites, // Pass scraped content from promoted websites
        (searchResults) => {
          // Emit Google search results if available
          if (searchResults && searchResults.length > 0) {
            emit('writer', 'card', undefined, 'google-search-results', { results: searchResults });
          }
        },
        (msg) => emit('writer', 'log', msg),
        availableImagesForWriter,  // 传递可用图片给写手
        (delta, fullText, isFinal) => {
          emit('writer', 'card', undefined, 'streaming-text', {
            content: fullText,
            speed: 3,
            interval: 50,
            live: true,
            isComplete: isFinal
          }, streamingEventId);
        }
      );
      // 内容生成成功后的详细日志
      console.log('[VisualArticle] Content generation successful:', {
        hasTitle: !!contentResult.title,
        titleLength: contentResult.title?.length || 0,
        hasContent: !!contentResult.content,
        contentLength: contentResult.content?.length || 0,
        hasArticleBody: !!contentResult.article_body,
        articleBodyLength: contentResult.article_body?.length || 0,
        hasMarkdown: !!contentResult.markdown,
        markdownLength: contentResult.markdown?.length || 0,
        contentPreview: (contentResult.content || contentResult.article_body || '')?.substring(0, 200)
      });
    } catch (contentError: any) {
      console.error('[VisualArticle] Failed to generate content:', contentError);
      console.error('[VisualArticle] Content error stack:', contentError?.stack);
      // Create a fallback content result
      contentResult = {
        title: strategyReport?.pageTitleH1 || keyword,
        content: `# ${strategyReport?.pageTitleH1 || keyword}\n\nContent generation failed: ${contentError?.message || 'Unknown error'}. Please try again.`,
        article_body: `Content generation failed: ${contentError?.message || 'Unknown error'}`
      };
      emit('writer', 'log', uiLanguage === 'zh' ? `警告: 内容生成失败 - ${contentError?.message}` : `Warning: Content generation failed - ${contentError?.message}`);
    }

    // Update streaming text with final content
    const finalContent = contentResult!.content || contentResult!.article_body || '';
    console.log('[VisualArticle] Final content for streaming-text:', {
      hasContent: !!finalContent,
      contentLength: finalContent.length,
      contentPreview: finalContent.substring(0, 200)
    });
    
    if (finalContent) {
      emit('writer', 'card', undefined, 'streaming-text', {
        content: finalContent,
        speed: 3,
        interval: 50,
        live: true,
        isComplete: true
      }, streamingEventId);
    } else {
      emit('writer', 'log', uiLanguage === 'zh' ? '⚠️ 警告: 未生成有效内容' : '⚠️ Warning: No valid content generated');
    }

    // Final result assembly with defensive checks
    // 确保至少有一个内容来源
    const articleContent = contentResult!.content || contentResult!.article_body || contentResult!.markdown || '';
    const articleTitle = contentResult!.title || strategyReport?.pageTitleH1 || keyword;
    
    const finalArticle = {
      title: articleTitle,
      content: articleContent,
      // 同时保留 article_body 以兼容前端不同的解析逻辑
      article_body: articleContent,
      markdown: contentResult!.markdown || articleContent,
      images: Array.isArray(generatedImages) ? generatedImages : [],
    };

    // Log final article for debugging - 详细日志
    console.log('[VisualArticle] Final article constructed:', {
      hasTitle: !!finalArticle.title,
      titleValue: finalArticle.title?.substring(0, 50),
      hasContent: !!finalArticle.content,
      contentLength: finalArticle.content?.length || 0,
      contentPreview: finalArticle.content?.substring(0, 300),
      hasArticleBody: !!finalArticle.article_body,
      hasMarkdown: !!finalArticle.markdown,
      imagesCount: finalArticle.images?.length || 0,
      imagesUrls: finalArticle.images?.map((i: any) => i.url?.substring(0, 50)),
    });

    // 如果内容仍然为空，记录警告
    if (!finalArticle.content || finalArticle.content.trim().length === 0) {
      console.error('[VisualArticle] WARNING: Final article has empty content!');
      emit('writer', 'log', uiLanguage === 'zh' 
        ? '⚠️ 警告: 文章内容为空，请检查生成过程' 
        : '⚠️ Warning: Article content is empty, please check the generation process');
    }

    // Note: Content saving is now handled by frontend calling /api/articles/save
    // The article data is returned directly, and frontend decides when to save

    return finalArticle;

  } catch (error: any) {
    emit('tracker', 'error', `Mission failed: ${error.message}`);
    throw error;
  }
}
