/**
 * Agent 2: SEO研究员
 * 
 * 职责：深度SEO研究（搜索引擎偏好、竞争对手分析）
 * 使用：Deep Dive模式 Step 1-5
 */

import { callGeminiAPI } from '../gemini.js';
import { fetchSerpResults, fetchSerpResultsBatch, type SerpData } from '../tools/serp-search.js';
import { getSEOResearcherPrompt, DEFAULT_SERP_ANALYSIS } from '../../../services/prompts/index.js';
import { KeywordData, TargetLanguage, ProbabilityLevel, SEOStrategyReport, SerpSnippet } from '../types.js';
import { SearchEngine } from '../tools/dataforseo.js';
import { getDomainOverview, getBatchDomainOverview } from '../tools/dataforseo-domain.js';
import { sql } from '../../lib/database.js';

/**
 * 辅助函数：计算蓝海信号分值 (Workflow 1)
 * 返回详细的分值分解，包括每个维度的得分和原因
 */
export function calculateBlueOceanScore(analysis: any): {
  totalScore: number;
  factors: Array<{
    name: string;
    score: number;
    reason: string;
  }>;
} {
  const factors: Array<{ name: string; score: number; reason: string }> = [];
  let totalScore = 0;

  // 1. 弱竞争者判断 (AI判断结果中包含)
  if (analysis.topDomainType === 'Forum/Social' || analysis.topDomainType === 'Weak Page') {
    const score = 30;
    totalScore += score;
    factors.push({
      name: '弱竞争者类型',
      score: score,
      reason: analysis.topDomainType === 'Forum/Social'
        ? 'Top结果主要是论坛/社交媒体页面，权威性较低'
        : 'Top结果是弱页面，优化程度不足'
    });
  }

  // 2. 内容相关性判断 (从 intentAssessment 或 intentAnalysis 提取关键词，向后兼容)
  const lowRelevanceKeywords = [
    '不相关', 'irrelevant', 'off-topic', '弱相关', 'weakly related',
    'low relevance', 'not matching', 'mismatch', '偏移', '不匹配',
    'wrong intent', '意图不符', 'mixed intent', '混合意图', '未覆盖'
  ];
  // 优先使用 intentAssessment，如果没有则使用 intentAnalysis（向后兼容）
  const intentText = analysis.intentAssessment || analysis.intentAnalysis || '';
  if (intentText && lowRelevanceKeywords.some(k => intentText.toLowerCase().includes(k))) {
    const score = 25;
    totalScore += score;
    factors.push({
      name: '内容相关性低',
      score: score,
      reason: 'SERP结果与关键词意图不匹配或相关性较弱，存在内容缺口'
    });
  }

  // 3. 内容深度与质量 (从 reasoning 提取关键词)
  const lowQualityKeywords = [
    'short', 'thin content', '字数少', '浅显', 'outdated', '过时', 'old',
    'shallow', 'basic', 'low quality', 'poorly written', '太短', '内容单薄',
    'automated', 'ai generated', 'spammy', 'lacks depth', '缺乏深度', '不够详细'
  ];
  if (analysis.reasoning && lowQualityKeywords.some(k => analysis.reasoning.toLowerCase().includes(k))) {
    const score = 20;
    totalScore += score;
    factors.push({
      name: '内容质量不足',
      score: score,
      reason: 'Top结果内容深度不足、质量较低或已过时，存在优化空间'
    });
  }

  // 4. 额外加分：如果没有直接竞争对手 (基于实际 SERP 返回结果)
  // 注意：这里基于 SERP API 实际返回的结果数量，而非 serpResultCount（该值不可靠）
  if (analysis.topSerpSnippets && Array.isArray(analysis.topSerpSnippets) && analysis.topSerpSnippets.length === 0) {
    const score = 20;
    totalScore += score;
    factors.push({
      name: '无直接竞争对手',
      score: score,
      reason: '搜索中未找到直接竞争对手，这是强蓝海信号'
    });
  }

  // 5. 考虑关键词难度 (如果有)
  const kd = analysis.difficulty ?? analysis.dataForSEOData?.difficulty ?? analysis.serankingData?.difficulty;
  if (kd !== undefined) {
    if (kd <= 20) {
      const score = 15;
      totalScore += score;
      factors.push({
        name: '关键词难度极低',
        score: score,
        reason: `关键词难度 (KD: ${kd}) 极低，竞争非常小`
      });
    } else if (kd <= 40) {
      const score = 5;
      totalScore += score;
      factors.push({
        name: '关键词难度较低',
        score: score,
        reason: `关键词难度 (KD: ${kd}) 较低，存在竞争但可接受`
      });
    }
  }

  // 限制最大分数为 100
  totalScore = Math.min(totalScore, 100);

  return {
    totalScore,
    factors
  };
}

/**
 * 辅助函数：计算“大鱼吃小鱼”概率 (Workflow 3)
 */
export function calculateOutrankProbability(
  websiteDR: number,
  competitorDRs: number[],
  relevanceScore: number = 0.5
): {
  canOutrankPositions: number[];
  top3Probability: ProbabilityLevel;
  top10Probability: ProbabilityLevel;
  finalProbability: ProbabilityLevel;
} {
  const canOutrankPositions: number[] = [];

  // competitorDRs格式：[第1名DR, 第5名DR, 第10名DR]
  // 对应的位置：[1, 5, 10]
  const positions = [1, 5, 10];

  // 分别对比第1名、第5名、第10名，判断哪些位置可以超越
  competitorDRs.forEach((dr, index) => {
    if (dr === 0) return; // 跳过未获取到DR的值

    const position = positions[index];
    const drGap = dr - websiteDR;

    // 只要 DR 差距在一定范围内，且网站 DR 较高或内容相关性极高，就有机会
    if (websiteDR >= dr - 5 || (relevanceScore > 0.85 && drGap <= 35) || (relevanceScore > 0.95 && drGap <= 50)) {
      canOutrankPositions.push(position);
    }
  });

  // 不计算概率，只返回对比结果（保留字段以保持向后兼容）
  return {
    canOutrankPositions,
    top3Probability: ProbabilityLevel.LOW, // 不再使用，保留仅为兼容
    top10Probability: ProbabilityLevel.LOW, // 不再使用，保留仅为兼容
    finalProbability: ProbabilityLevel.LOW // 不再使用，保留仅为兼容
  };
}

/**
 * 搜索引擎偏好分析结果（Markdown格式）
 */
export interface SearchPreferencesResult {
  // 主要使用结构化字段，markdown字段已废弃（保留仅为兼容）
  semantic_landscape?: string;
  engine_strategies?: {
    google?: {
      ranking_logic?: string;
      content_gap?: string;
      action_item?: string;
    };
    perplexity?: {
      citation_logic?: string;
      structure_hint?: string;
    };
    generative_ai?: {
      llm_preference?: string;
    };
  };
  geo_recommendations?: string;
  searchPreferences?: {
    google?: {
      rankingFactors?: string[];
      contentPreferences?: string;
      optimizationStrategy?: string;
    };
    chatgpt?: {
      rankingFactors?: string[];
      contentPreferences?: string;
      optimizationStrategy?: string;
    };
    claude?: {
      rankingFactors?: string[];
      contentPreferences?: string;
      optimizationStrategy?: string;
    };
    perplexity?: {
      rankingFactors?: string[];
      contentPreferences?: string;
      optimizationStrategy?: string;
    };
  };
}

/**
 * 竞争对手分析结果（Markdown格式）
 */
export interface CompetitorAnalysisResult {
  markdown: string;  // Markdown格式的完整分析
  // 保留向后兼容的字段（可选）
  competitor_benchmark?: Array<{
    domain?: string;
    content_angle?: string;
    weakness?: string;
  }>;
  winning_formula?: string;
  recommended_structure?: string[];
  competitorAnalysis?: {
    top10?: Array<{
      url?: string;
      title?: string;
      structure?: string[];
      wordCount?: number;
      contentGaps?: string[];
    }>;
    commonPatterns?: string[];
    contentGaps?: string[];
    recommendations?: string[];
  };
}

/**
 * 提取JSON内容
 */
function extractJSON(text: string): string {
  if (!text) return '{}';

  // 移除 Markdown 代码块标记
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // 移除可能的 Markdown 格式标记（如 ** 等）
  // 但保留 JSON 内部的字符串内容
  // 先尝试找到 JSON 对象或数组
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    let extracted = jsonMatch[1];
    // 如果提取的内容前后还有 Markdown 标记，尝试清理
    // 但要注意不要破坏 JSON 内部的字符串
    return extracted.trim();
  }

  // 如果没有找到 JSON，尝试移除开头的 Markdown 标记
  // 查找第一个 { 或 [
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  if (firstBrace !== -1 || firstBracket !== -1) {
    const startIdx = firstBrace !== -1 && firstBracket !== -1
      ? Math.min(firstBrace, firstBracket)
      : (firstBrace !== -1 ? firstBrace : firstBracket);

    // 从第一个 { 或 [ 开始，找到匹配的 } 或 ]
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;

        if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
          return text.substring(startIdx, i + 1).trim();
        }
      }
    }
  }

  return text.trim() || '{}';
}

/**
 * 分析搜索引擎偏好
 * 
 * 分析目标关键词在不同搜索引擎（Google、ChatGPT、Claude、Perplexity）中的排名机制和优化策略
 * 
 * @param keyword - 目标关键词
 * @param language - 语言代码（'zh' | 'en'）
 * @param targetLanguage - 目标语言（用于SERP搜索）
 * @returns 搜索引擎偏好分析结果
 */
