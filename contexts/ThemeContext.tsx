import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Context 接口定义
interface ThemeContextValue {
  // 主题状态
  isDarkTheme: boolean;
  toggleTheme: () => void;

  // 侧边栏状态
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// 创建 Context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Provider Props
interface ThemeProviderProps {
  children: React.ReactNode;
}

// Provider 组件
export function ThemeProvider({ children }: ThemeProviderProps) {
  // 主题状态
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      // 如果 localStorage 中有保存的主题，使用保存的值；否则默认使用暗色模式
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      // 默认暗色模式
      return true;
    } catch {
      return true;
    }
  });

  // 侧边栏状态
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const savedCollapsed = localStorage.getItem('sidebar_collapsed');
      if (savedCollapsed) {
        return savedCollapsed === 'true';
      }
      // 移动端默认折叠
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  // 切换主题
  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prev) => {
      const newTheme = !prev;
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  }, []);

  // 切换侧边栏
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebar_collapsed', String(newState));
      return newState;
    });
  }, []);

  // 设置侧边栏状态
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, []);

  // 响应式处理：移动端自动折叠侧边栏
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        if (!isSidebarCollapsed) {
          setSidebarCollapsed(true);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarCollapsed, setSidebarCollapsed]);

  // Context value
  const value: ThemeContextValue = {
    isDarkTheme,
    toggleTheme,
    isSidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Custom hook
export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
