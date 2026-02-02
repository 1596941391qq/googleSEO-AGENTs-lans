
import { sql, initPSEOPublishTables, PlatformToken } from '../api/lib/database';

async function checkTokens() {
    try {
        console.log('Initializing tables...');
        await initPSEOPublishTables();

        console.log('Checking Platform Tokens for Netlify...');
        const result = await sql<PlatformToken>`
      SELECT * FROM platform_tokens_v2 
      WHERE platform = 'netlify'
    `;

        if (result.rows.length === 0) {
            console.log('No Netlify tokens found in database!');
        } else {
            console.log(`Found ${result.rows.length} Netlify tokens:`);
            result.rows.forEach(token => {
                console.log(`- ID: ${token.id}`);
                console.log(`  Name: ${token.name}`);
                console.log(`  Status: ${token.status}`); // Critical: must be 'active'
                console.log(`  Usage Count: ${token.usage_count}`);
                console.log(`  Created At: ${token.created_at}`);
            });
        }

        console.log('\nChecking active platform tokens query (used by app):');
        const platforms = ['netlify', 'vercel', 'cf_pages'];
        const activeResult = await sql`
      SELECT * FROM platform_tokens_v2
      WHERE status = 'active' AND platform = ANY(${platforms}::text[])
      ORDER BY usage_count ASC, created_at ASC
    `;

        console.log(`Active Platform Tokens found by app query: ${activeResult.rows.length}`);
        activeResult.rows.forEach(token => {
            console.log(`- [${token.platform}] ${token.name} (${token.status})`);
        });

    } catch (error) {
        console.error('Error checking tokens:', error);
    } finally {
        process.exit(0);
    }
}

checkTokens();