export async function analyzeSearchPreferences(
  keyword: string,
  language: 'zh' | 'en' = 'en',
  targetLanguage: TargetLanguage = 'en',
  targetMarket: string = 'global',
  onSearchResults?: (results: Array<{ title: string; url: string; snippet?: string }>) => void,
  onProgress?: (message: string) => void
): Promise<SearchPreferencesResult> {
  try {
    // 构建市场标签
    const marketLabel = targetMarket === 'global'
      ? (language === 'zh' ? '全球市场' : 'Global Market')
      : targetMarket.toUpperCase();

    // 从 prompts 文件获取 system instruction 和 prompt
    const systemInstruction = getSEOResearcherPrompt('searchPreferences', language) as string;
    const prompt = getSEOResearcherPrompt('searchPreferences', language, {
      keyword,
      targetLanguage,
      marketLabel
    }) as string;

    onProgress?.(language === 'zh' ? `🤖 正在分析 ${marketLabel} 市场的搜索引擎偏好...` : `🤖 Analyzing search engine preferences for ${marketLabel} market...`);

    // 调用 Gemini API（使用 JSON 模式）
    const response = await callGeminiAPI(prompt, systemInstruction, {

      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          semantic_landscape: { type: 'string' },
          engine_strategies: {
            type: 'object',
            properties: {
              google: {
                type: 'object',
                properties: {
                  ranking_logic: { type: 'string' },
                  content_gap: { type: 'string' },
                  action_item: { type: 'string' }
                }
              },
              perplexity: {
                type: 'object',
                properties: {
                  citation_logic: { type: 'string' },
                  structure_hint: { type: 'string' }
                }
              },
              generative_ai: {
                type: 'object',
                properties: {
                  llm_preference: { type: 'string' }
                }
              }
            }
          },
          searchPreferences: {
            type: 'object',
            properties: {
              google: {
                type: 'object',
                properties: {
                  rankingFactors: { type: 'array', items: { type: 'string' } },
                  contentPreferences: { type: 'string' },
                  optimizationStrategy: { type: 'string' }
                }
              },
              chatgpt: {
                type: 'object',
                properties: {
                  rankingFactors: { type: 'array', items: { type: 'string' } },
                  contentPreferences: { type: 'string' },
                  optimizationStrategy: { type: 'string' }
                }
              },
              claude: {
                type: 'object',
                properties: {
                  rankingFactors: { type: 'array', items: { type: 'string' } },
                  contentPreferences: { type: 'string' },
                  optimizationStrategy: { type: 'string' }
                }
              },
              perplexity: {
                type: 'object',
                properties: {
                  rankingFactors: { type: 'array', items: { type: 'string' } },
                  contentPreferences: { type: 'string' },
                  optimizationStrategy: { type: 'string' }
                }
              }
            }
          },
          geo_recommendations: { type: 'string' }
        },
        required: ['semantic_landscape', 'engine_strategies']
      },
      onRetry: (attempt, error, delay) => {
        onProgress?.(language === 'zh'
          ? `⚠️ 搜索引擎偏好分析异常 (尝试 ${attempt}/3)，正在 ${delay}ms 后重试...`
          : `⚠️ Search preferences analysis error (attempt ${attempt}/3), retrying in ${delay}ms...`);
      }
    });

    // 提取并解析 JSON - 强制返回JSON格式
    let text = response?.text || '{}';
    text = extractJSONRobust(text);

    try {
      const parsed = JSON.parse(text);
      // 强制返回JSON格式，移除markdown字段，直接返回结构化数据
      // 确保所有必需字段都存在
      const result: SearchPreferencesResult = {
        semantic_landscape: parsed.semantic_landscape || '',
        engine_strategies: parsed.engine_strategies || {},
        geo_recommendations: parsed.geo_recommendations || '',
        searchPreferences: parsed.searchPreferences || {}
      };
      return result;
    } catch (parseError: any) {
      console.error('[Agent 2] Failed to parse search preferences JSON:', parseError);
      console.error('[Agent 2] Response text:', text.substring(0, 500));
      // 返回默认JSON结构（而不是markdown字符串）
      const defaultMessage = language === 'zh'
        ? `关键词 "${keyword}" 在 ${marketLabel} 市场的搜索引擎偏好分析。`
        : `Search preferences analysis for "${keyword}" in ${marketLabel} market.`;
      return {
        semantic_landscape: defaultMessage,
        engine_strategies: {},
        geo_recommendations: '',
        searchPreferences: {}
      };
    }
  } catch (error: any) {
    console.error('Analyze Search Preferences Error:', error);
    throw new Error(`Failed to analyze search preferences: ${error.message}`);
  }
}

/**
 * 分析竞争对手
 * 
 * 通过分析SERP结果，识别Top 10竞争对手的内容结构、弱点和机会
 * 
 * @param keyword - 目标关键词
 * @param serpData - SERP搜索结果数据（可选，如果不提供会自动获取）
 * @param language - 语言代码（'zh' | 'en'）
 * @param targetLanguage - 目标语言（用于SERP搜索）
 * @returns 竞争对手分析结果
 */
export async function analyzeCompetitors(
  keyword: string,
  serpData?: SerpData,
  language: 'zh' | 'en' = 'en',
  targetLanguage: TargetLanguage = 'en',
  targetMarket: string = 'global',
  searchEngine: SearchEngine = 'google',
  onSearchResults?: (results: Array<{ title: string; url: string; snippet?: string }>) => void,
  onProgress?: (message: string) => void
): Promise<CompetitorAnalysisResult> {
  try {
    // 如果没有提供 SERP 数据，则获取
    let serpResults = serpData;
    if (!serpResults) {
      onProgress?.(language === 'zh' ? `📡 正在抓取 ${searchEngine} 搜索结果以进行竞争对手分析...` : `📡 Fetching ${searchEngine} SERP for competitor analysis...`);
      serpResults = await fetchSerpResults(keyword, targetLanguage, searchEngine);
    }

    // 构建 SERP 结果上下文 (Snippet based)
    const serpSnippetsContext = serpResults.results && serpResults.results.length > 0
      ? serpResults.results.slice(0, 10).map((r, i) =>
        `${i + 1}. [${r.title}](${r.url})\n   Snippet: ${r.snippet}`
      ).join('\n\n')
      : 'No SERP results available.';

    // 不使用深度抓取，仅基于 SERP snippets 进行分析
    const deepContentContext = '';

    // 构建市场标签
    const marketLabel = targetMarket === 'global'
      ? (language === 'zh' ? '全球市场' : 'Global Market')
      : targetMarket.toUpperCase();

    // 从 prompts 文件获取 system instruction 和 prompt
    const systemInstruction = getSEOResearcherPrompt('competitorAnalysis', language) as string;
    const prompt = getSEOResearcherPrompt('competitorAnalysis', language, {
      keyword,
      targetLanguage,
      marketLabel,
      serpSnippetsContext,
      deepContentContext
    }) as string;

    onProgress?.(language === 'zh' ? `🤖 正在调用 AI 进行深度竞争对手分析...` : `🤖 Calling AI for deep competitor analysis...`);

    // 调用 Gemini API（使用 JSON 模式）
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          winning_formula: { type: 'string' },
          recommended_structure: { type: 'array', items: { type: 'string' } },
          competitor_benchmark: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                domain: { type: 'string' },
                content_angle: { type: 'string' },
                weakness: { type: 'string' }
              }
            }
          },
          competitorAnalysis: {
            type: 'object',
            properties: {
              top10: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    title: { type: 'string' },
                    structure: { type: 'array', items: { type: 'string' } },
                    wordCount: { type: 'number' },
                    contentGaps: { type: 'array', items: { type: 'string' } }
                  }
                }
              },
              commonPatterns: { type: 'array', items: { type: 'string' } },
              contentGaps: { type: 'array', items: { type: 'string' } },
              recommendations: { type: 'array', items: { type: 'string' } }
            }
          },
          markdown: { type: 'string' }
        },
        required: ['markdown']
      },
      onRetry: (attempt, error, delay) => {
        onProgress?.(language === 'zh'
          ? `⚠️ AI 竞争对手分析异常 (尝试 ${attempt}/3)，正在 ${delay}ms 后重试...`
          : `⚠️ AI competitor analysis error (attempt ${attempt}/3), retrying in ${delay}ms...`);
      }
    });

    // 提取并解析 JSON
    let text = response?.text || '{}';
    text = extractJSONRobust(text);

    try {
      const parsed = JSON.parse(text);
      // 确保 markdown 字段存在，如果没有则从其他字段生成
      if (!parsed.markdown) {
        parsed.markdown = JSON.stringify(parsed, null, 2);
      }
      return parsed as CompetitorAnalysisResult;
    } catch (parseError: any) {
      console.error('[Agent 2] Failed to parse competitor analysis JSON:', parseError);
      console.error('[Agent 2] Response text:', text.substring(0, 500));
      // 返回默认结构
      return {
        markdown: text || `Competitor analysis for "${keyword}" in ${marketLabel} market.`
      };
    }
  } catch (error: any) {
    console.error('Analyze Competitors Error:', error);
    throw new Error(`Failed to analyze competitors: ${error.message}`);
  }
}

function getLanguageName(code: TargetLanguage): string {
  switch (code) {
    case 'en': return 'English';
    case 'fr': return 'French';
    case 'ru': return 'Russian';
    case 'ja': return 'Japanese';
    case 'ko': return 'Korean';
    case 'pt': return 'Portuguese';
    case 'id': return 'Indonesian';
    case 'es': return 'Spanish';
    case 'ar': return 'Arabic';
    case 'zh': return 'Chinese';
    default: return 'English';
  }
}

function extractJSONRobust(text: string): string {
  if (!text) return '{}';

  // 移除 Markdown 代码块标记
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // 移除可能的 Markdown 格式标记（如 ** 等）在 JSON 外部
  // 先尝试找到 JSON 对象或数组
  // 注意：不使用贪婪匹配，而是直接查找第一个 { 或 [，然后使用括号匹配来提取完整 JSON
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let extracted: string | null = null;

  if (firstBrace !== -1 || firstBracket !== -1) {
    // 使用括号匹配方法提取完整 JSON（更可靠）
    const startIdx = firstBrace !== -1 && firstBracket !== -1
      ? Math.min(firstBrace, firstBracket)
      : (firstBrace !== -1 ? firstBrace : firstBracket);

    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = startIdx; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;

        if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
          extracted = text.substring(startIdx, i + 1);
          break;
        }
      }
    }
  }

  // 如果括号匹配失败，回退到正则表达式匹配（但可能匹配到不完整的 JSON）
  if (!extracted) {
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      extracted = jsonMatch[1];
    }
  }

  if (extracted) {

    // 使用更精确的方法提取完整的 JSON
    // 查找第一个 { 或 [
    const firstBrace = extracted.indexOf('{');
    const firstBracket = extracted.indexOf('[');

    if (firstBrace !== -1 || firstBracket !== -1) {
      const startIdx = firstBrace !== -1 && firstBracket !== -1
        ? Math.min(firstBrace, firstBracket)
        : (firstBrace !== -1 ? firstBrace : firstBracket);

      // 从第一个 { 或 [ 开始，找到匹配的 } 或 ]
      let braceCount = 0;
      let bracketCount = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = startIdx; i < extracted.length; i++) {
        const char = extracted[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;

          if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
            return extracted.substring(startIdx, i + 1).trim();
          }
        }
      }

      // 如果括号匹配失败（可能是 JSON 被截断），尝试修复截断的 JSON
      // 检查是否有未闭合的括号
      if (braceCount > 0 || bracketCount > 0) {
        // JSON 可能被截断，尝试添加缺失的闭合括号
        let fixedExtracted = extracted.substring(startIdx);
        if (bracketCount > 0) {
          fixedExtracted += ']'.repeat(bracketCount);
        }
        if (braceCount > 0) {
          fixedExtracted += '}'.repeat(braceCount);
        }
        return fixedExtracted.trim();
      }
    }

    return extracted.trim();
  }

  return text.trim() || '{}';
}

