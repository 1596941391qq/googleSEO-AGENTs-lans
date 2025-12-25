import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  generateDeepDiveStrategy,
  extractCoreKeywords,
  callGeminiAPI,
  searchGoogleSerp,
  fetchSErankingData
} from './_shared/gemini.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { ProbabilityLevel } from './_shared/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseRequestBody(req);
    const { keyword, uiLanguage, targetLanguage, strategyPrompt } = body;

    if (!keyword || !uiLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Enhanced deep dive for keyword: ${keyword.keyword}`);

    // Step 1: Generate strategy report
    const report = await generateDeepDiveStrategy(
      keyword,
      uiLanguage,
      targetLanguage,
      strategyPrompt
    );

    // Step 2: Extract core keywords from the generated content
    const coreKeywords = await extractCoreKeywords(report, targetLanguage, uiLanguage);
    console.log(`Extracted ${coreKeywords.length} core keywords:`, coreKeywords);

    // Step 2.5: Call SE Ranking API for core keywords
    console.log(`[SEO词研究工具] Fetching SE Ranking data for ${coreKeywords.length} keywords (Deep Dive mode)`);

    const serankingDataMap = new Map();
    try {
      const serankingResults = await fetchSErankingData(coreKeywords, 'us');

      serankingResults.forEach(data => {
        if (data.keyword) {
          serankingDataMap.set(data.keyword.toLowerCase(), data);
        }
      });

      // Flag to indicate that SE Ranking API call succeeded (even if some keywords have no data)
      // This is used to distinguish between "API failure" vs "API returned data (which might have is_data_found=false)"
      (serankingDataMap as any).apiSucceeded = true;

      console.log(`[SE Ranking] Successfully fetched data for ${serankingResults.length}/${coreKeywords.length} keywords`);

      // Log SE Ranking data for each keyword
      serankingResults.forEach(data => {
        if (data.is_data_found) {
          console.log(`[SE Ranking] "${data.keyword}": Volume=${data.volume}, KD=${data.difficulty}, CPC=$${data.cpc}, Competition=${data.competition}`);
        } else {
          console.log(`[SE Ranking] "${data.keyword}": No data found (blue ocean signal)`);
        }
      });
    } catch (serankingError) {
      console.warn(`[SE Ranking] API call failed: ${serankingError.message}. Proceeding with SERP analysis.`);
    }

    // Step 3: Search SERP for each core keyword
    const serpCompetitionData = [];
    for (const coreKeyword of coreKeywords.slice(0, 5)) { // Limit to top 5 to avoid rate limits
      try {
        const serpResults = await searchGoogleSerp(coreKeyword, targetLanguage);

        // Get SE Ranking data for this keyword
        const serankingData = serankingDataMap.get(coreKeyword.toLowerCase());

        // Analyze competition for this keyword (in UI language)
        const analysisPrompt = `Analyze the SERP competition for the keyword "${coreKeyword}".

SERP Results:
${serpResults.map((r, i) => `${i + 1}. ${r.title} - ${r.url}`).join('\n')}

Please respond in ${uiLanguage === 'zh' ? 'Chinese' : 'English'}.

Provide a brief analysis of the competition strength for this keyword.`;

        const analysisResponse = await callGeminiAPI(analysisPrompt);

        serpCompetitionData.push({
          keyword: coreKeyword,
          serpResults: serpResults.slice(0, 3),
          analysis: analysisResponse.text || 'Analysis unavailable',
          // Only include serankingData if API succeeded
          serankingData: (serankingDataMap as any).apiSucceeded && serankingData && serankingData.is_data_found ? {
            volume: serankingData.volume,
            difficulty: serankingData.difficulty,
            cpc: serankingData.cpc,
            competition: serankingData.competition,
            history_trend: serankingData.history_trend
          } : undefined
        });

        // Small delay between searches
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error searching for keyword "${coreKeyword}":`, error);

        // Get SE Ranking data for this keyword even if SERP fails
        const serankingData = serankingDataMap.get(coreKeyword.toLowerCase());

        serpCompetitionData.push({
          keyword: coreKeyword,
          serpResults: [],
          analysis: 'SERP search failed',
          // Only include serankingData if API succeeded
          serankingData: (serankingDataMap as any).apiSucceeded && serankingData && serankingData.is_data_found ? {
            volume: serankingData.volume,
            difficulty: serankingData.difficulty,
            cpc: serankingData.cpc,
            competition: serankingData.competition,
            history_trend: serankingData.history_trend
          } : undefined
        });
      }
    }

    // Step 4: Analyze search intent and ranking probability
    const intentAndProbabilityPrompt = `Based on the following SEO strategy and SERP competition analysis,
estimate the probability of this content ranking on Google's first page.

Target Keyword: ${keyword.keyword}
Page Title: ${report.pageTitleH1}
Meta Description: ${report.metaDescription}

Content Structure:
${report.contentStructure.map(s => `- ${s.header}`).join('\n')}

SERP Competition for Core Keywords:
${serpCompetitionData.map(d => `
Keyword: ${d.keyword}
Competition: ${d.analysis}
Top Results: ${d.serpResults.length > 0 ? d.serpResults.map(r => r.title).join(', ') : 'None found'}
`).join('\n')}

IMPORTANT: Respond in ${uiLanguage === 'zh' ? 'Chinese (中文)' : 'English'}.

Provide:
1. Search Intent: What are users looking for when they search this keyword?
2. Intent Match: Does the proposed content structure match this intent?
3. Ranking Probability: High/Medium/Low
4. Detailed analysis explaining why

Return ONLY valid JSON without markdown formatting:
{
  "searchIntent": "user search intent description",
  "intentMatch": "analysis of whether content matches intent",
  "probability": "High" | "Medium" | "Low",
  "analysis": "detailed ranking probability explanation"
}`;

    const probabilityResponse = await callGeminiAPI(intentAndProbabilityPrompt);
    let rankingProbability = ProbabilityLevel.MEDIUM;
    let rankingAnalysis = 'Analysis unavailable';
    let searchIntent = '';
    let intentMatch = '';

    try {
      // Extract JSON from response (might contain markdown)
      let jsonText = probabilityResponse.text;
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonText);
      rankingProbability = parsed.probability || ProbabilityLevel.MEDIUM;
      rankingAnalysis = parsed.analysis || 'No analysis provided';
      searchIntent = parsed.searchIntent || '';
      intentMatch = parsed.intentMatch || '';
    } catch (e) {
      console.error('Failed to parse probability response:', e);
      // If JSON parsing fails, use the text directly as analysis
      rankingAnalysis = probabilityResponse.text || 'Analysis unavailable';
    }

    // Step 5: Generate HTML content
    const htmlContent = generateHTMLContent(report, uiLanguage);

    // Return enhanced report
    const enhancedReport = {
      ...report,
      coreKeywords,
      htmlContent,
      rankingProbability,
      rankingAnalysis,
      searchIntent,
      intentMatch,
      serpCompetitionData
    };

    return res.json({ report: enhancedReport });
  } catch (error: any) {
    console.error('Enhanced deep dive error:', error);
    return sendErrorResponse(res, error, 'Failed to generate enhanced strategy report');
  }
}

