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

    console.log('[generate-website] Generating website for keyword:', strategyReport.targetKeyword);

    // Build comprehensive prompt from SEO strategy
    const contentStructureText = strategyReport.contentStructure
      .map((section: any, i: number) => `${i + 1}. ${section.header}\n   ${section.description}`)
      .join('\n');

    const longTailKeywordsText = strategyReport.longTailKeywords?.join(', ') || '';

    const prompt = `Generate a complete, production-ready SEO-optimized website based on this strategy:

**Target Keyword**: ${strategyReport.targetKeyword}
**Page Title (H1)**: ${strategyReport.pageTitleH1}
**Meta Description**: ${strategyReport.metaDescription}
**URL Slug**: ${strategyReport.urlSlug}
**User Intent**: ${strategyReport.userIntentSummary}
**Recommended Word Count**: ${strategyReport.recommendedWordCount} words

**Content Structure**:
${contentStructureText}

**Long-tail Keywords**: ${longTailKeywordsText}

**CRITICAL REQUIREMENTS**:

1. **HTML Structure**:
   - Return ONLY the body content (no <!DOCTYPE>, <html>, <head>, or <body> tags)
   - Use semantic HTML5 structure: <header>, <nav>, <main>, <article>, <section>, <aside>, <footer>
   - Include an attractive hero section with the H1 title
   - Create sections for each content structure point above
   - Add a call-to-action section
   - Use proper heading hierarchy (H1 → H2 → H3)
   - Add internal anchor links in navigation

2. **CSS Styling**:
   - Use Tailwind CSS classes extensively for styling
   - Return ONLY custom CSS (Tailwind CDN will be loaded separately)
   - Create a modern, professional design
   - Ensure mobile-first responsive design
   - Use gradient backgrounds, shadows, and modern effects
   - Include hover animations and transitions

3. **JavaScript**:
   - Add smooth scroll behavior for anchor links
   - Add scroll animations (fade-in, slide-up effects)
   - Add mobile menu toggle
   - Keep it lightweight and vanilla JS only

4. **SEO Optimization**:
   - Natural keyword density (target keyword: ${strategyReport.targetKeyword})
   - Use long-tail keywords throughout content
   - Add schema.org Article structured data in a <script type="application/ld+json"> tag
   - Optimize for featured snippets (use lists, tables, FAQs)

5. **Content Quality**:
   - Write ${strategyReport.recommendedWordCount} words of high-quality, informative content
   - Use the language: ${targetLanguage}
   - Make content engaging and valuable
   - Include statistics, examples, and actionable tips

6. **Design**:
   - Professional color scheme (you choose)
   - Clean typography
   - Ample white space
   - Visual hierarchy
   - Trust signals (testimonials, credentials if applicable)

**IMPORTANT OUTPUT FORMAT**:
Return your response as a valid JSON object with exactly three fields:
{
  "html": "body content here (string)",
  "css": "custom styles here (string)",
  "js": "javascript code here (string)"
}

Do not include any markdown code blocks, explanations, or additional text. Return ONLY the raw JSON object.`;

    console.log('[generate-website] Calling Gemini API...');

    const result = await callGeminiAPI(prompt, 'You are an expert web developer and SEO specialist.');

    console.log('[generate-website] Raw API response:', result.text.substring(0, 200));

    // Parse JSON response
    let codeObject;
    try {
      // Remove markdown code blocks if present
      let cleanedResult = result.text.trim();
      if (cleanedResult.startsWith('```json')) {
        cleanedResult = cleanedResult.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedResult.startsWith('```')) {
        cleanedResult = cleanedResult.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      codeObject = JSON.parse(cleanedResult);
    } catch (parseError) {
      console.error('[generate-website] JSON parse error:', parseError);
      console.error('[generate-website] Failed to parse:', result.text.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!codeObject.html || !codeObject.css || !codeObject.js) {
      throw new Error('AI response missing required fields (html, css, or js)');
    }

    console.log('[generate-website] Website generated successfully');
    console.log('[generate-website] HTML length:', codeObject.html.length);
    console.log('[generate-website] CSS length:', codeObject.css.length);
    console.log('[generate-website] JS length:', codeObject.js.length);

    return res.json({
      success: true,
      code: codeObject,
    });

  } catch (error: any) {
    console.error('[generate-website] Error:', error);
    return sendErrorResponse(res, error, 'Failed to generate website');
  }
}
