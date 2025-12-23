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
    const { currentData, userRequest, chatHistory } = body;

    if (!currentData || !userRequest) {
      return res.status(400).json({ error: 'Current data and user request are required' });
    }

    console.log('[optimize-component] Optimizing based on request:', userRequest);

    // Build conversation context (last 5 messages)
    const conversationContext = chatHistory
      ?.slice(-5)
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n') || '';

    const prompt = `You are modifying a website configuration based on user feedback.

**Current Website Data (JSON)**:
\`\`\`json
${JSON.stringify(currentData, null, 2)}
\`\`\`

**Recent Conversation**:
${conversationContext}

**User's Request**:
${userRequest}

**Instructions**:
1. Understand the user's request carefully
2. Modify ONLY the data that needs to change
3. Keep existing structure unless asked to change
4. Maintain SEO best practices in content
5. Return valid JSON in the same format

**Available Section Types**:
- hero: title, subtitle, ctaText
- features: title, features[] (icon, title, description)
- content: heading, content (HTML), imagePosition
- testimonials: title, testimonials[] (name, role, content, rating)
- faq: title, faqs[] (question, answer)
- cta: title, subtitle, buttonText

**Available Themes**: blue, green, purple, orange, red

**Available Icons**: Zap, Shield, Clock, Star, Check

**CRITICAL**:
- Return ONLY valid JSON, no explanation
- Maintain the exact structure: { "theme": "...", "sections": [...] }
- Each section must have "type" and "props" fields

**Output Format**:
Return the complete updated website data in JSON format.`;

    const result = await callGeminiAPI(
      prompt,
      'You are an expert web designer. Make precise data modifications based on user requests.',
      { model: 'gemini-3-flash-preview' }
    );

    // Extract JSON
    let updatedData;
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
        updatedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in response');
      }
    } catch (parseError) {
      console.error('[optimize-component] Parse error:', parseError);
      console.error('[optimize-component] Raw response:', result.text.substring(0, 500));
      throw new Error('Failed to parse updated data JSON');
    }

    // Validate structure
    if (!updatedData.theme || !Array.isArray(updatedData.sections)) {
      throw new Error('Invalid website data structure');
    }

    console.log('[optimize-component] Optimization completed');
    console.log('[optimize-component] Updated sections:', updatedData.sections.length);

    return res.json({
      success: true,
      data: updatedData,
      message: '✅ 已根据您的要求更新网站',
    });

  } catch (error: any) {
    console.error('[optimize-component] Error:', error);
    return sendErrorResponse(res, error, 'Failed to optimize component');
  }
}
