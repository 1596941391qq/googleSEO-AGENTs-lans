/**
 * Agent 5: 图像创意
 * 
 * 职责：提取视觉主题、生成图像提示词
 * 使用：Deep Dive模式 Step 8（可选）
 */

import { callGeminiAPI, getCurrentProxyInfo } from '../gemini.js';
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
  language: 'zh' | 'en' = 'en',
  onProgress?: (message: string) => void
): Promise<VisualThemesResult> {
  try {
    // 获取 Image Creative prompt
    const systemInstruction = getImageCreativePrompt('extractThemes', language);

    onProgress?.(language === 'zh' ? `🎨 正在分析文章深度语义，挖掘最匹配的视觉主题...` : `🎨 Analyzing content semantics for best visual themes...`);

    // 提取内容文本
    const contentText = typeof content === 'string'
      ? content
      : content.content || content.article_body || '';

    // 提取标题
    const title = typeof content === 'string'
      ? ''
      : content.title || '';

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
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          visual_strategy: { type: 'string' },
          themes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                visual_metaphor: { type: 'string' },
                text_overlay: { type: 'string' },
                composition: { type: 'string' },
                color_palette: { type: 'array', items: { type: 'string' } },
                description: { type: 'string' },
                visualElements: { type: 'array', items: { type: 'string' } },
                style: { type: 'string' },
                position: { type: 'string' }
              }
            }
          }
        },
        required: ['themes']
      },
      onRetry: (attempt, error, delay) => {
        onProgress?.(language === 'zh'
          ? `⚠️ 视觉主题提取连接异常 (尝试 ${attempt}/3)，正在 ${delay}ms 后重试...`
          : `⚠️ Visual theme extraction connection error (attempt ${attempt}/3), retrying in ${delay}ms...`);
      }
    });

    onProgress?.(language === 'zh' ? `✅ 视觉主题提取完成` : `✅ Visual themes extracted`);

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
 * @param keyword - 文章关键词，用于增强图像与主题的相关性
 * @param articleTitle - 文章标题，用于增强图像与主题的相关性
 * @returns 图像提示词列表
 */
export async function generateImagePrompts(
  themes: VisualTheme[],
  language: 'zh' | 'en' = 'en',
  keyword?: string,
  articleTitle?: string
): Promise<ImagePromptResult[]> {
  try {
    const imagePrompts: ImagePromptResult[] = [];

    for (const theme of themes) {
      // 构建主题描述
      const themeDescription = theme.visual_metaphor || theme.description || '';
      const themeTitle = theme.title || theme.id || 'Theme';

      // 生成 Nano Banana 2 prompt，增强主题相关性
      const nanoBananaPrompt = getNanoBananaPrompt(
        themeTitle,
        themeDescription,
        language,
        keyword,
        articleTitle
      );

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
  aspectRatio: '1:1' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9' = '4:3',
  onProgress?: (theme: string, type: 'starting' | 'completed' | 'failed', result?: string) => void
): Promise<Array<{ theme: string; imageUrl?: string; error?: string }>> {
  // 使用代理配置
  const proxyInfo = getCurrentProxyInfo();
  const API_BASE_URL = proxyInfo.baseUrl;
  const API_KEY = proxyInfo.provider === 'tuzi'
    ? (process.env.GEMINI_TUZI_API_KEY || process.env.GEMINI_API_KEY)
    : process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    console.warn(`API Key is not configured for proxy: ${proxyInfo.provider}. Skipping image generation.`);
    return prompts.map(p => ({
      theme: p.theme,
      error: `${proxyInfo.provider} API key not configured`
    }));
  }

  // 图片生成 API 端点（302.ai 和 tuzi 使用相同的格式）
  const API_URL = `${API_BASE_URL}/google/v1/models/gemini-3-pro-image-preview?response_format=url`;
  console.log(`[Image Generation] Using proxy: ${proxyInfo.provider}, URL: ${API_URL}`);

  // 并行处理请求
  const promises = prompts.map(async (promptResult) => {
    try {
      if (onProgress) onProgress(promptResult.theme, 'starting');

      // 根据文档构建请求体 - 使用正确的格式
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

      let imageUrl: string | undefined;

      // 1. 优先处理 302.ai API 文档格式：检查 output 字段
      if (data.output && typeof data.output === 'string') {
        imageUrl = data.output;
      }
      // 2. 如果status是completed且有output
      else if (data.status === 'completed' && data.output) {
        imageUrl = data.output;
      }
      // 3. 处理 processing/pending 状态
      else if (data.status === 'processing' || data.status === 'pending') {
        console.warn(`Image generation for theme "${promptResult.theme}" returned status: ${data.status}.`);
        return {
          theme: promptResult.theme,
          error: `Image generation status: ${data.status}. May need polling.`
        };
      }
      // 4. 回退处理：Gemini 标准的 candidates 格式
      else if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          if (candidate.content.parts.length > 1 && candidate.content.parts[1]?.url) {
            imageUrl = candidate.content.parts[1].url;
          }
          if (!imageUrl) {
            for (let i = 0; i < candidate.content.parts.length; i++) {
              const part = candidate.content.parts[i];
              if (part?.url) { imageUrl = part.url; break; }
              if (typeof part === 'object') {
                const possibleUrlFields = ['url', 'imageUrl', 'image_url', 'fileUrl', 'file_url'];
                for (const field of possibleUrlFields) {
                  // @ts-ignore
                  if (part[field]) { imageUrl = part[field]; break; }
                }
                if (imageUrl) break;
              }
            }
          }
        }
      }

      if (imageUrl) {
        if (onProgress) onProgress(promptResult.theme, 'completed', imageUrl);
        return {
          theme: promptResult.theme,
          imageUrl: imageUrl
        };
      } else {
        throw new Error('Image URL not found in response');
      }

    } catch (error: any) {
      console.error(`Failed to generate image for theme "${promptResult.theme}":`, error);
      if (onProgress) onProgress(promptResult.theme, 'failed', error.message);
      return {
        theme: promptResult.theme,
        error: error.message
      };
    }
  });

  return Promise.all(promises);
}

