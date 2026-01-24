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
  article_body?: string;
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

const MAX_SEO_CONTEXT_CHARS = 1800;
const MAX_REFERENCE_CHARS = 1600;
const MAX_PROMOTED_SITE_CHARS = 600;

function clampText(text: string, maxChars: number): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, Math.max(0, maxChars - 3)).trim() + '...';
}

function normalizeLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function summarizeObject(value: any, maxItems: number = 3, maxValueChars: number = 120): string {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .slice(0, maxItems)
      .map((item) => clampText(String(item), maxValueChars))
      .join('; ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .slice(0, maxItems)
      .map(([key, val]) => `${key}: ${clampText(String(val), maxValueChars)}`)
      .join('; ');
  }
  return clampText(String(value), maxValueChars);
}

function extractOutlineFromMarkdown(markdown: string, maxItems: number = 10) {
  const lines = markdown.split(/\r?\n/);
  const outline: Array<{ header: string; description: string }> = [];
  for (let i = 0; i < lines.length && outline.length < maxItems; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) {
      const header = line.replace(/^##\s+/, '').trim();
      let description = '';
      for (let j = i + 1; j < lines.length; j += 1) {
        const nextLine = normalizeLine(lines[j]);
        if (nextLine) {
          description = clampText(nextLine, 140);
          break;
        }
      }
      outline.push({ header, description });
    }
  }
  return outline;
}

