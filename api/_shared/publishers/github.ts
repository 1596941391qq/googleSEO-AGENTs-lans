/**
 * GitHub 发布适配器
 */

export interface GitHubPublishConfig {
    owner: string;
    repo: string;
    branch?: string;
    token: string;
    path?: string; // 基础路径，例如 'content/posts/'
    message?: string; // 提交信息
    format?: 'markdown' | 'html';
}

/**
 * 将内容发布到 GitHub
 * @param article 包含 title, content, images 的对象
 * @param config GitHub 配置
 */
export async function publishToGitHub(
    article: { title: string; content: string; urlSlug: string; keyword?: string; metaDescription?: string },
    config: GitHubPublishConfig
) {
    const { owner, repo, branch = 'main', token, path = 'content/posts/', message } = config;

    if (!token || !owner || !repo) {
        throw new Error('GitHub token, owner, and repo are required');
    }

    // 1. 准备文件路径和内容
    const isHtml = config.format === 'html';
    const extension = isHtml ? '.html' : '.md';
    const fileName = `${article.urlSlug}${extension}`;
    const fullPath = `${path.endsWith('/') ? path : path + '/'}${fileName}`;

    let finalContent: string;

    if (isHtml) {
        // HTML format not yet implemented - fallback to markdown
        // TODO: Implement markdown-to-html converter
        throw new Error('HTML format is not yet supported. Please use markdown format.');
    } else {
        // 1. 准备文件路径和内容
        // 构建 Frontmatter
        const date = new Date().toISOString();
        const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
date: ${date}
draft: false
${article.keyword ? `tags: ["${article.keyword}"]` : ''}
${article.metaDescription ? `description: "${article.metaDescription.replace(/"/g, '\\"')}"` : ''}
---

`;
        finalContent = frontmatter + article.content;
    }

    const contentBase64 = Buffer.from(finalContent).toString('base64');

    try {
        // 2. 检查文件是否存在（如果存在需要获取 sha 才能更新）
        let sha: string | undefined;
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}${branch ? `?ref=${branch}` : ''}`;

        const checkResponse = await fetch(getUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
            }
        });

        if (checkResponse.ok) {
            const fileData = await checkResponse.json() as any;
            sha = fileData.sha;
        }

        // 3. 提交文件内容
        const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`;
        const commitBody = {
            message: message || `Publish article: ${article.title}`,
            content: contentBase64,
            branch,
            sha // 如果存在 sha，则为更新操作
        };

        const publishResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify(commitBody),
        });

        const resultData = await publishResponse.json() as any;
        if (!publishResponse.ok) {
            throw new Error(`Failed to publish to GitHub: ${JSON.stringify(resultData)}`);
        }

        const htmlUrl = resultData.content.html_url;
        console.log('[GitHubPublisher] ✅ File published/updated:', htmlUrl);

        return {
            success: true,
            url: htmlUrl,
            sha: resultData.content.sha,
            path: fullPath
        };
    } catch (error) {
        console.error('[GitHubPublisher] ❌ Error:', error);
        throw error;
    }
}
