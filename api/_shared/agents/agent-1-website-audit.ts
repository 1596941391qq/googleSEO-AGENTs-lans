/**
 * Agent 1: 存量拓新 (Existing Website Audit)
 * 
 * 职责：分析现有网站，发现未被利用的流量空间
 * 使用：Existing Website Audit 模式
 * 
 * 核心逻辑：
 * 1. 获取网站内容（Firecrawl）
 * 2. 分析现有主题覆盖
 * 3. 获取竞争对手关键词（SE Ranking）
 * 4. AI 分析找出缺口
 * 5. 返回关键词机会列表
 */

import { callGeminiAPI } from '../gemini.js';
import { scrapeWebsite, cleanMarkdown } from '../tools/firecrawl.js';
import { getDomainKeywords, getDomainCompetitors } from '../tools/dataforseo-domain.js';
import { getDataForSEOLocationAndLanguage, fetchKeywordData } from '../tools/dataforseo.js';
import { KeywordData, TargetLanguage, IntentType, ProbabilityLevel } from '../types.js';
import { getExistingWebsiteAuditPrompt } from '../../../services/prompts/index.js';
import { analyzeRankingProbability } from './agent-2-seo-researcher.js';

/**
 * 从Markdown文本中提取关键词（改进版，支持多种格式）
 */
