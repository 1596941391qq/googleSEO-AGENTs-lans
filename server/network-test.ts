// 网络连接测试脚本
// 运行: npx tsx server/network-test.ts

async function testNetwork() {
  console.log("🔍 测试网络连接...\n");
  
  // 测试 1: 基本网络连接
  console.log("1. 测试基本网络连接...");
  try {
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) 
    });
    console.log("✅ Google 可访问");
  } catch (error: any) {
    console.log("❌ 无法访问 Google:", error.message);
    console.log("   这可能是因为网络限制或需要代理\n");
  }
  
  // 测试 2: Gemini API 端点
  console.log("2. 测试 Gemini API 端点...");
  try {
    const response = await fetch('https://generativelanguage.googleapis.com', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) 
    });
    console.log("✅ Gemini API 可访问");
  } catch (error: any) {
    console.log("❌ 无法访问 Gemini API:", error.message);
    console.log("   这会导致 'fetch failed' 错误\n");
  }
  
  // 测试 3: 检查代理设置
  console.log("3. 检查代理设置...");
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  
  if (httpProxy || httpsProxy) {
    console.log("✅ 检测到代理设置:");
    if (httpProxy) console.log(`   HTTP_PROXY: ${httpProxy}`);
    if (httpsProxy) console.log(`   HTTPS_PROXY: ${httpsProxy}`);
  } else {
    console.log("⚠️  未检测到代理设置");
    console.log("   如果无法访问 Google 服务，可能需要配置代理");
    console.log("   设置方法: export HTTPS_PROXY=http://your-proxy:port\n");
  }
  
  // 测试 4: API Key
  console.log("4. 检查 API Key...");
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    console.log(`✅ API Key 已设置 (长度: ${apiKey.length})`);
    if (apiKey.startsWith('AIza')) {
      console.log("✅ API Key 格式正确");
    } else {
      console.log("⚠️  API Key 格式可能不正确（通常以 'AIza' 开头）");
    }
  } else {
    console.log("❌ API Key 未设置");
  }
  
  console.log("\n📝 建议:");
  if (!apiKey) {
    console.log("   1. 在 .env 文件中设置 GEMINI_API_KEY");
  }
  console.log("   2. 如果网络受限，需要配置代理或使用 VPN");
  console.log("   3. 确保能够访问 generativelanguage.googleapis.com");
}

testNetwork().catch(console.error);

