/**
 * DataForSEO API 测试脚本
 *
 * 用法: node test-dataforseo.js <domain>
 * 例如: node test-dataforseo.js example.com
 */

const DATAFORSEO_LOGIN = 'soulcraftlimited@galatea.bar';
const DATAFORSEO_PASSWORD = '237696fd88fdfee9';
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

// 创建 Basic Auth 认证头
function createAuthHeader() {
  const credentials = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

// 测试域名概览 API
async function testDomainOverview(domain) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');

  console.log('\n========================================');
  console.log('🧪 测试 DataForSEO Domain Overview API');
  console.log('========================================');
  console.log(`📍 域名: ${cleanDomain}`);
  console.log(`🔑 认证: ${DATAFORSEO_LOGIN}`);

  const url = `${DATAFORSEO_BASE_URL}/domain_analytics/whois/overview/live`;

  const requestBody = [{
    limit: 1,
    filters: [
      ["domain", "=", cleanDomain]
    ],
    order_by: ["metrics.organic.count,desc"]
  }];

  console.log(`\n📤 请求 URL: ${url}`);
  console.log(`📤 请求体:`, JSON.stringify(requestBody, null, 2));

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': createAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const elapsed = Date.now() - startTime;
    console.log(`\n⏱️  请求耗时: ${elapsed}ms`);
    console.log(`📊 HTTP 状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API 错误:`);
      console.error(errorText);
      return null;
    }

    const data = await response.json();

    console.log(`\n✅ 响应成功`);
    console.log(`📥 响应结构:`, {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 0,
      status_code: data?.status_code,
      status_message: data?.status_message,
      tasks: data?.tasks?.length || 0,
    });

    // 显示完整响应（限制大小）
    const jsonStr = JSON.stringify(data, null, 2);
    if (jsonStr.length > 5000) {
      console.log(`\n📄 完整响应 (前 5000 字符):`);
      console.log(jsonStr.substring(0, 5000) + '\n... (truncated)');
    } else {
      console.log(`\n📄 完整响应:`);
      console.log(jsonStr);
    }

    // 解析数据
    if (data.status_code === 20000) {
      console.log(`\n✅ API 调用成功 (status_code: 20000)`);

      if (data.tasks && data.tasks.length > 0) {
        const firstTask = data.tasks[0];
        console.log(`📋 任务状态码: ${firstTask.status_code}`);

        if (firstTask.status_code === 20000 && firstTask.result) {
          const result = firstTask.result[0];

          if (result && result.items && result.items.length > 0) {
            const domainItem = result.items[0];
            const organicMetrics = domainItem.metrics?.organic || {};

            console.log(`\n📈 域名数据:`);
            console.log(`  - 域名: ${domainItem.domain}`);
            console.log(`  - 有机关键词数: ${organicMetrics.count || 0}`);
            console.log(`  - 预估流量价值: $${organicMetrics.etv || 0}`);
            console.log(`  - Pos 1: ${organicMetrics.pos_1 || 0}`);
            console.log(`  - Pos 2-3: ${organicMetrics.pos_2_3 || 0}`);
            console.log(`  - Pos 4-10: ${organicMetrics.pos_4_10 || 0}`);

            if (domainItem.backlinks_info) {
              console.log(`\n🔗 反向链接信息:`);
              console.log(`  - 引用域名: ${domainItem.backlinks_info.referring_domains || 0}`);
              console.log(`  - 引用主域名: ${domainItem.backlinks_info.referring_main_domains || 0}`);
              console.log(`  - 反向链接总数: ${domainItem.backlinks_info.backlinks || 0}`);
            }

            return domainItem;
          } else {
            console.warn(`\n⚠️  没有找到域名数据 (items 数组为空)`);
            console.log(`提示: 这个域名可能在 DataForSEO 数据库中没有记录`);
            return null;
          }
        } else {
          console.error(`\n❌ 任务失败: ${firstTask.status_message || 'Unknown error'}`);
          return null;
        }
      } else {
        console.error(`\n❌ 响应中没有 tasks`);
        return null;
      }
    } else {
      console.error(`\n❌ API 返回错误状态: ${data.status_code}`);
      console.error(`错误信息: ${data.status_message || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.error(`\n❌ 请求失败:`, error.message);
    return null;
  }
}

// 测试域名关键词 API
async function testDomainKeywords(domain, limit = 10) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');

  console.log('\n========================================');
  console.log('🧪 测试 DataForSEO Domain Keywords API');
  console.log('========================================');
  console.log(`📍 域名: ${cleanDomain}`);
  console.log(`🔢 限制: ${limit} 个关键词`);

  const url = `${DATAFORSEO_BASE_URL}/domain_analytics/google/keywords/live`;

  const requestBody = [{
    target: cleanDomain,
    location_code: 2840, // United States
    limit: limit,
  }];

  console.log(`\n📤 请求 URL: ${url}`);
  console.log(`📤 请求体:`, JSON.stringify(requestBody, null, 2));

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': createAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const elapsed = Date.now() - startTime;
    console.log(`\n⏱️  请求耗时: ${elapsed}ms`);
    console.log(`📊 HTTP 状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API 错误:`);
      console.error(errorText);
      return [];
    }

    const data = await response.json();

    console.log(`\n✅ 响应成功`);

    // 显示完整响应（限制大小）
    const jsonStr = JSON.stringify(data, null, 2);
    if (jsonStr.length > 5000) {
      console.log(`\n📄 完整响应 (前 5000 字符):`);
      console.log(jsonStr.substring(0, 5000) + '\n... (truncated)');
    } else {
      console.log(`\n📄 完整响应:`);
      console.log(jsonStr);
    }

    // 解析关键词
    const keywords = [];
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (firstItem.tasks && firstItem.tasks.length > 0) {
        const firstTask = firstItem.tasks[0];
        const taskResult = firstTask.result;

        if (Array.isArray(taskResult)) {
          taskResult.forEach(item => {
            if (item.keyword) {
              keywords.push(item.keyword);
            }
          });
        }
      }
    }

    console.log(`\n📋 提取到 ${keywords.length} 个关键词:`);
    keywords.slice(0, 10).forEach((kw, i) => {
      console.log(`  ${i + 1}. ${kw}`);
    });

    return keywords;
  } catch (error) {
    console.error(`\n❌ 请求失败:`, error.message);
    return [];
  }
}

// 主函数
async function main() {
  const domain = process.argv[2];

  if (!domain) {
    console.error('❌ 请提供域名参数');
    console.log('\n用法: node test-dataforseo.js <domain>');
    console.log('例如: node test-dataforseo.js example.com');
    process.exit(1);
  }

  console.log('🚀 开始测试 DataForSEO API...\n');

  // 测试 1: 域名概览
  const overviewData = await testDomainOverview(domain);

  // 测试 2: 域名关键词
  await testDomainKeywords(domain, 10);

  console.log('\n========================================');
  console.log('✅ 测试完成');
  console.log('========================================\n');

  if (!overviewData) {
    console.log('💡 建议:');
    console.log('  1. 检查域名是否正确（不要包含 http:// 或 www.）');
    console.log('  2. 尝试使用知名网站测试，如: example.com, apple.com');
    console.log('  3. 检查 DataForSEO 账户是否有余额');
    console.log('  4. 查看 DataForSEO 文档: https://docs.dataforseo.com/v3/');
  }
}

main().catch(console.error);
