import React, { useState, useEffect } from 'react';
import { Network, Check, AlertCircle, RefreshCw, Cpu } from 'lucide-react';
import { getProxyProvider, setProxyProvider, getSelectedModel, setSelectedModel, AVAILABLE_MODELS, GeminiModel } from '../lib/api-client';

interface ProxyProvider {
  id: '302' | 'tuzi';
  name: string;
  baseUrl: string;
  description: string;
  hasApiKey: boolean;
}

interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

interface ProxyStatus {
  providers: ProxyProvider[];
  models: ModelInfo[];
  current: {
    provider: '302' | 'tuzi';
    model: string;
  };
  currentInfo: {
    provider: string;
    baseUrl: string;
    urlTemplate: string;
    hasApiKey: boolean;
    model: string;
  };
}

interface ProxySwitcherProps {
  isDarkTheme?: boolean;
  compact?: boolean;
}

export function ProxySwitcher({ isDarkTheme = true, compact = false }: ProxySwitcherProps) {
  const [currentProvider, setCurrentProvider] = useState<'302' | 'tuzi'>(getProxyProvider() as '302' | 'tuzi');
  const [currentModel, setCurrentModel] = useState<string>(getSelectedModel());
  const [providers, setProviders] = useState<ProxyProvider[]>([]);
  const [models, setModels] = useState<ModelInfo[]>(AVAILABLE_MODELS.map(m => ({ ...m })));
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 获取代理状态
  useEffect(() => {
    fetchProxyStatus();
  }, []);

  // 监听代理切换事件
  useEffect(() => {
    const handleProxyChange = (e: CustomEvent) => {
      setCurrentProvider(e.detail);
    };
    const handleModelChange = (e: CustomEvent) => {
      setCurrentModel(e.detail);
    };
    window.addEventListener('proxy-provider-change', handleProxyChange as EventListener);
    window.addEventListener('model-change', handleModelChange as EventListener);
    return () => {
      window.removeEventListener('proxy-provider-change', handleProxyChange as EventListener);
      window.removeEventListener('model-change', handleModelChange as EventListener);
    };
  }, []);

  const fetchProxyStatus = async () => {
    try {
      const response = await fetch('/api/proxy-status', {
        headers: {
          'X-Proxy-Provider': getProxyProvider(),
          'X-Gemini-Model': getSelectedModel(),
        },
      });
      if (response.ok) {
        const data: ProxyStatus = await response.json();
        setProviders(data.providers);
        if (data.models) {
          setModels(data.models);
        }
      }
    } catch (error) {
      console.error('Failed to fetch proxy status:', error);
    }
  };

  const handleProviderSwitch = (providerId: '302' | 'tuzi') => {
    setIsLoading(true);
    setTestResult(null);
    setProxyProvider(providerId);
    setCurrentProvider(providerId);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleModelSwitch = (modelId: string) => {
    setIsLoading(true);
    setTestResult(null);
    setSelectedModel(modelId as GeminiModel);
    setCurrentModel(modelId);
    setTimeout(() => setIsLoading(false), 300);
  };

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/proxy-status', {
        headers: {
          'X-Proxy-Provider': currentProvider,
          'X-Gemini-Model': currentModel,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.currentInfo?.hasApiKey) {
          setTestResult({ 
            success: true, 
            message: `${currentProvider.toUpperCase()} + ${currentModel.split('-').slice(-2).join('-')} ✓` 
          });
        } else {
          setTestResult({ success: false, message: `API Key 未配置` });
        }
      } else {
        setTestResult({ success: false, message: '连接失败' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || '连接失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // 获取模型的简短显示名称
  const getShortModelName = (modelId: string) => {
    if (modelId.includes('3-flash')) return '3.0';
    if (modelId.includes('2.5-flash')) return '2.5';
    return modelId.split('-').slice(-1)[0];
  };

  if (compact) {
    // 紧凑模式：代理 + 模型切换按钮
    return (
      <div className={`flex items-center gap-1 rounded-lg p-1 ${
        isDarkTheme ? 'bg-slate-800/80 backdrop-blur-sm border border-slate-700/50' : 'bg-white/90 backdrop-blur-sm border border-gray-200'
      }`}>
        {/* 代理切换 */}
        <div className={`flex items-center rounded-md p-0.5 ${
          isDarkTheme ? 'bg-slate-900/50' : 'bg-gray-100'
        }`}>
          {['302', 'tuzi'].map((id) => (
            <button
              key={id}
              onClick={() => handleProviderSwitch(id as '302' | 'tuzi')}
              disabled={isLoading}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                currentProvider === id
                  ? isDarkTheme
                    ? 'bg-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-100 text-emerald-700'
                  : isDarkTheme
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'text-gray-400 hover:text-gray-600'
              }`}
              title={id === '302' ? '302 代理' : 'Tu-Zi 代理'}
            >
              {id === '302' ? '302' : 'TZ'}
            </button>
          ))}
        </div>

        {/* 分隔符 */}
        <div className={`w-px h-4 ${isDarkTheme ? 'bg-slate-700' : 'bg-gray-300'}`} />

        {/* 模型切换 */}
        <div className={`flex items-center rounded-md p-0.5 ${
          isDarkTheme ? 'bg-slate-900/50' : 'bg-gray-100'
        }`}>
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelSwitch(model.id)}
              disabled={isLoading}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                currentModel === model.id
                  ? isDarkTheme
                    ? 'bg-blue-500/30 text-blue-400'
                    : 'bg-blue-100 text-blue-700'
                  : isDarkTheme
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'text-gray-400 hover:text-gray-600'
              }`}
              title={`${model.name} - ${model.description}`}
            >
              {getShortModelName(model.id)}
            </button>
          ))}
        </div>

        {/* 测试按钮 */}
        <button
          onClick={testConnection}
          disabled={isLoading}
          className={`p-1 rounded transition-colors ${
            isDarkTheme 
              ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="测试连接"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        {/* 测试结果 */}
        {testResult && (
          <span className={`text-[10px] ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
            {testResult.success ? <Check className="w-3 h-3 inline" /> : <AlertCircle className="w-3 h-3 inline" />}
          </span>
        )}
      </div>
    );
  }

  // 完整模式
  return (
    <div className={`rounded-lg border p-4 ${
      isDarkTheme 
        ? 'bg-slate-900/50 border-slate-700/50' 
        : 'bg-white border-gray-200'
    }`}>
      {/* 代理选择 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Network className={`w-4 h-4 ${isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h3 className={`text-sm font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
            API 代理
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleProviderSwitch(provider.id)}
              disabled={isLoading}
              className={`p-2 rounded-lg border text-left transition-all ${
                currentProvider === provider.id
                  ? isDarkTheme
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-emerald-50 border-emerald-300'
                  : isDarkTheme
                    ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium text-xs ${
                  currentProvider === provider.id
                    ? isDarkTheme ? 'text-emerald-400' : 'text-emerald-700'
                    : isDarkTheme ? 'text-white' : 'text-gray-900'
                }`}>
                  {provider.name}
                </span>
                {currentProvider === provider.id && (
                  <Check className={`w-3 h-3 ${isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'}`} />
                )}
              </div>
              <div className={`text-[10px] mt-0.5 ${
                provider.hasApiKey 
                  ? isDarkTheme ? 'text-emerald-400/70' : 'text-emerald-600' 
                  : isDarkTheme ? 'text-red-400/70' : 'text-red-500'
              }`}>
                {provider.hasApiKey ? '✓ Key 已配置' : '✗ Key 未配置'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 模型选择 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className={`w-4 h-4 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`} />
          <h3 className={`text-sm font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
            模型选择
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelSwitch(model.id)}
              disabled={isLoading}
              className={`p-2 rounded-lg border text-left transition-all ${
                currentModel === model.id
                  ? isDarkTheme
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-blue-50 border-blue-300'
                  : isDarkTheme
                    ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium text-xs ${
                  currentModel === model.id
                    ? isDarkTheme ? 'text-blue-400' : 'text-blue-700'
                    : isDarkTheme ? 'text-white' : 'text-gray-900'
                }`}>
                  {model.name}
                </span>
                {currentModel === model.id && (
                  <Check className={`w-3 h-3 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`} />
                )}
              </div>
              <div className={`text-[10px] mt-0.5 ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                {model.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 测试连接 */}
      <div className="flex items-center justify-between">
        <button
          onClick={testConnection}
          disabled={isLoading}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
            isDarkTheme
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          测试连接
        </button>

        {testResult && (
          <span className={`text-xs flex items-center gap-1 ${
            testResult.success 
              ? isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'
              : isDarkTheme ? 'text-red-400' : 'text-red-500'
          }`}>
            {testResult.success ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {testResult.message}
          </span>
        )}
      </div>
    </div>
  );
}
