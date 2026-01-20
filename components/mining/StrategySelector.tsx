/**
 * 存量拓新策略选择器组件
 * 
 * 允许用户选择不同的挖词策略模块并设置各模块的生成数量
 */

import React, { useMemo } from 'react';
import { Check, Globe, Target, Users, Star, Building2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

// 策略模块 ID 类型
export type StrategyModuleId = 
  | 'website_content'
  | 'website_ranked'
  | 'competitor_keywords'
  | 'high_performer_expand'
  | 'industry_context';

// 单个策略模块配置
export interface StrategyModuleConfig {
  enabled: boolean;
  count: number;
  // industry_context 特有字段
  industry?: string;
  suggestions?: string;
}

// 完整策略配置
export interface StrategyConfig {
  website_content?: StrategyModuleConfig;
  website_ranked?: StrategyModuleConfig;
  competitor_keywords?: StrategyModuleConfig;
  high_performer_expand?: StrategyModuleConfig;
  industry_context?: StrategyModuleConfig & { industry?: string; suggestions?: string };
}

interface StrategySelectorProps {
  value: StrategyConfig;
  onChange: (config: StrategyConfig) => void;
  maxTotalKeywords?: number;
  language?: 'zh' | 'en';
  hasHighPerformerKeywords?: boolean; // 是否有已标记的高表现词
  onRequestHighPerformerList?: () => void; // 请求查看高表现词列表
  isDarkTheme?: boolean; // 深色模式
}

// 策略模块定义
const STRATEGY_MODULES: Record<StrategyModuleId, {
  icon: React.ElementType;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  defaultCount: number;
  minCount: number;
  maxCount: number;
}> = {
  website_content: {
    icon: Globe,
    name: { zh: '网站内容分析', en: 'Website Content Analysis' },
    description: { 
      zh: '从网站现有内容主题出发，发现可扩展的关键词机会', 
      en: 'Find expandable keyword opportunities from existing content themes' 
    },
    defaultCount: 10,
    minCount: 5,
    maxCount: 30,
  },
  website_ranked: {
    icon: Target,
    name: { zh: '网站已排名词', en: 'Website Ranked Keywords' },
    description: { 
      zh: '基于网站当前已排名的关键词进行语义扩展', 
      en: 'Semantic expansion based on currently ranked keywords' 
    },
    defaultCount: 10,
    minCount: 5,
    maxCount: 30,
  },
  competitor_keywords: {
    icon: Users,
    name: { zh: '竞对关键词', en: 'Competitor Keywords' },
    description: { 
      zh: '从竞争对手正在排名的词中发现内容缺口', 
      en: 'Find content gaps from competitor rankings' 
    },
    defaultCount: 10,
    minCount: 5,
    maxCount: 30,
  },
  high_performer_expand: {
    icon: Star,
    name: { zh: '高表现词扩展', en: 'High Performer Expansion' },
    description: { 
      zh: '基于已标记的优质关键词进行长尾和变体扩展', 
      en: 'Long-tail and variant expansion from marked high performers' 
    },
    defaultCount: 10,
    minCount: 5,
    maxCount: 30,
  },
  industry_context: {
    icon: Building2,
    name: { zh: '行业上下文', en: 'Industry Context' },
    description: { 
      zh: '结合行业特点和用户建议生成关键词', 
      en: 'Generate keywords based on industry and user suggestions' 
    },
    defaultCount: 10,
    minCount: 5,
    maxCount: 30,
  },
};

// 模块顺序
const MODULE_ORDER: StrategyModuleId[] = [
  'website_content',
  'website_ranked',
  'competitor_keywords',
  'high_performer_expand',
  'industry_context',
];

export const StrategySelector: React.FC<StrategySelectorProps> = ({
  value,
  onChange,
  maxTotalKeywords = 50,
  language = 'en',
  hasHighPerformerKeywords = false,
  onRequestHighPerformerList,
  isDarkTheme = true,
}) => {
  const isZh = language === 'zh';
  
  // 计算当前总数
  const totalCount = useMemo(() => {
    return Object.values(value).reduce((sum, config) => {
      return sum + (config?.enabled ? (config.count || 0) : 0);
    }, 0);
  }, [value]);

  // 是否超过限制
  const isOverLimit = totalCount > maxTotalKeywords;

  // 切换模块启用状态
  const toggleModule = (moduleId: StrategyModuleId) => {
    const currentConfig = value[moduleId];
    const isEnabled = currentConfig?.enabled || false;
    
    onChange({
      ...value,
      [moduleId]: {
        ...currentConfig,
        enabled: !isEnabled,
        count: currentConfig?.count || STRATEGY_MODULES[moduleId].defaultCount,
      },
    });
  };

  // 更新模块数量
  const updateModuleCount = (moduleId: StrategyModuleId, count: number) => {
    const module = STRATEGY_MODULES[moduleId];
    const clampedCount = Math.max(module.minCount, Math.min(module.maxCount, count));
    
    onChange({
      ...value,
      [moduleId]: {
        ...value[moduleId],
        count: clampedCount,
      },
    });
  };

  // 更新行业上下文
  const updateIndustryContext = (field: 'industry' | 'suggestions', val: string) => {
    onChange({
      ...value,
      industry_context: {
        ...value.industry_context,
        [field]: val,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* 标题和总数显示 */}
      <div className="flex items-center justify-between">
        <h3 className={cn(
          "text-sm font-semibold",
          isDarkTheme ? "text-white" : "text-slate-700"
        )}>
          {isZh ? '选择挖词策略' : 'Select Mining Strategies'}
        </h3>
        <div className={cn(
          "text-sm font-medium px-3 py-1 rounded-full",
          isOverLimit 
            ? (isDarkTheme ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
            : (isDarkTheme ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
        )}>
          {totalCount} / {maxTotalKeywords} {isZh ? '个词' : 'keywords'}
        </div>
      </div>

      {/* 超限警告 */}
      {isOverLimit && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-sm",
          isDarkTheme 
            ? "bg-red-500/10 border border-red-500/30 text-red-400"
            : "bg-red-50 border border-red-200 text-red-700"
        )}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            {isZh 
              ? `总数超过限制 ${maxTotalKeywords}，请减少各模块的数量`
              : `Total exceeds limit of ${maxTotalKeywords}, please reduce counts`}
          </span>
        </div>
      )}

      {/* 模块列表 */}
      <div className="space-y-3">
        {MODULE_ORDER.map((moduleId) => {
          const module = STRATEGY_MODULES[moduleId];
          const config = value[moduleId];
          const isEnabled = config?.enabled || false;
          const count = config?.count || module.defaultCount;
          const Icon = module.icon;

          // 高表现词模块的特殊警告
          const showHighPerformerWarning = 
            moduleId === 'high_performer_expand' && 
            isEnabled && 
            !hasHighPerformerKeywords;

          return (
            <div
              key={moduleId}
              className={cn(
                "border rounded-lg transition-all",
                isEnabled 
                  ? (isDarkTheme 
                      ? 'border-emerald-500/50 bg-emerald-500/10' 
                      : 'border-emerald-300 bg-emerald-50/50 shadow-sm')
                  : (isDarkTheme 
                      ? 'border-white/10 bg-white/5 hover:border-white/20' 
                      : 'border-slate-200 bg-white hover:border-slate-300')
              )}
            >
              {/* 模块头部 */}
              <div 
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => toggleModule(moduleId)}
              >
                {/* 勾选框 */}
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  isEnabled 
                    ? 'bg-emerald-500 border-emerald-500' 
                    : (isDarkTheme 
                        ? 'border-neutral-600 hover:border-neutral-500' 
                        : 'border-slate-300 hover:border-slate-400')
                )}>
                  {isEnabled && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* 图标 */}
                <div className={cn(
                  "p-1.5 rounded",
                  isEnabled 
                    ? 'bg-emerald-500 text-white' 
                    : (isDarkTheme 
                        ? 'bg-white/10 text-neutral-400' 
                        : 'bg-slate-100 text-slate-500')
                )}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* 名称和描述 */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-sm font-medium",
                    isEnabled 
                      ? (isDarkTheme ? 'text-emerald-400' : 'text-emerald-700')
                      : (isDarkTheme ? 'text-white' : 'text-slate-700')
                  )}>
                    {module.name[language]}
                  </div>
                  <div className={cn(
                    "text-xs truncate",
                    isDarkTheme ? "text-neutral-500" : "text-slate-500"
                  )}>
                    {module.description[language]}
                  </div>
                </div>

                {/* 数量控制 */}
                {isEnabled && (
                  <div 
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-sm font-medium transition-colors",
                        isDarkTheme 
                          ? "bg-white/10 border border-white/20 text-white hover:bg-white/20" 
                          : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                      )}
                      onClick={() => updateModuleCount(moduleId, count - 5)}
                      disabled={count <= module.minCount}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => updateModuleCount(moduleId, parseInt(e.target.value) || module.defaultCount)}
                      className={cn(
                        "w-12 h-6 text-center text-sm border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500",
                        isDarkTheme 
                          ? "bg-white/10 border-white/20 text-white" 
                          : "bg-white border-slate-300 text-slate-700"
                      )}
                      min={module.minCount}
                      max={module.maxCount}
                    />
                    <button
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-sm font-medium transition-colors",
                        isDarkTheme 
                          ? "bg-white/10 border border-white/20 text-white hover:bg-white/20" 
                          : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                      )}
                      onClick={() => updateModuleCount(moduleId, count + 5)}
                      disabled={count >= module.maxCount}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* 高表现词警告 */}
              {showHighPerformerWarning && (
                <div className={cn(
                  "mx-3 mb-3 flex items-center gap-2 p-2 rounded text-xs",
                  isDarkTheme 
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    : "bg-amber-50 border border-amber-200 text-amber-700"
                )}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {isZh 
                      ? '当前未标记高表现词，请先在关键词列表中标记'
                      : 'No high performers marked. Please mark keywords first.'}
                  </span>
                  {onRequestHighPerformerList && (
                    <button 
                      className={cn(
                        "ml-auto underline hover:no-underline",
                        isDarkTheme ? "text-amber-300" : "text-amber-800"
                      )}
                      onClick={onRequestHighPerformerList}
                    >
                      {isZh ? '去标记' : 'Mark now'}
                    </button>
                  )}
                </div>
              )}

              {/* 行业上下文特殊输入 */}
              {moduleId === 'industry_context' && isEnabled && (
                <div className="px-3 pb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder={isZh ? '行业名称（如：AI SaaS、电商、健康科技）' : 'Industry (e.g., AI SaaS, E-commerce, HealthTech)'}
                    value={config?.industry || ''}
                    onChange={(e) => updateIndustryContext('industry', e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500",
                      isDarkTheme 
                        ? "bg-white/5 border-white/20 text-white placeholder:text-neutral-600" 
                        : "bg-white border-slate-300 text-slate-700 placeholder:text-slate-400"
                    )}
                  />
                  <textarea
                    placeholder={isZh ? '补充建议（可选，如：关注企业服务、B2B市场）' : 'Suggestions (optional, e.g., focus on enterprise, B2B market)'}
                    value={config?.suggestions || ''}
                    onChange={(e) => updateIndustryContext('suggestions', e.target.value)}
                    rows={2}
                    className={cn(
                      "w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none",
                      isDarkTheme 
                        ? "bg-white/5 border-white/20 text-white placeholder:text-neutral-600" 
                        : "bg-white border-slate-300 text-slate-700 placeholder:text-slate-400"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div className={cn(
        "text-xs p-3 rounded-lg",
        isDarkTheme 
          ? "text-neutral-400 bg-white/5 border border-white/10" 
          : "text-slate-500 bg-slate-50"
      )}>
        {isZh 
          ? '💡 提示：可以同时选择多个策略模块，AI 将从不同角度生成关键词并自动去重。建议总数不超过 50 个以确保生成质量。'
          : '💡 Tip: Select multiple strategies for diverse keyword sources. AI will generate from different perspectives and deduplicate. Keep total under 50 for best quality.'}
      </div>
    </div>
  );
};

export default StrategySelector;
