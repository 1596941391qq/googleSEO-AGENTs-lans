import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { callGeminiAPI } from './_shared/gemini.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseRequestBody(req);
    const { strategyReport, targetLanguage } = body;

    if (!strategyReport) {
      return res.status(400).json({ error: 'Strategy report is required' });
    }

    console.log('[generate-structure] Generating project structure for:', strategyReport.targetKeyword);

    // Build content structure text
    const contentStructureText = strategyReport.contentStructure
      .map((section: any, i: number) => `${i + 1}. ${section.header} - ${section.description}`)
      .join('\n');

    const prompt = `Based on this SEO strategy, generate a project structure for a React website.

**Target Keyword**: ${strategyReport.targetKeyword}
**Page Title**: ${strategyReport.pageTitleH1}
**Meta Description**: ${strategyReport.metaDescription}
**User Intent**: ${strategyReport.userIntentSummary}

**Content Structure**:
${contentStructureText}

**Task**: Create a JSON structure defining the page sections. Each section should have:
- id: unique identifier (kebab-case)
- title: section title
- type: one of "hero", "feature-grid", "content", "testimonial", "cta", "faq"

**CRITICAL**:
1. Return ONLY valid JSON, no explanation
2. Include 4-6 sections based on content structure
3. Start with a "hero" section
4. End with a "cta" section

**Output Format**:
{
  "title": "page title in ${targetLanguage}",
  "description": "meta description",
  "sections": [
    {"id": "hero", "title": "Hero Section Title", "type": "hero"},
    {"id": "features", "title": "Features Title", "type": "feature-grid"},
    {"id": "cta", "title": "CTA Title", "type": "cta"}
  ]
}

Return ONLY the JSON object.`;

    const result = await callGeminiAPI(
      prompt,
      'You are a web architect. Generate concise project structures.',
      { model: 'gemini-3-flash-preview' }
    );

    // Parse JSON
    let structure;
    try {
      let cleanedResult = result.text.trim();

      // Remove markdown code blocks
      if (cleanedResult.startsWith('```json')) {
        cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResult.startsWith('```')) {
        cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Extract JSON object
      const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structure = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in response');
      }
    } catch (parseError) {
      console.error('[generate-structure] Parse error:', parseError);
      console.error('[generate-structure] Raw response:', result.text.substring(0, 500));
      throw new Error('Failed to parse structure JSON');
    }

    console.log('[generate-structure] Structure generated:', JSON.stringify(structure, null, 2));

    return res.json({
      success: true,
      structure,
    });

  } catch (error: any) {
    console.error('[generate-structure] Error:', error);
    return sendErrorResponse(res, error, 'Failed to generate project structure');
  }
}
