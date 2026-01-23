import { listRepoContents, createOrUpdateFile } from './github.js';

export async function rebuildStaticSiteIndex(config: {
    token: string;
    owner: string;
    repoName: string;
    branch?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const { token, owner, repoName, branch } = config;

        // 1. Scan for articles
        const articles: { name: string, path: string }[] = [];

        // Check docs/ folder
        const docsResult = await listRepoContents({ token, owner, repoName, path: 'docs', branch });
        if (docsResult.success && docsResult.files) {
            docsResult.files.forEach((f: any) => {
                if (f.name.endsWith('.html') || f.name.endsWith('.md')) {
                    articles.push({ name: f.name, path: f.path });
                }
            });
        }

        // Check root (exclude index.html itself)
        const rootResult = await listRepoContents({ token, owner, repoName, path: '', branch });
        if (rootResult.success && rootResult.files) {
            rootResult.files.forEach((f: any) => {
                if ((f.name.endsWith('.html') || f.name.endsWith('.md')) && f.name !== 'index.html') {
                    articles.push({ name: f.name, path: f.path });
                }
            });
        }

        // 2. Generate HTML
        const articleLinks = articles.map(a => `
        <li>
            <a href="${a.path}">${a.name.replace(/\.(html|md)$/, '').replace(/-/g, ' ')}</a>
            <span class="path">(${a.path})</span>
        </li>
        `).join('\n');

        const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Site Index</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #333; }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 30px; }
        ul { list-style: none; padding: 0; }
        li { margin: 15px 0; padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px; transition: transform 0.2s, box-shadow 0.2s; }
        li:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        a { text-decoration: none; color: #0070f3; font-weight: 600; font-size: 1.1em; display: block; }
        a:hover { text-decoration: underline; }
        .path { display: block; font-size: 0.85em; color: #666; margin-top: 6px; font-family: monospace; }
        .empty { color: #888; font-style: italic; text-align: center; margin-top: 40px; }
        footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; color: #999; font-size: 0.8em; text-align: center; }
    </style>
</head>
<body>
    <h1>📚 Published Articles</h1>
    ${articles.length > 0 ? `<ul>${articleLinks}</ul>` : '<p class="empty">No public articles found yet.</p>'}
    
    <footer>
        Last updated: ${new Date().toLocaleString()}
    </footer>
</body>
</html>`;

        // 3. Push index.html
        const updateResult = await createOrUpdateFile({
            token,
            owner,
            repoName,
            path: 'index.html',
            content: indexHtml,
            message: 'chore: update index.html with latest articles',
            branch: branch || 'main'
        });

        if (!updateResult.success) {
            return { success: false, error: updateResult.error };
        }

        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
