/**
 * 存量拓新挖词策略模块定义
 * 
 * 支持用户自由组合不同的挖词角度，每个模块独立收集数据和上下文
 */

// ============================================
// 类型定义
// ============================================

/**
 * 策略模块 ID
 */
export type MiningStrategyId = 
  | 'website_content'        // 网站内容分析
  | 'website_ranked'         // 网站已排名词
  | 'competitor_keywords'    // 竞对关键词
  | 'high_performer_expand'  // 高表现词扩展
  | 'industry_context';      // 行业上下文

/**
 * 单个策略配置
 */
export interface StrategyConfig {
  enabled: boolean;
  count: number;
  // 行业上下文特有字段
  industry?: string;
  suggestions?: string;
}

/**
 * 所有策略的配置
 */
export interface StrategiesConfig {
  website_content?: StrategyConfig;
  website_ranked?: StrategyConfig;
  competitor_keywords?: StrategyConfig;
  high_performer_expand?: StrategyConfig;
  industry_context?: StrategyConfig;
}

/**
 * 策略模块定义
 */
export interface StrategyModule {
  id: MiningStrategyId;
  name: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
  defaultEnabled: boolean;
  defaultCount: number;
  requiresData?: boolean; // 是否需要预先有数据才能使用
  requiresInput?: boolean; // 是否需要用户输入
}

/**
 * 收集到的上下文数据
 */
export interface StrategyContext {
  website_content?: string;
  website_ranked?: string[];
  competitor_keywords?: string[];
  high_performer_expand?: string[];
  industry_context?: {
    industry: string;
    suggestions?: string;
  };
}

/**
 * 带来源标记的关键词
 */
export interface KeywordWithSource {
  keyword: string;
  translation?: string;
  intent: 'Informational' | 'Transactional' | 'Local' | 'Commercial';
  volume?: number;
  difficulty?: number;
  sources: MiningStrategyId[];
}

// ============================================
// 策略模块注册表
// ============================================

export const STRATEGY_MODULES: StrategyModule[] = [
  {
    id: 'website_content',
    name: {
      zh: '网站内容分析',
      en: 'Website Content Analysis'
    },
    description: {
      zh: '分析网站现有内容主题，发现可扩展的关键词机会',
      en: 'Analyze existing content themes to find expandable keyword opportunities'
    },
    defaultEnabled: true,
    defaultCount: 10
  },
  {
    id: 'website_ranked',
    name: {
      zh: '网站已排名词',
      en: 'Website Ranked Keywords'
    },
    description: {
      zh: '基于网站已排名的关键词，发现可以强化或扩展的关键词',
      en: 'Find keywords to strengthen or expand based on currently ranked keywords'
    },
    defaultEnabled: false,
    defaultCount: 10
  },
  {
    id: 'competitor_keywords',
    name: {
      zh: '竞对关键词',
      en: 'Competitor Keywords'
    },
    description: {
      zh: '从竞争对手覆盖但我们未覆盖的词中发现机会',
      en: 'Find opportunities from competitor coverage gaps'
    },
    defaultEnabled: false,
    defaultCount: 10
  },
  {
    id: 'high_performer_expand',
    name: {
      zh: '高表现词扩展',
      en: 'High Performer Expansion'
    },
    description: {
      zh: '基于用户标记的好词进行语义扩展（长尾、变体、问题、比较）',
      en: 'Semantically expand user-marked good keywords (long-tail, variants, questions, comparisons)'
    },
    defaultEnabled: false,
    defaultCount: 10,
    requiresData: true
  },
  {
    id: 'industry_context',
    name: {
      zh: '行业上下文',
      en: 'Industry Context'
    },
    description: {
      zh: '结合行业特点和用户建议生成关键词',
      en: 'Generate keywords based on industry and user suggestions'
    },
    defaultEnabled: false,
    defaultCount: 10,
    requiresInput: true
  }
];

// ============================================
// 工具函数
// ============================================

/**
 * 获取默认策略配置
 */
export function getDefaultStrategiesConfig(): StrategiesConfig {
  const config: StrategiesConfig = {};
  
  STRATEGY_MODULES.forEach(module => {
    config[module.id] = {
      enabled: module.defaultEnabled,
      count: module.defaultCount
    };
  });
  
  return config;
}

/**
 * 获取启用的策略列表
 */
export function getEnabledStrategies(config: StrategiesConfig): Array<{
  id: MiningStrategyId;
  count: number;
  module: StrategyModule;
  config: StrategyConfig;
}> {
  return STRATEGY_MODULES
    .filter(module => config[module.id]?.enabled)
    .map(module => ({
      id: module.id,
      count: config[module.id]?.count || module.defaultCount,
      module,
      config: config[module.id]!
    }));
}

/**
 * 验证策略配置
 */
export function validateStrategiesConfig(
  config: StrategiesConfig,
  maxTotalKeywords: number = 50
): { valid: boolean; error?: string; totalCount: number } {
  const enabledStrategies = getEnabledStrategies(config);
  
  if (enabledStrategies.length === 0) {
    return {
      valid: false,
      error: 'At least one strategy must be enabled',
      totalCount: 0
    };
  }
  
  const totalCount = enabledStrategies.reduce((sum, s) => sum + s.count, 0);
  
  if (totalCount > maxTotalKeywords) {
    return {
      valid: false,
      error: `Total keywords (${totalCount}) exceeds limit (${maxTotalKeywords})`,
      totalCount
    };
  }
  
  if (totalCount === 0) {
    return {
      valid: false,
      error: 'Total keyword count must be greater than 0',
      totalCount
    };
  }
  
  return { valid: true, totalCount };
}

/**
 * 合并和去重关键词，保留多来源标记
 */
export function mergeAndDeduplicateKeywords(
  keywords: Array<{ keyword: string; source: MiningStrategyId; [key: string]: any }>
): KeywordWithSource[] {
  const keywordMap = new Map<string, KeywordWithSource>();
  
  keywords.forEach(kw => {
    const key = kw.keyword.toLowerCase().trim();
    if (!key) return;
    
    if (keywordMap.has(key)) {
      // 合并来源
      const existing = keywordMap.get(key)!;
      if (!existing.sources.includes(kw.source)) {
        existing.sources.push(kw.source);
      }
      // 更新其他字段（如果新的有值而旧的没有）
      if (!existing.volume && kw.volume) existing.volume = kw.volume;
      if (!existing.difficulty && kw.difficulty) existing.difficulty = kw.difficulty;
    } else {
      keywordMap.set(key, {
        keyword: kw.keyword,
        translation: kw.translation,
        intent: kw.intent || 'Informational',
        volume: kw.volume,
        difficulty: kw.difficulty,
        sources: [kw.source]
      });
    }
  });
  
  return Array.from(keywordMap.values());
}

/**
 * 获取策略模块的本地化名称
 */
export function getStrategyName(id: MiningStrategyId, language: 'zh' | 'en'): string {
  const module = STRATEGY_MODULES.find(m => m.id === id);
  return module ? module.name[language] : id;
}

/**
 * 获取来源标签（用于 UI 显示）
 */
export function getSourceLabels(
  sources: MiningStrategyId[],
  language: 'zh' | 'en'
): string[] {
  return sources.map(source => getStrategyName(source, language));
}