/**
 * 修复截断的 JSON，特别是处理未闭合的字符串
 * 这个函数会尝试修复字符串被截断的情况
 */
function fixTruncatedJSON(text: string): string {
  if (!text || text.trim() === '') return '{}';

  let fixed = text.trim();
  let inString = false;
  let escapeNext = false;
  let lastStringStart = -1;
  let braceCount = 0;
  let bracketCount = 0;

  // 找到第一个 {
  const firstBrace = fixed.indexOf('{');
  if (firstBrace === -1) return fixed;

  // 从第一个 { 开始扫描
  for (let i = firstBrace; i < fixed.length; i++) {
    const char = fixed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      if (!inString) {
        inString = true;
        lastStringStart = i;
      } else {
        inString = false;
        lastStringStart = -1;
      }
      continue;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
  }

  // 如果字符串未闭合，尝试修复
  if (inString && lastStringStart !== -1) {
    // 找到字符串开始的位置，尝试找到合理的结束位置
    // 如果字符串在字段值中，添加闭合引号
    const beforeString = fixed.substring(0, lastStringStart);
    const afterStringStart = fixed.substring(lastStringStart);

    // 检查是否是字段值（前面有 :）
    const colonIndex = beforeString.lastIndexOf(':');
    if (colonIndex !== -1) {
      // 这是一个字段值，添加闭合引号
      fixed = fixed.substring(0, fixed.length) + '"';
    }
  }

  // 修复未闭合的括号
  if (bracketCount > 0) {
    fixed += ']'.repeat(bracketCount);
  }
  if (braceCount > 0) {
    // 在添加闭合括号之前，确保最后一个字段有正确的格式
    // 如果最后一个字符不是 } 或 ]，可能需要添加逗号或闭合引号
    const lastChar = fixed[fixed.length - 1];
    if (lastChar !== '"' && lastChar !== '}' && lastChar !== ']' && lastChar !== '[') {
      // 可能是一个未闭合的字符串或字段，尝试修复
      if (!fixed.endsWith('"')) {
        fixed += '"';
      }
    }
    fixed += '}'.repeat(braceCount);
  }

  return fixed;
}

/**
 * 尝试从截断的 JSON 中提取部分字段
 * 返回一个包含已解析字段的对象
 * 优化版本：能处理字符串被截断的情况
 */
function extractPartialJSON(text: string): any {
  const partial: any = {};

  // 尝试提取关键字段 - 使用更宽松的正则表达式处理截断情况
  const probabilityMatch = text.match(/"probability"\s*:\s*"([^"]*)"?/);
  if (probabilityMatch && probabilityMatch[1]) {
    partial.probability = probabilityMatch[1];
  }

  // reasoning 可能被截断，提取到文本末尾的所有内容
  const reasoningMatch = text.match(/"reasoning"\s*:\s*"([^"]*)/);
  if (reasoningMatch) {
    // 提取从 "reasoning": " 开始到文本末尾或下一个引号的所有内容
    const reasoningStart = reasoningMatch.index! + reasoningMatch[0].length;
    let reasoningEnd = text.length;
    // 查找下一个未转义的引号或文本末尾
    for (let i = reasoningStart; i < text.length; i++) {
      if (text[i] === '"' && (i === reasoningStart || text[i - 1] !== '\\')) {
        reasoningEnd = i;
        break;
      }
    }
    partial.reasoning = text.substring(reasoningStart, reasoningEnd).trim();
  }

  // 优先提取 intentAssessment（新格式）
  const intentAssessmentMatch = text.match(/"intentAssessment"\s*:\s*"([^"]*)/);
  if (intentAssessmentMatch) {
    const start = intentAssessmentMatch.index! + intentAssessmentMatch[0].length;
    let end = text.length;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '"' && (i === start || text[i - 1] !== '\\')) {
        end = i;
        break;
      }
    }
    partial.intentAssessment = text.substring(start, end).trim();
  }

  // 向后兼容：如果没有 intentAssessment，尝试提取 searchIntent 和 intentAnalysis
  if (!partial.intentAssessment) {
    const searchIntentMatch = text.match(/"searchIntent"\s*:\s*"([^"]*)/);
    if (searchIntentMatch) {
      const start = searchIntentMatch.index! + searchIntentMatch[0].length;
      let end = text.length;
      for (let i = start; i < text.length; i++) {
        if (text[i] === '"' && (i === start || text[i - 1] !== '\\')) {
          end = i;
          break;
        }
      }
      partial.searchIntent = text.substring(start, end).trim();
    }

    const intentAnalysisMatch = text.match(/"intentAnalysis"\s*:\s*"([^"]*)/);
    if (intentAnalysisMatch) {
      const start = intentAnalysisMatch.index! + intentAnalysisMatch[0].length;
      let end = text.length;
      for (let i = start; i < text.length; i++) {
        if (text[i] === '"' && (i === start || text[i - 1] !== '\\')) {
          end = i;
          break;
        }
      }
      partial.intentAnalysis = text.substring(start, end).trim();
    }
  }

  const serpResultCountMatch = text.match(/"serpResultCount"\s*:\s*(-?\d+)/);
  if (serpResultCountMatch) {
    partial.serpResultCount = parseInt(serpResultCountMatch[1], 10);
  }

  const topDomainTypeMatch = text.match(/"topDomainType"\s*:\s*"([^"]*)"?/);
  if (topDomainTypeMatch && topDomainTypeMatch[1]) {
    partial.topDomainType = topDomainTypeMatch[1];
  }

  return partial;
}

/**
 * Analyze Ranking Probability
 * Updated to support "Big fish eats small fish" and explicit scoring
 */
