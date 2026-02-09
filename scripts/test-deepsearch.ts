/**
 * UniFuncs Deep Search API 测试脚本
 * 用于测试 Deep Search API 的返回数据，并优化展示和数据库字段设计
 * 
 * 使用方法：
 * 1. 设置环境变量: $env:UNIFUNCS_API_KEY="your_key"; npx tsx scripts/test-deepsearch.ts
 * 2. 命令行参数: npx tsx scripts/test-deepsearch.ts your_key
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// 手动加载 .env.local 文件
function loadEnvFile() {
  const envPaths = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      console.log(`📄 Loading environment from: ${envPath}`);
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            process.env[key.trim()] = value.trim();
          }
        }
      }
      return true;
    }
  }
  return false;
}

// 加载环境变量
loadEnvFile();

interface DeepSearchRequest {
  articleTitle: string;
  articleUrl: string;
  promotionWebsite: string;
  promotionKeywords?: string[];
}

interface DeepSearchResponse {
  success: boolean;
  shareUrl?: string;
  error?: string;
  rawResponse?: string;
  metadata?: {
    totalChunks: number;
    responseLength: number;
    processingTime: number;
    hasShareUrl: boolean;
  };
}

/**
 * 测试 Deep Search API
 */
async function testDeepSearchAPI(request: DeepSearchRequest): Promise<DeepSearchResponse> {
  // 从环境变量或命令行参数获取 API Key
  const apiKey = process.env.UNIFUNCS_API_KEY || process.argv[2];

  if (!apiKey) {
    console.error('❌ UNIFUNCS_API_KEY not found');
    console.error('Please provide API key in one of the following ways:');
    console.error('  1. Set UNIFUNCS_API_KEY environment variable');
    console.error('  2. Create .env file with UNIFUNCS_API_KEY=your_key');
    console.error('  3. Pass as command line argument: npm run test:deepsearch YOUR_API_KEY');
    return {
      success: false,
      error: 'UNIFUNCS_API_KEY not configured',
    };
  }

  const { articleTitle, articleUrl, promotionWebsite, promotionKeywords } = request;

  console.log('\n' + '='.repeat(80));
  console.log('🚀 Starting Deep Search API Test');
  console.log('='.repeat(80));
  console.log(`📝 Article Title: "${articleTitle}"`);
  console.log(`🔗 Article URL: ${articleUrl}`);
  console.log(`🌐 Promotion Website: ${promotionWebsite}`);
  console.log(`🔑 Keywords: ${promotionKeywords?.join(', ') || 'None'}`);
  console.log('='.repeat(80) + '\n');

  // 构建请求体
  const requestBody = {
    model: 's2',
    messages: [
      {
        role: 'user',
        content: articleTitle,
      },
    ],
    stream: true,
    important_urls: [
      promotionWebsite,
      articleUrl,
    ],
    important_keywords: promotionKeywords || [promotionWebsite],
    important_prompt: '联网搜索将其他产品和推广网站进行评测对比，并用自然的方式突出推广的产品',
    push_to_share: true,
    set_public: true,
  };

  console.log('📤 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n' + '─'.repeat(80) + '\n');

  const startTime = Date.now();

  try {
    const response = await fetch('https://api.unifuncs.com/deepsearch/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      return {
        success: false,
        error: `Deep Search API error: ${response.status} ${response.statusText}`,
      };
    }

    console.log('✅ API request successful, processing stream...\n');
    console.log('📥 Stream Output:');
    console.log('─'.repeat(80));

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('❌ No response body reader available');
      return {
        success: false,
        error: 'No response body',
      };
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let shareUrl: string | undefined;
    let chunkCount = 0;
    const chunks: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;
      chunks.push(chunk);
      chunkCount++;

      // 实时输出到控制台
      process.stdout.write(chunk);

      // 尝试提取分享链接
      const shareUrlMatch = chunk.match(/"share_url"\s*:\s*"([^"]+)"/);
      if (shareUrlMatch) {
        shareUrl = shareUrlMatch[1];
        console.log(`\n\n🔗 Found share URL: ${shareUrl}\n`);
      }
    }

    const processingTime = Date.now() - startTime;

    console.log('\n' + '─'.repeat(80));
    console.log('\n' + '='.repeat(80));
    console.log('✅ Stream Completed');
    console.log('='.repeat(80));
    console.log(`📊 Total Chunks: ${chunkCount}`);
    console.log(`📏 Response Length: ${fullResponse.length} characters`);
    console.log(`⏱️  Processing Time: ${(processingTime / 1000).toFixed(2)}s`);
    console.log(`🔗 Share URL: ${shareUrl || 'Not found'}`);
    console.log('='.repeat(80) + '\n');

    // 分析响应结构
    console.log('🔍 Analyzing Response Structure...\n');
    analyzeResponse(fullResponse, chunks);

    return {
      success: true,
      shareUrl,
      rawResponse: fullResponse,
      metadata: {
        totalChunks: chunkCount,
        responseLength: fullResponse.length,
        processingTime,
        hasShareUrl: !!shareUrl,
      },
    };

  } catch (error: any) {
    console.error('❌ Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * 分析响应结构
 */
function analyzeResponse(fullResponse: string, chunks: string[]) {
  console.log('📋 Response Analysis:');
  console.log('─'.repeat(80));

  // 1. 检查是否包含 SSE 格式
  const sseLines = fullResponse.split('\n').filter(line => line.startsWith('data:'));
  console.log(`SSE Lines: ${sseLines.length}`);

  // 2. 尝试解析 JSON 对象
  const jsonObjects: any[] = [];
  for (const line of sseLines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.substring(6).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const obj = JSON.parse(jsonStr);
          jsonObjects.push(obj);
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }

  console.log(`Parsed JSON Objects: ${jsonObjects.length}`);

  // 3. 提取关键字段
  if (jsonObjects.length > 0) {
    console.log('\n📦 Sample JSON Object (first):');
    console.log(JSON.stringify(jsonObjects[0], null, 2));

    if (jsonObjects.length > 1) {
      console.log('\n📦 Sample JSON Object (last):');
      console.log(JSON.stringify(jsonObjects[jsonObjects.length - 1], null, 2));
    }

    // 统计字段出现频率
    const fieldCounts: Record<string, number> = {};
    for (const obj of jsonObjects) {
      for (const key of Object.keys(obj)) {
        fieldCounts[key] = (fieldCounts[key] || 0) + 1;
      }
    }

    console.log('\n📊 Field Frequency:');
    for (const [field, count] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${field}: ${count} times (${((count / jsonObjects.length) * 100).toFixed(1)}%)`);
    }
  }

  // 4. 提取所有可能的 URL
  const urlPattern = /https?:\/\/[^\s"']+/g;
  const urls = fullResponse.match(urlPattern) || [];
  const uniqueUrls = [...new Set(urls)];

  console.log(`\n🔗 Found URLs: ${uniqueUrls.length}`);
  uniqueUrls.forEach((url, i) => {
    console.log(`  ${i + 1}. ${url}`);
  });

  console.log('─'.repeat(80) + '\n');
}

/**
 * 生成数据库字段建议
 */
function generateDatabaseSchema() {
  console.log('='.repeat(80));
  console.log('💾 Suggested Database Schema');
  console.log('='.repeat(80));
  console.log(`
-- 添加 Deep Search 相关字段到 published_articles 表
ALTER TABLE published_articles ADD COLUMN IF NOT EXISTS deepsearch_share_url TEXT;
ALTER TABLE published_articles ADD COLUMN IF NOT EXISTS deepsearch_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE published_articles ADD COLUMN IF NOT EXISTS deepsearch_indexed_at TIMESTAMP;
ALTER TABLE published_articles ADD COLUMN IF NOT EXISTS deepsearch_response_length INTEGER;
ALTER TABLE published_articles ADD COLUMN IF NOT EXISTS deepsearch_processing_time INTEGER;
ALTER TABLE published_articles ADD COLUMN IF NOT EXISTS deepsearch_error TEXT;

-- 或者创建独立的 Deep Search 索引表
CREATE TABLE IF NOT EXISTS deepsearch_indexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES published_articles(id) ON DELETE CASCADE,
  share_url TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
  response_length INTEGER,
  processing_time INTEGER, -- 毫秒
  error_message TEXT,
  raw_response TEXT, -- 可选：存储完整响应用于调试
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(article_id)
);

CREATE INDEX IF NOT EXISTS idx_deepsearch_indexes_article_id ON deepsearch_indexes(article_id);
CREATE INDEX IF NOT EXISTS idx_deepsearch_indexes_status ON deepsearch_indexes(status);
  `);
  console.log('='.repeat(80) + '\n');
}

/**
 * 生成用户展示数据建议
 */
function generateUserDisplaySuggestions() {
  console.log('='.repeat(80));
  console.log('👤 User Display Suggestions');
  console.log('='.repeat(80));
  console.log(`
📊 发布成功后展示给用户的信息：

1. 基本信息：
   ✅ 文章标题
   ✅ 发布平台 (CF Pages/Netlify/Vercel)
   ✅ 站点名称
   ✅ 文章 URL
   ✅ 站点首页 URL
   ✅ GitHub 仓库 URL

2. Deep Search 索引信息：
   ✅ 索引状态：成功/失败/处理中
   ✅ 分享链接 (share_url) - 用户可以查看 Deep Search 生成的内容
   ✅ 处理时间
   ⚠️  错误信息（如果失败）

3. 建议的 UI 展示：
   
   ┌─────────────────────────────────────────────────────────┐
   │ 🎉 文章发布成功！                                        │
   ├─────────────────────────────────────────────────────────┤
   │ 📝 标题: "Your Article Title"                           │
   │ 🌐 平台: Cloudflare Pages                               │
   │ 🔗 文章链接: https://your-site.pages.dev/article-slug/  │
   │ 🏠 站点首页: https://your-site.pages.dev                │
   │ 💻 GitHub: https://github.com/owner/repo                │
   ├─────────────────────────────────────────────────────────┤
   │ 🔍 Deep Search 索引                                      │
   │ ✅ 状态: 已完成                                          │
   │ 🔗 分享链接: https://s.unifuncs.com/share/xxx           │
   │ ⏱️  处理时间: 45.2s                                      │
   └─────────────────────────────────────────────────────────┘

4. API 返回格式建议：
   {
     "success": true,
     "data": {
       "message": "Article published successfully",
       "article": {
         "id": "uuid",
         "title": "Article Title",
         "liveUrl": "https://...",
         "siteUrl": "https://...",
         "repoUrl": "https://github.com/..."
       },
       "platform": {
         "name": "cf_pages",
         "displayName": "Cloudflare Pages",
         "siteName": "your-site"
       },
       "deepSearch": {
         "status": "success",
         "shareUrl": "https://s.unifuncs.com/share/xxx",
         "processingTime": 45200,
         "indexedAt": "2024-01-01T00:00:00Z"
       }
     }
   }
  `);
  console.log('='.repeat(80) + '\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('\n🧪 UniFuncs Deep Search API Test Script\n');

  // 测试数据
  const testRequest: DeepSearchRequest = {
    articleTitle: 'Best SEO Tools for 2024: Complete Guide',
    articleUrl: 'https://example-site.pages.dev/best-seo-tools-2024/',
    promotionWebsite: 'https://nichedigger.ai',
    promotionKeywords: ['nichedigger', 'SEO tool', 'keyword research'],
  };

  // 执行测试
  const result = await testDeepSearchAPI(testRequest);

  // 显示结果摘要
  console.log('='.repeat(80));
  console.log('📋 Test Result Summary');
  console.log('='.repeat(80));
  console.log(`Success: ${result.success ? '✅' : '❌'}`);
  if (result.success) {
    console.log(`Share URL: ${result.shareUrl || 'Not found'}`);
    console.log(`Response Length: ${result.metadata?.responseLength || 0} characters`);
    console.log(`Processing Time: ${((result.metadata?.processingTime || 0) / 1000).toFixed(2)}s`);
  } else {
    console.log(`Error: ${result.error}`);
  }
  console.log('='.repeat(80) + '\n');

  // 生成数据库字段建议
  generateDatabaseSchema();

  // 生成用户展示建议
  generateUserDisplaySuggestions();

  console.log('✅ Test completed!\n');
}

// 运行测试
main().catch(console.error);

