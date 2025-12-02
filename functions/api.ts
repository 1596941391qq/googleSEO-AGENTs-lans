// EdgeOne Functions API 路由处理 (TypeScript版本)
import { 
  generateKeywords, 
  analyzeRankingProbability, 
  generateDeepDiveStrategy, 
  translatePromptToSystemInstruction, 
  translateText 
} from './services/gemini';
import type { Env } from './index';

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// JSON 响应辅助函数
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// 错误响应
function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status);
}

// 路由处理
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 健康检查
  if (path === '/health' || path === '/api/health') {
    return jsonResponse({ status: 'ok', message: 'EdgeOne Function is running' });
  }

  // API 路由
  if (request.method === 'POST') {
    try {
      const body = await request.json() as any;

      // 生成关键词
      if (path === '/api/generate-keywords') {
        const { seedKeyword, targetLanguage, systemInstruction, existingKeywords, roundIndex } = body;
        
        if (!seedKeyword || !targetLanguage || !systemInstruction) {
          return errorResponse('Missing required fields', 400);
        }

        const keywords = await generateKeywords(
          seedKeyword,
          targetLanguage,
          systemInstruction,
          existingKeywords || [],
          roundIndex || 1,
          env
        );

        return jsonResponse({ keywords });
      }

      // 分析排名
      if (path === '/api/analyze-ranking') {
        const { keywords, systemInstruction } = body;
        
        if (!keywords || !Array.isArray(keywords) || keywords.length === 0 || !systemInstruction) {
          return errorResponse('Missing required fields', 400);
        }

        const analyzedKeywords = await analyzeRankingProbability(keywords, systemInstruction, env);
        return jsonResponse({ keywords: analyzedKeywords });
      }

      // 深度策略
      if (path === '/api/deep-dive-strategy') {
        const { keyword, uiLanguage, targetLanguage } = body;
        
        if (!keyword || !uiLanguage || !targetLanguage) {
          return errorResponse('Missing required fields', 400);
        }

        const report = await generateDeepDiveStrategy(keyword, uiLanguage, targetLanguage, env);
        return jsonResponse({ report });
      }

      // 翻译提示词
      if (path === '/api/translate-prompt') {
        const { prompt } = body;
        
        if (!prompt) {
          return errorResponse('Missing prompt field', 400);
        }

        const optimized = await translatePromptToSystemInstruction(prompt, env);
        return jsonResponse({ optimized });
      }

      // 翻译文本
      if (path === '/api/translate-text') {
        const { text, targetLanguage } = body;
        
        if (!text || !targetLanguage) {
          return errorResponse('Missing required fields', 400);
        }

        const translated = await translateText(text, targetLanguage, env);
        return jsonResponse({ translated });
      }

    } catch (error: any) {
      console.error('API Error:', error);
      return errorResponse(error.message || 'Internal Server Error');
    }
  }

  // 404
  return errorResponse('Not Found', 404);
}
