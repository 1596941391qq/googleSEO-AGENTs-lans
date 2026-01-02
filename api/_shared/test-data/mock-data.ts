/**
 * Mock Data Generator for Test Agent Mode
 */

import { KeywordData, IntentType, ProbabilityLevel } from '../types.js';

/**
 * Generate mock keywords
 */
export function getMockKeywords(seed: string, count: number = 10): KeywordData[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `mock-kw-${i}`,
    keyword: `${seed} example ${i + 1}`,
    translation: `${seed} 示例 ${i + 1}`,
    intent: i % 3 === 0 ? IntentType.COMMERCIAL : (i % 3 === 1 ? IntentType.INFORMATIONAL : IntentType.TRANSACTIONAL),
    volume: Math.floor(Math.random() * 10000),
    probability: Math.random() > 0.6 ? ProbabilityLevel.HIGH : (Math.random() > 0.3 ? ProbabilityLevel.MEDIUM : ProbabilityLevel.LOW),
    difficulty: Math.floor(Math.random() * 100)
  }));
}

/**
 * Generate mock SERP results
 */
export function getMockSerpResults(keyword: string) {
  return {
    results: [
      {
        title: `Top Guide for ${keyword}`,
        url: `https://example.com/${keyword.replace(/\s+/g, '-')}-guide`,
        snippet: `This is a comprehensive guide about ${keyword}. Learn everything you need to know.`
      },
      {
        title: `Best ${keyword} in 2026`,
        url: `https://test.com/best-${keyword.replace(/\s+/g, '-')}`,
        snippet: `Discover the best options for ${keyword} available in the market.`
      },
      {
        title: `What is ${keyword}?`,
        url: `https://wiki.example.org/wiki/${keyword.replace(/\s+/g, '_')}`,
        snippet: `Definition and explanation of ${keyword}.`
      }
    ],
    totalResults: 1000000
  };
}

/**
 * Generate mock SE Ranking data
 */
export function getMockSERankingData(keywords: string[]) {
  return keywords.map(kw => ({
    keyword: kw,
    is_data_found: true,
    volume: Math.floor(Math.random() * 5000),
    cpc: Number((Math.random() * 5).toFixed(2)),
    competition: Number(Math.random().toFixed(2)),
    difficulty: Math.floor(Math.random() * 80),
    history_trend: {
      '2025-12': Math.floor(Math.random() * 5000),
      '2026-01': Math.floor(Math.random() * 5000)
    }
  }));
}

/**
 * Generate mock SEO Strategy Report
 */
export function getMockSEOStrategyReport(keyword: string) {
  return {
    pageTitleH1: `Ultimate Guide to ${keyword}`,
    metaDescription: `Learn everything about ${keyword} in this detailed guide. Tips, tricks, and best practices.`,
    userSearchIntent: "Users want to learn about " + keyword,
    targetAudience: "Beginners and enthusiasts",
    contentStructure: [
      { header: `Introduction to ${keyword}`, description: "Overview of the topic", sectionType: "H2" },
      { header: `Why ${keyword} Matters`, description: "Importance and benefits", sectionType: "H2" },
      { header: `How to Use ${keyword}`, description: "Step by step guide", sectionType: "H2" },
      { header: "Conclusion", description: "Summary", sectionType: "H2" }
    ],
    recommendedWordCount: 1500,
    longTailKeywords: [`best ${keyword}`, `${keyword} tips`, `${keyword} vs others`],
    contentTone: "Professional and informative",
    uniqueValueProposition: "Actionable advice with latest data"
  };
}
