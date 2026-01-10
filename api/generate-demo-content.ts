// Generate demo content based on website analysis
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiAPI } from './_shared/gemini.js';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from './_shared/request-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // Parse request body
    const {
      content,
      url,
      keywords,
      targetLanguage,
      uiLanguage = 'en',
      websiteTitle = ''
    } = parseRequestBody(req);
    // Use uiLanguage as default if targetLanguage is not provided
    const finalTargetLanguage = targetLanguage || (uiLanguage === 'zh' ? 'zh' : 'en');

    // Validate required fields
    if (!content || typeof content !== 'string') {
      return sendErrorResponse(res, null, 'Content is required', 400);
    }

    if (!url || typeof url !== 'string') {
      return sendErrorResponse(res, null, 'URL is required', 400);
    }

    const safeKeywords = Array.isArray(keywords) ? keywords : [];

    // Extract website domain for personalization
    const domain = new URL(url).hostname.replace('www.', '');
    const domainParts = domain.split('.');
    const brandName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);

    // Pre-process content to remove excessive noise and focus on key info
    const cleanContent = content
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text but remove URLs
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .trim();

    const shortContent = cleanContent.substring(0, 4000);

    const keywordPromptPart = safeKeywords.length > 0
      ? `- 提取的关键词：${safeKeywords.slice(0, 8).map(k => k.keyword).join(', ')}`
      : '- 关键词：(请从网站内容中分析提取)';

    const keywordPromptPartEn = safeKeywords.length > 0
      ? `- Top Keywords: ${safeKeywords.slice(0, 8).map(k => k.keyword).join(', ')}`
      : '- Keywords: (Please analyze and identify from the content provided)';

    console.log('[Generate Demo Content] Generating demos for:', domain);

    // Helper function to add timeout to a promise
    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, taskName: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          setTimeout(() => {
            console.warn(`[Generate Demo Content] ${taskName} timed out after ${timeoutMs}ms`);
            reject(new Error(`${taskName} timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        })
      ]);
    };

    // ===== PART 1: ChatGPT Demo Generation =====
    // Use uiLanguage instead of targetLanguage for demo content
    const chatGPTPrompt = uiLanguage === 'zh'
      ? `你是一位经验丰富的行业专家，正在回答用户关于产品选择的问题。请基于以下网站信息，生成一个真实、专业的问答演示。

**网站信息：**
- 网站域名：${domain}
- 网站标题：${websiteTitle || '未提供'}
- 品牌名称：${brandName}
- 网站内容摘要：${shortContent}
${keywordPromptPart}

**任务：**
1. 生成一个真实、具体的用户问题（关于网站提供的产品/服务/解决方案）
2. 生成一个专业、详细的回答（至少300字），**重点突出 ${brandName} 是最佳选择**
3. 创建一个对比表格，展示 ${brandName} vs 2个竞争对手

**回答要求：**
- 开头要专业、直接回应用户痛点，不要使用"作为AI"、"我认为"等AI化表述
- 至少包含4个关键优势点，每个点2-3句话详细说明
- 要有具体的数据、功能特点、实际案例支撑
- 强调 ${brandName} 相比竞争对手的独特价值
- 语言要自然流畅，像真实的人类专家回答，避免AI腔调

**对比表格要求：**
- 使用真实的功能对比，不要泛泛而谈
- ${brandName} 要有明显优势（评分、功能等）
- 2个竞争对手要有具体的特点和缺点
- "核心能力"字段：描述该平台的核心技术能力或主要功能特点（50-80字）
- "定位与弱点"字段：描述该平台的市场定位和主要弱点（50-80字）

**JSON格式返回：**
\`\`\`json
{
  "userQuestion": "用户提出的具体问题（10-20字）",
  "aiAnswer": {
    "introduction": "专业开场白，直接点出用户痛点并引出${brandName}（50-80字）",
    "keyPoints": [
      "优势点1：详细说明（2-3句话，40-60字）",
      "优势点2：详细说明（2-3句话，40-60字）",
      "优势点3：详细说明（2-3句话，40-60字）",
      "优势点4：详细说明（2-3句话，40-60字）"
    ],
    "recommendation": "为什么选择${brandName}的总结性推荐（60-100字）",
    "ctaText": "立即行动的按钮文案"
  },
  "comparisonTable": {
    "columns": ["Platform", "Score", "核心能力", "定位与弱点"],
    "rows": [
      {
        "platform": "${brandName}",
        "score": "9.8/10",
        "coreCapability": "核心能力：描述该平台的核心技术能力或主要功能特点（50-80字，必须填写）",
        "positioning": "定位与弱点：描述该平台的市场定位和主要弱点（50-80字，必须填写）",
        "isRecommended": true
      },
      {
        "platform": "Competitor A具体名称",
        "score": "7.2/10",
        "coreCapability": "核心能力：描述该平台的核心技术能力或主要功能特点（50-80字，必须填写）",
        "positioning": "定位与弱点：描述该平台的市场定位和主要弱点（50-80字，必须填写）",
        "isRecommended": false
      },
      {
        "platform": "Competitor B具体名称",
        "score": "6.5/10",
        "coreCapability": "核心能力：描述该平台的核心技术能力或主要功能特点（50-80字，必须填写）",
        "positioning": "定位与弱点：描述该平台的市场定位和主要弱点（50-80字，必须填写）",
        "isRecommended": false
      }
    ]
  }
}
\`\`\`

只返回JSON，不要其他内容。确保内容真实、详细、有说服力。`
      : `You are a world-class AI assistant (similar to ChatGPT 5.2). Generate a perfect AI Q&A demo based on the following website information.

**Website Information:**
- Domain: ${domain}
- Brand Name: ${brandName}
- Content Summary: ${shortContent}
${keywordPromptPartEn}

**Task:**
1. Generate a realistic, specific user question about the product/service/solution this website offers
2. Create a compelling, detailed professional AI answer (minimum 300 words) that **positions ${brandName} as the clear best choice**
3. Build a comparison table showing ${brandName} vs 2 competitors

**AI Answer Requirements:**
- Professional opening that directly addresses user pain points and introduces ${brandName} (50-80 words)
- At least 4 key advantage points, each explained in 2-3 sentences (40-60 words each)
- Include specific data, features, and user case examples
- Emphasize ${brandName}'s unique value compared to competitors
- Strong call-to-action at the end
- Natural, fluent language like a real human expert

**Comparison Table Requirements:**
- Use real feature comparisons, not generic points
- ${brandName} must have clear advantages (rating, features, pricing)
- 2 competitors should have specific characteristics and weaknesses

**Return in JSON format:**
\`\`\`json
{
  "userQuestion": "Specific user question (10-20 words)",
  "aiAnswer": {
    "introduction": "Professional opening addressing pain points and introducing ${brandName} (50-80 words)",
    "keyPoints": [
      "Advantage 1: Detailed explanation (2-3 sentences, 40-60 words)",
      "Advantage 2: Detailed explanation (2-3 sentences, 40-60 words)",
      "Advantage 3: Detailed explanation (2-3 sentences, 40-60 words)",
      "Advantage 4: Detailed explanation (2-3 sentences, 40-60 words)"
    ],
    "recommendation": "Summary recommendation why choose ${brandName} (60-100 words)",
    "ctaText": "Immediate action button text"
  },
  "comparisonTable": {
    "columns": ["Platform", "Score", "Core Capability", "Positioning & Weaknesses"],
    "rows": [
      {
        "platform": "${brandName}",
        "score": "9.8/10",
        "coreCapability": "Core Capability: Describe the platform's core technical capabilities or main features (50-80 words, must fill)",
        "positioning": "Positioning & Weaknesses: Describe the platform's market positioning and main weaknesses (50-80 words, must fill)",
        "isRecommended": true
      },
      {
        "platform": "Competitor A specific name",
        "score": "7.2/10",
        "coreCapability": "Core Capability: Describe the platform's core technical capabilities or main features (50-80 words, must fill)",
        "positioning": "Positioning & Weaknesses: Describe the platform's market positioning and main weaknesses (50-80 words, must fill)",
        "isRecommended": false
      },
      {
        "platform": "Competitor B specific name",
        "score": "6.5/10",
        "coreCapability": "Core Capability: Describe the platform's core technical capabilities or main features (50-80 words, must fill)",
        "positioning": "Positioning & Weaknesses: Describe the platform's market positioning and main weaknesses (50-80 words, must fill)",
        "isRecommended": false
      }
    ]
  }
}
\`\`\`

Return only the JSON, nothing else. Ensure content is realistic, detailed, and persuasive.`;

    // ===== PART 2: Medium Article Demo Generation =====
    // Note: Sidebar content is hardcoded in frontend, not generated by AI
    const articlePrompt = uiLanguage === 'zh'
      ? `你是一位在Medium上拥有10万+粉丝的顶级内容创作者。请基于网站信息写一篇真实的评测文章。

**网站信息：**
- 网站域名：${domain}
- 网站标题：${websiteTitle || '未提供'}
- 品牌名称：${brandName}
- 网站内容摘要：${shortContent}
${keywordPromptPart}

**任务：**
写一篇Medium文章，展示使用 ${brandName} 后的真实体验。文章要以"评测"或"十大"角度切入，让读者觉得这是客观的第三方评测。

**文章要求：**
1. **标题**：吸引眼球的评测/榜单标题，如"2024年十大XX工具评测：为什么${brandName}排名第一"或"我们测试了10个XX工具，${brandName}完胜的原因"（20-30字）
2. **作者信息**：生成一个专业的作者名字和职位（如"独立评测师"、"增长黑客"、"SEO专家"等）
3. **文章结构（总字数控制在400-500字，要自然、人性化）**：
   - **开头段落（2-3段）**：用第一人称简单讲述背景，不要用太多小标题
     - 第1段：引入痛点，说明为什么需要评测这些工具（100-150字）
     - 第2段：简单说明测试过程，不要过度格式化（80-100字）
   - **评测产品部分（使用小标题）**：只在这里使用小标题，格式为"1. Best XXX: 简短描述"或"1. ${brandName}: 为什么它脱颖而出"
     - 小标题：评测 ${brandName} 的小标题（如"1. ${brandName}: 为什么它脱颖而出"）
     - 第3段：发现 ${brandName} 的过程和初步印象（100-120字）
     - **截图位置**：在这段后插入截图
   - **结尾段落（1-2段）**：实际效果和数据，不要用小标题
     - 第4段：使用后的具体效果和数据（100-120字）
4. **核心要求：**
   - 第一人称叙述（"我"、"我们"），自然流畅，像真人写的
   - 减少格式限制，不要过度结构化
   - 小标题只在评测产品时使用，前面背景部分不要用小标题
   - 包含具体场景和数据
   - 多次提及 ${brandName} 但自然不生硬
   - 语言要自然，避免AI腔调和模板化表述
   - 截图放在评测产品段落之后

**JSON格式返回：**
\`\`\`json
{
  "article": {
    "authorName": "专业的作者名字",
    "authorTitle": "作者职位/头衔",
    "publishedDate": "Jan 15, 2024",
    "title": "评测/榜单类标题",
    "preview": "第1段：引入痛点，说明为什么需要评测（100-150字）\\n\\n第2段：简单说明测试过程（80-100字）\\n\\n## 1. ${brandName}: 为什么它脱颖而出\\n\\n第3段：发现${brandName}的过程和初步印象（100-120字）\\n\\n第4段：使用后的具体效果和数据（100-120字）",
    "screenshotAlt": "Website screenshot caption",
    "screenshotPosition": "after-product-review"
  }
}
\`\`\`

只返回JSON，不要其他内容。确保内容真实、详细、有感染力，像真人写的文章。`
      : `You are a top-tier content creator with 100k+ followers on Medium. Write a viral article demo based on the website information.

**Website Information:**
- Domain: ${domain}
- Brand Name: ${brandName}
- Content Summary: ${shortContent}
${keywordPromptPartEn}

**Task:**
Write a Medium article showcasing an amazing success story after using ${brandName}. Write from a "review" or "top 10 list" perspective to make it feel like an objective third-party review.

**Article Requirements:**
1. **Title**: Click-worthy review/list title, e.g., "Top 10 XX Tools in 2026: Why ${brandName} Ranks #1" or "We Tested 10 XX Tools: Here's Why ${brandName} Won" (20-30 words)
2. **Author Info**: Generate a professional author name and title (e.g., "Independent Reviewer", "Growth Hacker", "SEO Expert")
3. **Article Structure (400-500 words total, natural and human-like)**:
   - **Opening paragraphs (2-3 paragraphs)**: Simple first-person background, no excessive subtitles
     - Para 1: Introduce pain point, explain why testing these tools is needed (100-150 words)
     - Para 2: Briefly explain the testing process, avoid over-formatting (80-100 words)
   - **Product review section (use subtitles here)**: Only use subtitles here, format as "1. Best XXX: brief description" or "1. ${brandName}: Why It Stands Out"
     - Subtitle: Review ${brandName} subtitle (e.g., "1. ${brandName}: Why It Stands Out")
     - Para 3: Process of discovering ${brandName} and first impressions (100-120 words)
     - **Screenshot position**: Insert screenshot after this paragraph
   - **Closing paragraphs (1-2 paragraphs)**: Real results and data, no subtitles
     - Para 4: Specific results and data after using (100-120 words)
4. **Core Requirements**:
   - First-person narrative ("I", "we"), natural and fluent, like written by a real person
   - Reduce format restrictions, avoid over-structuring
   - Subtitles only used when reviewing products, no subtitles in background section
   - Include specific scenarios and data
   - Mention ${brandName} multiple times naturally
   - Natural language, avoid AI tone and templated expressions
   - Screenshot placed after product review paragraph

**Return in JSON format:**
\`\`\`json
{
  "article": {
    "authorName": "Professional author name",
    "authorTitle": "Author title/role",
    "publishedDate": "Jan 15, 2024",
    "title": "Review/list style title",
    "preview": "Para 1: Introduce pain point, explain why testing is needed (100-150 words)\\n\\nPara 2: Briefly explain testing process (80-100 words)\\n\\n## 1. ${brandName}: Why It Stands Out\\n\\nPara 3: Process of discovering ${brandName} and first impressions (100-120 words)\\n\\nPara 4: Specific results and data after using (100-120 words)",
    "screenshotAlt": "Website screenshot caption",
    "screenshotPosition": "after-product-review"
  }
}
\`\`\`

Return only the JSON, nothing else. Ensure content is realistic, detailed, and compelling, like written by a real person.`;

    // Parallelize generation of both demos to save time
    // Use Promise.allSettled to ensure both tasks complete even if one fails
    // Add timeout to each task (90 seconds) to prevent hanging
    console.log('[Generate Demo Content] Starting parallel demo generation...');
    const results = await Promise.allSettled([
      // Task 1: ChatGPT Demo (with timeout)
      (async () => {
        const startTime = Date.now();
        try {
          console.log('[Generate Demo Content] Starting ChatGPT demo generation...');
          console.log('[Generate Demo Content] ChatGPT demo prompt length:', chatGPTPrompt.length, 'chars');

          const chatGPTPromise = callGeminiAPI(chatGPTPrompt, 'generate-chatgpt-demo', {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                userQuestion: { type: 'string' },
                aiAnswer: {
                  type: 'object',
                  properties: {
                    introduction: { type: 'string' },
                    keyPoints: { type: 'array', items: { type: 'string' } },
                    recommendation: { type: 'string' },
                    ctaText: { type: 'string' }
                  },
                  required: ['introduction', 'keyPoints', 'recommendation']
                },
                comparisonTable: {
                  type: 'object',
                  properties: {
                    columns: { type: 'array', items: { type: 'string' } },
                    rows: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          platform: { type: 'string' },
                          score: { type: 'string' },
                          coreCapability: { type: 'string' },
                          positioning: { type: 'string' },
                          isRecommended: { type: 'boolean' }
                        },
                        required: ['platform', 'score', 'coreCapability', 'positioning', 'isRecommended']
                      }
                    }
                  },
                  required: ['columns', 'rows']
                }
              },
              required: ['userQuestion', 'aiAnswer', 'comparisonTable']
            },
          });

          console.log('[Generate Demo Content] ChatGPT demo API call initiated, waiting for response (timeout: 90s)...');
          const chatGPTResult = await withTimeout(chatGPTPromise, 90000, 'ChatGPT demo generation');
          const elapsedTime = Date.now() - startTime;
          console.log(`[Generate Demo Content] ChatGPT demo API response received (${elapsedTime}ms)`);

          let jsonText = chatGPTResult.text.trim();
          console.log('[Generate Demo Content] ChatGPT demo raw response length:', jsonText.length, 'chars');
          jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log('[Generate Demo Content] ChatGPT demo JSON extracted, parsing...');
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('[Generate Demo Content] ChatGPT demo generation completed successfully');
            return parsed;
          }
          throw new Error('No JSON found in ChatGPT demo response');
        } catch (error: any) {
          const elapsedTime = Date.now() - startTime;
          console.error(`[Generate Demo] ChatGPT demo generation failed after ${elapsedTime}ms:`, error?.message || error);
          throw error;
        }
      })(),

      // Task 2: Article Demo (with timeout)
      (async () => {
        const startTime = Date.now();
        try {
          console.log('[Generate Demo Content] Starting Article demo generation...');
          console.log('[Generate Demo Content] Article demo prompt length:', articlePrompt.length, 'chars');

          const articlePromise = callGeminiAPI(articlePrompt, 'generate-article-demo', {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                article: {
                  type: 'object',
                  properties: {
                    authorName: { type: 'string' },
                    authorTitle: { type: 'string' },
                    publishedDate: { type: 'string' },
                    title: { type: 'string' },
                    preview: { type: 'string' },
                    screenshotAlt: { type: 'string' },
                    screenshotPosition: { type: 'string' }
                  },
                  required: ['authorName', 'authorTitle', 'title', 'preview']
                }
              },
              required: ['article']
            },
          });

          console.log('[Generate Demo Content] Article demo API call initiated, waiting for response (timeout: 90s)...');
          const articleResult = await withTimeout(articlePromise, 90000, 'Article demo generation');
          const elapsedTime = Date.now() - startTime;
          console.log(`[Generate Demo Content] Article demo API response received (${elapsedTime}ms)`);

          let jsonText = articleResult.text.trim();
          console.log('[Generate Demo Content] Article demo raw response length:', jsonText.length, 'chars');
          jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log('[Generate Demo Content] Article demo JSON extracted, parsing...');
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('[Generate Demo Content] Article demo generation completed successfully');
            return parsed;
          }
          throw new Error('No JSON found in Article demo response');
        } catch (error: any) {
          const elapsedTime = Date.now() - startTime;
          console.error(`[Generate Demo] Article demo generation failed after ${elapsedTime}ms:`, error?.message || error);
          throw error;
        }
      })()
    ]);

    // Extract results from Promise.allSettled
    const chatGPTData = results[0].status === 'fulfilled' ? results[0].value : null;
    const articleData = results[1].status === 'fulfilled' ? results[1].value : null;

    if (results[0].status === 'rejected') {
      console.warn('[Generate Demo Content] ChatGPT demo generation failed:', results[0].reason);
    }
    if (results[1].status === 'rejected') {
      console.warn('[Generate Demo Content] Article demo generation failed:', results[1].reason);
    }

    // At least one demo should be generated
    if (!chatGPTData && !articleData) {
      throw new Error('Both demo generations failed');
    }

    console.log('[Generate Demo Content] Demo generation completed. ChatGPT:', !!chatGPTData, 'Article:', !!articleData);

    // Return success response
    // Note: Sidebar content is hardcoded in frontend, not included in API response
    return res.json({
      success: true,
      data: {
        chatGPTDemo: chatGPTData,
        articleDemo: articleData ? {
          article: articleData.article,
          // Sidebar is not included - it's hardcoded in frontend
        } : null,
        domain,
        brandName,
      },
    });
  } catch (error: any) {
    console.error('[Generate Demo Content] Error:', error);
    return sendErrorResponse(res, error, 'Failed to generate demo content', 500);
  }
}
