import React, { createContext, useContext, useState, useCallback } from 'react';
import { fetchWithAuth } from '../lib/api-client';

// 网站数据接口
interface Website {
  id: string;
  url: string;
  domain?: string;
  isDefault: boolean;
}

// Context 接口定义
interface WebsiteContextValue {
  // 选中的网站
  selectedWebsite: Website | null;
  setSelectedWebsite: (website: Website | null) => void;

  // 网站列表
  websites: Website[];
  currentWebsite: Website | null;
  loadWebsites: () => Promise<void>;

  // URL 验证
  validateUrl: (url: string) => Promise<{ valid: boolean; website?: Website; error?: string }>;
  normalizeUrl: (input: string) => string;
}

// 创建 Context
const WebsiteContext = createContext<WebsiteContextValue | undefined>(undefined);

// Provider Props
interface WebsiteProviderProps {
  children: React.ReactNode;
}

// URL 规范化函数
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  // 如果已经有协议，直接返回
  if (trimmed.match(/^https?:\/\//i)) {
    return trimmed;
  }

  // 如果以 // 开头，添加 https:
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // 否则，添加 https://
  return `https://${trimmed}`;
}

// Provider 组件
export function WebsiteProvider({ children }: WebsiteProviderProps) {
  // 选中的网站
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);

  // 网站列表
  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);

  // 加载网站列表
  const loadWebsites = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/websites/list');
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setWebsites(result.data.websites || []);
          setCurrentWebsite(result.data.currentWebsite || null);

          // 自动选择当前网站（如果还没有选择）
          if (!selectedWebsite && result.data.currentWebsite) {
            setSelectedWebsite(result.data.currentWebsite);
          }
        }
      } else {
        console.error('[WebsiteContext] Failed to load websites list');
      }
    } catch (error) {
      console.error('[WebsiteContext] Failed to load websites list:', error);
    }
  }, [selectedWebsite]);

  // URL 验证
  const validateUrl = useCallback(
    async (url: string): Promise<{ valid: boolean; website?: Website; error?: string }> => {
      try {
        const normalizedUrl = normalizeUrl(url);
        const urlObj = new URL(normalizedUrl);

        // 验证主机名：必须包含点号且有有效的域名格式
        const hostname = urlObj.hostname;
        if (!hostname || !hostname.includes('.') || hostname.endsWith('.') || hostname.startsWith('.')) {
          return { valid: false, error: 'Invalid hostname' };
        }

        // 检查主机名在点号前至少有一个字符
        const parts = hostname.split('.');
        if (parts.length < 2 || parts.some((part) => part.length === 0)) {
          return { valid: false, error: 'Invalid domain format' };
        }

        // URL 有效，创建网站对象
        const website: Website = {
          id: `manual-${Date.now()}`,
          url: normalizedUrl,
          domain: urlObj.hostname.replace(/^www\./, ''),
          isDefault: false,
        };

        return { valid: true, website };
      } catch (e) {
        return { valid: false, error: 'Invalid URL format' };
      }
    },
    []
  );

  // Context value
  const value: WebsiteContextValue = {
    selectedWebsite,
    setSelectedWebsite,
    websites,
    currentWebsite,
    loadWebsites,
    validateUrl,
    normalizeUrl,
  };

  return <WebsiteContext.Provider value={value}>{children}</WebsiteContext.Provider>;
}

// Custom hook
export function useWebsiteContext() {
  const context = useContext(WebsiteContext);
  if (context === undefined) {
    throw new Error('useWebsiteContext must be used within a WebsiteProvider');
  }
  return context;
}
