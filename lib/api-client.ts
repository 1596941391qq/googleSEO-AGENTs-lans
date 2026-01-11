/**
 * API Client Utility
 * Provides authenticated fetch and other API-related helpers
 */

// 本地存储 keys
const PROXY_PROVIDER_KEY = 'gemini_proxy_provider';
const MODEL_KEY = 'gemini_model';

// 可用的模型列表
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '快速稳定' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: '最新预览版' },
] as const;

export type GeminiModel = typeof AVAILABLE_MODELS[number]['id'];

/**
 * 获取当前选择的代理商
 */
export function getProxyProvider(): string {
  return localStorage.getItem(PROXY_PROVIDER_KEY) || '302';
}

/**
 * 设置代理商
 */
export function setProxyProvider(provider: '302' | 'tuzi'): void {
  localStorage.setItem(PROXY_PROVIDER_KEY, provider);
  // 触发自定义事件，让其他组件可以监听变化
  window.dispatchEvent(new CustomEvent('proxy-provider-change', { detail: provider }));
}

/**
 * 获取当前选择的模型
 */
export function getSelectedModel(): string {
  return localStorage.getItem(MODEL_KEY) || 'gemini-2.5-flash';
}

/**
 * 设置模型
 */
export function setSelectedModel(model: GeminiModel): void {
  localStorage.setItem(MODEL_KEY, model);
  // 触发自定义事件，让其他组件可以监听变化
  window.dispatchEvent(new CustomEvent('model-change', { detail: model }));
}

/**
 * Enhanced fetch that automatically adds Authorization header, Proxy Provider header, and Model header
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  const proxyProvider = getProxyProvider();
  const model = getSelectedModel();
  
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // 添加代理商选择 header
  if (!headers.has('X-Proxy-Provider')) {
    headers.set('X-Proxy-Provider', proxyProvider);
  }
  
  // 添加模型选择 header
  if (!headers.has('X-Gemini-Model')) {
    headers.set('X-Gemini-Model', model);
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Handle 401 Unauthorized globally if needed
  if (response.status === 401) {
    console.warn('[API] Unauthorized (401). User might need to re-login.');
    // Optional: Clear token or redirect to login
    // localStorage.removeItem('auth_token');
    // window.location.href = '/login'; 
  }
  
  return response;
}

/**
 * Helper for POST requests
 */
export async function postWithAuth(url: string, data: any, options: RequestInit = {}): Promise<Response> {
  return fetchWithAuth(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
  });
}