export const analyzeRankingProbability = async (
  keywords: KeywordData[],
  systemInstruction: string,
  uiLanguage: 'zh' | 'en' = 'en',
  targetLanguage: TargetLanguage = 'en',
  websiteUrl?: string,
  websiteDR?: number,
  searchEngine: SearchEngine = 'google',
  onProgress?: (message: string) => void,
  websiteId?: string, // 可选：用于查询缓存
  industry?: string // 可选：用户选择的精确行业，用于过滤SERP结果
): Promise<KeywordData[]> => {
  const uiLangName = uiLanguage === 'zh' ? 'Chinese' : 'English';
  const engineName = searchEngine.charAt(0).toUpperCase() + searchEngine.slice(1);

  // 检查缓存（优化：避免重复分析已在系统中分析过的关键词，无论是否有 websiteId）
  let keywordsFromCache: KeywordData[] = [];
  let keywordsToAnalyze: KeywordData[] = [];

  if (keywords.length > 0) {
    try {
      const { getDataForSEOLocationAndLanguage } = await import('../tools/dataforseo.js');
      const { locationCode } = getDataForSEOLocationAndLanguage(targetLanguage);
      const { getKeywordAnalysisCacheBatch } = await import('../../lib/database.js');

      const cacheMap = await getKeywordAnalysisCacheBatch(
        keywords.map(k => k.keyword),
        locationCode,
        searchEngine,
        websiteId
      );

      console.log(`[Agent 2] Found ${cacheMap.size} cached analysis results for ${keywords.length} keywords`);

      // 分离有缓存和没有缓存的关键词
      for (const keyword of keywords) {
        const cached = cacheMap.get(keyword.keyword.toLowerCase());

        // 如果缓存中有完整的 Agent 2 分析结果（相同市场/引擎），直接使用
        if (cached && cached.agent2_probability && cached.agent2_reasoning) {
          // 使用缓存中的 DataForSEO 数据
          if (cached.dataforseo_is_data_found) {
            keyword.dataForSEOData = {
              volume: cached.dataforseo_volume || 0,
              difficulty: cached.dataforseo_difficulty || null,
              cpc: cached.dataforseo_cpc || null,
              competition: cached.dataforseo_competition || null,
              history_trend: cached.dataforseo_history_trend || null,
              is_data_found: cached.dataforseo_is_data_found,
            };
            keyword.serankingData = {
              is_data_found: cached.dataforseo_is_data_found,
              volume: cached.dataforseo_volume || 0,
              cpc: cached.dataforseo_cpc || null,
              competition: cached.dataforseo_competition || null,
              difficulty: cached.dataforseo_difficulty || null,
              history_trend: cached.dataforseo_history_trend || null,
            };
            keyword.volume = cached.dataforseo_volume || keyword.volume || 0;
          }

          // 使用缓存中的分析结果
          keyword.probability = cached.agent2_probability as any;
          keyword.searchIntent = cached.agent2_search_intent;
          keyword.intentAnalysis = cached.agent2_intent_analysis;
          keyword.intentAssessment = cached.agent2_intent_analysis || cached.agent2_search_intent; // 向后兼容
          keyword.reasoning = cached.agent2_reasoning;
          keyword.topDomainType = cached.agent2_top_domain_type as any;
          keyword.serpResultCount = cached.agent2_serp_result_count;
          keyword.topSerpSnippets = cached.agent2_top_serp_snippets || [];
          (keyword as any).blueOceanScore = cached.agent2_blue_ocean_score;
          (keyword as any).blueOceanScoreBreakdown = cached.agent2_blue_ocean_breakdown;
          (keyword as any).websiteDR = cached.website_dr;
          (keyword as any).competitorDRs = cached.competitor_drs;
          (keyword as any).top3Probability = cached.top3_probability;
          (keyword as any).top10Probability = cached.top10_probability;
          (keyword as any).canOutrankPositions = cached.can_outrank_positions;

          keywordsFromCache.push(keyword);
          console.log(`[Agent 2] Using cached analysis for "${keyword.keyword}" (probability: ${cached.agent2_probability})`);
        } else {
          keywordsToAnalyze.push(keyword);
        }
      }

      // 如果所有关键词都来自缓存，直接返回
      if (keywordsFromCache.length === keywords.length) {
        onProgress?.(uiLanguage === 'zh'
          ? `✅ 所有 ${keywords.length} 个关键词都使用了缓存的分析结果（无需重新分析）`
          : `✅ All ${keywords.length} keywords used cached analysis results (no re-analysis needed)`);
        return keywordsFromCache;
      }

      // 如果有部分关键词来自缓存，记录日志
      if (keywordsFromCache.length > 0) {
        onProgress?.(uiLanguage === 'zh'
          ? `✅ ${keywordsFromCache.length} 个关键词使用了缓存结果，${keywordsToAnalyze.length} 个需要重新分析`
          : `✅ ${keywordsFromCache.length} keywords used cached results, ${keywordsToAnalyze.length} need re-analysis`);
        // 使用剩余的关键词继续分析
        keywords = keywordsToAnalyze;
      }
    } catch (cacheError: any) {
      console.warn(`[Agent 2] Cache check failed: ${cacheError.message}, proceeding with full analysis`);
      // 缓存检查失败，继续正常分析所有关键词
      keywordsToAnalyze = keywords;
    }
  } else {
    // 没有 keywords，正常分析所有关键词
    keywordsToAnalyze = keywords;
  }

  // OPTIMIZED: Automatically select language-appropriate system instruction
  // If the provided systemInstruction matches the default English version, replace it with the appropriate language version
  // This ensures AI outputs in the correct language (Chinese or English) based on UI language setting
  let finalSystemInstruction = systemInstruction;
  const defaultEnPrompt = DEFAULT_SERP_ANALYSIS.en.trim();
  const isDefaultPrompt = systemInstruction.trim() === defaultEnPrompt ||
    systemInstruction.includes('You are a Google SERP Analysis AI Expert');

  if (isDefaultPrompt && uiLanguage === 'zh') {
    // Use Chinese version of the prompt for Chinese UI
    finalSystemInstruction = DEFAULT_SERP_ANALYSIS.zh.trim();
  } else if (isDefaultPrompt && uiLanguage === 'en') {
    // Ensure English version is used for English UI
    finalSystemInstruction = defaultEnPrompt;
  }
  // If it's a custom prompt, keep it as-is (user may have customized it in English)

  // 如果提供了网站URL但没提供DR，尝试从缓存获取网站自身的DR，不再自动调用 API
  let siteDR = websiteDR;
  if (websiteUrl && siteDR === undefined) {
    try {
      if (websiteId) {
        console.log(`[Agent 2] Checking cache for target website DR: ${websiteId}`);
        const cacheResult = await sql`
          SELECT backlinks_info
          FROM domain_overview_cache
          WHERE website_id = ${websiteId}
          ORDER BY data_date DESC
          LIMIT 1
        `;

        if (cacheResult.rows.length > 0) {
          const row = cacheResult.rows[0];
          // 如果 backlinks_info 是字符串，解析它
          const backlinksInfo = typeof row.backlinks_info === 'string'
            ? JSON.parse(row.backlinks_info)
            : row.backlinks_info;

          const referringDomains = backlinksInfo?.referringDomains || 0;
          siteDR = Math.min(Math.round(Math.log10(referringDomains + 1) * 15), 100);
          console.log(`[Agent 2] Loaded site DR from cache: ${siteDR}`);
        } else {
          console.log(`[Agent 2] No cached domain overview found for ${websiteId}, skipping DR estimation.`);
        }
      } else {
        console.log(`[Agent 2] No websiteId provided, cannot check cache for DR.`);
      }
    } catch (e) {
      console.warn(`[Agent 2] Failed to get site DR from cache:`, e);
    }
  }

  // 优化版本：使用预获取的 SERP 和 DR 数据进行分析
  const analyzeSingleKeywordWithPreFetchedData = async (
    keywordData: KeywordData,
    serpData: SerpData | undefined,
    allDomainsDRMap: Map<string, number>
  ): Promise<KeywordData> => {
    // 使用预获取的 SERP 数据
    let serpResults: any[] = [];
    let serpResultCount = -1;

    if (serpData) {
      serpResults = serpData.results || [];
      serpResultCount = serpData.totalResults || -1;
    }

    // 从预获取的 DR Map 中提取竞争对手 DR 值（优化：只取第1名、第5名、第10名）
    // competitorDRs数组格式：[第1名DR, 第5名DR, 第10名DR]
    let competitorDRs: number[] = [];
    if (serpResults.length > 0) {
      const drValues: number[] = [];
      // 提取第1名、第5名、第10名的DR值
      if (serpResults.length > 0 && serpResults[0]?.url) {
        const domain = serpResults[0].url.replace(/^https?:\/\//, '').split('/')[0];
        const dr = allDomainsDRMap.get(domain) || 0;
        if (dr > 0) drValues.push(dr);
      }
      if (serpResults.length >= 5 && serpResults[4]?.url) {
        const domain = serpResults[4].url.replace(/^https?:\/\//, '').split('/')[0];
        const dr = allDomainsDRMap.get(domain) || 0;
        if (dr > 0) drValues.push(dr);
      }
      if (serpResults.length >= 10 && serpResults[9]?.url) {
        const domain = serpResults[9].url.replace(/^https?:\/\//, '').split('/')[0];
        const dr = allDomainsDRMap.get(domain) || 0;
        if (dr > 0) drValues.push(dr);
      }

      // 存储第1名、第5名、第10名的DR值
      competitorDRs = drValues;
    }

    // 继续使用原有的分析逻辑...
    return await continueAnalysisWithSerpAndDR(keywordData, serpResults, serpResultCount, competitorDRs, industry);
  };

  // 原有版本：串行获取 SERP 和 DR（保留作为备用）
  const analyzeSingleKeyword = async (keywordData: KeywordData): Promise<KeywordData> => {
    onProgress?.(uiLanguage === 'zh'
      ? `🔍 [${keywordData.keyword}] 开始深度分析...`
      : `🔍 [${keywordData.keyword}] Starting deep analysis...`);

    // Step 1: Fetch real Google SERP results
    let serpData;
    let serpResults: any[] = [];
    let serpResultCount = -1;

    try {
      onProgress?.(uiLanguage === 'zh'
        ? `📡 [${keywordData.keyword}] 正在抓取 ${searchEngine} 实时搜索结果...`
        : `📡 [${keywordData.keyword}] Fetching ${searchEngine} real-time SERP...`);

      serpData = await fetchSerpResults(keywordData.keyword, targetLanguage, searchEngine);
      serpResults = serpData.results || [];
      serpResultCount = serpData.totalResults || -1;

      onProgress?.(uiLanguage === 'zh'
        ? `✅ [${keywordData.keyword}] 已获取 ${serpResults.length} 条搜索结果`
        : `✅ [${keywordData.keyword}] Fetched ${serpResults.length} search results`);
    } catch (error: any) {
      console.warn(`[Agent 2] Failed to fetch ${searchEngine} SERP for ${keywordData.keyword}:`, error.message);
    }

    // Step 1.5: Fetch DR for Top competitors (优化：只获取第1名、第5名、第10名，节省70%成本)
    let competitorDRs: number[] = [];
    if (serpResults.length > 0) {
      try {
        onProgress?.(uiLanguage === 'zh'
          ? `🛡️ [${keywordData.keyword}] 正在评估竞争对手的域名权威度 (DR)...`
          : `🛡️ [${keywordData.keyword}] Assessing Domain Rating (DR) for competitors...`);

        const drFetchStart = Date.now();
        // 优化：只获取第1名、第5名、第10名（如果存在）的域名
        const domainsToFetch: string[] = [];
        if (serpResults.length > 0 && serpResults[0]?.url) {
          domainsToFetch.push(serpResults[0].url);
        }
        if (serpResults.length >= 5 && serpResults[4]?.url) {
          domainsToFetch.push(serpResults[4].url);
        }
        if (serpResults.length >= 10 && serpResults[9]?.url) {
          domainsToFetch.push(serpResults[9].url);
        }

        if (domainsToFetch.length > 0) {
          const domainMap = await getBatchDomainOverview(domainsToFetch);
          const drValues: number[] = [];
          domainsToFetch.forEach(url => {
            const domain = url.replace(/^https?:\/\//, '').split('/')[0];
            const dr = (domainMap.get(domain) as any)?.dr || 0;
            if (dr > 0) drValues.push(dr);
          });

          // 存储第1名、第5名、第10名的DR值
          competitorDRs = drValues;
        }

        onProgress?.(uiLanguage === 'zh'
          ? `✅ [${keywordData.keyword}] 竞争对手权威度评估完成`
          : `✅ [${keywordData.keyword}] Competitor DR assessment completed`);
      } catch (e) {
        console.warn(`[Agent 2] Failed to fetch competitor DRs:`, e);
      }
    }

    return await continueAnalysisWithSerpAndDR(keywordData, serpResults, serpResultCount, competitorDRs, industry);
  };

  // 提取共同的分析逻辑
  const continueAnalysisWithSerpAndDR = async (
    keywordData: KeywordData,
    serpResults: any[],
    serpResultCount: number,
    competitorDRs: number[],
    industry?: string
  ): Promise<KeywordData> => {
    // 记录分析开始时间，用于性能统计
    const keywordStartTime = Date.now();

    // Step 2: Build system instruction with real SERP data
    // OPTIMIZED: Reduced from Top 5 to Top 3, removed verbose warnings
    const maxSerpResults = 3; // 只使用前3个结果 (优化：从5减到3)
    const isBlueOceanMode = siteDR === undefined;

    const serpContext = serpResults.length > 0
      ? `\n\nTOP ${maxSerpResults} ${engineName} RESULTS for "${keywordData.keyword}":\n${serpResults.slice(0, maxSerpResults).map((r, i) => {
        if (!r) return `${i + 1}. [No data]`;
        const drInfo = (!isBlueOceanMode && competitorDRs[i] !== undefined) ? ` [DR:${competitorDRs[i]}]` : '';
        return `${i + 1}. ${r.title || '[No title]'} | ${r.url || '[No URL]'}${drInfo}`;
      }).join('\n')}${!isBlueOceanMode && siteDR !== undefined ? `\n\nYour DR: ${siteDR}` : ''}`
      : `\n\nNote: SERP data unavailable.`;

    // Add DataForSEO data context if available (use dataForSEOData or serankingData for backward compatibility)
    // OPTIMIZED: Reduced verbose explanations to single-line format
    const dataForSEOData = (keywordData as any).dataForSEOData || keywordData.serankingData;
    const dataForSEOContext = dataForSEOData && dataForSEOData.is_data_found
      ? `\n\nKEYWORD DATA: Vol=${dataForSEOData.volume || 'N/A'}, KD=${dataForSEOData.difficulty || 'N/A'}, CPC=$${dataForSEOData.cpc || 'N/A'}`
      : dataForSEOData
        ? `\n\nKEYWORD DATA: No data (for non-English, this is normal - verify with SERP)`
        : ``;

    // OPTIMIZED: Removed topSerpSnippets and serpResultCount from AI output
    // These fields are populated from real SERP data after AI response (see lines 1520-1533)
    // This reduces token consumption, improves response speed, and eliminates potential inconsistencies
    // OPTIMIZED: Use language-appropriate system instruction and enforce language-specific output
    const outputLanguageInstruction = uiLanguage === 'zh'
      ? '重要：所有输出内容必须使用中文。包括 intentAssessment 和 reasoning 字段的内容都必须用中文编写。'
      : 'IMPORTANT: All output content must be in English. Both intentAssessment and reasoning fields must be written in English.';

    // 如果提供了精确行业，添加行业过滤指导
    const industryFilterInstruction = industry
      ? (uiLanguage === 'zh'
        ? `\n\n# 精确行业过滤
用户选择的精确行业是：**${industry}**。

**关键要求**：在分析SERP结果时，**只关注与"${industry}"相关的结果**，忽略其他行业的权威网站（如电商网站的商品页、其他行业的专业网站等）。

**分析原则**：
1. 即使其他行业有高权威网站（如电商、新闻、其他专业网站），也不应影响目标行业"${industry}"的上首页概率评估
2. 只评估与"${industry}"行业相关的SERP结果的竞争强度
3. 如果SERP结果主要是其他行业的内容（即使这些网站权威性很高），这实际上是**高概率上首页的机会**（因为目标行业竞争较弱）
4. 示例：如果关键词是"S16霸王龙95"，行业是"云顶之弈游戏"，即使SERP中有电商网站的霸王龙商品页，也不应影响"游戏相关内容高概率上首页"的判断

**输出要求**：在reasoning中明确说明你是基于"${industry}"行业进行的分析，并说明其他行业的结果已被忽略。`
        : `\n\n# Industry Filtering
User's selected precise industry: **${industry}**.

**CRITICAL REQUIREMENT**: When analyzing SERP results, **focus ONLY on results related to "${industry}"**, ignore authoritative sites from other industries (e.g., e-commerce product pages, other industry professional sites, etc.).

**Analysis Principles**:
1. Even if other industries have high-authority sites (e.g., e-commerce, news, other professional sites), this should NOT affect the ranking probability assessment for the target industry "${industry}"
2. Only evaluate the competition strength of SERP results related to the "${industry}" industry
3. If SERP results are primarily from other industries (even if these sites have high authority), this is actually a **HIGH probability opportunity** (because the target industry has weaker competition)
4. Example: If the keyword is "S16霸王龙95" and the industry is "云顶之弈游戏" (TFT game), even if SERP has e-commerce product pages about dinosaurs, this should NOT affect the judgment that "game-related content has high probability to rank on page 1"

**Output Requirement**: In your reasoning, clearly state that you analyzed based on the "${industry}" industry, and explain that results from other industries have been ignored.`)
      : '';

    const fullSystemInstruction = `
${finalSystemInstruction}
${industryFilterInstruction}

TASK: Analyze ${engineName} SERP for "${keywordData.keyword}"
${serpContext}
keyword Research data:${dataForSEOContext}

${outputLanguageInstruction}

OUTPUT (${uiLangName}, JSON only):
{
  "intentAssessment": "${uiLanguage === 'zh' ? '用户意图：[类型] | SERP匹配：[分析]' : 'Intent: [type] | SERP Match: [analysis]'}",
  "topDomainType": "${uiLanguage === 'zh' ? '大品牌 | 利基网站 | 论坛/社交 | 弱页面 | 政府/教育 | 未知' : 'Big Brand | Niche Site | Forum/Social | Weak Page | Gov/Edu | Unknown'}",
  "probability": "${uiLanguage === 'zh' ? '高 | 中 | 低' : 'High | Medium | Low'}",
  "relevanceScore": 0-1,
  "reasoning": "${uiLanguage === 'zh' ? '简要分析（2-3句话）' : 'Brief analysis (2-3 sentences)'}"
}`;

    try {
      let response;
      try {
        onProgress?.(uiLanguage === 'zh'
          ? `🤖 [${keywordData.keyword}] 正在调用 AI 专家进行胜率估算和蓝海信号分析...`
          : `🤖 [${keywordData.keyword}] Calling AI expert for outrank and blue ocean analysis...`);

        const geminiStart = Date.now();
        response = await callGeminiAPI(
          `Analyze SEO competition for: ${keywordData.keyword}

CRITICAL: 
- Return ONLY a valid JSON object in the exact format specified
- No markdown, no explanations, no thinking process
- JSON object must start with {`,
          fullSystemInstruction,
          {
            model: 'gemini-2.5-flash',
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                intentAssessment: { type: 'string' },
                topDomainType: { type: 'string' },
                probability: { type: 'string', enum: ['High', 'Medium', 'Low'] },
                relevanceScore: { type: 'number' },
                reasoning: { type: 'string' }
                // Note: serpResultCount and topSerpSnippets are NOT in schema
                // They are populated from real SERP data after AI response (see lines 1520-1533)
              },
              required: ['probability', 'reasoning', 'intentAssessment']
            },
            enableGoogleSearch: false,
            onRetry: (attempt, error, delay) => {
              onProgress?.(uiLanguage === 'zh'
                ? `⚠️ [${keywordData.keyword}] AI 分析连接异常 (尝试 ${attempt}/3)，正在 ${delay}ms 后重试...`
                : `⚠️ [${keywordData.keyword}] AI analysis connection error (attempt ${attempt}/3), retrying in ${delay}ms...`);
            },
            onFallback: (originalModel, fallbackModel) => {
              onProgress?.(uiLanguage === 'zh'
                ? `🔄 [${keywordData.keyword}] 主模型 ${originalModel} 失败，切换到备用模型 ${fallbackModel}...`
                : `🔄 [${keywordData.keyword}] Primary model ${originalModel} failed, switching to fallback ${fallbackModel}...`);
            }
          }
        );
        onProgress?.(uiLanguage === 'zh'
          ? `✨ [${keywordData.keyword}] AI 分析完成`
          : `✨ [${keywordData.keyword}] AI analysis completed`);

        console.log(`[Agent 2] Gemini analysis for "${keywordData.keyword}" completed in ${Date.now() - geminiStart}ms`);
        if (response && response.text) {
          console.log(`[Agent 2] Gemini response length for "${keywordData.keyword}": ${response.text.length}`);
        } else {
          console.warn(`[Agent 2] Gemini response is empty or invalid for "${keywordData.keyword}"`);
        }
      } catch (apiError: any) {
        // 如果API调用失败（如400错误），使用默认值并继续
        console.error(`API call failed for keyword ${keywordData.keyword}:`, apiError.message);
        // 返回默认分析结果
        // 根据 uiLanguage 设置默认值
        const defaultIntentAssessment = uiLanguage === 'zh'
          ? '用户意图：无法确定意图（API调用失败）| SERP匹配：分析跳过'
          : 'User Intent: Unable to determine intent due to API error | SERP Match: Analysis skipped';
        const defaultReasoning = uiLanguage === 'zh'
          ? `API调用失败: ${apiError.message}. 使用默认分析结果。`
          : `API call failed: ${apiError.message}. Using default analysis result.`;

        return {
          ...keywordData,
          probability: ProbabilityLevel.MEDIUM,
          reasoning: defaultReasoning,
          intentAssessment: defaultIntentAssessment,
          serpResultCount: serpResultCount > 0 ? serpResultCount : -1,
          topDomainType: "Unknown" as const,
          topSerpSnippets: serpResults.slice(0, 3).map((r: any) => ({
            title: r.title || '',
            url: r.url || '',
            snippet: r.snippet || ''
          }))
        } as KeywordData;
      }

      let text = response.text || "{}";
      const finishReason = (response as any).finishReason; // 检查是否被截断

      // 检查是否因 token 限制被截断
      const isTruncated = finishReason === 'LENGTH' || finishReason === 'MAX_TOKENS';
      if (isTruncated) {
        console.warn(`⚠️  Response truncated for keyword "${keywordData.keyword}" (finishReason: ${finishReason})`);
      }

      // 如果响应以 Markdown 格式开头（如 "**Refining..."），先清理
      // 移除 Markdown 格式标记和思考过程
      if (text && typeof text === 'string') {
        const trimmedText = text.trim();
        if (trimmedText && typeof trimmedText.startsWith === 'function' && (trimmedText.startsWith('**') || trimmedText.startsWith('*'))) {
          // 查找第一个 { 之前的所有内容，可能是思考过程
          const firstBrace = text.indexOf('{');
          if (firstBrace > 0) {
            // 移除 { 之前的所有 Markdown 和思考过程
            text = text.substring(firstBrace);
          }
          // 移除所有 Markdown 格式标记
          text = text.replace(/^\*\*[^*]+\*\*/gm, ''); // 移除 **text** 格式
          text = text.replace(/^\*[^*]+/gm, ''); // 移除 * text 格式
          text = text.replace(/^#+\s+/gm, ''); // 移除 # 标题格式
          text = text.trim();
        }
      }

      // Enhanced JSON extraction - try to find JSON even if wrapped in markdown
      text = extractJSONRobust(text);

      if (!text || text.trim() === '') {
        throw new Error("Empty JSON response from model");
      }

      // 声明 analysis 变量在 try 块外，以便在整个作用域内使用
      let analysis: any = null;
      try {
        analysis = JSON.parse(text);
      } catch (e: any) {
        console.error("JSON Parse Error for keyword:", keywordData.keyword);
        console.error("Extracted text (first 500 chars):", text.substring(0, 500));
        if (isTruncated) {
          console.error("⚠️  Response was truncated (finishReason: " + finishReason + "), attempting recovery...");
        }

        // Enhanced fallback: try multiple strategies to extract JSON
        let recovered = false;

        // Strategy 0: 使用新的智能修复函数处理字符串截断
        try {
          const fixedText = fixTruncatedJSON(text);
          analysis = JSON.parse(fixedText);
          console.log("✓ Fixed truncated JSON using smart string repair");
          recovered = true;
        } catch (fixError) {
          // 继续使用其他恢复策略
        }

        // Strategy 0.5: 尝试修复常见的 JSON 截断问题（括号不匹配）
        if (!recovered) {
          let fixedText = text.trim();
          const openBraces = (fixedText.match(/\{/g) || []).length;
          const closeBraces = (fixedText.match(/\}/g) || []).length;
          if (openBraces > closeBraces) {
            // 添加缺失的闭合括号和可能的数组闭合
            const missingBraces = openBraces - closeBraces;
            // 检查是否有未闭合的数组
            const openBrackets = (fixedText.match(/\[/g) || []).length;
            const closeBrackets = (fixedText.match(/\]/g) || []).length;
            if (openBrackets > closeBrackets) {
              fixedText += ']'.repeat(openBrackets - closeBrackets);
            }
            // 添加缺失的闭合大括号
            fixedText += '}'.repeat(missingBraces);

            try {
              analysis = JSON.parse(fixedText);
              console.log("✓ Fixed truncated JSON by adding missing braces");
              recovered = true;
            } catch (fixError) {
              // 继续使用其他恢复策略
            }
          }
        }

        // Strategy 1: Try to find JSON object with "probability" field
        if (!recovered && response?.text) {
          const jsonMatch1 = response.text.match(/\{[\s\S]*?"probability"[\s\S]*?\}/);
          if (jsonMatch1) {
            try {
              analysis = JSON.parse(jsonMatch1[0]);
              console.log("✓ Recovered JSON using probability field match");
              recovered = true;
            } catch (recoveryError) {
              // Continue to next strategy
            }
          }
        }

        // Strategy 2: Try to find any JSON object that looks complete (使用清理后的文本)
        if (!recovered && response?.text) {
          // 先清理 Markdown，再查找 JSON
          let cleanedText = response.text;
          // 移除 Markdown 格式标记
          cleanedText = cleanedText.replace(/^\*\*[^*]+\*\*/gm, '');
          cleanedText = cleanedText.replace(/^\*[^*]+/gm, '');
          cleanedText = cleanedText.replace(/^#+\s+/gm, '');
          cleanedText = cleanedText.replace(/^```[\s\S]*?```/gm, '');

          // Find the first { and try to extract complete JSON
          const firstBrace = cleanedText.indexOf('{');
          if (firstBrace !== -1) {
            // Try to find matching closing brace
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;

            for (let i = firstBrace; i < cleanedText.length; i++) {
              const char = cleanedText[i];

              if (escapeNext) {
                escapeNext = false;
                continue;
              }

              if (char === '\\') {
                escapeNext = true;
                continue;
              }

              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }

              if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;

                if (braceCount === 0 && char === '}') {
                  const candidate = cleanedText.substring(firstBrace, i + 1);
                  try {
                    analysis = JSON.parse(candidate);
                    console.log("✓ Recovered JSON using brace matching");
                    recovered = true;
                    break;
                  } catch (recoveryError) {
                    // Continue searching
                  }
                }
              }
            }
          }
        }

        if (!recovered) {
          // Strategy 3: 尝试提取部分字段（即使 JSON 不完整）
          const partialJSON = extractPartialJSON(text);
          if (Object.keys(partialJSON).length > 0) {
            console.log("✓ Extracted partial JSON fields:", Object.keys(partialJSON));
            // 使用提取的部分字段，缺失的字段使用友好的默认值
            // 检查提取的字段是否包含错误信息，如果有则使用更友好的提示
            const hasErrorInField = (field: string | undefined): boolean => {
              if (!field) return false;
              const errorKeywords = ['无法确定', 'Unable to determine', '分析失败', 'Analysis failed', 'AI响应被截断', 'AI response was truncated', '原始错误', 'Original error', '不完整的JSON', 'incomplete JSON'];
              return errorKeywords.some(keyword => field.includes(keyword));
            };

            const getFriendlyIntentAssessment = (extracted: string | undefined, searchIntent?: string, intentAnalysis?: string): string => {
              // 优先使用 intentAssessment
              if (extracted && !hasErrorInField(extracted)) return extracted;
              // 向后兼容：如果有 searchIntent 和 intentAnalysis，合并它们
              if (searchIntent && intentAnalysis && !hasErrorInField(searchIntent) && !hasErrorInField(intentAnalysis)) {
                return uiLanguage === 'zh'
                  ? `用户意图：${searchIntent} | SERP匹配：${intentAnalysis}`
                  : `User Intent: ${searchIntent} | SERP Match: ${intentAnalysis}`;
              }
              return uiLanguage === 'zh'
                ? '正在分析用户搜索意图和SERP匹配度...'
                : 'Analyzing user search intent and SERP match...';
            };

            const getFriendlyReasoning = (extracted: string | undefined): string => {
              if (extracted && !hasErrorInField(extracted)) return extracted;
              // 如果提取了probability，基于它生成友好的推理
              if (partialJSON.probability) {
                const prob = partialJSON.probability;
                return uiLanguage === 'zh'
                  ? `基于SERP分析，该关键词的排名概率为${prob === 'High' ? '高' : prob === 'Medium' ? '中' : '低'}。详细分析正在生成中...`
                  : `Based on SERP analysis, ranking probability is ${prob}. Detailed analysis is being generated...`;
              }
              return uiLanguage === 'zh'
                ? '正在分析SERP竞争情况和排名概率...'
                : 'Analyzing SERP competition and ranking probability...';
            };

            analysis = {
              intentAssessment: getFriendlyIntentAssessment(
                partialJSON.intentAssessment,
                partialJSON.searchIntent,
                partialJSON.intentAnalysis
              ),
              serpResultCount: partialJSON.serpResultCount !== undefined ? partialJSON.serpResultCount : (serpResultCount > 0 ? serpResultCount : -1),
              topDomainType: partialJSON.topDomainType || "Unknown",
              probability: partialJSON.probability || "Medium",
              reasoning: getFriendlyReasoning(partialJSON.reasoning),
              topSerpSnippets: []
            };
            recovered = true;
          }
        }

        if (!recovered) {
          // 如果所有恢复策略都失败，使用默认值并记录错误
          console.error("All JSON recovery strategies failed. Using default values.");
          if (isTruncated) {
            console.error("⚠️  Response was truncated, consider reducing output length or splitting the request");
          }
          // 根据 uiLanguage 设置友好的默认值（不显示技术性错误信息）
          const defaultIntentAssessment = uiLanguage === 'zh'
            ? '用户意图：正在分析中... | SERP匹配：正在评估中...'
            : 'User Intent: Analyzing... | SERP Match: Evaluating...';
          const defaultReasoning = uiLanguage === 'zh'
            ? '正在分析SERP竞争情况和排名概率，请稍候...'
            : 'Analyzing SERP competition and ranking probability, please wait...';

          analysis = {
            intentAssessment: defaultIntentAssessment,
            serpResultCount: serpResultCount > 0 ? serpResultCount : -1,
            topDomainType: "Unknown",
            probability: "Medium", // 默认中等概率
            reasoning: defaultReasoning,
            topSerpSnippets: []
          };
          // 不抛出错误，而是使用默认值继续处理
        }
      }

      if (typeof analysis !== 'object' || analysis === null) {
        throw new Error("Response is not a valid JSON object");
      }

      if (serpResults.length > 0) {
        analysis.topSerpSnippets = serpResults.slice(0, 3).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet
        }));
        if (serpResultCount > 0) {
          analysis.serpResultCount = serpResultCount;
        }
      }

      if (typeof analysis.serpResultCount !== 'number') {
        analysis.serpResultCount = serpResultCount > 0 ? serpResultCount : -1;
      }
      if (!analysis.topDomainType) analysis.topDomainType = 'Unknown';
      if (!analysis.probability) analysis.probability = ProbabilityLevel.MEDIUM;
      if (!analysis.reasoning) {
        analysis.reasoning = uiLanguage === 'zh' ? '分析完成' : 'Analysis completed';
      }
      // 处理 intentAssessment：如果没有，尝试从 searchIntent 和 intentAnalysis 合并（向后兼容）
      if (!analysis.intentAssessment) {
        if (analysis.searchIntent && analysis.intentAnalysis) {
          // 向后兼容：合并旧字段
          analysis.intentAssessment = uiLanguage === 'zh'
            ? `用户意图：${analysis.searchIntent} | SERP匹配：${analysis.intentAnalysis}`
            : `User Intent: ${analysis.searchIntent} | SERP Match: ${analysis.intentAnalysis}`;
        } else {
          // 设置默认值
          analysis.intentAssessment = uiLanguage === 'zh'
            ? '用户意图：未知 | SERP匹配：分析不可用'
            : 'User Intent: Unknown | SERP Match: Analysis not available';
        }
      }
      if (!Array.isArray(analysis.topSerpSnippets)) {
        analysis.topSerpSnippets = serpResults.length > 0
          ? serpResults.slice(0, 3).map(r => ({ title: r.title, url: r.url, snippet: r.snippet }))
          : [];
      }

      if (typeof analysis.serpResultCount === 'number' && analysis.serpResultCount === 0) {
        analysis.probability = ProbabilityLevel.HIGH;
        analysis.reasoning = `Blue Ocean! Zero indexed results found - this is a completely untapped keyword.`;
        analysis.topDomainType = 'Weak Page';
      }

      // 计算蓝海评分 - 作为评估指标（用于blueOceanScore字段，但不用于覆盖AI返回的probability）
      const blueOceanScoreData = calculateBlueOceanScore({
        ...keywordData,
        ...analysis
      });

      // 计算大鱼吃小鱼对比结果 (Workflow 3) - 仅在存量拓新模式（有siteDR）下计算
      // 只返回对比结果（canOutrankPositions），供分析agent作为参考，不计算概率
      let outrankData = {
        canOutrankPositions: [] as number[],
        top3Probability: ProbabilityLevel.LOW,
        top10Probability: ProbabilityLevel.LOW,
        finalProbability: analysis.probability || ProbabilityLevel.MEDIUM
      };

      // 存量拓新模式：如果有 DR 数据，使用"大鱼吃小鱼"算法计算outrank相关指标
      if (!isBlueOceanMode && siteDR !== undefined && competitorDRs.length > 0) {
        outrankData = calculateOutrankProbability(siteDR, competitorDRs, analysis.relevanceScore || 0.5);
      }

      // 直接使用AI返回的probability，不再重新计算

      console.log(`[Agent 2] Total analysis for "${keywordData.keyword}" took ${Date.now() - keywordStartTime}ms`);

      return {
        ...keywordData,
        ...analysis,
        blueOceanScore: blueOceanScoreData.totalScore,
        blueOceanScoreBreakdown: {
          totalScore: blueOceanScoreData.totalScore,
          factors: blueOceanScoreData.factors
        },
        websiteDR: siteDR,
        competitorDRs,
        canOutrankPositions: outrankData.canOutrankPositions,
        top3Probability: outrankData.top3Probability,
        top10Probability: outrankData.top10Probability,
        rawResponse: response?.text || '',
        searchResults: response?.searchResults // 添加联网搜索结果
      };

    } catch (error) {
      console.error(`Analysis failed for ${keywordData.keyword}:`, error);
      return {
        ...keywordData,
        probability: ProbabilityLevel.LOW,
        reasoning: "API Analysis Failed (Timeout or Rate Limit).",
        topDomainType: "Unknown",
        serpResultCount: -1,
        rawResponse: "Error: " + error.message
      };
    }
  };

  const results: KeywordData[] = [];

  const BATCH_SIZE = 6; // 提升批处理大小，充分利用 API 并发能力
  const BATCH_DELAY = 300; // 减少批次间延迟，避免过度等待
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 260000; // 保持 260 秒超时限制，确保在前端 300 秒超时前返回

  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_EXECUTION_TIME) {
      console.warn(`[Agent 2] Timeout reached after ${elapsed}ms. Processed ${results.length}/${keywords.length} keywords.`);
      onProgress?.(uiLanguage === 'zh'
        ? `⏱️ 执行超时，已处理 ${results.length}/${keywords.length} 个关键词`
        : `⏱️ Timeout reached. Processed ${results.length}/${keywords.length} keywords`);
      break;
    }

    const batch = keywords.slice(i, i + BATCH_SIZE);
    const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(keywords.length / BATCH_SIZE);

    onProgress?.(uiLanguage === 'zh'
      ? `📦 正在处理第 ${currentBatchNum}/${totalBatches} 批关键词 (${batch.length}个)...`
      : `📦 Processing batch ${currentBatchNum}/${totalBatches} (${batch.length} keywords)...`);

    // 优化策略：批次层面的批量并行处理
    // Step 1: 批量并行获取所有关键词的 SERP 结果
    onProgress?.(uiLanguage === 'zh'
      ? `📡 [批次 ${currentBatchNum}] 正在批量并行获取 SERP 结果...`
      : `📡 [Batch ${currentBatchNum}] Batch fetching SERP results in parallel...`);

    const batchKeywords = batch.map(k => k.keyword);
    const serpResultsMap = await fetchSerpResultsBatch(
      batchKeywords,
      targetLanguage,
      searchEngine, // engine 参数
      BATCH_SIZE, // 批次大小
      BATCH_DELAY // 批次延迟
    );

    // Step 2: 从所有 SERP 结果中提取所有需要查询的域名，批量并行获取 DR 值
    // 蓝海模式（siteDR === undefined）跳过 DR 获取以节省 API 调用和时间
    const isBlueOceanMode = siteDR === undefined;
    let allDomainsDRMap = new Map<string, number>();

    if (!isBlueOceanMode) {
      // 存量拓新模式：需要 DR 数据用于"大鱼吃小鱼"算法
      onProgress?.(uiLanguage === 'zh'
        ? `🛡️ [批次 ${currentBatchNum}] 正在批量并行获取竞争对手 DR 值...`
        : `🛡️ [Batch ${currentBatchNum}] Batch fetching competitor DR values in parallel...`);

      // 优化：只获取每个关键词的第1名、第5名、第10名域名（节省70%成本）
      const allDomains = new Set<string>();
      batch.forEach(k => {
        const serpData = serpResultsMap.get(k.keyword.toLowerCase());
        if (serpData?.results) {
          const results = serpData.results;
          // 只添加第1名、第5名、第10名的域名
          if (results.length > 0 && results[0]?.url) {
            const domain = results[0].url.replace(/^https?:\/\//, '').split('/')[0];
            if (domain && domain.includes('.')) {
              allDomains.add(domain);
            }
          }
          if (results.length >= 5 && results[4]?.url) {
            const domain = results[4].url.replace(/^https?:\/\//, '').split('/')[0];
            if (domain && domain.includes('.')) {
              allDomains.add(domain);
            }
          }
          if (results.length >= 10 && results[9]?.url) {
            const domain = results[9].url.replace(/^https?:\/\//, '').split('/')[0];
            if (domain && domain.includes('.')) {
              allDomains.add(domain);
            }
          }
        }
      });

      if (allDomains.size > 0) {
        try {
          const domainsArray = Array.from(allDomains);
          const drMap = await getBatchDomainOverview(domainsArray);
          // 转换 Map 格式
          drMap.forEach((overview, domain) => {
            allDomainsDRMap.set(domain, (overview as any)?.dr || 0);
          });
        } catch (e) {
          console.warn(`[Agent 2] Failed to batch fetch DRs:`, e);
        }
      }
    } else {
      // 蓝海模式：跳过 DR 获取
      console.log(`[Agent 2] Blue Ocean mode: Skipping competitor DR fetching to save API calls and time`);
    }

    // Step 3: 并行处理批次内的所有关键词（使用已获取的 SERP 和 DR 数据）
    const batchResults = await Promise.allSettled(
      batch.map(k => analyzeSingleKeywordWithPreFetchedData(
        k,
        serpResultsMap.get(k.keyword.toLowerCase()),
        allDomainsDRMap
      ))
    );

    const processedResults = batchResults.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Analysis failed for keyword ${batch[idx].keyword}:`, result.reason);
        return {
          ...batch[idx],
          probability: ProbabilityLevel.LOW,
          reasoning: "Analysis failed due to timeout or error",
          topDomainType: "Unknown" as const,
          serpResultCount: -1
        };
      }
    });

    results.push(...processedResults);

    // 批次间短暂延迟，避免 API 限流（仅在还有更多批次时延迟）
    if (i + BATCH_SIZE < keywords.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  // 保存新分析的关键词到缓存
  if (results.length > 0) {
    try {
      const { saveKeywordAnalysisCache } = await import('../../lib/database.js');
      const { getDataForSEOLocationAndLanguage } = await import('../tools/dataforseo.js');
      const { locationCode } = getDataForSEOLocationAndLanguage(targetLanguage);

      console.log(`[Agent 2] Saving ${results.length} newly analyzed keywords to cache...`);

      for (const keyword of results) {
        // 1. 保存网站特定缓存（如果有 websiteId）
        if (websiteId) {
          await saveKeywordAnalysisCache({
            website_id: websiteId as any,
            keyword: keyword.keyword,
            location_code: locationCode,
            search_engine: searchEngine,
            dataforseo_volume: keyword.dataForSEOData?.volume || keyword.serankingData?.volume || 0,
            dataforseo_difficulty: keyword.dataForSEOData?.difficulty || keyword.serankingData?.difficulty || null,
            dataforseo_cpc: keyword.dataForSEOData?.cpc || keyword.serankingData?.cpc || null,
            dataforseo_competition: keyword.dataForSEOData?.competition || keyword.serankingData?.competition || null,
            dataforseo_history_trend: keyword.dataForSEOData?.history_trend || keyword.serankingData?.history_trend || null,
            dataforseo_is_data_found: !!(keyword.dataForSEOData?.is_data_found || keyword.serankingData?.is_data_found),
            agent2_probability: keyword.probability,
            agent2_search_intent: keyword.searchIntent || keyword.intentAssessment,
            agent2_intent_analysis: keyword.intentAnalysis || keyword.intentAssessment,
            agent2_reasoning: keyword.reasoning,
            agent2_top_domain_type: keyword.topDomainType,
            agent2_serp_result_count: keyword.serpResultCount,
            agent2_top_serp_snippets: keyword.topSerpSnippets,
            agent2_blue_ocean_score: (keyword as any).blueOceanScore,
            agent2_blue_ocean_breakdown: (keyword as any).blueOceanScoreBreakdown,
            website_dr: (keyword as any).websiteDR,
            competitor_drs: (keyword as any).competitorDRs,
            top3_probability: (keyword as any).top3Probability,
            top10_probability: (keyword as any).top10Probability,
            can_outrank_positions: (keyword as any).canOutrankPositions,
            source: websiteId ? 'website-audit' : 'manual'
          });
        }

        // 2. 始终保存/更新全局共享缓存（website_id 为 NULL）
        // 这样其他模式（如蓝海模式）就能复用这些高价值的分析结果
        await saveKeywordAnalysisCache({
          website_id: null as any,
          keyword: keyword.keyword,
          location_code: locationCode,
          search_engine: searchEngine,
          dataforseo_volume: keyword.dataForSEOData?.volume || keyword.serankingData?.volume || 0,
          dataforseo_difficulty: keyword.dataForSEOData?.difficulty || keyword.serankingData?.difficulty || null,
          dataforseo_cpc: keyword.dataForSEOData?.cpc || keyword.serankingData?.cpc || null,
          dataforseo_competition: keyword.dataForSEOData?.competition || keyword.serankingData?.competition || null,
          dataforseo_history_trend: keyword.dataForSEOData?.history_trend || keyword.serankingData?.history_trend || null,
          dataforseo_is_data_found: !!(keyword.dataForSEOData?.is_data_found || keyword.serankingData?.is_data_found),
          agent2_probability: keyword.probability,
          agent2_search_intent: keyword.searchIntent || keyword.intentAssessment,
          agent2_intent_analysis: keyword.intentAnalysis || keyword.intentAssessment,
          agent2_reasoning: keyword.reasoning,
          agent2_top_domain_type: keyword.topDomainType,
          agent2_serp_result_count: keyword.serpResultCount,
          agent2_top_serp_snippets: keyword.topSerpSnippets,
          agent2_blue_ocean_score: (keyword as any).blueOceanScore,
          agent2_blue_ocean_breakdown: (keyword as any).blueOceanScoreBreakdown,
          // 注意：全局缓存不保存特定网站的 DR 数据
          source: 'manual'
        });
      }
      console.log(`[Agent 2] Cache update completed.`);
    } catch (saveError) {
      console.warn(`[Agent 2] Failed to save analysis results to cache:`, saveError);
    }
  }

  // 合并缓存的关键词和新分析的关键词
  return [...keywordsFromCache, ...results];
};

export const extractCoreKeywords = async (
  report: any,
  targetLanguage: TargetLanguage,
  uiLanguage: 'zh' | 'en'
): Promise<string[]> => {
  const targetLangName = getLanguageName(targetLanguage);

  // 从 prompts 文件获取 prompt
  const prompt = getSEOResearcherPrompt('extractCoreKeywords', uiLanguage, {
    targetLangName,
    report
  }) as string;

  try {
    const response = await callGeminiAPI(prompt, undefined, {
    });
    const text = (response?.text || '').trim();
    const jsonMatch = text.match(/\[.*?\]/s);
    if (jsonMatch) {
      const keywords = JSON.parse(jsonMatch[0]);
      return keywords.filter((k: string) => k && k.trim().length > 0).slice(0, 8);
    }
    const extracted = text.split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').replace(/["\[\],]/g, '').trim())
      .filter(line => line.length > 0 && line.length < 50)
      .slice(0, 8);
    if (extracted.length > 0) return extracted;
    return [report.targetKeyword];
  } catch (error: any) {
    console.error('Failed to extract core keywords:', error);
    return [report.targetKeyword];
  }
};

export const generateDeepDiveStrategy = async (
  keyword: KeywordData,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage,
  customPrompt?: string,
  searchPreferences?: SearchPreferencesResult,
  competitorAnalysis?: CompetitorAnalysisResult,
  targetMarket: string = 'global',
  reference?: {
    type: 'document' | 'url';
    document?: {
      filename: string;
      content: string;
    };
    url?: {
      url: string;
      content?: string;
      screenshot?: string;
      title?: string;
    };
  },
  onProgress?: (message: string) => void
): Promise<SEOStrategyReport> => {
  const uiLangName = uiLanguage === 'zh' ? 'Chinese' : 'English';
  const targetLangName = getLanguageName(targetLanguage);

  // Construct context from analysis results
  let analysisContext = '';

  if (searchPreferences) {
    analysisContext += `\n\n=== SEARCH ENGINE PREFERENCES ===\n${JSON.stringify(searchPreferences, null, 2)}`;
  }

  if (competitorAnalysis) {
    analysisContext += `\n\n=== COMPETITOR ANALYSIS (Based on Deep Scrape) ===\n${JSON.stringify(competitorAnalysis, null, 2)}`;

    if (competitorAnalysis.winning_formula) {
      analysisContext += `\n\nWINNING FORMULA: ${competitorAnalysis.winning_formula}`;
    }

    if (competitorAnalysis.competitorAnalysis?.contentGaps) {
      analysisContext += `\n\nCONTENT GAPS TO FILL: ${competitorAnalysis.competitorAnalysis.contentGaps.join(', ')}`;
    }
  }

  // Add reference context
  let referenceContext = '';
  if (reference) {
    if (reference.type === 'document' && reference.document) {
      // Provide summary for strategist (first 2000 chars)
      const docSummary = reference.document.content.length > 2000
        ? reference.document.content.substring(0, 2000) + '...'
        : reference.document.content;
      referenceContext = `\n\n=== USER REFERENCE DOCUMENT ===\nFilename: ${reference.document.filename}\nContent Summary:\n${docSummary}\n\nIMPORTANT: While the user provided this reference document, your primary focus must be on the keyword "${keyword.keyword}". Extract relevant information from the document that relates to the keyword, but ensure the content strategy is centered around "${keyword.keyword}". If the document content is not relevant to the keyword, use it only as a style reference.`;
    } else if (reference.type === 'url' && reference.url?.content && reference.url?.url) {
      // Provide summary for strategist (first 2000 chars)
      const urlSummary = reference.url.content.length > 2000
        ? reference.url.content.substring(0, 2000) + '...'
        : reference.url.content;
      const urlString = typeof reference.url.url === 'string' ? reference.url.url : 'N/A';
      const titleString = reference.url.title && typeof reference.url.title === 'string' ? reference.url.title : '';
      referenceContext = `\n\n=== USER REFERENCE URL ===\nURL: ${urlString}\n${titleString ? `Title: ${titleString}\n` : ''}Content Summary:\n${urlSummary}\n\nIMPORTANT: While the user provided this reference URL, your primary focus must be on the keyword "${keyword.keyword}". Extract relevant information from the URL that relates to the keyword, but ensure the content strategy is centered around "${keyword.keyword}". If the URL content is not relevant to the keyword, use it only as a style reference.`;
    }
  }

  const marketLabel = targetMarket === 'global'
    ? 'Global'
    : targetMarket.toUpperCase();

  // 从 prompts 文件获取 system instruction 和 prompt
  const promptConfig = getSEOResearcherPrompt('deepDiveStrategy', uiLanguage, {
    keyword: keyword.keyword,
    targetLangName,
    uiLangName,
    marketLabel,
    analysisContext,
    referenceContext
  }) as { systemInstruction: string; prompt: string };

  const systemInstruction = customPrompt || (promptConfig.systemInstruction + analysisContext + referenceContext);
  const prompt = promptConfig.prompt;

  onProgress?.(uiLanguage === 'zh' ? `🤖 正在制定最终的 SEO 内容策略报告...` : `🤖 Generating final SEO content strategy report...`);

  try {
    const response = await callGeminiAPI(prompt, systemInstruction, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          targetKeyword: { type: 'string' },
          pageTitleH1: { type: 'string' },
          pageTitleH1_trans: { type: 'string' },
          metaDescription: { type: 'string' },
          metaDescription_trans: { type: 'string' },
          urlSlug: { type: 'string' },
          userIntentSummary: { type: 'string' },
          contentStructure: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                header: { type: 'string' },
                header_trans: { type: 'string' },
                description: { type: 'string' },
                description_trans: { type: 'string' }
              },
              required: ['header', 'description']
            }
          },
          longTailKeywords: { type: 'array', items: { type: 'string' } },
          longTailKeywords_trans: { type: 'array', items: { type: 'string' } },
          coreKeywords: { type: 'array', items: { type: 'string' } }, // OPTIMIZED: Embedded core keywords extraction
          recommendedWordCount: { type: 'number' },
          markdown: { type: 'string' }
        },
        required: ['pageTitleH1', 'metaDescription', 'contentStructure', 'markdown', 'coreKeywords']
      },
      onRetry: (attempt, error, delay) => {
        onProgress?.(uiLanguage === 'zh'
          ? `⚠️ 策略报告生成异常 (尝试 ${attempt}/3)，正在 ${delay}ms 后重试...`
          : `⚠️ Strategy report generation error (attempt ${attempt}/3), retrying in ${delay}ms...`);
      }
    });

    // 提取并解析 JSON
    let text = response?.text || '{}';
    text = extractJSONRobust(text);

    try {
      const parsed = JSON.parse(text);
      // 确保 markdown 字段存在，如果没有则从其他字段生成
      if (!parsed.markdown) {
        // 从结构化数据生成 Markdown
        const mdParts: string[] = [];
        mdParts.push(`# Content Strategy: ${parsed.pageTitleH1 || keyword.keyword}\n\n`);
        mdParts.push(`## Page Title (H1)\n${parsed.pageTitleH1 || ''}\n*Translation: ${parsed.pageTitleH1_trans || ''}*\n\n`);
        mdParts.push(`## Meta Description\n${parsed.metaDescription || ''}\n*Translation: ${parsed.metaDescription_trans || ''}*\n\n`);
        if (parsed.urlSlug) mdParts.push(`## URL Slug\n${parsed.urlSlug}\n\n`);
        if (parsed.userIntentSummary) mdParts.push(`## User Intent Analysis\n${parsed.userIntentSummary}\n\n`);
        if (parsed.contentStructure && Array.isArray(parsed.contentStructure)) {
          mdParts.push(`## Content Structure\n`);
          parsed.contentStructure.forEach((section: any, idx: number) => {
            mdParts.push(`### H2 ${idx + 1}: ${section.header || ''}\n*Translation: ${section.header_trans || ''}*\n\n`);
            mdParts.push(`**Description**: ${section.description || ''}\n\n`);
            if (section.description_trans) {
              mdParts.push(`*Translation: ${section.description_trans}*\n\n`);
            }
          });
        }
        if (parsed.longTailKeywords && Array.isArray(parsed.longTailKeywords)) {
          mdParts.push(`## Long-tail Keywords\n${parsed.longTailKeywords.join(', ')}\n\n`);
        }
        if (parsed.recommendedWordCount) {
          mdParts.push(`## Recommended Word Count\n${parsed.recommendedWordCount} words\n\n`);
        }
        parsed.markdown = mdParts.join('');
      }
      return parsed as SEOStrategyReport;
    } catch (parseError: any) {
      console.error('[Agent 2] Failed to parse strategy report JSON:', parseError);
      console.error('[Agent 2] Response text:', text.substring(0, 500));
      // 返回默认结构
      return {
        targetKeyword: keyword.keyword,
        pageTitleH1: keyword.keyword,
        contentStructure: [],
        markdown: text || `Content strategy for "${keyword.keyword}" in ${marketLabel} market.`
      };
    }
  } catch (error: any) {
    console.error("Deep Dive Error:", error);
    throw new Error(`Failed to generate strategy report: ${error.message || error}`);
  }
};


