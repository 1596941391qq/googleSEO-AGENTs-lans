/**
 * 更新站点使用的 GitHub Token
 * 
 * 在浏览器控制台执行以下代码:
 */

// 步骤 1: 获取新 GitHub Token 的 ID
fetch('/api/admin/tokens')
    .then(r => r.json())
    .then(data => {
        const newToken = data.data.githubTokens.find(t => t.name === 'GitHub 2423818852');

        if (!newToken) {
            console.error('❌ Token "GitHub 2423818852" not found');
            return;
        }

        console.log('✅ Found Token:');
        console.log('  - ID:', newToken.id);
        console.log('  - Name:', newToken.name);
        console.log('  - Owner:', newToken.owner_name);
        console.log('');

        // 步骤 2: 更新站点配置
        console.log('Updating site...');
        return fetch('/api/admin/update-site-github-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteId: '98e32922-0bc8-4f30-b03e-b4c2bd18f1bd',
                githubTokenId: newToken.id
            })
        });
    })
    .then(r => r ? r.json() : null)
    .then(result => {
        if (result) {
            console.log('');
            console.log('✅ Site updated successfully!');
            console.log('Result:', result);
        }
    })
    .catch(err => {
        console.error('❌ Error:', err);
    });
