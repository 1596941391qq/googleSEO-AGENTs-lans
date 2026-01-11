import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setRequestProxyProvider, setRequestModel } from './gemini.js';

/**
 * Parse request body, handling both JSON string and object
 * 同时自动初始化请求上下文（包括代理选择）
 */
export function parseRequestBody(req: VercelRequest): any {
  // 自动初始化请求上下文（提取代理选择等）
  initRequestContext(req);
  
  let body = req.body;
  
  // If body is a string, try to parse it as JSON
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      throw new Error('Invalid JSON in request body');
    }
  }
  
  return body || {};
}

/**
 * 初始化请求上下文（提取代理选择、模型选择等）
 * 应该在每个 API handler 开头调用
 */
export function initRequestContext(req: VercelRequest): void {
  // 从 header 中读取代理选择
  const proxyProvider = req.headers['x-proxy-provider'] as string | undefined;
  // 从 header 中读取模型选择
  const model = req.headers['x-gemini-model'] as string | undefined;
  
  console.log(`[Request Context] X-Proxy-Provider: ${proxyProvider || '(not set)'}, X-Gemini-Model: ${model || '(not set)'}`);
  
  // 总是设置代理选择（如果没有 header 则传 null 重置为默认值）
  setRequestProxyProvider((proxyProvider as '302' | 'tuzi') || null);
  // 总是设置模型选择（如果没有 header 则传 null 重置为默认值）
  setRequestModel(model || null);
}

/**
 * Set CORS headers
 * 可选传入 req 参数来自动初始化请求上下文
 */
export function setCorsHeaders(res: VercelResponse, req?: VercelRequest) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Proxy-Provider, X-Gemini-Model');
  
  // 如果传入了 req，自动初始化请求上下文
  if (req) {
    initRequestContext(req);
  }
}

/**
 * Handle OPTIONS request
 */
export function handleOptions(res: VercelResponse) {
  setCorsHeaders(res);
  return res.status(204).end();
}

/**
 * Send error response with detailed information
 */
export function sendErrorResponse(
  res: VercelResponse,
  error: any,
  defaultMessage: string,
  statusCode: number = 500
) {
  console.error(`Error: ${defaultMessage}`, error);
  console.error('Error stack:', error?.stack);
  console.error('Error name:', error?.name);
  
  const errorResponse: any = {
    error: error?.message || defaultMessage,
    type: error?.name || 'UnknownError',
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') {
    errorResponse.stack = error?.stack;
  }
  
  return res.status(statusCode).json(errorResponse);
}

