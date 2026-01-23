import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env
import { deployToNetlify } from '../api/_shared/services/platform-deployers.js';
import { rebuildStaticSiteIndex } from '../api/_shared/services/static-site.js';
import { createInterface } from 'readline';

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

// KNOWN CONFIG
const knownConfig = {
    netlifyToken: 'nfp_FcUX5UV1cQU7xwoSqnafr2TXmVzMY7PQ26c2',
    owner: 'ylyy',
    repo: 'pseo-site-050ad0b5'
};

async function getGitHubToken(): Promise<string | null> {
    // 1. Check for manual env var first (user provided)
    if (process.env.githubtoken) {
        console.log('Found manual "githubtoken" in .env');
        return process.env.githubtoken;
    }

    try {
        console.log('Attempting to fetch GitHub token from database...');
        // Dynamic import to ensure env vars are loaded first
        const { getAvailableTokensForNewSite, decryptToken } = await import('../api/lib/database.js');

        // Try to get a token suitable for 'informational' content (or any)
        const tokens = await getAvailableTokensForNewSite('informational');
        if (tokens && tokens.github_token) {
            console.log(`Found GitHub token in database for owner: ${tokens.github_token.owner_name}`);
            if (tokens.github_token.owner_name !== knownConfig.owner) {
                console.warn(`WARNING: Token owner (${tokens.github_token.owner_name}) does not match config owner (${knownConfig.owner}). This might cause 404s.`);
            }
            return decryptToken(tokens.github_token.token_encrypted);
        }
    } catch (error) {
        console.warn('Failed to fetch token from DB:', error);
    }
    return null;
}

async function run() {
    console.log('=== Netlify Auto-Setup & Fix Tool (Automated) ===');

    // 1. Netlify Token
    const netlifyToken = knownConfig.netlifyToken;
    console.log('Using provided Netlify Token.');

    // 2. GitHub Config
    const owner = knownConfig.owner;
    const repo = knownConfig.repo;

    let githubToken = await getGitHubToken();
    if (!githubToken) {
        console.log('Could not automatically retrieve GitHub Token.');
        githubToken = await question('Please Enter GitHub Token manually: ');
    }

    if (!githubToken) {
        console.error('GitHub Token is required to rebuild the index.');
        process.exit(1);
    }

    console.log(`\nConfig: Repo=${owner}/${repo}`);

    // 3. Deploy/Link to Netlify
    console.log('\n--- Linking to Netlify ---');
    const deployResult = await deployToNetlify({
        token: netlifyToken,
        repoOwner: owner,
        repoName: repo,
        siteName: repo,
        buildCommand: '# no build needed',
        publishDir: '.'
    });

    if (deployResult.success) {
        console.log('✅ Netlify Site Created/Linked!');
        console.log('Site URL:', deployResult.siteUrl);
    } else {
        console.error('❌ Netlify Deployment Failed:', deployResult.error);
        // We continue because maybe it just failed to create because it exists, but we explicitly want to fix the Index
    }

    // 4. Rebuild Index
    console.log('\n--- Rebuilding index.html ---');
    const indexResult = await rebuildStaticSiteIndex({
        token: githubToken,
        owner: owner,
        repoName: repo,
        branch: 'main'
    });

    if (indexResult.success) {
        console.log('✅ index.html updated successfully.');
    } else {
        console.error('❌ Failed to update index.html:', indexResult.error);
    }

    console.log('\n=== Done ===');
    rl.close();
    process.exit(0);
}

run();