function generateHTMLContent(report: any, uiLanguage: string): string {
  return `<!DOCTYPE html>
<html lang="${uiLanguage === 'zh' ? 'zh-CN' : 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${report.metaDescription}">
    <title>${report.pageTitleH1}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f9fafb;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #1a202c;
            line-height: 1.2;
        }
        .meta-description {
            font-size: 1.1rem;
            color: #4a5568;
            margin-bottom: 30px;
            padding-bottom: 30px;
            border-bottom: 2px solid #e2e8f0;
        }
        h2 {
            font-size: 1.8rem;
            margin-top: 40px;
            margin-bottom: 15px;
            color: #2d3748;
        }
        p {
            margin-bottom: 20px;
            color: #4a5568;
            font-size: 1.05rem;
        }
        .long-tail-keywords {
            background: #edf2f7;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .long-tail-keywords h3 {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: #2d3748;
        }
        .keyword-tag {
            display: inline-block;
            background: #4299e1;
            color: white;
            padding: 6px 12px;
            margin: 5px;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #a0aec0;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${report.pageTitleH1}</h1>
        <div class="meta-description">${report.metaDescription}</div>

        ${report.contentStructure.map(section => `
        <h2>${section.header}</h2>
        <p>${section.description}</p>
        `).join('')}

        ${report.longTailKeywords && report.longTailKeywords.length > 0 ? `
        <div class="long-tail-keywords">
            <h3>${uiLanguage === 'zh' ? '相关关键词' : 'Related Keywords'}</h3>
            <div>
                ${report.longTailKeywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}
            </div>
        </div>
        ` : ''}

        <footer>
            <p>${uiLanguage === 'zh' ? '基于 AI 生成的 SEO 优化内容' : 'AI-Generated SEO Optimized Content'}</p>
            <p>${uiLanguage === 'zh' ? '推荐字数' : 'Recommended Word Count'}: ${report.recommendedWordCount}</p>
        </footer>
    </div>
</body>
</html>`;
}
