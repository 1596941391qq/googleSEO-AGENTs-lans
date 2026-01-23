
import { convertMarkdownToHtml } from '../api/_shared/utils/markdown-converter.js';
import { addArticleToMkDocs } from '../api/_shared/services/github.js';
import { rebuildStaticSiteIndex } from '../api/_shared/services/static-site.js';
import { createInterface } from 'readline';

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function run() {
    console.log('=== HTML Publishing System Test (Manual) ===');
    console.log('This script bypasses the database and tests the core Logic: Markdown -> HTML -> GitHub');

    // 1. Get Config
    const token = await question('Enter GitHub Token: ');
    const owner = await question('Enter Repo Owner: ');
    const repo = await question('Enter Repo Name: ');

    if (!token || !owner || !repo) {
        console.error('Missing required info');
        process.exit(1);
    }

    // 2. Prepare Content
    const article = {
        title: 'System Test HTML Article',
        content: `
# Hello from Manual Test

This is a test article published via the manual test script to verify HTML conversion and Netlify hosting compatibility.

## Features Verified

- [x] Markdown to HTML conversion
- [x] GitHub API interaction
- [x] HTML file upload
- [ ] Netlify deployment (Verify URL manually)

**Time:** ${new Date().toISOString()}
    `,
        slug: 'system-test-html-' + Date.now(),
        metaDescription: 'A test article for verifying the publishing flow',
        keyword: 'test'
    };

    console.log('\n--- Step 1: Converting Markdown to HTML ---');
    const html = convertMarkdownToHtml(article.content, article.title, {
        description: article.metaDescription,
        keywords: article.keyword
    });
    console.log('HTML Length:', html.length);
    console.log('Preview:', html.substring(0, 200).replace(/\n/g, ' '));

    console.log('\n--- Step 2: Pushing to GitHub ---');
    try {
        const result = await addArticleToMkDocs({
            token,
            owner,
            repoName: repo,
            articleSlug: article.slug,
            articleTitle: article.title,
            articleContent: html,
            branch: 'main',
            extension: '.html' // CRITICAL: Explicitly asking for HTML extension
        });

        if (result.success) {
            console.log('✅ Success! File uploaded.');
            console.log('GitHub Path:', result.articlePath);
            // Construct approximate Netlify URL (assumption)
            console.log('Likely Netlify URL:', `https://${repo}.netlify.app/docs/${article.slug}.html`);
            console.log('(Note: Netlify URL depends on your site name configuration)');

            console.log('\n--- Step 3: Rebuilding Index ---');
            const indexResult = await rebuildStaticSiteIndex({ token, owner, repoName: repo });
            if (indexResult.success) {
                console.log('✅ Index rebuilt successfully.');
            } else {
                console.warn('⚠️ Failed to rebuild index:', indexResult.error);
            }

        } else {
            console.error('❌ Failed:', result.error);
        }
    } catch (err) {
        console.error('❌ Exception:', err);
    }

    rl.close();
}

run();
