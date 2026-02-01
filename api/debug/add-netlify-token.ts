/**
 * 临时脚本: 添加 Netlify Token 到数据库
 * 运行: node --loader ts-node/esm api/debug/add-netlify-token.ts
 */

import { createPlatformToken } from '../lib/database.js';

async function main() {
    console.log('[Add Netlify Token] Starting...');

    const netlifyToken = 'nfp_FcUX5UV1cQU7xwoSqnafr2TXmVzMY7PQ26c2';

    try {
        const result = await createPlatformToken({
            platform: 'netlify',
            token: netlifyToken,
            name: 'Netlify Main Token'
        });

        if ('error' in result) {
            console.error('[Add Netlify Token] ❌ Error:', result.error);
            process.exit(1);
        }

        console.log('[Add Netlify Token] ✅ Success!');
        console.log('[Add Netlify Token] Token ID:', result.id);
        console.log('[Add Netlify Token] Platform:', result.platform);
        console.log('[Add Netlify Token] Name:', result.name);
        console.log('[Add Netlify Token] Status:', result.status);

    } catch (error: any) {
        console.error('[Add Netlify Token] ❌ Exception:', error.message);
        process.exit(1);
    }
}

main();
