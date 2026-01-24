/**
 * Agent 3: 内容写手
 * 
 * 职责：基于SEO研究结果生成高质量内容
 * 使用：Deep Dive模式 Step 6
 */

import { callGeminiAPI } from '../gemini.js';
import { getContentWriterPrompt } from '../../../services/prompts/index.js';
import { SEOStrategyReport, TargetLanguage } from '../types.js';
import { SearchPreferencesResult, CompetitorAnalysisResult } from './agent-2-seo-researcher.js';

/**
 * 内容生成结果
 */
export interface ContentGenerationResult {
  markdown?: string;  // 完整的 Markdown 内容（新格式）
  title?: string;
  metaDescription?: string;
  content?: string;
  structure?: string[];
  seo_meta?: {
    title?: string;
    description?: string;
  };
  article_body?: string;
  logic_check?: string;
  geo_score?: {
    title_standard?: string;
    summary?: string;
    information_gain?: string;
    format_engineering?: string;
    entity_engineering?: string;
    comparison?: string;
    faq?: string;
    total_score?: string;
  };
  appliedOptimizations?: {
    keywords?: Array<{
      position?: string;
      keyword?: string;
    }>;
    geo?: string[];
    aio?: string[];
  };
}

/**
 * 提取JSON内容
 */
function extractJSON(text: string): string {
  // Try to find JSON object
  const jsonMatch = text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  return text.trim();
}

// Processed promoted website with scraped content
export interface ProcessedPromotedWebsite {
  url: string;
  content: string;
  screenshot?: string;
  title?: string;
}

/**
 * 可用图片资源（用于写手在文章中插入）
 */
export interface AvailableImage {
  url: string;
  theme: string;
  description?: string;
  isScreenshot?: boolean;
  sourceUrl?: string;  // 如果是推广截图，附带来源URL
}

/**
 * 生成内容
 * 
 * 基于SEO研究报告、搜索引擎偏好分析和竞争对手分析，生成高质量的文章内容
 * 
 * @param seoStrategyReport - SEO策略报告
 * @param searchPreferences - 搜索引擎偏好分析结果（可选）
 * @param competitorAnalysis - 竞争对手分析结果（可选）
 * @param language - 语言代码（'zh' | 'en'）
 * @returns 内容生成结果
 */