function extractKeywordsFromMarkdown(text: string): any[] {
  const keywords: any[] = [];

  if (!text) return keywords;

  // 1. 查找列表格式的关键词（- keyword, * keyword, 1. keyword等）
  const listPatterns = [
    /(?:^|\n)[-*•]\s*([^\n]+)/g,
    /(?:^|\n)\d+\.\s*([^\n]+)/g,
  ];

  for (const pattern of listPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let keyword = match[1].trim();

      // 移除可能的Markdown格式标记和说明文字
      keyword = keyword
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接格式
        .replace(/[:：].*$/, '') // 移除冒号后的说明
        .replace(/\([^)]*\)/g, '') // 移除括号内容
        .trim();

      // 过滤掉太短、太长或明显不是关键词的内容
      // 排除字段名和常见占位符
      const excludedKeywords = [
        'keyword', 'translation', 'intent', 'volume', 'difficulty', 'reasoning',
        'priority', 'opportunity_type', 'commercial', 'informational', 'transactional',
        'local', '关键词', '翻译', '意图', '搜索量', '难度', '推理', '优先级',
        '机会类型', '商业', '信息', '交易', '本地'
      ];

      if (keyword.length > 2 && keyword.length < 100 &&
        !keyword.match(/^(关键词|keyword|建议|suggestion|机会|opportunity)/i) &&
        !keyword.includes('：') && !keyword.includes(':') &&
        !excludedKeywords.some(excluded => keyword.toLowerCase() === excluded.toLowerCase()) &&
        !keyword.match(/^[a-z_]+$/i) && // 排除纯英文单词（可能是字段名）
        keyword.split(' ').length <= 10) { // 排除过长的短语
        keywords.push({
          keyword: keyword,
          volume: 0,
          intent: 'Informational',
          reasoning: 'Extracted from analysis report',
        });
      }
    }
  }

  // 2. 查找"关键词："或"keyword:"后面的内容
  const keywordSectionPatterns = [
    /(?:关键词|keyword|建议关键词|recommended keywords?)[:：]\s*\n?([^\n]+(?:\n[-*•\d]+\s*[^\n]+)*)/gi,
    /(?:关键词|keyword)[:：]\s*([^\n]+)/gi,
  ];

  for (const pattern of keywordSectionPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const section = match[1];
      // 提取逗号或换行分隔的关键词
      const excludedPatterns = [
        /^(关键词|keyword|intent|volume|translation|reasoning|priority|opportunity_type|difficulty)$/i,
        /^(Informational|Transactional|Local|Commercial)$/i,
      ];

      const excludedKeywords = [
        'keyword', 'translation', 'intent', 'volume', 'difficulty', 'reasoning',
        'priority', 'opportunity_type', 'commercial', 'informational', 'transactional',
        'local', '关键词', '翻译', '意图', '搜索量', '难度', '推理', '优先级',
        '机会类型', '商业', '信息', '交易', '本地'
      ];

      const extracted = section
        .split(/[,，\n]/)
        .map(k => k.trim().replace(/^[-*•\d\.]\s*/, '').replace(/^["'`]|["'`]$/g, ''))
        .filter(k => {
          if (k.length < 3 || k.length >= 100) return false;
          // 排除字段名
          if (excludedPatterns.some(pattern => pattern.test(k))) return false;
          // 排除常见占位符
          if (excludedKeywords.some(excluded => k.toLowerCase() === excluded.toLowerCase())) return false;
          // 排除包含冒号的格式（如 "keyword: value"）
          if (k.includes(':') || k.includes('：')) return false;
          // 排除纯英文单词（可能是字段名）
          if (k.match(/^[a-z_]+$/i) && k.length < 15) return false;
          // 排除过长的短语
          if (k.split(' ').length > 10) return false;
          return true;
        });

      extracted.forEach(k => {
        keywords.push({
          keyword: k,
          volume: 0,
          intent: 'Informational',
          reasoning: 'Extracted from keyword section',
        });
      });
    }
  }

  // 3. 查找引号中的关键词（可能是AI强调的关键词）
  const quotedPattern = /["'`]([^"'`]{3,50})["'`]/g;
  const quotedMatches = text.matchAll(quotedPattern);
  for (const match of quotedMatches) {
    const keyword = match[1].trim();
    if (keyword.length > 2 && keyword.length < 100) {
      keywords.push({
        keyword: keyword,
        volume: 0,
        intent: 'Informational',
        reasoning: 'Extracted from quoted text',
      });
    }
  }

  // 去重（基于关键词本身，不区分大小写）
  const uniqueKeywords = Array.from(
    new Map(keywords.map(k => [k.keyword.toLowerCase(), k])).values()
  );

  return uniqueKeywords.slice(0, 30); // 增加限制数量
}

/**
 * 清理 JSON 响应中的 Google 搜索引用标记
 */
function cleanSearchReferences(text: string): string {
  if (!text) return text;

  // 移除常见的搜索引用格式
  // 1. 移除方括号引用，如 [1], [2], [source]
  text = text.replace(/\[\d+\]/g, '');
  text = text.replace(/\[source\]/gi, '');
  text = text.replace(/\[citation\]/gi, '');

  // 2. 移除括号引用，如 (source: url), (from: ...)
  text = text.replace(/\(source[^)]*\)/gi, '');
  text = text.replace(/\(from[^)]*\)/gi, '');
  text = text.replace(/\(citation[^)]*\)/gi, '');

  // 3. 移除独立出现的 URL（不在引号内的）
  text = text.replace(/(?<!["'])\bhttps?:\/\/[^\s)]+(?!["'])/g, '');

  // 4. 移除引用前缀
  text = text.replace(/^(根据|基于|来自).{0,20}(搜索结果|搜索|资料)[:：]\s*/i, '');
  text = text.replace(/^(According to|Based on|From).{0,30}(search results|search|sources)[:：]\s*/i, '');

  // 5. 移除引用标记行
  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (/^(\[\d+\]|\(source|\(from|\(citation|来源|参考)/i.test(trimmed)) return false;
    if (/^https?:\/\/.+$/.test(trimmed)) return false;
    return true;
  });

  return cleanedLines.join('\n').trim();
}

/**
 * 提取JSON内容（支持Markdown格式）
 */
function extractJSON(text: string): string {
  if (!text) return '[]';

  // 0. 先清理搜索引用标记
  text = cleanSearchReferences(text);

  // 1. 移除 Markdown 代码块标记
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // 2. 尝试找到 JSON 数组或对象
  const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    let extracted = jsonMatch[1];

    // 使用更精确的方法提取完整的 JSON
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

          if (braceCount === 0 && bracketCount === 0 && i > startIdx) {
            return extracted.substring(startIdx, i + 1);
          }
        }
      }
    }

    return extracted;
  }

  // 3. 如果没有找到JSON，尝试从Markdown文本中提取关键词信息
  // 查找可能的关键词列表模式
  const keywordPatterns = [
    /(?:keywords?|opportunities?|suggestions?)[:\s]*\[([^\]]+)\]/i,
    /(?:keywords?|opportunities?|suggestions?)[:\s]*\n([\s\S]*?)(?:\n\n|\n#|$)/i,
  ];

  for (const pattern of keywordPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      // 尝试解析为JSON数组
      const keywords = match[1]
        .split(/[,\n]/)
        .map(k => k.trim().replace(/^[-*•]\s*/, '').replace(/^["']|["']$/g, ''))
        .filter(k => k.length > 0)
        .map(k => ({ keyword: k, volume: 0, intent: 'Informational' }));

      if (keywords.length > 0) {
        return JSON.stringify(keywords);
      }
    }
  }

  // 4. 如果都失败了，返回空数组
  console.warn('[Website Audit] Could not extract JSON from response, returning empty array');
  return '[]';
}

/**
 * 存量拓新选项
 */
export interface ExistingWebsiteAuditOptions {
  websiteId: string;
  websiteUrl: string;
  websiteDomain: string;
  targetLanguage?: TargetLanguage;
  uiLanguage?: 'zh' | 'en';
  industry?: string;
  wordsPerRound?: number; // 生成关键词数量
  miningStrategy?: 'horizontal' | 'vertical'; // 挖掘策略
  additionalSuggestions?: string; // 用户额外建议
  searchEngine?: 'google' | 'baidu' | 'bing' | 'yandex'; // 搜索引擎
  onEvent?: (event: {
    id: string;
    agentId: 'tracker' | 'researcher' | 'strategist' | 'writer' | 'artist';
    type: 'log' | 'card' | 'error';
    timestamp: number;
    message?: string;
    cardType?: string;
    data?: any;
  }) => void; // 事件回调，用于实时可视化
}

/**
 * 存量拓新结果
 */
export interface ExistingWebsiteAuditResult {
  analysisReport: string; // AI 分析报告（文本格式）
  keywords: KeywordData[]; // 从分析报告中提取的关键词列表
  rawResponse: string;
  competitorKeywordsPool?: string[]; // 所有竞争对手关键词池（用于后续轮次优先使用）
  analysis: {
    websiteContentSummary: string;
    competitorKeywordsCount: number;
    suggestedKeywordsCount: number; // 提取的关键词数量
    opportunitiesFound?: number; // 为了兼容性
  };
}

/**
 * 存量拓新 - 分析现有网站，发现未被利用的流量空间
 * 
 * @param options - 存量拓新选项
 * @returns 关键词机会列表
 */
export async function auditWebsiteForKeywords(
  options: ExistingWebsiteAuditOptions
): Promise<ExistingWebsiteAuditResult> {
  const {
    websiteUrl,
    websiteDomain,
    targetLanguage = 'en',
    uiLanguage = 'en',
    industry,
    wordsPerRound = 10,
    miningStrategy = 'horizontal',
    additionalSuggestions,
    searchEngine = 'google',
    onEvent,
  } = options;

  const emit = (agentId: 'tracker' | 'researcher' | 'strategist' | 'writer' | 'artist', type: 'log' | 'card' | 'error', message?: string, cardType?: string, data?: any) => {
    if (onEvent) {
      onEvent({
        id: Math.random().toString(36).substring(7),
        agentId,
        type,
        timestamp: Date.now(),
        message,
        cardType,
        data
      });
    }
  };

  console.log(`[Website Audit] Starting audit for website: ${websiteUrl}`);
  emit('tracker', 'log', uiLanguage === 'zh' ? `开始分析网站: ${websiteUrl}` : `Starting audit for website: ${websiteUrl}`);

  try {
    // Step 1: 获取网站内容（使用 Firecrawl）
    console.log(`[Website Audit] Step 1: Fetching website content...`);
    emit('researcher', 'log', uiLanguage === 'zh' ? '正在抓取网站内容...' : 'Fetching website content...');
    let websiteContent = '';
    try {
      const scrapeResult = await scrapeWebsite(websiteUrl, false);
      websiteContent = cleanMarkdown(scrapeResult.markdown || '', 15000); // 增加上限到 1.5w 字符，但经过清理更精简
      console.log(`[Website Audit] Fetched and cleaned content: ${websiteContent.length} characters`);

      // Emit Firecrawl results visualization
      emit('researcher', 'card', undefined, 'firecrawl-result', {
        url: websiteUrl,
        title: scrapeResult.title || websiteUrl,
        contentLength: websiteContent.length,
        hasScreenshot: !!scrapeResult.screenshot,
        images: scrapeResult.images || [],
        preview: websiteContent.substring(0, 500) + (websiteContent.length > 500 ? '...' : '')
      });

      emit('researcher', 'log', uiLanguage === 'zh'
        ? `✓ 成功抓取并清理 ${websiteContent.length} 字符内容`
        : `✓ Successfully scraped and cleaned ${websiteContent.length} characters`);
    } catch (error: any) {
      console.warn(`[Website Audit] Failed to scrape website: ${error.message}`);
      emit('researcher', 'error', uiLanguage === 'zh'
        ? `网站抓取失败: ${error.message}`
        : `Failed to scrape website: ${error.message}`);
      // 如果抓取失败，使用空内容继续（AI 可以基于其他信息分析）
      websiteContent = `Website: ${websiteUrl}\nDomain: ${websiteDomain}`;
    }

    // Step 2: 获取竞争对手关键词（使用 DataForSEO Domain API）
    console.log(`[Website Audit] Step 2: Fetching competitor keywords...`);
    emit('researcher', 'log', uiLanguage === 'zh' ? '正在获取竞争对手数据...' : 'Fetching competitor data...');
    let competitorKeywords: string[] = [];
    let competitorDomains: string[] = [];

    try {
      // 获取竞争对手列表
      // 将语言代码转换为 DataForSEO 的 location_code
      const { getDataForSEOLocationAndLanguage } = await import('../tools/dataforseo.js');
      const { locationCode } = getDataForSEOLocationAndLanguage(targetLanguage);

      emit('researcher', 'log', uiLanguage === 'zh' ? `正在查询域名竞争对手 (${websiteDomain})...` : `Querying domain competitors (${websiteDomain})...`);
      const competitors = await getDomainCompetitors(websiteDomain, locationCode, 5);
      competitorDomains = competitors.map(c => c.domain).filter(Boolean);
      console.log(`[Website Audit] Found ${competitorDomains.length} competitors`);

      // Emit DataForSEO Domain Competitors visualization
      if (competitors.length > 0) {
        emit('researcher', 'card', undefined, 'dataforseo-competitors', {
          domain: websiteDomain,
          competitors: competitors.map(c => ({
            domain: c.domain,
            title: c.title || c.domain,
            commonKeywords: c.commonKeywords || 0,
            organicTraffic: c.organicTraffic || 0,
            totalKeywords: c.totalKeywords || 0,
            gapKeywords: c.gapKeywords || 0,
            visibilityScore: c.visibilityScore || 0
          })),
          totalCompetitors: competitors.length
        });
      }

      emit('researcher', 'log', uiLanguage === 'zh'
        ? `✓ 发现 ${competitorDomains.length} 个竞争对手`
        : `✓ Found ${competitorDomains.length} competitors`);

      // 获取每个竞争对手的关键词（取前几个）
      emit('researcher', 'log', uiLanguage === 'zh' ? '正在获取竞争对手关键词...' : 'Fetching competitor keywords...');
      const competitorKeywordsPromises = competitorDomains.slice(0, 3).map(async (domain) => {
        try {
          const { locationCode } = getDataForSEOLocationAndLanguage(targetLanguage);
          const keywords = await getDomainKeywords(domain, locationCode, 20);

          // Emit DataForSEO Domain Keywords visualization for each competitor
          if (keywords.length > 0) {
            emit('researcher', 'card', undefined, 'dataforseo-keywords', {
              domain: domain,
              keywordCount: keywords.length,
              sampleKeywords: keywords.slice(0, 10).map(k => ({
                keyword: k.keyword,
                position: k.currentPosition,
                volume: k.searchVolume,
                difficulty: k.difficulty
              }))
            });
          }

          return keywords.map(k => k.keyword);
        } catch (error: any) {
          console.warn(`[Website Audit] Failed to get keywords for competitor ${domain}: ${error.message}`);
          return [];
        }
      });

      const competitorKeywordsArrays = await Promise.all(competitorKeywordsPromises);
      competitorKeywords = competitorKeywordsArrays.flat();
      console.log(`[Website Audit] Collected ${competitorKeywords.length} competitor keywords`);
      emit('researcher', 'log', uiLanguage === 'zh'
        ? `✓ 收集到 ${competitorKeywords.length} 个竞争对手关键词`
        : `✓ Collected ${competitorKeywords.length} competitor keywords`);
    } catch (error: any) {
      console.warn(`[Website Audit] Failed to get competitor keywords: ${error.message}`);
      emit('researcher', 'error', uiLanguage === 'zh'
        ? `获取竞争对手关键词失败: ${error.message}`
        : `Failed to get competitor keywords: ${error.message}`);
      // 如果获取失败，使用空数组继续
      competitorKeywords = [];
    }

    // Step 3: 构建 AI Prompt
    console.log(`[Website Audit] Step 3: Building AI prompt...`);
    const prompt = getExistingWebsiteAuditPrompt(
      websiteUrl,
      websiteContent,
      competitorKeywords,
      industry,
      uiLanguage,
      miningStrategy,
      additionalSuggestions,
      wordsPerRound
    );

    // Step 4: 调用 AI 分析
    console.log(`[Website Audit] Step 4: Calling AI for analysis...`);
    emit('strategist', 'log', uiLanguage === 'zh' ? '正在使用 AI 分析关键词机会...' : 'Analyzing keyword opportunities with AI...');
    const aiResponse = await callGeminiAPI(prompt, 'website-audit', {
      onRetry: (attempt, error, delay) => {
        emit('strategist', 'log', uiLanguage === 'zh'
          ? `⚠️ AI 分析连接异常 (尝试 ${attempt}/3)，正在 ${delay}ms 后重试...`
          : `⚠️ AI analysis connection error (attempt ${attempt}/3), retrying in ${delay}ms...`);
      }
    });

    // Emit Google search results if available
    if (aiResponse.searchResults && aiResponse.searchResults.length > 0 && onEvent) {
      emit('strategist', 'card', undefined, 'google-search-results', { results: aiResponse.searchResults });
    }

    // Step 5: 处理 AI 响应（直接使用文本报告）
    console.log(`[Website Audit] Step 5: Processing AI analysis report...`);
    console.log(`[Website Audit] Response length: ${aiResponse.text.length} characters`);
    emit('strategist', 'log', uiLanguage === 'zh' ? '正在处理 AI 分析报告...' : 'Processing AI analysis report...');

    const analysisReport = aiResponse.text.trim();

    // 从分析报告中提取关键词 - 优先尝试提取JSON格式
    let extractedKeywords: any[] = [];

    // 首先尝试提取JSON格式的关键词数组
    try {
      const jsonStr = extractJSON(analysisReport);
      if (jsonStr && jsonStr !== '[]') {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          extractedKeywords = parsed;
          console.log(`[Website Audit] Extracted ${extractedKeywords.length} keywords from JSON format`);
        } else if (parsed.keywords && Array.isArray(parsed.keywords)) {
          extractedKeywords = parsed.keywords;
          console.log(`[Website Audit] Extracted ${extractedKeywords.length} keywords from JSON object with keywords field`);
        }
      }
    } catch (jsonError: any) {
      console.warn(`[Website Audit] Failed to extract JSON keywords: ${jsonError.message}`);
    }

    // 如果JSON提取失败，回退到Markdown提取
    if (extractedKeywords.length === 0) {
      extractedKeywords = extractKeywordsFromMarkdown(analysisReport);
      console.log(`[Website Audit] Extracted ${extractedKeywords.length} keywords from Markdown format`);
    }

    // 转换为 KeywordData 格式
    // 使用时间戳+随机数生成唯一 ID，避免多轮挖掘时 ID 冲突
    const auditTimestamp = Date.now();
    let keywords: KeywordData[] = extractedKeywords
      .map((kw: any, index: number) => ({
        id: `audit-${auditTimestamp}-${index}-${Math.random().toString(36).substring(7)}`,
        keyword: kw.keyword || '',
        translation: kw.translation || kw.keyword,
        intent: (kw.intent || 'Informational') as KeywordData['intent'],
        volume: kw.volume || 0,
        reasoning: kw.reasoning || 'Extracted from website audit analysis report',
        source: 'website-audit' as const,
      }))
      .filter((kw: KeywordData) => kw.keyword && kw.keyword.trim() !== '')
      .slice(0, wordsPerRound); // 限制数量

    // 获取 DataForSEO 数据以丰富关键词信息
    if (keywords.length > 0) {
      try {
        emit('strategist', 'log', uiLanguage === 'zh'
          ? `正在获取 DataForSEO 关键词数据...`
          : 'Fetching DataForSEO keyword data...');

        const { locationCode, languageCode } = getDataForSEOLocationAndLanguage(targetLanguage);
        const keywordStrings = keywords.map(k => k.keyword);
        const dataForSEOResults = await fetchKeywordData(keywordStrings, locationCode, languageCode);

        // 创建 DataForSEO 数据映射
        const dataForSEODataMap = new Map<string, any>();
        dataForSEOResults.forEach(data => {
          if (data.keyword) {
            dataForSEODataMap.set(data.keyword.toLowerCase(), data);
          }
        });

        // 将 DataForSEO 数据附加到关键词
        keywords = keywords.map(kw => {
          const dataForSEOData = dataForSEODataMap.get(kw.keyword.toLowerCase());

          if (dataForSEOData) {
            kw.dataForSEOData = {
              is_data_found: dataForSEOData.is_data_found || false,
              volume: dataForSEOData.volume,
              cpc: dataForSEOData.cpc,
              competition: dataForSEOData.competition,
              difficulty: dataForSEOData.difficulty,
              history_trend: dataForSEOData.history_trend,
            };
            kw.serankingData = kw.dataForSEOData; // 向后兼容

            // 更新 volume 如果 DataForSEO 有数据
            if (dataForSEOData.volume) {
              kw.volume = dataForSEOData.volume;
            }
          }

          return kw;
        });

        emit('strategist', 'log', uiLanguage === 'zh'
          ? `✓ DataForSEO 数据已获取`
          : '✓ DataForSEO data fetched');
      } catch (dataForSEOError: any) {
        console.warn(`[Website Audit] DataForSEO API call failed: ${dataForSEOError.message}`);
        emit('strategist', 'log', uiLanguage === 'zh'
          ? `⚠️ DataForSEO 数据获取失败，继续使用默认值`
          : '⚠️ DataForSEO data fetch failed, using defaults');
        // 继续处理，不中断流程
      }
    }

    console.log(`[Website Audit] Generated analysis report (${analysisReport.length} characters, extracted ${keywords.length} keywords)`);

    // 立即发送关键词提取结果卡片（在 SERP 分析前）
    emit('strategist', 'card', uiLanguage === 'zh'
      ? `关键词提取完成 (${keywords.length} 个关键词)`
      : `Keywords Extracted (${keywords.length} keywords)`,
      'keywords-extracted', {
      keywords: keywords.map(k => ({
        keyword: k.keyword,
        translation: k.translation,
        intent: k.intent,
        volume: k.volume,
        difficulty: k.dataForSEOData?.difficulty || (k as any).difficulty
      })),
      totalCount: keywords.length,
      stage: 'generated'
    }
    );

    // Step 6: 对提取的关键词进行 SERP 分析和概率分析
    let analyzedKeywords = keywords;
    if (keywords.length > 0) {
      try {
        emit('strategist', 'log', uiLanguage === 'zh'
          ? `🔍 步骤 6: 正在对这 ${keywords.length} 个关键词进行 SERP 分析和排名概率分析...`
          : `🔍 Step 6: Analyzing SERP and ranking probability for ${keywords.length} keywords...`);

        const systemInstruction = `You are an SEO expert analyzing keyword ranking opportunities for an existing website. Use the website's content themes and competitor analysis to provide accurate probability assessments.`;

        analyzedKeywords = await analyzeRankingProbability(
          keywords,
          systemInstruction,
          uiLanguage,
          targetLanguage,
          websiteUrl,
          undefined, // websiteDR 参数已弃用，保留以保持向后兼容性
          searchEngine,
          (msg) => emit('strategist', 'log', msg),
          options.websiteId, // 传递 websiteId 以便检查缓存，避免重复分析
          industry // 传递industry参数，用于行业过滤
        );

        const highProbCount = analyzedKeywords.filter(k => k.probability === 'High').length;
        const mediumProbCount = analyzedKeywords.filter(k => k.probability === 'Medium').length;
        const lowProbCount = analyzedKeywords.filter(k => k.probability === 'Low').length;

        emit('strategist', 'log', uiLanguage === 'zh'
          ? `✓ SERP 分析完成：高概率 ${highProbCount} 个，中概率 ${mediumProbCount} 个，低概率 ${lowProbCount} 个`
          : `✓ SERP analysis complete: ${highProbCount} High, ${mediumProbCount} Medium, ${lowProbCount} Low probability`);
      } catch (analysisError: any) {
        console.warn(`[Website Audit] SERP analysis failed: ${analysisError.message}`);
        emit('strategist', 'log', uiLanguage === 'zh'
          ? `⚠️ SERP 分析失败，使用原始关键词数据: ${analysisError.message}`
          : `⚠️ SERP analysis failed, using original keywords: ${analysisError.message}`);
        // 继续使用原始关键词，不中断流程
      }
    }

    // Emit analysis report visualization card with analyzed keywords
    emit('strategist', 'card', uiLanguage === 'zh'
      ? `网站审计分析报告（${analyzedKeywords.length} 个关键词建议）`
      : `Website Audit Analysis Report (${analyzedKeywords.length} keyword suggestions)`,
      'website-audit-report', {
      report: analysisReport,
      reportLength: analysisReport.length,
      extractedKeywordsCount: analyzedKeywords.length,
      keywords: analyzedKeywords.map(k => ({
        keyword: k.keyword,
        translation: k.translation,
        intent: k.intent,
        volume: k.volume,
        difficulty: k.dataForSEOData?.difficulty || (k as any).difficulty,
        reasoning: k.reasoning,
        probability: k.probability,
        opportunity_type: (k as any).opportunity_type || 'optimization',
        priority: (k as any).priority || (k.probability === 'High' ? 'high' : k.probability === 'Medium' ? 'medium' : 'low'),
        serpResultCount: k.serpResultCount,
        topDomainType: k.topDomainType,
        searchIntent: k.searchIntent,
        intentAnalysis: k.intentAnalysis
      })),
      websiteUrl: websiteUrl,
      websiteDomain: websiteDomain,
      competitorKeywordsCount: competitorKeywords.length,
      miningStrategy: miningStrategy,
      industry: industry
    });

    emit('strategist', 'log', uiLanguage === 'zh'
      ? `✓ 分析报告已生成（${analysisReport.length} 字符，提取了 ${analyzedKeywords.length} 个关键词，已完成 SERP 分析）`
      : `✓ Analysis report generated (${analysisReport.length} chars, extracted ${analyzedKeywords.length} keywords, SERP analysis completed)`);

    // 构建竞争对手关键词池（用于后续轮次优先使用）
    // 去重并过滤掉已经提取的关键词
    const extractedKeywordSet = new Set(analyzedKeywords.map(k => k.keyword.toLowerCase()));
    const competitorKeywordsPool = Array.from(new Set(competitorKeywords))
      .filter(kw => kw && kw.trim() !== '' && !extractedKeywordSet.has(kw.toLowerCase()))
      .slice(0, 200); // 限制数量，避免过大

    if (competitorKeywordsPool.length > 0) {
      emit('strategist', 'log', uiLanguage === 'zh'
        ? `💾 已缓存 ${competitorKeywordsPool.length} 个竞争对手关键词，将在后续轮次优先使用`
        : `💾 Cached ${competitorKeywordsPool.length} competitor keywords for subsequent rounds`);
    }

    return {
      analysisReport,
      keywords: analyzedKeywords, // 返回分析后的关键词列表
      rawResponse: aiResponse.text,
      competitorKeywordsPool, // 返回竞争对手关键词池
      analysis: {
        websiteContentSummary: websiteContent.substring(0, 500),
        competitorKeywordsCount: competitorKeywords.length,
        suggestedKeywordsCount: analyzedKeywords.length,
        opportunitiesFound: analyzedKeywords.length, // 为了兼容性
      },
    };
  } catch (error: any) {
    console.error(`[Website Audit] Failed to audit website: ${error.message}`);
    throw error;
  }
}

