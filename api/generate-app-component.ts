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
    const { strategyReport, projectStructure, targetLanguage } = body;

    if (!strategyReport || !projectStructure) {
      return res.status(400).json({ error: 'Strategy report and project structure are required' });
    }

    console.log('[generate-app] Generating website data for:', strategyReport.targetKeyword);

    // Build content details from SEO strategy
    const contentDetails = strategyReport.contentStructure
      .map((section: any, i: number) => `
Section ${i + 1}: ${section.header}
Description: ${section.description}
`)
      .join('\n');

    const prompt = `Generate a website configuration in JSON format based on this SEO strategy.

**SEO Strategy**:
- Target Keyword: ${strategyReport.targetKeyword}
- Page Title (H1): ${strategyReport.pageTitleH1}
- Meta Description: ${strategyReport.metaDescription}
- URL Slug: ${strategyReport.urlSlug}
- User Intent: ${strategyReport.userIntentSummary}
- Recommended Word Count: ${strategyReport.recommendedWordCount} words
- Language: ${targetLanguage}

**Content Details**:
${contentDetails}

**Long-tail Keywords**:
${strategyReport.longTailKeywords?.join(', ') || 'N/A'}

**Available Components**:
1. "hero" - Hero section with title, subtitle, CTA
2. "features" - Feature cards with icons
3. "content" - Content section with heading and text
4. "testimonials" - Customer testimonials
5. "faq" - Frequently asked questions
6. "cta" - Call-to-action section

**Available Icons**: "Zap", "Shield", "Clock", "Star", "Check"

**Available Themes**: "blue", "green", "purple", "orange", "red"

**CRITICAL REQUIREMENTS**:

1. **Output ONLY valid JSON** - No explanations, no markdown code blocks

2. **Generate 4-6 sections** based on content structure

3. **Use appropriate icons** for features (Zap for speed, Shield for security, etc.)

4. **Write high-quality content** in ${targetLanguage} language:
   - Include target keyword: ${strategyReport.targetKeyword}
   - Use long-tail keywords naturally
   - Write ${strategyReport.recommendedWordCount} words total across all sections

5. **Section-specific requirements**:
   - Hero: Create compelling title and subtitle
   - Features: 3-6 feature items with icon, title, description
   - Content: Use heading and multi-paragraph HTML content
   - Testimonials: 3-6 customer reviews
   - FAQ: 5-8 common questions with detailed answers
   - CTA: Strong call-to-action message

**Output Format**:
{
  "theme": "blue" | "green" | "purple" | "orange" | "red",
  "sections": [
    {
      "type": "hero",
      "props": {
        "title": "Page title here",
        "subtitle": "Subtitle here",
        "ctaText": "Button text"
      }
    },
    {
      "type": "features",
      "props": {
        "title": "Features heading",
        "features": [
          { "icon": "Zap", "title": "Fast", "description": "Description here" }
        ]
      }
    },
    {
      "type": "content",
      "props": {
        "heading": "Content heading",
        "content": "<p>HTML content here</p><p>Multiple paragraphs</p>",
        "imagePosition": "left" | "right"
      }
    },
    {
      "type": "testimonials",
      "props": {
        "title": "Testimonials heading",
        "testimonials": [
          { "name": "John Doe", "role": "CEO", "content": "Review text", "rating": 5 }
        ]
      }
    },
    {
      "type": "faq",
      "props": {
        "title": "FAQ heading",
        "faqs": [
          { "question": "Question here?", "answer": "Answer here" }
        ]
      }
    },
    {
      "type": "cta",
      "props": {
        "title": "CTA title",
        "subtitle": "CTA subtitle",
        "buttonText": "Button text"
      }
    }
  ]
}

Generate the website configuration now.`;

    const result = await callGeminiAPI(
      prompt,
      'You are an expert web designer and SEO specialist. Generate high-quality website configurations.',
      { model: 'gemini-3-flash-preview' }
    );

    // Parse JSON
    let websiteData;
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
        websiteData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in response');
      }
    } catch (parseError) {
      console.error('[generate-app] Parse error:', parseError);
      console.error('[generate-app] Raw response:', result.text.substring(0, 500));
      throw new Error('Failed to parse website data JSON');
    }

    // Validate structure
    if (!websiteData.theme || !Array.isArray(websiteData.sections)) {
      throw new Error('Invalid website data structure');
    }

    console.log('[generate-app] Website data generated successfully');
    console.log('[generate-app] Theme:', websiteData.theme);
    console.log('[generate-app] Sections:', websiteData.sections.length);

    return res.json({
      success: true,
      data: websiteData,
    });

  } catch (error: any) {
    console.error('[generate-app] Error:', error);
    return sendErrorResponse(res, error, 'Failed to generate website data');
  }
}
