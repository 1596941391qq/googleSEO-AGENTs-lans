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
  onSearchResults?: (results: Array<{ title: string; url: string; snippet?: string }>) => void
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

    // 构建SEO研究上下文
    let seoContext = '';
    if (isMarkdownStrategy) {
      // Use Markdown strategy directly
      seoContext = `
SEO Strategy Report (Markdown Format):

${seoStrategyReport.markdown}
`;
    } else {
      // Use old structured format
      const structuredReport = seoStrategyReport as SEOStrategyReport;
      seoContext = `
SEO Strategy Report:
- Target Keyword: ${structuredReport.targetKeyword}
- Page Title (H1): ${structuredReport.pageTitleH1}
- Meta Description: ${structuredReport.metaDescription}
- URL Slug: ${structuredReport.urlSlug}
- User Intent: ${structuredReport.userIntentSummary}
- Recommended Word Count: ${structuredReport.recommendedWordCount} words
- Long-tail Keywords: ${structuredReport.longTailKeywords?.join(', ') || 'N/A'}

Content Structure:
${structuredReport.contentStructure.map((section, i) =>
  `${i + 1}. ${section.header}\n   ${section.description}`
).join('\n\n')}
`;
    }

    // 添加搜索引擎偏好分析上下文（如果提供）
    let searchPreferencesContext = '';
    if (searchPreferences) {
      if (contentLanguage === 'zh') {
        searchPreferencesContext = `
搜索引擎偏好分析：
${searchPreferences.semantic_landscape ? `- 语义分布：${searchPreferences.semantic_landscape}\n` : ''}
${searchPreferences.engine_strategies?.google ? `- Google策略：${JSON.stringify(searchPreferences.engine_strategies.google, null, 2)}\n` : ''}
${searchPreferences.engine_strategies?.perplexity ? `- Perplexity策略：${JSON.stringify(searchPreferences.engine_strategies.perplexity, null, 2)}\n` : ''}
`;
      } else {
        searchPreferencesContext = `
Search Engine Preferences:
${searchPreferences.searchPreferences ? JSON.stringify(searchPreferences.searchPreferences, null, 2) : ''}
`;
      }
    }

    // 添加竞争对手分析上下文（如果提供）
    let competitorContext = '';
    if (competitorAnalysis) {
      if (contentLanguage === 'zh') {
        competitorContext = `
竞争对手分析：
${competitorAnalysis.winning_formula ? `- 制胜公式：${competitorAnalysis.winning_formula}\n` : ''}
${competitorAnalysis.recommended_structure ? `- 推荐结构：${competitorAnalysis.recommended_structure.join('\n')}\n` : ''}
${competitorAnalysis.competitor_benchmark ? `- 竞争对手基准：${JSON.stringify(competitorAnalysis.competitor_benchmark.slice(0, 3), null, 2)}\n` : ''}
`;
      } else {
        competitorContext = `
Competitor Analysis:
${competitorAnalysis.competitorAnalysis ? JSON.stringify(competitorAnalysis.competitorAnalysis, null, 2) : ''}
`;
      }
    }

    // 添加参考资料上下文（如果提供）
    let referenceContext = '';
    if (reference) {
      if (reference.type === 'document' && reference.document) {
        // For writer, provide full content (or summary if too long)
        const docContent = reference.document.content.length > 10000
          ? reference.document.content.substring(0, 10000) + '...'
          : reference.document.content;
        if (contentLanguage === 'zh') {
          referenceContext = `
用户参考文档：
文件名：${reference.document.filename}
内容：
${docContent}

重要提示：虽然用户提供了参考文档，但文章的核心主题必须是"${seoStrategyReport.targetKeyword}"。从文档中提取与关键词相关的信息、数据和案例，但如果文档内容与关键词无关，请忽略不相关内容，只使用有用的部分。确保文章围绕"${seoStrategyReport.targetKeyword}"展开。
`;
        } else {
          referenceContext = `
User Reference Document:
Filename: ${reference.document.filename}
Content:
${docContent}

IMPORTANT: While the user provided this reference document, the core theme of the article must be "${seoStrategyReport.targetKeyword}". Extract relevant information, data, and examples from the document that relate to the keyword. If the document content is not relevant to the keyword, ignore irrelevant parts and only use useful portions. Ensure the article is centered around "${seoStrategyReport.targetKeyword}".
`;
        }
      } else if (reference.type === 'url' && reference.url?.content) {
        // For writer, provide full content (or summary if too long)
        const urlContent = reference.url.content.length > 10000
          ? reference.url.content.substring(0, 10000) + '...'
          : reference.url.content;
        if (contentLanguage === 'zh') {
          referenceContext = `
用户参考URL：
URL：${reference.url.url}
${reference.url.title ? `标题：${reference.url.title}\n` : ''}内容：
${urlContent}

重要提示：虽然用户提供了参考URL，但文章的核心主题必须是"${seoStrategyReport.targetKeyword}"。从URL中提取与关键词相关的信息、数据和案例，但如果URL内容与关键词无关，请忽略不相关内容，只使用有用的部分。确保文章围绕"${seoStrategyReport.targetKeyword}"展开。
`;
        } else {
          referenceContext = `
User Reference URL:
URL: ${reference.url.url}
${reference.url.title ? `Title: ${reference.url.title}\n` : ''}Content:
${urlContent}

IMPORTANT: While the user provided this reference URL, the core theme of the article must be "${seoStrategyReport.targetKeyword}". Extract relevant information, data, and examples from the URL that relate to the keyword. If the URL content is not relevant to the keyword, ignore irrelevant parts and only use useful portions. Ensure the article is centered around "${seoStrategyReport.targetKeyword}".
`;
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

    const prompt = contentLanguage === 'zh'
      ? `基于以下SEO研究结果，为 ${marketLabel} 市场撰写一篇高质量的文章内容。

${seoContext}${searchPreferencesContext}${competitorContext}${referenceContext}

要求：
1. 严格按照推荐的内容结构撰写，特别关注 ${marketLabel} 市场的本地化需求
2. 自然融入目标关键词和长尾关键词（关键词密度1-2%），使用适合 ${marketLabel} 市场的表达方式
3. 前100字必须直接击中 ${marketLabel} 市场用户的搜索痛点
4. 每段不超过3行，多使用列表、粗体和引言
5. 确保内容流畅自然，有价值，符合 ${marketLabel} 市场的文化和习惯
6. 字数约 ${wordCountHint} 字

请以Markdown格式输出完整文章，包括以下部分：
- **H1 标题**（文章主标题）
- **文章正文**（使用 H2、H3 标题组织结构）
- **关键要点总结**（在文章末尾）`;
      : `Generate a high-quality article based on the following SEO research findings for the ${marketLabel} market.

${seoContext}${searchPreferencesContext}${competitorContext}${referenceContext}

Requirements:
1. Follow the recommended content structure strictly, with special attention to localization needs for ${marketLabel} market
2. Naturally integrate target keyword and long-tail keywords (1-2% density), using expressions appropriate for ${marketLabel} market
3. First 100 words must directly address search pain points of users in ${marketLabel} market
4. Keep paragraphs under 3 lines, use lists, bold, and quotes
5. Ensure content flows naturally and provides value, aligned with ${marketLabel} market culture and habits
6. Target word count: approximately ${wordCountHint} words

Please output the complete article in Markdown format, including:
- **H1 Title** (main article title)
- **Article Body** (organized with H2, H3 headings)
- **Key Takeaways** (at the end of the article)`;

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
      console.log('[Content Writer] Calling Gemini API with prompt length:', prompt.length);
      response = await callGeminiAPI(prompt, systemInstruction, {
      });
      console.log('[Content Writer] API response received, text length:', response.text?.length || 0);
    } catch (apiError: any) {
      console.error('[Content Writer] API call failed:', apiError.message);
      throw new Error(`Failed to call Gemini API: ${apiError.message}`);
    }

    // 直接返回 Markdown 内容，不需要 JSON 解析
    const markdownContent = response?.text || '';

    if (!markdownContent || markdownContent.length === 0) {
      console.error('[Content Writer] Empty response from API');
      throw new Error('Empty response from Gemini API');
    }

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