// ============================================
// 策略模块化挖词模式
// ============================================

import {
  buildDynamicStrategyPrompt,
  StrategyModuleConfig,
  StrategyContextData,
  StrategyModuleId
} from '../../../services/prompts/index.js';
import { getHighPerformerKeywordsByWebsiteId } from '../../lib/database.js';

/**
 * 策略配置类型
 */
export interface StrategyConfig {
  website_content?: { enabled: boolean; count: number };
  website_ranked?: { enabled: boolean; count: number };
  competitor_keywords?: { enabled: boolean; count: number };
  high_performer_expand?: { enabled: boolean; count: number };
  industry_context?: { enabled: boolean; count: number; industry?: string; suggestions?: string };
}

/**
 * 策略模式审计选项
 */
export interface StrategyAuditOptions {
  websiteId: string;
  websiteUrl: string;
  websiteDomain: string;
  targetLanguage?: TargetLanguage;
  uiLanguage?: 'zh' | 'en';
  industry?: string;
  miningStrategy?: 'horizontal' | 'vertical';
  strategies?: StrategyConfig;
  maxTotalKeywords?: number;
  searchEngine?: 'google' | 'baidu' | 'bing' | 'yandex';
  onEvent?: (event: {
    id: string;
    agentId: 'tracker' | 'researcher' | 'strategist' | 'writer' | 'artist';
    type: 'log' | 'card' | 'error';
    timestamp: number;
    message?: string;
    cardType?: string;
    data?: any;
  }) => void;
}

