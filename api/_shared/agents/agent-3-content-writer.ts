/**
 * Agent 3: 内容写手
 * 
 * 职责：基于SEO研究结果生成高质量内容
 * 使用：Deep Dive模式 Step 6
 */

import { callGeminiAPI } from '../gemini.js';
import { getContentWriterPrompt } from '../../../services/prompts/index.js';
import { SEOStrategyReport } from '../types.js';
import { SearchPreferencesResult, CompetitorAnalysisResult } from './agent-2-seo-researcher.js';

/**
 * 内容生成结果
 */
export interface ContentGenerationResult {
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
  seoStrategyReport: SEOStrategyReport,
  searchPreferences?: SearchPreferencesResult,
  competitorAnalysis?: CompetitorAnalysisResult,
  language: 'zh' | 'en' = 'en'
): Promise<ContentGenerationResult> {
  try {
    // 获取 Content Writer prompt
    const systemInstruction = getContentWriterPrompt(language);

    // 构建SEO研究上下文
    const seoContext = `
SEO Strategy Report:
- Target Keyword: ${seoStrategyReport.targetKeyword}
- Page Title (H1): ${seoStrategyReport.pageTitleH1}
- Meta Description: ${seoStrategyReport.metaDescription}
- URL Slug: ${seoStrategyReport.urlSlug}
- User Intent: ${seoStrategyReport.userIntentSummary}
- Recommended Word Count: ${seoStrategyReport.recommendedWordCount} words
- Long-tail Keywords: ${seoStrategyReport.longTailKeywords?.join(', ') || 'N/A'}

Content Structure:
${seoStrategyReport.contentStructure.map((section, i) => 
  `${i + 1}. ${section.header}\n   ${section.description}`
).join('\n\n')}
`;

    // 添加搜索引擎偏好分析上下文（如果提供）
    let searchPreferencesContext = '';
    if (searchPreferences) {
      if (language === 'zh') {
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
      if (language === 'zh') {
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

    // 构建生成提示
    const prompt = language === 'zh'
      ? `基于以下SEO研究结果，撰写一篇高质量的文章内容。

${seoContext}${searchPreferencesContext}${competitorContext}

要求：
1. 严格按照推荐的内容结构撰写
2. 自然融入目标关键词和长尾关键词（关键词密度1-2%）
3. 前100字必须直接击中用户搜索痛点
4. 每段不超过3行，多使用列表、粗体和引言
5. 确保内容流畅自然，有价值
6. 字数约 ${seoStrategyReport.recommendedWordCount} 字

请以Markdown格式输出完整文章。`
      : `Generate a high-quality article based on the following SEO research findings.

${seoContext}${searchPreferencesContext}${competitorContext}

Requirements:
1. Follow the recommended content structure strictly
2. Naturally integrate target keyword and long-tail keywords (1-2% density)
3. First 100 words must directly address user search pain points
4. Keep paragraphs under 3 lines, use lists, bold, and quotes
5. Ensure content flows naturally and provides value
6. Target word count: approximately ${seoStrategyReport.recommendedWordCount} words

Please output the complete article in Markdown format.`;

    // 调用 Gemini API
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: 'application/json'
    });

    let text = response.text || '{}';
    text = extractJSON(text);

    // 解析 JSON
    try {
      const result = JSON.parse(text);
      
      // 处理不同的输出格式（中文和英文可能有不同的结构）
      const contentResult: ContentGenerationResult = {
        title: result.title || result.seo_meta?.title || seoStrategyReport.pageTitleH1,
        metaDescription: result.metaDescription || result.seo_meta?.description || seoStrategyReport.metaDescription,
        content: result.content || result.article_body || '',
        structure: result.structure || seoStrategyReport.contentStructure.map(s => s.header),
        seo_meta: result.seo_meta,
        article_body: result.article_body,
        logic_check: result.logic_check,
        appliedOptimizations: result.appliedOptimizations
      };

      return contentResult;
    } catch (e: any) {
      console.error('JSON Parse Error in generateContent:', e.message);
      console.error('Extracted text (first 500 chars):', text.substring(0, 500));
      
      // 如果JSON解析失败，尝试提取Markdown内容
      const markdownMatch = text.match(/```markdown\n([\s\S]*?)\n```/) || text.match(/# .*[\s\S]*/);
      const markdownContent = markdownMatch ? markdownMatch[1] || markdownMatch[0] : text;
      
      return {
        title: seoStrategyReport.pageTitleH1,
        metaDescription: seoStrategyReport.metaDescription,
        content: markdownContent,
        structure: seoStrategyReport.contentStructure.map(s => s.header)
      };
    }
  } catch (error: any) {
    console.error('Generate Content Error:', error);
    throw new Error(`Failed to generate content: ${error.message}`);
  }
}

