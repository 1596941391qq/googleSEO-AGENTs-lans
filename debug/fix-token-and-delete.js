/**
 * 在浏览器控制台执行此脚本来修复 Token 关联问题
 */

(async () => {
    const adminToken = localStorage.getItem('admin_token');
    const headers = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
    };

    try {
        // 1. 获取所有 Tokens
        const tokensRes = await fetch('/api/admin/tokens', { headers });
        const tokensData = await tokensRes.json();

        console.log('=== All GitHub Tokens ===');
        tokensData.data.githubTokens.forEach(t => {
            console.log(`ID: ${t.id} | Name: ${t.name} | Owner: ${t.owner_name} | Sites: ${t.usage_count}`);
        });

        // 2. 找到正确的 Token (Correct GitHub 2423818852)
        const correctToken = tokensData.data.githubTokens.find(t => t.name === 'Correct GitHub 2423818852');
        const wrongToken = tokensData.data.githubTokens.find(t => t.owner_name.includes('15969413912423818852'));

        if (!correctToken) {
            console.error('❌ Correct token not found!');
            return;
        }

        console.log('\n✅ Correct Token:', correctToken.id, correctToken.owner_name);
        if (wrongToken) {
            console.log('❌ Wrong Token:', wrongToken.id, wrongToken.owner_name);
        }

        // 3. 更新站点使用正确的 Token
        console.log('\n=== Updating Site ===');
        const updateRes = await fetch('/api/admin/update-site-github-token', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                siteId: '98e32922-0bc8-4f30-b03e-b4c2bd18f1bd',
                githubTokenId: correctToken.id
            })
        });

        const updateResult = await updateRes.json();
        console.log('Update Result:', updateResult);

        if (updateResult.success) {
            console.log('✅ Site updated to use correct token!');

            // 4. 现在尝试删除错误的 Token
            if (wrongToken) {
                console.log('\n=== Deleting Wrong Token ===');
                const deleteRes = await fetch('/api/admin/tokens?type=github', {
                    method: 'DELETE',
                    headers: headers,
                    body: JSON.stringify({ tokenId: wrongToken.id })
                });

                const deleteResult = await deleteRes.json();
                console.log('Delete Result:', deleteResult);

                if (deleteResult.success) {
                    console.log('✅ Wrong token deleted successfully!');
                } else {
                    console.error('❌ Failed to delete wrong token:', deleteResult.error);
                }
            }
        } else {
            console.error('❌ Failed to update site:', updateResult.error);
        }

        // 5. 刷新页面查看结果
        console.log('\n=== Refreshing page in 2 seconds ===');
        setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
        console.error('❌ Error:', error);
    }
})();