/**
 * 策略模式审计结果
 */
export interface StrategyAuditResult {
  keywords: Array<{
    keyword: string;
    translation?: string;
    intent: 'Informational' | 'Transactional' | 'Local' | 'Commercial';
    volume?: number;
    difficulty?: number;
    sources: StrategyModuleId[];
  }>;
  rawResponse: string;
  enabledStrategies: StrategyModuleId[];
  analysis: {
    websiteContentLength?: number;
    websiteRankedCount?: number;
    competitorKeywordsCount?: number;
    highPerformerCount?: number;
  };
}

/**
 * 策略模块化挖词 - 根据用户选择的策略组合生成关键词
 */
export async function auditWebsiteWithStrategies(
  options: StrategyAuditOptions
): Promise<StrategyAuditResult> {
  const {
    websiteId,
    websiteUrl,
    websiteDomain,
    targetLanguage = 'en',
    uiLanguage = 'en',
    industry,
    miningStrategy = 'horizontal',
    strategies,
    maxTotalKeywords = 50,
    searchEngine = 'google', // 添加搜索引擎参数
    onEvent,
  } = options;

  const emit = (
    agentId: 'tracker' | 'researcher' | 'strategist' | 'writer' | 'artist',
    type: 'log' | 'card' | 'error',
    message?: string,
    cardType?: string,
    data?: any
  ) => {
    if (onEvent) {
      onEvent({
        id: Math.random().toString(36).substring(7),
        agentId,
        type,
        timestamp: Date.now(),
        message,
        cardType,
        data
      });
    }
  };

  console.log(`[Strategy Audit] Starting strategy-based audit for: ${websiteUrl}`);
  emit('tracker', 'log', uiLanguage === 'zh'
    ? `🚀 开始策略模块化挖词: ${websiteUrl}`
    : `🚀 Starting strategy-based keyword mining: ${websiteUrl}`
  );

  // 1. 解析启用的策略
  const enabledStrategies: StrategyModuleConfig[] = [];
  const enabledStrategyIds: StrategyModuleId[] = [];

  if (strategies) {
    if (strategies.website_content?.enabled) {
      enabledStrategies.push({
        id: 'website_content',
        enabled: true,
        count: strategies.website_content.count || 10
      });
      enabledStrategyIds.push('website_content');
    }
    if (strategies.website_ranked?.enabled) {
      enabledStrategies.push({
        id: 'website_ranked',
        enabled: true,
        count: strategies.website_ranked.count || 10
      });
      enabledStrategyIds.push('website_ranked');
    }
    if (strategies.competitor_keywords?.enabled) {
      enabledStrategies.push({
        id: 'competitor_keywords',
        enabled: true,
        count: strategies.competitor_keywords.count || 10
      });
      enabledStrategyIds.push('competitor_keywords');
    }
    if (strategies.high_performer_expand?.enabled) {
      enabledStrategies.push({
        id: 'high_performer_expand',
        enabled: true,
        count: strategies.high_performer_expand.count || 10
      });
      enabledStrategyIds.push('high_performer_expand');
    }
    if (strategies.industry_context?.enabled) {
      enabledStrategies.push({
        id: 'industry_context',
        enabled: true,
        count: strategies.industry_context.count || 10,
        industry: strategies.industry_context.industry || industry,
        suggestions: strategies.industry_context.suggestions
      });
      enabledStrategyIds.push('industry_context');
    }
  }

  // 如果没有启用任何策略，默认启用 website_content
  if (enabledStrategies.length === 0) {
    enabledStrategies.push({
      id: 'website_content',
      enabled: true,
      count: 10
    });
    enabledStrategyIds.push('website_content');
  }

  const totalRequested = enabledStrategies.reduce((sum, s) => sum + s.count, 0);
  emit('tracker', 'log', uiLanguage === 'zh'
    ? `📊 已启用 ${enabledStrategies.length} 个策略模块，预计生成 ${totalRequested} 个关键词`
    : `📊 ${enabledStrategies.length} strategy modules enabled, expecting ${totalRequested} keywords`
  );

  // 2. 并行收集各模块的上下文数据
  const contexts: StrategyContextData = {};
  const analysis: StrategyAuditResult['analysis'] = {};
  const collectTasks: Promise<void>[] = [];

  // 导入缓存函数
  const { getWebsiteContentCache, saveWebsiteContentCache } = await import('../../lib/database.js');

  // 2.1 网站内容分析
  if (enabledStrategyIds.includes('website_content')) {
    collectTasks.push((async () => {
      try {
        // 优先检查缓存
        const cached = await getWebsiteContentCache(websiteId, 'scraped_content');

        if (cached && cached.content) {
          // 使用缓存的网站内容
          emit('researcher', 'log', uiLanguage === 'zh'
            ? `📦 使用缓存的网站内容 (${cached.content.length} 字符)`
            : `📦 Using cached website content (${cached.content.length} chars)`
          );

          contexts.website_content = cached.content;
          analysis.websiteContentLength = cached.content.length;

          // 发送可视化卡片（标记为缓存）
          emit('researcher', 'card', uiLanguage === 'zh'
            ? `网站内容分析 (${cached.content.length} 字符) [缓存]`
            : `Website Content Analysis (${cached.content.length} chars) [Cached]`,
            'firecrawl-result', {
            url: websiteUrl,
            title: cached.title || websiteUrl,
            contentLength: cached.content.length,
            hasScreenshot: false,
            images: cached.metadata?.images || [],
            preview: cached.content.substring(0, 500) + (cached.content.length > 500 ? '...' : ''),
            fromCache: true
          }
          );
          return;
        }

        // 无缓存，重新抓取
        emit('researcher', 'log', uiLanguage === 'zh'
          ? '📄 正在抓取网站内容...'
          : '📄 Fetching website content...'
        );
        const scrapeResult = await scrapeWebsite(websiteUrl, false);
        const websiteContent = cleanMarkdown(scrapeResult.markdown || '', 15000);
        contexts.website_content = websiteContent;
        analysis.websiteContentLength = websiteContent.length;

        // 保存到缓存（有效期 24 小时）
        await saveWebsiteContentCache(
          websiteId,
          websiteContent,
          'scraped_content',
          scrapeResult.title,
          {
            images: scrapeResult.images || [],
            scrapedAt: new Date().toISOString(),
            url: websiteUrl
          },
          24
        );

        // 发送可视化卡片
        emit('researcher', 'card', uiLanguage === 'zh'
          ? `网站内容分析 (${websiteContent.length} 字符)`
          : `Website Content Analysis (${websiteContent.length} chars)`,
          'firecrawl-result', {
          url: websiteUrl,
          title: scrapeResult.title || websiteUrl,
          contentLength: websiteContent.length,
          hasScreenshot: !!scrapeResult.screenshot,
          images: scrapeResult.images || [],
          preview: websiteContent.substring(0, 500) + (websiteContent.length > 500 ? '...' : '')
        }
        );

        emit('researcher', 'log', uiLanguage === 'zh'
          ? `✅ 网站内容抓取完成 (${websiteContent.length} 字符)`
          : `✅ Website content fetched (${websiteContent.length} chars)`
        );
      } catch (error: any) {
        emit('researcher', 'error', uiLanguage === 'zh'
          ? `❌ 网站内容抓取失败: ${error.message}`
          : `❌ Failed to fetch website content: ${error.message}`
        );
        contexts.website_content = `Website: ${websiteUrl}\nDomain: ${websiteDomain}`;
      }
    })());
  }

  // 2.2 网站已排名词
  if (enabledStrategyIds.includes('website_ranked')) {
    collectTasks.push((async () => {
      try {
        emit('researcher', 'log', uiLanguage === 'zh'
          ? '🔍 正在获取网站已排名关键词...'
          : '🔍 Fetching website ranked keywords...'
        );
        const { locationCode } = getDataForSEOLocationAndLanguage(targetLanguage);
        const keywords = await getDomainKeywords(websiteDomain, locationCode, 50);
        contexts.website_ranked = keywords.map(k => k.keyword).filter(k => k && k.trim());
        analysis.websiteRankedCount = contexts.website_ranked.length;

        // 发送可视化卡片
        if (keywords.length > 0) {
          emit('researcher', 'card', uiLanguage === 'zh'
            ? `网站已排名关键词 (${contexts.website_ranked.length} 个)`
            : `Website Ranked Keywords (${contexts.website_ranked.length})`,
            'dataforseo-keywords', {
            domain: websiteDomain,
            keywords: keywords.slice(0, 20).map((k: any) => ({
              keyword: k.keyword,
              position: k.currentPosition ?? k.position,
              volume: k.searchVolume ?? k.volume,
              traffic: k.trafficPercentage ?? k.traffic,
              url: k.url
            })),
            totalCount: contexts.website_ranked.length
          }
          );
        }

        emit('researcher', 'log', uiLanguage === 'zh'
          ? `✅ 获取到 ${contexts.website_ranked.length} 个已排名关键词`
          : `✅ Found ${contexts.website_ranked.length} ranked keywords`
        );
      } catch (error: any) {
        emit('researcher', 'error', uiLanguage === 'zh'
          ? `❌ 获取已排名关键词失败: ${error.message}`
          : `❌ Failed to fetch ranked keywords: ${error.message}`
        );
        contexts.website_ranked = [];
      }
    })());
  }

  // 2.3 竞对关键词
  if (enabledStrategyIds.includes('competitor_keywords')) {
    collectTasks.push((async () => {
      try {
        emit('researcher', 'log', uiLanguage === 'zh'
          ? '🎯 正在获取竞争对手关键词...'
          : '🎯 Fetching competitor keywords...'
        );
        const { locationCode } = getDataForSEOLocationAndLanguage(targetLanguage);

        // 获取竞争对手列表
        const competitors = await getDomainCompetitors(websiteDomain, locationCode, 3);
        const competitorDomains = competitors.map(c => c.domain).filter(Boolean);

        if (competitorDomains.length === 0) {
          emit('researcher', 'log', uiLanguage === 'zh'
            ? `⚠️ 未找到竞争对手，跳过竞对关键词收集`
            : `⚠️ No competitors found, skipping competitor keywords`
          );
          contexts.competitor_keywords = [];
          return;
        }

        // 发送竞争对手列表可视化卡片
        emit('researcher', 'card', uiLanguage === 'zh'
          ? `竞争对手分析 (${competitors.length} 个)`
          : `Competitor Analysis (${competitors.length})`,
          'dataforseo-competitors', {
          domain: websiteDomain,
          competitors: competitors.map(c => ({
            domain: c.domain,
            title: c.title || c.domain,
            commonKeywords: c.commonKeywords || 0,
            organicTraffic: c.organicTraffic || 0,
            totalKeywords: c.totalKeywords || 0,
            gapKeywords: c.gapKeywords || 0,
            visibilityScore: c.visibilityScore || 0
          })),
          totalCompetitors: competitors.length
        }
        );

        // 获取每个竞争对手的关键词
        const competitorKeywordsArrays = await Promise.all(
          competitorDomains.slice(0, 3).map(async (domain) => {
            try {
              const keywords = await getDomainKeywords(domain, locationCode, 30);
              return keywords.map(k => k.keyword);
            } catch {
              return [];
            }
          })
        );

        contexts.competitor_keywords = Array.from(new Set(competitorKeywordsArrays.flat())).filter(k => k && k.trim());
        analysis.competitorKeywordsCount = contexts.competitor_keywords.length;

        // 发送竞对关键词可视化卡片
        if (contexts.competitor_keywords.length > 0) {
          emit('researcher', 'card', uiLanguage === 'zh'
            ? `竞对关键词池 (${contexts.competitor_keywords.length} 个)`
            : `Competitor Keywords Pool (${contexts.competitor_keywords.length})`,
            'competitor-keywords', {
            keywords: contexts.competitor_keywords.slice(0, 30),
            totalCount: contexts.competitor_keywords.length,
            competitorCount: competitorDomains.length
          }
          );
        }

        emit('researcher', 'log', uiLanguage === 'zh'
          ? `✅ 从 ${competitorDomains.length} 个竞争对手收集到 ${contexts.competitor_keywords.length} 个关键词`
          : `✅ Collected ${contexts.competitor_keywords.length} keywords from ${competitorDomains.length} competitors`
        );
      } catch (error: any) {
        emit('researcher', 'error', uiLanguage === 'zh'
          ? `❌ 获取竞对关键词失败: ${error.message}`
          : `❌ Failed to fetch competitor keywords: ${error.message}`
        );
        contexts.competitor_keywords = [];
      }
    })());
  }

  // 2.4 高表现词扩展
  if (enabledStrategyIds.includes('high_performer_expand')) {
    collectTasks.push((async () => {
      try {
        emit('researcher', 'log', uiLanguage === 'zh'
          ? '⭐ 正在获取高表现关键词...'
          : '⭐ Fetching high performer keywords...'
        );
        // 从数据库获取用户标记的好词
        const highPerformers = await getHighPerformerKeywordsByWebsiteId(websiteId, websiteId);
        contexts.high_performer_expand = highPerformers;
        analysis.highPerformerCount = highPerformers.length;

        if (highPerformers.length === 0) {
          emit('researcher', 'log', uiLanguage === 'zh'
            ? `⚠️ 未找到已标记的高表现词，请先标记一些好词`
            : `⚠️ No high performer keywords marked. Please mark some good keywords first.`
          );
        } else {
          // 发送高表现词可视化卡片
          emit('researcher', 'card', uiLanguage === 'zh'
            ? `高表现关键词 (${highPerformers.length} 个)`
            : `High Performer Keywords (${highPerformers.length})`,
            'high-performers', {
            keywords: highPerformers.slice(0, 20),
            totalCount: highPerformers.length
          }
          );

          emit('researcher', 'log', uiLanguage === 'zh'
            ? `✅ 找到 ${highPerformers.length} 个高表现关键词`
            : `✅ Found ${highPerformers.length} high performer keywords`
          );
        }
      } catch (error: any) {
        emit('researcher', 'error', uiLanguage === 'zh'
          ? `❌ 获取高表现词失败: ${error.message}`
          : `❌ Failed to fetch high performer keywords: ${error.message}`
        );
        contexts.high_performer_expand = [];
      }
    })());
  }

  // 2.5 行业上下文
  if (enabledStrategyIds.includes('industry_context')) {
    const industryConfig = strategies?.industry_context;
    contexts.industry_context = {
      industry: industryConfig?.industry || industry || 'General',
      suggestions: industryConfig?.suggestions
    };
    emit('researcher', 'log', uiLanguage === 'zh'
      ? `🏭 行业上下文: ${contexts.industry_context.industry}`
      : `🏭 Industry context: ${contexts.industry_context.industry}`
    );
  }

  // 等待所有数据收集完成
  await Promise.all(collectTasks);

  // 3. 构建动态 Prompt
  emit('strategist', 'log', uiLanguage === 'zh'
    ? '🧠 正在构建 AI 挖词 Prompt...'
    : '🧠 Building AI mining prompt...'
  );

  const prompt = buildDynamicStrategyPrompt(
    enabledStrategies,
    contexts,
    uiLanguage,
    miningStrategy,
    maxTotalKeywords
  );

  // 4. 调用 AI 生成关键词
  emit('strategist', 'log', uiLanguage === 'zh'
    ? '🤖 正在调用 AI 生成关键词...'
    : '🤖 Calling AI to generate keywords...'
  );

  const aiResponse = await callGeminiAPI(prompt, 'strategy-keyword-mining', {
    responseMimeType: 'application/json',
    onRetry: (attempt, error, delay) => {
      emit('strategist', 'log', uiLanguage === 'zh'
        ? `⚠️ AI 调用失败 (尝试 ${attempt}/3)，${delay}ms 后重试...`
        : `⚠️ AI call failed (attempt ${attempt}/3), retrying in ${delay}ms...`
      );
    }
  });

  // 5. 解析 AI 响应
  let rawKeywords: any[] = [];
  try {
    const jsonText = extractJSON(aiResponse.text);
    rawKeywords = JSON.parse(jsonText);
    if (!Array.isArray(rawKeywords)) {
      rawKeywords = [];
    }
  } catch (parseError: any) {
    console.error('[Strategy Audit] Failed to parse AI response:', parseError.message);
    emit('strategist', 'error', uiLanguage === 'zh'
      ? `⚠️ AI 响应解析失败，尝试提取关键词...`
      : `⚠️ Failed to parse AI response, trying to extract keywords...`
    );
    // 尝试从文本中提取关键词
    rawKeywords = extractKeywordsFromMarkdown(aiResponse.text);
  }

  // 6. 合并和去重关键词
  const keywordMap = new Map<string, StrategyAuditResult['keywords'][0]>();

  rawKeywords.forEach(kw => {
    if (!kw.keyword) return;
    const key = kw.keyword.toLowerCase().trim();
    if (!key) return;

    if (keywordMap.has(key)) {
      // 合并来源
      const existing = keywordMap.get(key)!;
      const source = kw.source as StrategyModuleId;
      if (source && !existing.sources.includes(source)) {
        existing.sources.push(source);
      }
    } else {
      keywordMap.set(key, {
        keyword: kw.keyword,
        translation: kw.translation,
        intent: kw.intent || 'Informational',
        volume: kw.volume,
        difficulty: kw.difficulty,
        sources: kw.source ? [kw.source as StrategyModuleId] : ['website_content']
      });
    }
  });

  let keywords = Array.from(keywordMap.values());

  emit('strategist', 'log', uiLanguage === 'zh'
    ? `✅ 生成了 ${keywords.length} 个关键词（去重后）`
    : `✅ Generated ${keywords.length} keywords (after deduplication)`
  );

  // 立即发送关键词生成结果卡片（在 SERP 分析前）
  emit('strategist', 'card', uiLanguage === 'zh'
    ? `策略挖词结果 (${keywords.length} 个关键词)`
    : `Strategy Mining Results (${keywords.length} keywords)`,
    'strategy-keywords-result',
    {
      keywords: keywords.slice(0, 20),
      totalCount: keywords.length,
      enabledStrategies: enabledStrategyIds,
      analysis,
      stage: 'generated' // 标记为生成阶段
    }
  );

  // 7. 对关键词进行 SERP 分析和排名概率分析
  if (keywords.length > 0) {
    try {
      emit('strategist', 'log', uiLanguage === 'zh'
        ? `🔍 正在对 ${keywords.length} 个关键词进行 SERP 分析和排名概率分析...`
        : `🔍 Analyzing SERP and ranking probability for ${keywords.length} keywords...`
      );

      // 将策略挖词结果转换为 KeywordData 格式
      // 使用时间戳+随机数生成唯一 ID，避免多轮挖掘时 ID 冲突
      const timestamp = Date.now();
      const keywordsForAnalysis: KeywordData[] = keywords.map((kw, idx) => ({
        id: `strategy-${timestamp}-${idx}-${Math.random().toString(36).substring(7)}`,
        keyword: kw.keyword,
        translation: kw.translation || '',
        intent: (kw.intent || IntentType.INFORMATIONAL) as IntentType,
        volume: kw.volume || 0,
        difficulty: kw.difficulty,
        probability: ProbabilityLevel.MEDIUM,
        sources: kw.sources
      }));

      const systemInstruction = `You are an SEO expert analyzing keyword ranking opportunities for an existing website. Use the website's content themes and competitor analysis to provide accurate probability assessments.`;

      const analyzedKeywords = await analyzeRankingProbability(
        keywordsForAnalysis,
        systemInstruction,
        uiLanguage,
        targetLanguage,
        websiteUrl,
        undefined,
        searchEngine,
        (msg) => emit('strategist', 'log', msg),
        options.websiteId,
        industry
      );

      // 合并分析结果回原关键词
      const analyzedMap = new Map(analyzedKeywords.map(k => [k.keyword.toLowerCase(), k]));
      keywords = keywords.map(kw => {
        const analyzed = analyzedMap.get(kw.keyword.toLowerCase());
        if (analyzed) {
          return {
            ...kw,
            probability: analyzed.probability,
            reasoning: analyzed.reasoning,
            intentAssessment: analyzed.intentAssessment,
            serpResultCount: analyzed.serpResultCount,
            topDomainType: analyzed.topDomainType,
            topSerpSnippets: analyzed.topSerpSnippets,
            serankingData: analyzed.serankingData,
            dataForSEOData: analyzed.dataForSEOData
          };
        }
        return kw;
      });

      const highProbCount = keywords.filter(k => (k as any).probability === 'High').length;
      const mediumProbCount = keywords.filter(k => (k as any).probability === 'Medium').length;
      const lowProbCount = keywords.filter(k => (k as any).probability === 'Low').length;

      emit('strategist', 'log', uiLanguage === 'zh'
        ? `✓ SERP 分析完成：高概率 ${highProbCount} 个，中概率 ${mediumProbCount} 个，低概率 ${lowProbCount} 个`
        : `✓ SERP analysis complete: ${highProbCount} High, ${mediumProbCount} Medium, ${lowProbCount} Low probability`
      );
    } catch (analysisError: any) {
      console.warn(`[Strategy Audit] SERP analysis failed: ${analysisError.message}`);
      emit('strategist', 'log', uiLanguage === 'zh'
        ? `⚠️ SERP 分析失败，使用原始关键词数据: ${analysisError.message}`
        : `⚠️ SERP analysis failed, using original keywords: ${analysisError.message}`
      );
    }
  }

  // 8. 发送分析完成后的结果卡片
  emit('strategist', 'card', uiLanguage === 'zh'
    ? `SERP 分析完成 (${keywords.length} 个关键词)`
    : `SERP Analysis Complete (${keywords.length} keywords)`,
    'strategy-keywords-result',
    {
      keywords: keywords.slice(0, 20),
      totalCount: keywords.length,
      enabledStrategies: enabledStrategyIds,
      analysis,
      stage: 'analyzed' // 标记为分析完成阶段
    }
  );

  return {
    keywords,
    rawResponse: aiResponse.text,
    enabledStrategies: enabledStrategyIds,
    analysis
  };
}