export async function generateContent(
  seoStrategyReport: SEOStrategyReport | { markdown: string },  // Support both formats
  searchPreferences?: SearchPreferencesResult,
  competitorAnalysis?: CompetitorAnalysisResult,
  uiLanguage: 'zh' | 'en' = 'en',
  targetMarket: string = 'global',
  targetLanguage: TargetLanguage = 'en',
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
  },
  promotedWebsites?: string[],
  promotionIntensity?: "natural" | "strong",
  processedPromotedWebsites?: ProcessedPromotedWebsite[],
  onSearchResults?: (results: Array<{ title: string; url: string; snippet?: string }>) => void,
  onProgress?: (message: string) => void,
  availableImages?: AvailableImage[]  // 新增：可用图片资源，用于在文章中插入
): Promise<ContentGenerationResult> {
  try {
    // 获取 Content Writer prompt - 使用 targetLanguage 来确定生成内容的语言
    // uiLanguage 仅用于UI显示，targetLanguage 用于实际内容生成
    const contentLanguage = targetLanguage === 'zh' ? 'zh' : 'en';

    let systemInstruction: string;
    try {
      systemInstruction = getContentWriterPrompt(contentLanguage);
      if (!systemInstruction || typeof systemInstruction !== 'string') {
        console.warn('[Content Writer] Invalid systemInstruction, using fallback');
        systemInstruction = contentLanguage === 'zh'
          ? '你是一位专业的SEO内容写手。'
          : 'You are a professional SEO content writer.';
      }
    } catch (e) {
      console.error('[Content Writer] Failed to get system instruction:', e);
      systemInstruction = contentLanguage === 'zh'
        ? '你是一位专业的SEO内容写手。'
        : 'You are a professional SEO content writer.';
    }

    // Check if strategy report is in Markdown format
    const isMarkdownStrategy = 'markdown' in seoStrategyReport && seoStrategyReport.markdown;

    // Extract target keyword for reference context
    let targetKeyword = '';
    if (isMarkdownStrategy) {
      // Try to extract keyword from markdown (look for "Target Keyword:" or similar patterns)
      const keywordMatch = seoStrategyReport.markdown.match(/(?:目标关键词|Target Keyword|关键词)[:：]\s*(.+?)(?:\n|$)/i);
      targetKeyword = keywordMatch ? keywordMatch[1].trim() : 'the target keyword';
    } else {
      const structuredReport = seoStrategyReport as SEOStrategyReport;
      targetKeyword = structuredReport.targetKeyword || 'the target keyword';
    }

    // 构建SEO研究上下文（压缩版）
    let seoContext = '';
    if (isMarkdownStrategy) {
      // 压缩 Markdown 策略：只保留关键信息
      const markdown = seoStrategyReport.markdown;
      // 提取关键部分：目标关键词、用户意图、推荐字数、结构大纲、核心长尾词
      const intentMatch = markdown.match(/(?:用户意图|User Intent|搜索意图)[:：]\s*(.+?)(?:\n|$)/i);
      const wordCountMatch = markdown.match(/(?:推荐字数|Recommended Word Count|字数)[:：]\s*(\d+)/i);
      const structureMatch = markdown.match(/(?:内容结构|Content Structure|大纲)[:：]?\s*([\s\S]*?)(?:\n##|\n---|\n\*\*|$)/i);
      const longtailMatch = markdown.match(/(?:长尾关键词|Long-tail Keywords|LSI)[:：]?\s*(.{0,200}?)(?:\n##|\n---|\n\*\*|$)/i);

      seoContext = `
SEO Strategy (Compressed):
- Target Keyword: ${targetKeyword}
- User Intent: ${intentMatch ? intentMatch[1].trim().substring(0, 100) : 'N/A'}
- Word Count: ${wordCountMatch ? wordCountMatch[1] : '1500-2000'} words
- Structure Outline: ${structureMatch ? structureMatch[1].trim().substring(0, 500) : 'See H2 sections'}
- Top Long-tail Keywords: ${longtailMatch ? longtailMatch[1].trim().substring(0, 150) : 'N/A'}
`;
    } else {
      // 压缩结构化格式：只保留可行动的要点
      const structuredReport = seoStrategyReport as SEOStrategyReport;
      // 只保留 H2 标题和简短说明（每个限制 50 字）
      const compressedStructure = structuredReport.contentStructure
        .map((section, i) => `${i + 1}. ${section.header}: ${section.description.substring(0, 50)}${section.description.length > 50 ? '...' : ''}`)
        .join('\n');
      // 只保留前 10 个长尾关键词
      const topLongtail = structuredReport.longTailKeywords?.slice(0, 10).join(', ') || 'N/A';

      seoContext = `
SEO Strategy (Compressed):
- Target Keyword: ${structuredReport.targetKeyword}
- User Intent: ${structuredReport.userIntentSummary.substring(0, 100)}
- Word Count: ${structuredReport.recommendedWordCount} words
- Structure Outline:
${compressedStructure}
- Top 10 Long-tail Keywords: ${topLongtail}
`;
    }

    // 添加搜索引擎偏好分析上下文（压缩版：提炼成 3 条可执行准则）
    let searchPreferencesContext = '';
    if (searchPreferences) {
      // 提取关键策略点，限制为 3 条简短准则
      const guidelines: string[] = [];

      if (searchPreferences.semantic_landscape) {
        guidelines.push(searchPreferences.semantic_landscape.substring(0, 120));
      }

      if (searchPreferences.engine_strategies?.google) {
        const googleStrategy = searchPreferences.engine_strategies.google;
        if (typeof googleStrategy === 'string') {
          guidelines.push(`Google: ${googleStrategy.substring(0, 120)}`);
        } else if (typeof googleStrategy === 'object') {
          const strategyText = JSON.stringify(googleStrategy).substring(0, 120);
          guidelines.push(`Google: ${strategyText}`);
        }
      }

      if (searchPreferences.engine_strategies?.perplexity) {
        const perplexityStrategy = searchPreferences.engine_strategies.perplexity;
        if (typeof perplexityStrategy === 'string') {
          guidelines.push(`AI Search: ${perplexityStrategy.substring(0, 120)}`);
        } else if (typeof perplexityStrategy === 'object') {
          const strategyText = JSON.stringify(perplexityStrategy).substring(0, 120);
          guidelines.push(`AI Search: ${strategyText}`);
        }
      }

      if (guidelines.length > 0) {
        searchPreferencesContext = contentLanguage === 'zh'
          ? `\n搜索偏好准则（3条）：\n${guidelines.slice(0, 3).map((g, i) => `${i + 1}. ${g}`).join('\n')}\n`
          : `\nSearch Preferences (3 Guidelines):\n${guidelines.slice(0, 3).map((g, i) => `${i + 1}. ${g}`).join('\n')}\n`;
      }
    }

    // 添加竞争对手分析上下文（压缩版：只保留 winning_formula + 3 个缺口 + 3 个标题）
    let competitorContext = '';
    if (competitorAnalysis) {
      const winningFormula = competitorAnalysis.winning_formula?.substring(0, 200) || '';
      const contentGaps = competitorAnalysis.content_gaps?.slice(0, 3).join('; ') || '';
      const topTitles = competitorAnalysis.competitor_benchmark
        ?.slice(0, 3)
        .map(c => c.title || c.url)
        .join('; ') || '';

      if (contentLanguage === 'zh') {
        competitorContext = `
竞品分析（压缩）：
- 制胜公式：${winningFormula}
- 内容缺口（Top 3）：${contentGaps}
- 竞品标题参考（Top 3）：${topTitles}
`;
      } else {
        competitorContext = `
Competitor Analysis (Compressed):
- Winning Formula: ${winningFormula}
- Content Gaps (Top 3): ${contentGaps}
- Competitor Titles (Top 3): ${topTitles}
`;
      }
    }

    // 添加参考资料上下文（压缩版：只抽取关键词相关段落，上限 1800 字）
    let referenceContext = '';
    if (reference) {
      if (reference.type === 'document' && reference.document) {
        // 压缩文档内容：提取与关键词相关的段落
        const docContent = reference.document.content;
        let extractedContent = '';

        // 简单的关键词匹配提取（不使用额外 LLM）
        const keywordLower = targetKeyword.toLowerCase();
        const paragraphs = docContent.split(/\n\n+/);
        const relevantParagraphs: string[] = [];

        // 提取包含关键词的段落及其上下文
        for (let i = 0; i < paragraphs.length; i++) {
          if (paragraphs[i].toLowerCase().includes(keywordLower)) {
            // 添加前一段、当前段、后一段
            if (i > 0 && !relevantParagraphs.includes(paragraphs[i - 1])) {
              relevantParagraphs.push(paragraphs[i - 1]);
            }
            if (!relevantParagraphs.includes(paragraphs[i])) {
              relevantParagraphs.push(paragraphs[i]);
            }
            if (i < paragraphs.length - 1 && !relevantParagraphs.includes(paragraphs[i + 1])) {
              relevantParagraphs.push(paragraphs[i + 1]);
            }
          }
        }

        // 如果没有匹配，取前 1800 字
        if (relevantParagraphs.length === 0) {
          extractedContent = docContent.substring(0, 1800);
        } else {
          extractedContent = relevantParagraphs.join('\n\n').substring(0, 1800);
        }

        if (contentLanguage === 'zh') {
          referenceContext = `
用户参考文档（压缩）：
文件名：${reference.document.filename}
相关内容摘要（${extractedContent.length} 字）：
${extractedContent}${extractedContent.length >= 1800 ? '...' : ''}

提示：文章核心主题必须是"${targetKeyword}"，从文档中提取相关信息。
`;
        } else {
          referenceContext = `
User Reference Document (Compressed):
Filename: ${reference.document.filename}
Relevant Content Extract (${extractedContent.length} chars):
${extractedContent}${extractedContent.length >= 1800 ? '...' : ''}

Note: Article core theme must be "${targetKeyword}". Extract relevant info from document.
`;
        }
      } else if (reference.type === 'url' && reference.url?.content && reference.url?.url) {
        // 压缩 URL 内容：同样提取关键词相关段落
        const urlContent = reference.url.content;
        let extractedContent = '';

        const keywordLower = targetKeyword.toLowerCase();
        const paragraphs = urlContent.split(/\n\n+/);
        const relevantParagraphs: string[] = [];

        for (let i = 0; i < paragraphs.length; i++) {
          if (paragraphs[i].toLowerCase().includes(keywordLower)) {
            if (i > 0 && !relevantParagraphs.includes(paragraphs[i - 1])) {
              relevantParagraphs.push(paragraphs[i - 1]);
            }
            if (!relevantParagraphs.includes(paragraphs[i])) {
              relevantParagraphs.push(paragraphs[i]);
            }
            if (i < paragraphs.length - 1 && !relevantParagraphs.includes(paragraphs[i + 1])) {
              relevantParagraphs.push(paragraphs[i + 1]);
            }
          }
        }

        if (relevantParagraphs.length === 0) {
          extractedContent = urlContent.substring(0, 1800);
        } else {
          extractedContent = relevantParagraphs.join('\n\n').substring(0, 1800);
        }

        const urlString = typeof reference.url.url === 'string' ? reference.url.url : 'N/A';
        const titleString = reference.url.title && typeof reference.url.title === 'string' ? reference.url.title : '';

        if (contentLanguage === 'zh') {
          referenceContext = `
用户参考URL（压缩）：
URL：${urlString}
${titleString ? `标题：${titleString}\n` : ''}相关内容摘要（${extractedContent.length} 字）：
${extractedContent}${extractedContent.length >= 1800 ? '...' : ''}

提示：文章核心主题必须是"${targetKeyword}"，从URL中提取相关信息。
`;
        } else {
          referenceContext = `
User Reference URL (Compressed):
URL: ${urlString}
${titleString ? `Title: ${titleString}\n` : ''}Relevant Content Extract (${extractedContent.length} chars):
${extractedContent}${extractedContent.length >= 1800 ? '...' : ''}

Note: Article core theme must be "${targetKeyword}". Extract relevant info from URL.
`;
        }
      }
    }

    // 添加推广网站的抓取内容（压缩版：每个网站只保留标题 + 1 句描述 + 2 条功能点，上限 600 字/站）
    let promotedWebsitesContext = '';
    if (processedPromotedWebsites && processedPromotedWebsites.length > 0) {
      const sitesWithContent = processedPromotedWebsites.filter(p => p.content && p.content.trim().length > 0);
      if (sitesWithContent.length > 0) {
        if (contentLanguage === 'zh') {
          promotedWebsitesContext = `

### 推广网站详细内容（压缩）
以下是用户希望在文章中推广的网站及其核心信息：

${sitesWithContent.map((site, index) => {
  // 压缩内容：提取标题、简短描述、关键功能点
  const siteContent = site.content;
  const title = site.title || site.url;

  // 提取第一句作为描述（限制 100 字）
  const firstSentence = siteContent.split(/[。.!！\n]/)[0].substring(0, 100);

  // 提取前 2 个要点（查找列表项或段落）
  const bulletPoints: string[] = [];
  const lines = siteContent.split('\n');
  for (const line of lines) {
    if (line.match(/^[-*•]\s/) || line.match(/^\d+\.\s/)) {
      bulletPoints.push(line.trim().substring(0, 80));
      if (bulletPoints.length >= 2) break;
    }
  }

  // 如果没有找到列表项，提取前 2 个短段落
  if (bulletPoints.length === 0) {
    const paragraphs = siteContent.split(/\n\n+/).filter(p => p.length > 20 && p.length < 200);
    bulletPoints.push(...paragraphs.slice(0, 2).map(p => p.substring(0, 80)));
  }

  return `**网站 ${index + 1}: ${title}**
URL: ${site.url}
描述：${firstSentence}
核心功能：
${bulletPoints.map(bp => `- ${bp}`).join('\n')}`;
}).join('\n\n---\n\n')}

请在文章中自然地融入对这些网站的介绍和推荐。`;
        } else {
          promotedWebsitesContext = `

### Promoted Websites Content (Compressed)
Below are the websites the user wants to promote with their core information:

${sitesWithContent.map((site, index) => {
  const siteContent = site.content;
  const title = site.title || site.url;

  const firstSentence = siteContent.split(/[.!?\n]/)[0].substring(0, 100);

  const bulletPoints: string[] = [];
  const lines = siteContent.split('\n');
  for (const line of lines) {
    if (line.match(/^[-*•]\s/) || line.match(/^\d+\.\s/)) {
      bulletPoints.push(line.trim().substring(0, 80));
      if (bulletPoints.length >= 2) break;
    }
  }

  if (bulletPoints.length === 0) {
    const paragraphs = siteContent.split(/\n\n+/).filter(p => p.length > 20 && p.length < 200);
    bulletPoints.push(...paragraphs.slice(0, 2).map(p => p.substring(0, 80)));
  }

  return `**Website ${index + 1}: ${title}**
URL: ${site.url}
Description: ${firstSentence}
Key Features:
${bulletPoints.map(bp => `- ${bp}`).join('\n')}`;
}).join('\n\n---\n\n')}

Please naturally integrate these websites in the article.`;
        }
        console.log(`[Content Writer] Added ${sitesWithContent.length} promoted websites (compressed) to context`);
      }
    }

    // 构建生成提示
    const marketLabel = targetMarket === 'global'
      ? (contentLanguage === 'zh' ? '全球市场' : 'Global Market')
      : targetMarket.toUpperCase();

    // 对于 Markdown 格式的策略报告，直接使用报告文本；对于结构化格式，提取字段
    let wordCountHint = '1500-2000'; // 默认字数
    if (!isMarkdownStrategy) {
      const structuredReport = seoStrategyReport as SEOStrategyReport;
      wordCountHint = structuredReport.recommendedWordCount?.toString() || wordCountHint;
    }

    // 验证必要参数
    if (!seoContext || seoContext.length === 0) {
      console.error('[Content Writer] Empty SEO context');
      throw new Error('SEO strategy report is empty or invalid');
    }

    // 使用 prompts/index.ts 中的 prompt 模板
    // 将推广网站内容添加到 referenceContext 中
    const fullReferenceContext = referenceContext + promotedWebsitesContext;
    
    const prompt = getContentWriterPrompt(contentLanguage, {
      marketLabel,
      seoContext,
      searchPreferencesContext,
      competitorContext,
      referenceContext: fullReferenceContext,
      wordCountHint,
      promotedWebsites,
      promotionIntensity,
      availableImages  // 传递可用图片资源
    });

    // 验证 prompt
    if (!prompt || prompt.length === 0) {
      console.error('[Content Writer] Empty prompt generated');
      throw new Error('Failed to generate content prompt');
    }

    if (!systemInstruction || systemInstruction.length === 0) {
      console.error('[Content Writer] Empty system instruction');
      throw new Error('Failed to get system instruction');
    }

    // 调用 Gemini API - 不要求 JSON 格式，直接返回 Markdown
    let response;
    try {
      onProgress?.(contentLanguage === 'zh' ? `✍️ AI 专家正在撰写深度内容，请稍候（这通常需要 30-60 秒）...` : `✍️ AI expert is drafting deep content, please wait (this usually takes 30-60 seconds)...`);
      
      console.log('[Content Writer] Calling Gemini API with prompt length:', prompt.length);
      response = await callGeminiAPI(prompt, systemInstruction, {
        // 不设置 maxOutputTokens 限制，让 API 使用模型支持的最大值
        // 这样可以确保长文章不会被截断
        onRetry: (attempt, error, delay) => {
          onProgress?.(contentLanguage === 'zh'
            ? `⚠️ 内容撰写连接异常 (尝试 ${attempt}/3)，正在 ${delay}ms 后重试...`
            : `⚠️ Content drafting connection error (attempt ${attempt}/3), retrying in ${delay}ms...`);
        }
      });
      
      // 检查是否被截断
      if (response.finishReason === 'LENGTH' || response.finishReason === 'MAX_TOKENS') {
        console.warn('[Content Writer] ⚠️ Response was truncated! finishReason:', response.finishReason);
        onProgress?.(contentLanguage === 'zh' 
          ? `⚠️ 警告: AI 输出被截断，可能影响文章完整性` 
          : `⚠️ Warning: AI output was truncated, article may be incomplete`);
      }
      
      onProgress?.(contentLanguage === 'zh' ? `✅ 内容初稿撰写完成` : `✅ Content draft completed`);
      console.log('[Content Writer] API response received, text length:', response.text?.length || 0);
    } catch (apiError: any) {
      console.error('[Content Writer] API call failed:', apiError.message);
      throw new Error(`Failed to call Gemini API: ${apiError.message}`);
    }

    // 获取原始响应
    const rawResponse = response?.text || '';

    if (!rawResponse || rawResponse.length === 0) {
      console.error('[Content Writer] Empty response from API');
      throw new Error('Empty response from Gemini API');
    }

    console.log('[Content Writer] Raw response preview:', rawResponse.substring(0, 200));
    console.log('[Content Writer] Response starts with:', rawResponse.trim().charAt(0));

    // 尝试解析 JSON 格式的响应（AI 有时会返回 JSON 而不是纯 Markdown）
    let markdownContent = '';
    let extractedTitle = '';
    let seoMeta: { title?: string; description?: string } | undefined;
    let geoScore: any = undefined;
    let logicCheck: string | undefined;

    // 清理可能的 markdown 代码块包装 - 使用简单可靠的字符串处理
    let cleanedResponse = rawResponse.trim();
    
    console.log('[Content Writer] Before cleanup, starts with:', cleanedResponse.substring(0, 20), 'length:', cleanedResponse.length);
    
    // 检测并移除 ```json 或 ``` 包装
    // 方法1：检查是否以 ```json 开头
    if (cleanedResponse.startsWith('```json')) {
      // 移除开头的 ```json 和可能的换行
      cleanedResponse = cleanedResponse.substring(7); // 移除 "```json"
      if (cleanedResponse.startsWith('\n')) {
        cleanedResponse = cleanedResponse.substring(1);
      }
      // 移除末尾的 ```
      const lastBackticks = cleanedResponse.lastIndexOf('```');
      if (lastBackticks !== -1) {
        cleanedResponse = cleanedResponse.substring(0, lastBackticks).trim();
      }
      console.log('[Content Writer] Removed ```json wrapper, new length:', cleanedResponse.length);
    } 
    // 方法2：检查是否以 ``` 开头（但不是 ```json）
    else if (cleanedResponse.startsWith('```')) {
      // 移除开头的 ``` 和可能的语言标识和换行
      cleanedResponse = cleanedResponse.substring(3); // 移除 "```"
      // 移除语言标识（如果有的话，到第一个换行为止）
      const firstNewline = cleanedResponse.indexOf('\n');
      if (firstNewline !== -1) {
        cleanedResponse = cleanedResponse.substring(firstNewline + 1);
      }
      // 移除末尾的 ```
      const lastBackticks = cleanedResponse.lastIndexOf('```');
      if (lastBackticks !== -1) {
        cleanedResponse = cleanedResponse.substring(0, lastBackticks).trim();
      }
      console.log('[Content Writer] Removed ``` wrapper, new length:', cleanedResponse.length);
    }

    cleanedResponse = cleanedResponse.trim();
    console.log('[Content Writer] After cleanup, starts with:', cleanedResponse.substring(0, 50), 'ends with:', cleanedResponse.substring(cleanedResponse.length - 20));

    // 检查是否是 JSON 格式
    if (cleanedResponse.startsWith('{') && cleanedResponse.endsWith('}')) {
      try {
        const jsonData = JSON.parse(cleanedResponse);
        console.log('[Content Writer] Detected JSON response, keys:', Object.keys(jsonData));
        
        // 提取 article_body 或 content 或 markdown
        markdownContent = jsonData.article_body || jsonData.content || jsonData.markdown || '';
        
        // 如果提取的内容仍然有问题，尝试进一步处理
        if (typeof markdownContent === 'string') {
          let contentToProcess = markdownContent.trim();
          
          // 检查是否被代码块包裹
          if (contentToProcess.startsWith('```')) {
            const mdCodeBlockMatch = contentToProcess.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```\s*$/);
            if (mdCodeBlockMatch) {
              contentToProcess = mdCodeBlockMatch[1].trim();
              console.log('[Content Writer] Removed markdown code block from article_body');
            }
          }
          
          // 检查是否是嵌套的 JSON 字符串
          if (contentToProcess.startsWith('{')) {
            try {
              const nestedJson = JSON.parse(contentToProcess);
              if (nestedJson.article_body || nestedJson.content || nestedJson.markdown) {
                contentToProcess = nestedJson.article_body || nestedJson.content || nestedJson.markdown || '';
                console.log('[Content Writer] Extracted from nested JSON');
              }
            } catch (e) {
              // 嵌套解析失败，保持原样
            }
          }
          
          markdownContent = contentToProcess;
        }
        
        // 提取标题（优先从 seo_meta.title，然后从 title 字段）
        if (jsonData.seo_meta?.title) {
          extractedTitle = jsonData.seo_meta.title;
          seoMeta = jsonData.seo_meta;
        } else if (jsonData.title) {
          extractedTitle = jsonData.title;
        }
        
        // 提取其他元数据
        if (jsonData.geo_score) {
          geoScore = jsonData.geo_score;
        }
        if (jsonData.logic_check) {
          logicCheck = jsonData.logic_check;
        }
        
        console.log('[Content Writer] Extracted from JSON - title:', extractedTitle?.substring(0, 50), 'content length:', markdownContent?.length);
      } catch (e: any) {
        console.log('[Content Writer] JSON parse failed:', e.message);
        // JSON 解析失败，尝试从不完整的 JSON 中提取各个字段
        
        // 尝试提取 article_body
        const articleBodyMatch = cleanedResponse.match(/"article_body"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"(?:geo_score|logic_check|seo_meta)"|"\s*}$)/);
        if (articleBodyMatch) {
          let extractedBody = articleBodyMatch[1];
          // 解码转义字符
          try {
            extractedBody = JSON.parse(`"${extractedBody}"`);
          } catch {
            extractedBody = extractedBody
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\t/g, '\t')
              .replace(/\\\\/g, '\\');
          }
          markdownContent = extractedBody;
          console.log('[Content Writer] Extracted article_body from incomplete JSON, length:', markdownContent?.length);
        } else {
          // 如果无法提取 article_body，使用原始响应
          markdownContent = cleanedResponse;
        }
        
        // 尝试提取 geo_score（即使 JSON 整体解析失败）
        const geoScoreMatch = cleanedResponse.match(/"geo_score"\s*:\s*(\{[^}]+\})/);
        if (geoScoreMatch) {
          try {
            geoScore = JSON.parse(geoScoreMatch[1]);
            console.log('[Content Writer] Extracted geo_score from incomplete JSON');
          } catch {
            console.log('[Content Writer] Failed to parse geo_score');
          }
        }
        
        // 尝试提取 logic_check
        const logicCheckMatch = cleanedResponse.match(/"logic_check"\s*:\s*"([^"]+)"/);
        if (logicCheckMatch) {
          logicCheck = logicCheckMatch[1];
          console.log('[Content Writer] Extracted logic_check from incomplete JSON');
        }
        
        // 尝试提取 seo_meta
        const seoMetaMatch = cleanedResponse.match(/"seo_meta"\s*:\s*(\{[^}]+\})/);
        if (seoMetaMatch) {
          try {
            seoMeta = JSON.parse(seoMetaMatch[1]);
            extractedTitle = seoMeta?.title || '';
            console.log('[Content Writer] Extracted seo_meta from incomplete JSON');
          } catch {
            console.log('[Content Writer] Failed to parse seo_meta');
          }
        }
      }
    } else {
      // 纯 Markdown 格式
      console.log('[Content Writer] Detected Markdown response (not JSON)');
      markdownContent = cleanedResponse;
    }

    // 如果 markdownContent 仍然是空的，使用原始响应
    if (!markdownContent || markdownContent.trim().length === 0) {
      console.warn('[Content Writer] No content extracted, using raw response');
      markdownContent = rawResponse;
    }

    // 从 Markdown 中提取标题（第一个 # 标题）- 仅当还没有提取到标题时
    if (!extractedTitle) {
      const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
      extractedTitle = titleMatch ? titleMatch[1].trim() : '';
      console.log('[Content Writer] Title from Markdown H1:', extractedTitle?.substring(0, 50));
    }

    // 移除 H1 标题后的内容（用于正文部分）
    const titleMatch = markdownContent.match(/^#\s+.+$/m);
    const contentBody = titleMatch
      ? markdownContent.replace(/^#\s+.+$/m, '').trim()
      : markdownContent;

    console.log('[Content Writer] Final result - title:', extractedTitle?.substring(0, 50), 'content length:', contentBody?.length);

    return {
      markdown: markdownContent,
      content: contentBody,
      article_body: contentBody,
      title: extractedTitle,
      seo_meta: seoMeta,
      geo_score: geoScore,
      logic_check: logicCheck
    };
  } catch (error: any) {
    console.error('Generate Content Error:', error);
    throw new Error(`Failed to generate content: ${error.message}`);
  }
}

