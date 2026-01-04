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
import { getDomainKeywords } from '../tools/se-ranking-domain.js';
import { getDomainCompetitors } from '../tools/dataforseo.js';
import { KeywordData, TargetLanguage } from '../types.js';
import { getExistingWebsiteAuditPrompt } from '../../../services/prompts/index.js';

/**
 * 提取JSON内容
 */
function extractJSON(text: string): string {
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  return text.trim();
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
}

/**
 * 存量拓新结果
 */
export interface ExistingWebsiteAuditResult {
  keywords: KeywordData[];
  rawResponse: string;
  analysis: {
    websiteContentSummary: string;
    competitorKeywordsCount: number;
    opportunitiesFound: number;
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
  } = options;

  console.log(`[Website Audit] Starting audit for website: ${websiteUrl}`);

  try {
    // Step 1: 获取网站内容（使用 Firecrawl）
    console.log(`[Website Audit] Step 1: Fetching website content...`);
    let websiteContent = '';
    try {
      const scrapeResult = await scrapeWebsite(websiteUrl, false);
      websiteContent = scrapeResult.markdown || scrapeResult.content || '';
      console.log(`[Website Audit] Fetched ${websiteContent.length} characters of content`);
    } catch (error: any) {
      console.warn(`[Website Audit] Failed to scrape website: ${error.message}`);
      // 如果抓取失败，使用空内容继续（AI 可以基于其他信息分析）
      websiteContent = `Website: ${websiteUrl}\nDomain: ${websiteDomain}`;
    }

    // Step 2: 获取竞争对手关键词（使用 SE Ranking Domain API）
    console.log(`[Website Audit] Step 2: Fetching competitor keywords...`);
    let competitorKeywords: string[] = [];
    let competitorDomains: string[] = [];

    try {
      // 获取竞争对手列表
      // 将语言代码转换为 DataForSEO 的 location_code: 2166=中国, 2840=美国
      const locationCode = targetLanguage === 'zh' ? 2166 : 2840;
      const competitors = await getDomainCompetitors(websiteDomain, locationCode, 5);
      competitorDomains = competitors.map(c => c.domain).filter(Boolean);
      console.log(`[Website Audit] Found ${competitorDomains.length} competitors`);

      // 获取每个竞争对手的关键词（取前几个）
      const competitorKeywordsPromises = competitorDomains.slice(0, 3).map(async (domain) => {
        try {
          const keywords = await getDomainKeywords(domain, targetLanguage === 'zh' ? 'cn' : 'us', 20);
          return keywords.map(k => k.keyword);
        } catch (error: any) {
          console.warn(`[Website Audit] Failed to get keywords for competitor ${domain}: ${error.message}`);
          return [];
        }
      });

      const competitorKeywordsArrays = await Promise.all(competitorKeywordsPromises);
      competitorKeywords = competitorKeywordsArrays.flat();
      console.log(`[Website Audit] Collected ${competitorKeywords.length} competitor keywords`);
    } catch (error: any) {
      console.warn(`[Website Audit] Failed to get competitor keywords: ${error.message}`);
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
    const aiResponse = await callGeminiAPI(prompt, 'website-audit', {
      enableGoogleSearch: true  // 启用联网搜索以获取最新SEO最佳实践
    });

    // Step 5: 解析 AI 响应
    console.log(`[Website Audit] Step 5: Parsing AI response...`);
    const jsonText = extractJSON(aiResponse.text);
    let parsedKeywords: any[] = [];

    try {
      parsedKeywords = JSON.parse(jsonText);
      if (!Array.isArray(parsedKeywords)) {
        console.warn(`[Website Audit] AI response is not an array, attempting to extract...`);
        // 尝试从对象中提取数组
        if (parsedKeywords.keywords && Array.isArray(parsedKeywords.keywords)) {
          parsedKeywords = parsedKeywords.keywords;
        } else {
          parsedKeywords = [];
        }
      }
    } catch (parseError: any) {
      console.error(`[Website Audit] Failed to parse AI response: ${parseError.message}`);
      console.error(`[Website Audit] Raw response: ${jsonText.substring(0, 500)}`);
      parsedKeywords = [];
    }

    // Step 6: 转换为 KeywordData 格式，并限制数量
    const keywords: KeywordData[] = parsedKeywords
      .map((kw: any, index: number) => ({
        id: `audit-${Date.now()}-${index}`, // 生成唯一 ID
        keyword: kw.keyword || '',
        translation: kw.translation || kw.keyword,
        intent: (kw.intent || 'Informational') as KeywordData['intent'],
        volume: kw.volume || 0,
        reasoning: (kw.reasoning || kw.priority || '') + (kw.opportunity_type ? ` (${kw.opportunity_type})` : ''),
        source: 'website-audit' as const, // 标记来源为存量拓新
        // 注意：opportunityType 和 priority 不是 KeywordData 的标准字段，存储在 reasoning 中
      }))
      .filter((kw: KeywordData) => kw.keyword && kw.keyword.trim() !== '')
      .slice(0, wordsPerRound); // 限制生成的关键词数量

    console.log(`[Website Audit] Generated ${keywords.length} keyword opportunities`);

    return {
      keywords,
      rawResponse: aiResponse.text,
      analysis: {
        websiteContentSummary: websiteContent.substring(0, 500),
        competitorKeywordsCount: competitorKeywords.length,
        opportunitiesFound: keywords.length,
      },
    };
  } catch (error: any) {
    console.error(`[Website Audit] Failed to audit website: ${error.message}`);
    throw error;
  }
}

