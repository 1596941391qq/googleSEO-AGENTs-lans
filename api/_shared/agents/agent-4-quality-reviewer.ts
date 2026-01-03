/**
 * Agent 4: 质量审查
 * 
 * 职责：检查内容质量（关键词密度、AI检测、可读性等）
 * 使用：Deep Dive模式 Step 7
 */

import { callGeminiAPI } from '../gemini.js';
import { getQualityReviewerPrompt } from '../../../services/prompts/index.js';
import { ContentGenerationResult } from './agent-3-content-writer.js';

/**
 * 质量审查结果
 */
export interface QualityReviewResult {
  total_score?: number;
  verdict?: 'PASS' | 'REJECT' | 'NEEDS_REVISION';
  fix_list?: string[];
  ai_footprint_analysis?: string;
  keywordDensity?: {
    score?: number;
    details?: string[];
  };
  aiDetection?: {
    probability?: number;
    details?: string[];
  };
  geoCompliance?: {
    passed?: boolean;
    details?: string[];
  };
  aioCompliance?: {
    passed?: boolean;
    details?: string[];
  };
  readability?: {
    fleschScore?: number;
    gradeLevel?: string;
  };
  overallScore?: number;
  passed?: boolean;
  suggestions?: string[];
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
 * 审查内容质量
 * 
 * 对生成的内容进行全面质量检查，包括关键词密度、AI检测、可读性等
 * 
 * @param content - 生成的内容
 * @param targetKeyword - 目标关键词
 * @param language - 语言代码（'zh' | 'en'）
 * @returns 质量审查结果
 */
export async function reviewQuality(
  content: ContentGenerationResult | string,
  targetKeyword: string,
  language: 'zh' | 'en' = 'en'
): Promise<QualityReviewResult> {
  try {
    // 获取 Quality Reviewer prompt
    const systemInstruction = getQualityReviewerPrompt(language);

    // 提取内容文本
    const contentText = typeof content === 'string' 
      ? content 
      : content.content || content.article_body || '';

    // 提取标题和元描述
    const title = typeof content === 'string' 
      ? '' 
      : content.title || content.seo_meta?.title || '';
    
    const metaDescription = typeof content === 'string' 
      ? '' 
      : content.metaDescription || content.seo_meta?.description || '';

    // 构建审查提示
    const prompt = language === 'zh'
      ? `请对以下内容进行全面质量审查。

目标关键词：${targetKeyword}
${title ? `标题：${title}\n` : ''}${metaDescription ? `元描述：${metaDescription}\n` : ''}

内容：
${contentText}

请检查：
1. 真实性检查：文中提到的数据、事实是否有逻辑漏洞？
2. SEO深度：关键词是否出现在了Title、首段、H2和结尾？
3. 信息增益评分（0-10）：该内容是否提供了互联网上尚未泛滥的新信息？
4. 人味检测：语气是否过于机械？是否缺乏情感共鸣？
5. 关键词密度：目标1-2%
6. AI检测：评估AI生成概率
7. 可读性：评估内容可读性

请提供详细的审查结果和改进建议。`
      : `Please perform comprehensive quality review on the following content.

Target Keyword: ${targetKeyword}
${title ? `Title: ${title}\n` : ''}${metaDescription ? `Meta Description: ${metaDescription}\n` : ''}

Content:
${contentText}

Please check:
1. Factual accuracy: Are there logical gaps in data and facts mentioned?
2. SEO depth: Does the keyword appear in Title, first paragraph, H2, and conclusion?
3. Information gain score (0-10): Does the content provide new information not yet common on the internet?
4. Human touch: Is the tone too mechanical? Does it lack emotional resonance?
5. Keyword density: Target 1-2%
6. AI detection: Evaluate AI generation probability
7. Readability: Assess content readability

Please provide detailed review results and improvement suggestions.`;

    // 调用 Gemini API
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: 'application/json',
      enableGoogleSearch: true  // 启用联网搜索以验证事实和检查信息准确性
    });

    let text = response.text || '{}';
    text = extractJSON(text);

    // 解析 JSON
    try {
      const result = JSON.parse(text);
      return result as QualityReviewResult;
    } catch (e: any) {
      console.error('JSON Parse Error in reviewQuality:', e.message);
      console.error('Extracted text (first 500 chars):', text.substring(0, 500));
      
      // 返回默认结构
      return {
        total_score: 0,
        verdict: 'NEEDS_REVISION',
        fix_list: ['Failed to parse review results'],
        ai_footprint_analysis: text.substring(0, 500)
      };
    }
  } catch (error: any) {
    console.error('Review Quality Error:', error);
    throw new Error(`Failed to review quality: ${error.message}`);
  }
}

