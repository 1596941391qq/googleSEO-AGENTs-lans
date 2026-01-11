import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, initRequestContext } from './_shared/request-handler.js';
import { getCurrentProxyInfo } from './_shared/gemini.js';

/**
 * GET /api/proxy-status
 * 获取当前代理配置和模型状态
 * 
 * Response:
 * {
 *   providers: [{ id: '302', name: '302.ai', ... }, ...],
 *   models: [{ id: 'gemini-2.5-flash', name: '...', ... }, ...],
 *   current: { provider, model },
 *   currentInfo: { ... }
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return handleOptions(res);
    
    // 初始化请求上下文（读取 X-Proxy-Provider 和 X-Gemini-Model header）
    initRequestContext(req);
    
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const proxyInfo = getCurrentProxyInfo();

    // 返回可用的代理商、模型列表和当前选择
    return res.json({
      providers: [
        {
          id: '302',
          name: '302.ai',
          baseUrl: 'https://api.302.ai',
          description: '302.ai 中转站',
          hasApiKey: !!process.env.GEMINI_API_KEY,
        },
        {
          id: 'tuzi',
          name: 'Tu-Zi',
          baseUrl: 'https://api.tu-zi.com',
          description: 'Tu-Zi 中转站',
          hasApiKey: !!(process.env.GEMINI_TUZI_API_KEY || process.env.GEMINI_API_KEY),
        },
      ],
      models: [
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          description: '快速稳定',
        },
        {
          id: 'gemini-3-flash-preview',
          name: 'Gemini 3 Flash Preview',
          description: '最新预览版',
        },
      ],
      current: {
        provider: proxyInfo.provider,
        model: proxyInfo.model,
      },
      currentInfo: proxyInfo,
    });
  } catch (error: any) {
    console.error('Proxy status error:', error);
    return res.status(500).json({ 
      error: error?.message || 'Failed to get proxy status' 
    });
  }
}
