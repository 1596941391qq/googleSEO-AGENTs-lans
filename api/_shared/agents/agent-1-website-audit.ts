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
import { scrapeWebsite } from '../tools/firecrawl.js';
import { getDomainKeywords, getDomainCompetitors } from '../tools/dataforseo-domain.js';
import { getDataForSEOLocationAndLanguage } from '../tools/dataforseo.js';
import { KeywordData, TargetLanguage } from '../types.js';
import { getExistingWebsiteAuditPrompt } from '../../../services/prompts/index.js';

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
      if (keyword.length > 2 && keyword.length < 100 &&
        !keyword.match(/^(关键词|keyword|建议|suggestion|机会|opportunity)/i) &&
        !keyword.includes('：') && !keyword.includes(':')) {
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

      const extracted = section
        .split(/[,，\n]/)
        .map(k => k.trim().replace(/^[-*•\d\.]\s*/, '').replace(/^["'`]|["'`]$/g, ''))
        .filter(k => {
          if (k.length < 3 || k.length >= 100) return false;
          // 排除字段名
          if (excludedPatterns.some(pattern => pattern.test(k))) return false;
          // 排除包含冒号的格式（如 "keyword: value"）
          if (k.includes(':') || k.includes('：')) return false;
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
      websiteContent = scrapeResult.markdown || '';
      console.log(`[Website Audit] Fetched ${websiteContent.length} characters of content`);

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
        ? `✓ 成功抓取 ${websiteContent.length} 字符内容`
        : `✓ Successfully scraped ${websiteContent.length} characters`);
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
      // 不再强制 JSON 格式，返回自然文本分析报告
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

    // 从分析报告中提取关键词
    const extractedKeywords = extractKeywordsFromMarkdown(analysisReport);

    // 转换为 KeywordData 格式
    const keywords: KeywordData[] = extractedKeywords
      .map((kw: any, index: number) => ({
        id: `audit-${Date.now()}-${index}`,
        keyword: kw.keyword || '',
        translation: kw.translation || kw.keyword,
        intent: (kw.intent || 'Informational') as KeywordData['intent'],
        volume: kw.volume || 0,
        reasoning: kw.reasoning || 'Extracted from website audit analysis report',
        source: 'website-audit' as const,
      }))
      .filter((kw: KeywordData) => kw.keyword && kw.keyword.trim() !== '')
      .slice(0, wordsPerRound); // 限制数量

    console.log(`[Website Audit] Generated analysis report (${analysisReport.length} characters, extracted ${keywords.length} keywords)`);

    // Emit analysis report visualization card
    emit('strategist', 'card', uiLanguage === 'zh'
      ? `网站审计分析报告（${keywords.length} 个关键词建议）`
      : `Website Audit Analysis Report (${keywords.length} keyword suggestions)`,
      'website-audit-report', {
      report: analysisReport,
      reportLength: analysisReport.length,
      extractedKeywordsCount: keywords.length,
      keywords: keywords.map(k => ({
        keyword: k.keyword,
        intent: k.intent,
        reasoning: k.reasoning
      })),
      websiteUrl: websiteUrl,
      websiteDomain: websiteDomain,
      competitorKeywordsCount: competitorKeywords.length,
      miningStrategy: miningStrategy,
      industry: industry
    });

    emit('strategist', 'log', uiLanguage === 'zh'
      ? `✓ 分析报告已生成（${analysisReport.length} 字符，提取了 ${keywords.length} 个关键词）`
      : `✓ Analysis report generated (${analysisReport.length} chars, extracted ${keywords.length} keywords)`);

    return {
      analysisReport,
      keywords, // 添加关键词列表，供 App.tsx 使用
      rawResponse: aiResponse.text,
      analysis: {
        websiteContentSummary: websiteContent.substring(0, 500),
        competitorKeywordsCount: competitorKeywords.length,
        suggestedKeywordsCount: keywords.length,
        opportunitiesFound: keywords.length, // 为了兼容性
      },
    };
  } catch (error: any) {
    console.error(`[Website Audit] Failed to audit website: ${error.message}`);
    throw error;
  }
}

