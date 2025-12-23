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
    const { currentCode, userRequest, chatHistory } = body;

    if (!currentCode || !userRequest) {
      return res.status(400).json({ error: 'Current code and user request are required' });
    }

    console.log('[optimize-website] Optimizing website based on:', userRequest);

    // Build conversation context
    const conversationContext = chatHistory
      ?.slice(-5) // Only last 5 messages for context
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n') || '';

    const prompt = `You are an expert web developer. The user has a website and wants to make changes.

**Current Website Code:**
HTML (body only):
\`\`\`html
${currentCode.html}
\`\`\`

CSS (custom styles):
\`\`\`css
${currentCode.css}
\`\`\`

JavaScript:
\`\`\`javascript
${currentCode.js}
\`\`\`

**Recent Conversation:**
${conversationContext}

**User's New Request:**
${userRequest}

**Instructions:**
1. Understand the user's request carefully
2. Modify ONLY the parts of the code that need to change
3. Keep the existing structure and functionality intact unless asked to change
4. Return complete, working code (not just the changes)
5. Maintain SEO best practices
6. Keep the code production-ready

**Important:**
- HTML: Return only the body content (no DOCTYPE, html, head, or body tags)
- CSS: Return only custom styles (Tailwind CDN is loaded separately)
- JS: Return vanilla JavaScript

**IMPORTANT OUTPUT FORMAT**:
Return your response as a valid JSON object with exactly three fields:
{
  "html": "updated body content here (string)",
  "css": "updated custom styles here (string)",
  "js": "updated javascript code here (string)"
}

Do not include any markdown code blocks, explanations, or additional text. Return ONLY the raw JSON object.`;

    console.log('[optimize-website] Calling Gemini API...');

    const result = await callGeminiAPI(prompt, 'You are an expert web developer and SEO specialist.');

    console.log('[optimize-website] Raw API response:', result.text.substring(0, 200));

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
      console.error('[optimize-website] JSON parse error:', parseError);
      console.error('[optimize-website] Failed to parse:', result.text.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!codeObject.html || !codeObject.css || !codeObject.js) {
      throw new Error('AI response missing required fields (html, css, or js)');
    }

    console.log('[optimize-website] Optimization completed successfully');
    console.log('[optimize-website] HTML length:', codeObject.html.length);
    console.log('[optimize-website] CSS length:', codeObject.css.length);
    console.log('[optimize-website] JS length:', codeObject.js.length);

    return res.json({
      success: true,
      code: codeObject,
      message: `✅ 已根据您的要求更新网站代码`,
    });

  } catch (error: any) {
    console.error('[optimize-website] Error:', error);
    return sendErrorResponse(res, error, 'Failed to optimize website');
  }
}