function extractKeywordList(line: string, maxItems: number = 10): string[] {
  if (!line) return [];
  return line
    .split(/[,，;；]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function buildSeoSummaryFromMarkdown(markdown: string, contentLanguage: 'zh' | 'en') {
  const keywordMatch = markdown.match(/(?:目标关键词|Target Keyword|关键词)[:：]\s*(.+?)(?:\n|$)/i);
  const intentMatch = markdown.match(/(?:用户意图|User Intent|Intent)[:：]\s*(.+?)(?:\n|$)/i);
  const wordCountMatch = markdown.match(/(?:推荐字数|Recommended Word Count|Word Count)[:：]\s*(\d+.*?)(?:\n|$)/i);
  const longTailMatch = markdown.match(/(?:长尾关键词|Long-tail Keywords)[:：]\s*(.+?)(?:\n|$)/i);

  const targetKeyword = keywordMatch ? keywordMatch[1].trim() : '';
  const userIntent = intentMatch ? intentMatch[1].trim() : '';
  const wordCountHint = wordCountMatch ? wordCountMatch[1].trim() : '';
  const outline = extractOutlineFromMarkdown(markdown);
  const longTail = longTailMatch ? extractKeywordList(longTailMatch[1]) : [];

  return {
    targetKeyword,
    userIntent,
    wordCountHint,
    outline,
    longTail,
    language: contentLanguage
  };
}

function buildSeoSummaryFromStructured(report: SEOStrategyReport, contentLanguage: 'zh' | 'en') {
  const outline = (report.contentStructure || []).slice(0, 10).map((section) => ({
    header: section.header || '',
    description: clampText(section.description || '', 140)
  }));
  return {
    targetKeyword: report.targetKeyword || '',
    userIntent: report.userIntentSummary || '',
    wordCountHint: report.recommendedWordCount ? `${report.recommendedWordCount}` : '',
    outline,
    longTail: (report.longTailKeywords || []).slice(0, 10),
    language: contentLanguage
  };
}

function buildSeoContext(summary: {
  targetKeyword: string;
  userIntent: string;
  wordCountHint: string;
  outline: Array<{ header: string; description: string }>;
  longTail: string[];
  language: 'zh' | 'en';
}): string {
  const outlineLines = summary.outline
    .filter((item) => item.header)
    .map((item, index) => `${index + 1}. ${item.header}${item.description ? ` — ${item.description}` : ''}`)
    .join('\n');

  const longTailText = summary.longTail.length > 0 ? summary.longTail.join(', ') : (summary.language === 'zh' ? '暂无' : 'N/A');

  const header = summary.language === 'zh' ? 'SEO 策略要点' : 'SEO Strategy Summary';
  const keywordLabel = summary.language === 'zh' ? '目标关键词' : 'Target Keyword';
  const intentLabel = summary.language === 'zh' ? '用户意图' : 'User Intent';
  const wordCountLabel = summary.language === 'zh' ? '推荐字数' : 'Recommended Word Count';
  const outlineLabel = summary.language === 'zh' ? '结构大纲' : 'Outline';
  const longTailLabel = summary.language === 'zh' ? '核心长尾关键词（Top 10）' : 'Core Long-tail Keywords (Top 10)';

  const context = `
${header}:
- ${keywordLabel}: ${summary.targetKeyword || (summary.language === 'zh' ? '待定' : 'TBD')}
- ${intentLabel}: ${summary.userIntent || (summary.language === 'zh' ? '未提供' : 'Not provided')}
- ${wordCountLabel}: ${summary.wordCountHint || (summary.language === 'zh' ? '未提供' : 'Not provided')}
- ${outlineLabel}:
${outlineLines || (summary.language === 'zh' ? '暂无' : 'N/A')}
- ${longTailLabel}: ${longTailText}
`;

  return clampText(context, MAX_SEO_CONTEXT_CHARS);
}

function buildSearchPreferencesContext(
  searchPreferences: SearchPreferencesResult,
  contentLanguage: 'zh' | 'en'
): string {
  const rules: string[] = [];

  if (searchPreferences.semantic_landscape) {
    rules.push(
      contentLanguage === 'zh'
        ? `语义覆盖重点：${clampText(searchPreferences.semantic_landscape, 160)}`
        : `Semantic coverage focus: ${clampText(searchPreferences.semantic_landscape, 160)}`
    );
  }

  if (searchPreferences.engine_strategies?.google) {
    rules.push(
      contentLanguage === 'zh'
        ? `Google 可执行策略：${summarizeObject(searchPreferences.engine_strategies.google)}`
        : `Google execution tips: ${summarizeObject(searchPreferences.engine_strategies.google)}`
    );
  }

  if (searchPreferences.engine_strategies?.perplexity) {
    rules.push(
      contentLanguage === 'zh'
        ? `Perplexity 可执行策略：${summarizeObject(searchPreferences.engine_strategies.perplexity)}`
        : `Perplexity execution tips: ${summarizeObject(searchPreferences.engine_strategies.perplexity)}`
    );
  }

  if (searchPreferences.searchPreferences && rules.length < 3) {
    const summary = summarizeObject(searchPreferences.searchPreferences);
    if (summary) {
      rules.push(
        contentLanguage === 'zh'
          ? `通用偏好提示：${summary}`
          : `General preference hint: ${summary}`
      );
    }
  }

  const topRules = rules.filter(Boolean).slice(0, 3);
  if (topRules.length === 0) return '';

  const header = contentLanguage === 'zh'
    ? '搜索偏好（3条可执行准则）'
    : 'Search Preferences (3 Actionable Rules)';

  return `\n${header}:\n- ${topRules.join('\n- ')}\n`;
}

function buildCompetitorContext(
  competitorAnalysis: CompetitorAnalysisResult,
  contentLanguage: 'zh' | 'en'
): string {
  const winningFormula = competitorAnalysis.winning_formula || '';
  const contentGaps =
    competitorAnalysis.competitorAnalysis?.contentGaps ||
    (competitorAnalysis as any).contentGaps ||
    [];

  const competitorBenchmark = competitorAnalysis.competitor_benchmark || [];
  const topBenchmarks = competitorBenchmark.slice(0, 3).map((competitor: any) => {
    const title = competitor.title || competitor.content_title || competitor.domain || '';
    const angle = competitor.content_angle || competitor.angle || '';
    const combined = [title, angle].filter(Boolean).join(' — ');
    return clampText(combined || title || angle || '', 120);
  }).filter(Boolean);

  const header = contentLanguage === 'zh' ? '竞争对手摘要' : 'Competitor Summary';
  const formulaLabel = contentLanguage === 'zh' ? '制胜公式' : 'Winning Formula';
  const gapsLabel = contentLanguage === 'zh' ? '内容缺口（Top 3）' : 'Content Gaps (Top 3)';
  const anglesLabel = contentLanguage === 'zh' ? '竞品标题/角度（Top 3）' : 'Competitor Titles/Angles (Top 3)';

  const gapsText = contentGaps.slice(0, 3).map((gap: string) => clampText(String(gap), 140));

  return `
${header}:
- ${formulaLabel}: ${clampText(winningFormula || (contentLanguage === 'zh' ? '未提供' : 'Not provided'), 200)}
- ${gapsLabel}: ${gapsText.length > 0 ? gapsText.join('; ') : (contentLanguage === 'zh' ? '暂无' : 'N/A')}
- ${anglesLabel}: ${topBenchmarks.length > 0 ? topBenchmarks.join('; ') : (contentLanguage === 'zh' ? '暂无' : 'N/A')}
`;
}

function extractRelevantReference(
  content: string,
  keyword: string,
  maxChars: number = MAX_REFERENCE_CHARS
): string {
  if (!content) return '';
  const safeKeyword = keyword?.trim();
  const lines = content.split(/\r?\n/);
  const matchedLines: string[] = [];
  const usedIndexes = new Set<number>();

  if (safeKeyword) {
    const keywordLower = safeKeyword.toLowerCase();
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(keywordLower)) {
        for (let i = Math.max(0, index - 1); i <= Math.min(lines.length - 1, index + 1); i += 1) {
          if (!usedIndexes.has(i)) {
            const normalized = normalizeLine(lines[i]);
            if (normalized) {
              matchedLines.push(normalized);
              usedIndexes.add(i);
            }
          }
        }
      }
    });
  }

  let excerpt = matchedLines.join('\n');
  if (!excerpt) {
    const fallback: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const normalized = normalizeLine(lines[i]);
      if (normalized) {
        fallback.push(normalized);
      }
      if (fallback.join('\n').length >= maxChars) break;
    }
    excerpt = fallback.join('\n');
  }

  return clampText(excerpt, maxChars);
}

