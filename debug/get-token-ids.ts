import { getAllGitHubTokens, getAllPlatformTokens } from '../api/lib/database.js';

async function main() {
    try {
        const githubTokens = await getAllGitHubTokens();
        const platformTokens = await getAllPlatformTokens();

        console.log('--- GitHub Tokens ---');
        githubTokens.forEach(t => {
            console.log(`ID: ${t.id} | Name: ${t.name} | Owner: ${t.owner_name}`);
        });

        console.log('\n--- Platform Tokens ---');
        platformTokens.forEach(t => {
            console.log(`ID: ${t.id} | Platform: ${t.platform} | Name: ${t.name}`);
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
