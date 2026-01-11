import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// Add global styles to hide all scrollbars (complementing index.html styles)
const style = document.createElement('style');
style.textContent = `
  /* Ensure all scrollbars are hidden globally */
  * {
    -ms-overflow-style: none !important;  /* IE and Edge */
    scrollbar-width: none !important;  /* Firefox */
  }
  *::-webkit-scrollbar {
    display: none !important;  /* Chrome, Safari and Opera */
    width: 0 !important;
    height: 0 !important;
  }
  
  /* Specific classes for scrollbar hiding */
  .scrollbar-hide,
  .custom-scrollbar,
  [class*="overflow"] {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
  }
  .scrollbar-hide::-webkit-scrollbar,
  .custom-scrollbar::-webkit-scrollbar,
  [class*="overflow"]::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
`;
document.head.appendChild(style);

// 全局 Fetch 拦截器，自动注入 Authorization Token 和代理/模型 header
// 注意：优先使用 fetchWithAuth/postWithAuth，此拦截器仅作为后备
const originalFetch = window.fetch;
window.fetch = async (resource, config) => {
  const token = localStorage.getItem('auth_token');
  
  // 只对本站 API 请求注入 Token
  const isApiRequest = typeof resource === 'string' && 
    (resource.startsWith('/api/') || resource.startsWith(window.location.origin + '/api/'));

  if (isApiRequest) {
    config = config || {};
    const headers = new Headers(config.headers || {});
    
    // 添加 Authorization
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // 添加代理和模型 header（如果还没有的话）
    // 注意：fetchWithAuth/postWithAuth 会设置这些 header，这里只是后备
    if (!headers.has('X-Proxy-Provider')) {
      const proxyProvider = localStorage.getItem('gemini_proxy_provider') || '302';
      headers.set('X-Proxy-Provider', proxyProvider);
    }
    
    if (!headers.has('X-Gemini-Model')) {
      const model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
      headers.set('X-Gemini-Model', model);
    }
    
    config.headers = headers;
  }
  
  return originalFetch(resource, config);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);