function extractSentences(content: string): string[] {
  if (!content) return [];
  return content
    .replace(/\r?\n+/g, ' ')
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function summarizePromotedWebsite(site: ProcessedPromotedWebsite): string {
  const title = site.title || site.url;
  const sentences = extractSentences(site.content);
  const valueSentence = sentences[0] ? clampText(sentences[0], 160) : '';

  const bulletCandidates = site.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, '').trim());

  const features = [
    ...bulletCandidates,
    ...sentences.slice(1, 4)
  ]
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => clampText(item, 120));

  const combined = [
    `标题: ${title}`,
    `价值描述: ${valueSentence || (title ? `${title} offers clear value for the target topic.` : 'Value summary unavailable.')}`,
    `功能点: ${features.length > 0 ? features.join('；') : '暂无'}`
  ].join('\n');

  return clampText(combined, MAX_PROMOTED_SITE_CHARS);
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

    // 构建SEO研究上下文（压缩为可行动要点）
    let seoContext = '';
    if (isMarkdownStrategy) {
      const summary = buildSeoSummaryFromMarkdown(seoStrategyReport.markdown, contentLanguage);
      seoContext = buildSeoContext(summary);
    } else {
      const structuredReport = seoStrategyReport as SEOStrategyReport;
      const summary = buildSeoSummaryFromStructured(structuredReport, contentLanguage);
      seoContext = buildSeoContext(summary);
    }

    // 添加搜索引擎偏好分析上下文（如果提供）
    let searchPreferencesContext = '';
    if (searchPreferences) {
      searchPreferencesContext = buildSearchPreferencesContext(searchPreferences, contentLanguage);
    }

    // 添加竞争对手分析上下文（如果提供）
    let competitorContext = '';
    if (competitorAnalysis) {
      competitorContext = buildCompetitorContext(competitorAnalysis, contentLanguage);
    }

    // 添加参考资料上下文（如果提供）
    let referenceContext = '';
    if (reference) {
      if (reference.type === 'document' && reference.document) {
        const excerpt = extractRelevantReference(reference.document.content, targetKeyword, MAX_REFERENCE_CHARS);
        if (contentLanguage === 'zh') {
          referenceContext = `
参考文档要点（关键词相关片段）：
文件名：${reference.document.filename}
内容摘录：
${excerpt}

重要提示：仅使用与"${targetKeyword}"相关的信息，忽略无关内容。
`;
        } else {
          referenceContext = `
Reference Document Highlights (keyword-focused):
Filename: ${reference.document.filename}
Excerpt:
${excerpt}

IMPORTANT: Only use content relevant to "${targetKeyword}" and ignore unrelated parts.
`;
        }
      } else if (reference.type === 'url' && reference.url?.content && reference.url?.url) {
        const excerpt = extractRelevantReference(reference.url.content, targetKeyword, MAX_REFERENCE_CHARS);
        const urlString = typeof reference.url.url === 'string' ? reference.url.url : 'N/A';
        const titleString = reference.url.title && typeof reference.url.title === 'string' ? reference.url.title : '';
        if (contentLanguage === 'zh') {
          referenceContext = `
参考URL要点（关键词相关片段）：
URL：${urlString}
${titleString ? `标题：${titleString}\n` : ''}内容摘录：
${excerpt}

重要提示：仅使用与"${targetKeyword}"相关的信息，忽略无关内容。
`;
        } else {
          referenceContext = `
Reference URL Highlights (keyword-focused):
URL: ${urlString}
${titleString ? `Title: ${titleString}\n` : ''}Excerpt:
${excerpt}

IMPORTANT: Only use content relevant to "${targetKeyword}" and ignore unrelated parts.
`;
        }
      }
    }

    // 添加推广网站的抓取内容（如果有）
    let promotedWebsitesContext = '';
    if (processedPromotedWebsites && processedPromotedWebsites.length > 0) {
      const sitesWithContent = processedPromotedWebsites.filter(p => p.content && p.content.trim().length > 0);
      if (sitesWithContent.length > 0) {
        const summaries = sitesWithContent.map((site, index) => {
          const summary = summarizePromotedWebsite(site);
          return `${contentLanguage === 'zh' ? `网站 ${index + 1}` : `Website ${index + 1}`}:\n${summary}\nURL: ${site.url}`;
        });
        if (contentLanguage === 'zh') {
          promotedWebsitesContext = `

### 推广网站摘要
${summaries.join('\n\n')}

请基于以上要点自然融入推广信息，避免直接复制原文。`;
        } else {
          promotedWebsitesContext = `

### Promoted Websites Summary
${summaries.join('\n\n')}

Please weave these sites in naturally based on the summaries above, without copying raw source text.`;
        }
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
        onProgress?.(contentLanguage === 'zh' 
          ? `⚠️ 警告: AI 输出被截断，可能影响文章完整性` 
          : `⚠️ Warning: AI output was truncated, article may be incomplete`);
      }
      
      onProgress?.(contentLanguage === 'zh' ? `✅ 内容初稿撰写完成` : `✅ Content draft completed`);
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

    // 清理可能的 markdown 代码块包装
    let cleanedResponse = rawResponse.trim();
    
    // 检测并移除 ```json 或 ``` 包装
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.substring(7);
      if (cleanedResponse.startsWith('\n')) {
        cleanedResponse = cleanedResponse.substring(1);
      }
      const lastBackticks = cleanedResponse.lastIndexOf('```');
      if (lastBackticks !== -1) {
        cleanedResponse = cleanedResponse.substring(0, lastBackticks).trim();
      }
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.substring(3);
      const firstNewline = cleanedResponse.indexOf('\n');
      if (firstNewline !== -1) {
        cleanedResponse = cleanedResponse.substring(firstNewline + 1);
      }
      const lastBackticks = cleanedResponse.lastIndexOf('```');
      if (lastBackticks !== -1) {
        cleanedResponse = cleanedResponse.substring(0, lastBackticks).trim();
      }
    }

    const markdownContent = cleanedResponse.trim();

    // 从 Markdown 中提取标题（第一个 # 标题）
    const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
    const extractedTitle = titleMatch ? titleMatch[1].trim() : '';

    // 移除 H1 标题后的内容（用于正文部分）
    const contentBody = titleMatch
      ? markdownContent.replace(/^#\s+.+$/m, '').trim()
      : markdownContent;

    return {
      markdown: markdownContent,
      content: contentBody,
      article_body: contentBody,
      title: extractedTitle
    };
  } catch (error: any) {
    console.error('Generate Content Error:', error);
    throw new Error(`Failed to generate content: ${error.message}`);
  }
}

