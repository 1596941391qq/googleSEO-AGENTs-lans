/**
 * 临时脚本: 更新站点的 GitHub Token
 */

// 直接通过 SQL 更新,避免数据库连接问题
const siteId = '98e32922-0bc8-4f30-b03e-b4c2bd18f1bd';

console.log('[Update Site Token] 请在浏览器控制台执行以下代码:');
console.log('');
console.log('```javascript');
console.log(`// 1. 获取新 GitHub Token 的 ID
fetch('/api/admin/tokens')
  .then(r => r.json())
  .then(data => {
    const newToken = data.data.githubTokens.find(t => t.name === 'GitHub 2423818852');
    console.log('New Token ID:', newToken.id);
    console.log('New Token Owner:', newToken.owner_name);
    
    // 2. 更新站点配置(需要创建 API 或直接用 SQL)
    // 由于没有现成的 API,我们需要手动在数据库中更新
    console.log('');
    console.log('请告诉 AI Token ID,它会帮你更新数据库');
    return newToken.id;
  });
`);
console.log('```');
