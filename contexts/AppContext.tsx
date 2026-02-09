import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  UILanguage,
  ArchiveEntry,
  BatchArchiveEntry,
  DeepDiveArchiveEntry,
  AppState,
  STORAGE_KEYS,
} from '../types';

// Context 接口定义
interface AppContextValue {
  // UI 语言
  uiLanguage: UILanguage;
  setUiLanguage: (lang: UILanguage) => void;

  // 导航
  currentStep: AppState['step'];
  navigateTo: (step: AppState['step']) => void;

  // 归档管理
  archives: ArchiveEntry[];
  batchArchives: BatchArchiveEntry[];
  deepDiveArchives: DeepDiveArchiveEntry[];
  addArchive: (entry: ArchiveEntry) => void;
  addBatchArchive: (entry: BatchArchiveEntry) => void;
  addDeepDiveArchive: (entry: DeepDiveArchiveEntry) => void;
  loadArchive: (id: string) => ArchiveEntry | undefined;
  loadBatchArchive: (id: string) => BatchArchiveEntry | undefined;
  loadDeepDiveArchive: (id: string) => DeepDiveArchiveEntry | undefined;
}

// 创建 Context
const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider Props
interface AppProviderProps {
  children: React.ReactNode;
}

// Provider 组件
export function AppProvider({ children }: AppProviderProps) {
  // UI 语言状态
  const [uiLanguage, setUiLanguageState] = useState<UILanguage>(() => {
    try {
      const saved = localStorage.getItem('ui_language');
      return (saved as UILanguage) || 'en';
    } catch {
      return 'en';
    }
  });

  // 当前页面状态
  const [currentStep, setCurrentStep] = useState<AppState['step']>('content-generation');

  // 归档状态
  const [archives, setArchives] = useState<ArchiveEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ARCHIVES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [batchArchives, setBatchArchives] = useState<BatchArchiveEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BATCH_ARCHIVES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deepDiveArchives, setDeepDiveArchives] = useState<DeepDiveArchiveEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEEPDIVE_ARCHIVES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 持久化 UI 语言
  const setUiLanguage = useCallback((lang: UILanguage) => {
    setUiLanguageState(lang);
    localStorage.setItem('ui_language', lang);
  }, []);

  // 导航函数
  const navigateTo = useCallback((step: AppState['step']) => {
    setCurrentStep(step);
  }, []);

  // 归档管理函数
  const addArchive = useCallback((entry: ArchiveEntry) => {
    setArchives((prev) => {
      const updated = [entry, ...prev];
      localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addBatchArchive = useCallback((entry: BatchArchiveEntry) => {
    setBatchArchives((prev) => {
      const updated = [entry, ...prev];
      localStorage.setItem(STORAGE_KEYS.BATCH_ARCHIVES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addDeepDiveArchive = useCallback((entry: DeepDiveArchiveEntry) => {
    setDeepDiveArchives((prev) => {
      const updated = [entry, ...prev];
      localStorage.setItem(STORAGE_KEYS.DEEPDIVE_ARCHIVES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadArchive = useCallback((id: string) => {
    return archives.find((a) => a.id === id);
  }, [archives]);

  const loadBatchArchive = useCallback((id: string) => {
    return batchArchives.find((a) => a.id === id);
  }, [batchArchives]);

  const loadDeepDiveArchive = useCallback((id: string) => {
    return deepDiveArchives.find((a) => a.id === id);
  }, [deepDiveArchives]);

  // Context value
  const value: AppContextValue = {
    uiLanguage,
    setUiLanguage,
    currentStep,
    navigateTo,
    archives,
    batchArchives,
    deepDiveArchives,
    addArchive,
    addBatchArchive,
    addDeepDiveArchive,
    loadArchive,
    loadBatchArchive,
    loadDeepDiveArchive,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
