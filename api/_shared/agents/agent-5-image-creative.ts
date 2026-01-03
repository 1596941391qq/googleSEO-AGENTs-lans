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
 * 生成图像（使用 302.ai Gemini 3 Pro Image Preview API）
 * 
 * 调用 302.ai 的 Gemini 3 Pro Image Preview API 生成图像
 * 文档: https://doc.302.ai/379863519e0
 * 
 * @param prompts - 图像提示词列表
 * @param aspectRatio - 图像宽高比，默认为 '4:3'
 * @returns 生成的图像URL列表
 */
export async function generateImages(
  prompts: ImagePromptResult[],
  aspectRatio: '1:1' | '2.3' | '3:2' | '3:4' | '4.3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9' = '4:3'
): Promise<Array<{ theme: string; imageUrl?: string; error?: string }>> {
  // 使用 302.ai 的 API endpoint
  const API_BASE_URL = process.env.GEMINI_PROXY_URL || 'https://api.302.ai';
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    console.warn('GEMINI_API_KEY is not configured. Skipping image generation.');
    return prompts.map(p => ({
      theme: p.theme,
      error: '302.ai API key not configured'
    }));
  }

  const API_URL = `${API_BASE_URL}/google/v1/models/gemini-3-pro-image-preview?response_format=url`;

  const results: Array<{ theme: string; imageUrl?: string; error?: string }> = [];

  for (const promptResult of prompts) {
    try {
      // 根据文档构建请求体
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: promptResult.prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio
          }
        }
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`302.ai API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // 处理错误响应
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 优先处理 Gemini 标准的 candidates 格式
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          // 从 parts 中查找包含 url 的部分（过滤掉 thought 过程）
          for (const part of candidate.content.parts) {
            if (part.url && typeof part.url === 'string') {
              // 找到图片 URL
              results.push({
                theme: promptResult.theme,
                imageUrl: part.url
              });
              break; // 找到第一个 URL 就退出
            }
          }
          
          // 如果没有找到 url，检查是否所有 parts 都是 thought 过程
          const hasUrl = candidate.content.parts.some(part => part.url);
          if (!hasUrl) {
            console.warn(`Image generation for theme "${promptResult.theme}" returned candidates but no URL found in parts`);
            results.push({
              theme: promptResult.theme,
              error: 'Image URL not found in response candidates'
            });
          }
        } else {
          throw new Error(`Invalid candidates format: missing content.parts`);
        }
      }
      // 回退处理：根据文档，响应可能包含 status 和 output 字段（异步处理格式）
      else if (data.status === 'completed' && data.output) {
        // 直接返回图片 URL
        results.push({
          theme: promptResult.theme,
          imageUrl: data.output
        });
      } else if (data.status === 'processing' || data.status === 'pending') {
        // 如果 API 返回异步处理状态，记录警告
        // 实际使用时可能需要根据 API 文档实现轮询逻辑
        console.warn(`Image generation for theme "${promptResult.theme}" returned status: ${data.status}`);
        results.push({
          theme: promptResult.theme,
          error: `Image generation status: ${data.status}. May need polling.`
        });
      } else if (data.output) {
        // 尝试直接使用 output 字段（某些情况下可能直接返回）
        results.push({
          theme: promptResult.theme,
          imageUrl: data.output
        });
      } else {
        // 如果都不匹配，抛出错误
        throw new Error(`Unexpected response format: ${JSON.stringify(data).substring(0, 500)}`);
      }
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

