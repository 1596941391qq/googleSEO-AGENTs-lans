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

// 全局 Fetch 拦截器，自动注入 Authorization Token
const originalFetch = window.fetch;
window.fetch = async (resource, config) => {
  const token = localStorage.getItem('auth_token');
  
  // 只对本站 API 请求注入 Token
  const isApiRequest = typeof resource === 'string' && 
    (resource.startsWith('/api/') || resource.startsWith(window.location.origin + '/api/'));

  if (token && isApiRequest) {
    config = config || {};
    const headers = new Headers(config.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
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