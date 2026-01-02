/**
 * Agent 5: 图像创意
 * 
 * 职责：提取视觉主题、生成图像提示词
 * 使用：Deep Dive模式 Step 8（可选）
 */

import { callGeminiAPI } from '../gemini.js';
import { getImageCreativePrompt, getNanoBananaPrompt } from '../../../services/prompts/index.js';
import { ContentGenerationResult } from './agent-3-content-writer.js';

/**
 * 视觉主题
 */
export interface VisualTheme {
  id?: string;
  title?: string;
  visual_metaphor?: string;
  text_overlay?: string;
  composition?: string;
  color_palette?: string[];
  description?: string;
  visualElements?: string[];
  style?: string;
  position?: string;
}

/**
 * 视觉主题提取结果
 */
export interface VisualThemesResult {
  visual_strategy?: string;
  themes?: VisualTheme[];
}

/**
 * 图像提示词生成结果
 */
export interface ImagePromptResult {
  theme: string;
  prompt: string;
  description?: string;
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
 * 提取视觉主题
 * 
 * 从文章内容中提取4-6个核心视觉主题，用于生成配图
 * 
 * @param content - 生成的内容
 * @param language - 语言代码（'zh' | 'en'）
 * @returns 视觉主题提取结果
 */
export async function extractVisualThemes(
  content: ContentGenerationResult | string,
  language: 'zh' | 'en' = 'en'
): Promise<VisualThemesResult> {
  try {
    // 获取 Image Creative prompt
    const systemInstruction = getImageCreativePrompt('extractThemes', language);

    // 提取内容文本
    const contentText = typeof content === 'string' 
      ? content 
      : content.content || content.article_body || '';

    // 提取标题
    const title = typeof content === 'string' 
      ? '' 
      : content.title || content.seo_meta?.title || '';

    // 构建提取提示
    const prompt = language === 'zh'
      ? `请从以下文章中提取4-6个核心视觉主题，用于生成能够提升用户停留时间的配图。

${title ? `标题：${title}\n\n` : ''}文章内容：
${contentText}

请提供：
1. 整体视觉风格建议
2. 4-6个视觉主题，每个主题包含：
   - 视觉隐喻（用什么具体的画面来表达）
   - 文本叠加（图中应该出现的关键词）
   - 构图建议
   - 色彩 palette

请确保主题与文章内容高度相关，并有助于SEO。`
      : `Please extract 4-6 visual themes from the following article suitable for image generation.

${title ? `Title: ${title}\n\n` : ''}Article Content:
${contentText}

Please provide:
1. Overall visual strategy
2. 4-6 visual themes, each including:
   - Visual metaphor (what specific image to express)
   - Text overlay (keywords that should appear in the image)
   - Composition suggestions
   - Color palette

Ensure themes are highly relevant to article content and SEO-friendly.`;

    // 调用 Gemini API
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: 'application/json'
    });

    let text = response.text || '{}';
    text = extractJSON(text);

    // 解析 JSON
    try {
      const result = JSON.parse(text);
      return result as VisualThemesResult;
    } catch (e: any) {
      console.error('JSON Parse Error in extractVisualThemes:', e.message);
      console.error('Extracted text (first 500 chars):', text.substring(0, 500));
      
      // 返回默认结构
      return {
        visual_strategy: 'Professional, modern, SEO-friendly',
        themes: []
      };
    }
  } catch (error: any) {
    console.error('Extract Visual Themes Error:', error);
    throw new Error(`Failed to extract visual themes: ${error.message}`);
  }
}

/**
 * 生成图像提示词
 * 
 * 为每个视觉主题生成Nano Banana 2 API可用的高质量图像提示词
 * 
 * @param themes - 视觉主题列表
 * @param language - 语言代码（'zh' | 'en'）
 * @returns 图像提示词列表
 */
export async function generateImagePrompts(
  themes: VisualTheme[],
  language: 'zh' | 'en' = 'en'
): Promise<ImagePromptResult[]> {
  try {
    const imagePrompts: ImagePromptResult[] = [];

    for (const theme of themes) {
      // 构建主题描述
      const themeDescription = theme.visual_metaphor || theme.description || '';
      const themeTitle = theme.title || theme.id || 'Theme';

      // 生成 Nano Banana 2 prompt
      const nanoBananaPrompt = getNanoBananaPrompt(themeTitle, themeDescription, language);

      // 如果需要，可以调用 Gemini API 进一步优化 prompt
      // 这里直接使用生成的 prompt
      imagePrompts.push({
        theme: themeTitle,
        prompt: nanoBananaPrompt,
        description: themeDescription
      });
    }

    return imagePrompts;
  } catch (error: any) {
    console.error('Generate Image Prompts Error:', error);
    throw new Error(`Failed to generate image prompts: ${error.message}`);
  }
}

/**
 * 生成图像（可选 - 需要Nano Banana 2 API配置）
 * 
 * 调用Nano Banana 2 API生成图像
 * 
 * @param prompts - 图像提示词列表
 * @returns 生成的图像URL列表
 */
export async function generateImages(
  prompts: ImagePromptResult[]
): Promise<Array<{ theme: string; imageUrl?: string; error?: string }>> {
  const NANO_BANANA_API_URL = process.env.NANO_BANANA_API_URL || 'https://api.nanobanana.com/v2/images';
  const NANO_BANANA_API_KEY = process.env.NANO_BANANA_API_KEY;

  if (!NANO_BANANA_API_KEY) {
    console.warn('NANO_BANANA_API_KEY is not configured. Skipping image generation.');
    return prompts.map(p => ({
      theme: p.theme,
      error: 'Nano Banana 2 API key not configured'
    }));
  }

  const results: Array<{ theme: string; imageUrl?: string; error?: string }> = [];

  for (const promptResult of prompts) {
    try {
      const response = await fetch(NANO_BANANA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NANO_BANANA_API_KEY}`
        },
        body: JSON.stringify({
          prompt: promptResult.prompt,
          width: 1024,
          height: 1024,
          quality: 'high'
        })
      });

      if (!response.ok) {
        throw new Error(`Nano Banana API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      results.push({
        theme: promptResult.theme,
        imageUrl: data.imageUrl || data.url
      });
    } catch (error: any) {
      console.error(`Failed to generate image for theme "${promptResult.theme}":`, error);
      results.push({
        theme: promptResult.theme,
        error: error.message
      });
    }
  }

  return results;
}

