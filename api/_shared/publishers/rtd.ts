/**
 * Read the Docs (RTD) 发布适配器
 * 通过 GitHub API 将 Markdown 内容推送到 MkDocs 项目
 * RTD 会自动检测 commit 并触发构建
 */

interface RTDPublishConfig {
  githubToken: string;           // GitHub Personal Access Token
  repoOwner: string;             // GitHub 用户名或组织名
  repoName: string;              // 仓库名称 (如 ai-seo-docs)
  branch?: string;               // 分支名 (默认 main)
  docsPath?: string;             // 文档目录 (默认 docs)
  pathPrefix?: 'lab' | 'guide' | 'compare' | 'tool';  // URL 路径前缀（快慢刀机制）
}

interface ArticleContent {
  title: string;
  content: string;               // HTML 内容，需要转换为 Markdown
  keyword: string;
  metaDescription?: string;
  images?: Array<{ url: string; alt: string }>;
  urlSlug?: string;
}

interface GitHubFileContent {
  path: string;
  content: string;
  sha?: string;  // 如果是更新已有文件，需要提供 sha
}

/**
 * 将 HTML 内容转换为 Markdown（简化版）
 */
function htmlToMarkdown(html: string): string {
  let md = html;
  
  // 处理标题
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  
  // 处理段落
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // 处理链接
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // 处理粗体和斜体
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // 处理图片
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)');
  
  // 处理列表
  md = md.replace(/<ul[^>]*>/gi, '\n');
  md = md.replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol[^>]*>/gi, '\n');
  md = md.replace(/<\/ol>/gi, '\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // 处理代码块
  md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // 处理引用块
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
    return content.split('\n').map((line: string) => `> ${line.trim()}`).join('\n') + '\n\n';
  });
  
  // 处理换行
  md = md.replace(/<br\s*\/?>/gi, '\n');
  
  // 清理剩余 HTML 标签
  md = md.replace(/<[^>]+>/g, '');
  
  // 清理多余空行
  md = md.replace(/\n{3,}/g, '\n\n');
  
  // 解码 HTML 实体
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  
  return md.trim();
}

/**
 * 生成 MkDocs 页面的 Markdown 内容
 */
function generateMkDocsPage(article: ArticleContent, config: RTDPublishConfig): string {
  const markdownContent = htmlToMarkdown(article.content);
  const slug = article.urlSlug || article.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // 生成内链（根据快慢刀机制）
  const internalLinks = generateInternalLinks(config.pathPrefix || 'lab', slug);
  
  // MkDocs 支持 YAML front matter
  const frontMatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
description: "${(article.metaDescription || '').replace(/"/g, '\\"')}"
---

`;

  // 组装完整页面
  let page = frontMatter;
  page += `# ${article.title}\n\n`;
  page += markdownContent;
  
  // 添加内链区域
  if (internalLinks) {
    page += `\n\n---\n\n## Related Resources\n\n${internalLinks}`;
  }
  
  return page;
}

/**
 * 生成内链（单向漏斗原则）
 * lab → guide/tool → compare/live
 */
function generateInternalLinks(currentPath: 'lab' | 'guide' | 'compare' | 'tool', slug: string): string {
  const links: string[] = [];
  
  if (currentPath === 'lab') {
    // lab 页面链接到 guide
    links.push(`- 📚 [Complete Guide](../guide/${slug}/)`);
  } else if (currentPath === 'guide' || currentPath === 'tool') {
    // guide/tool 页面链接到 compare
    links.push(`- 🔍 [See Comparisons](../compare/${slug}-alternatives/)`);
  }
  // compare 不反向链接
  
  return links.join('\n');
}

/**
 * 生成 URL slug
 */
function generateSlug(keyword: string, existingSlug?: string): string {
  if (existingSlug) return existingSlug;
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')  // 保留中文
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

/**
 * 通过 GitHub API 获取文件内容（检查是否已存在）
 */
async function getFileFromGitHub(
  config: RTDPublishConfig,
  filePath: string
): Promise<{ exists: boolean; sha?: string; content?: string }> {
  const { githubToken, repoOwner, repoName, branch = 'main' } = config;
  
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NicheDigger-PSEO-Agent'
        }
      }
    );
    
    if (response.status === 404) {
      return { exists: false };
    }
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    return {
      exists: true,
      sha: data.sha,
      content: Buffer.from(data.content, 'base64').toString('utf-8')
    };
  } catch (error) {
    console.error('[RTD Publisher] Error checking file:', error);
    return { exists: false };
  }
}

/**
 * 通过 GitHub API 创建或更新文件
 */
async function createOrUpdateFile(
  config: RTDPublishConfig,
  file: GitHubFileContent,
  message: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const { githubToken, repoOwner, repoName, branch = 'main' } = config;
  
  try {
    const body: any = {
      message,
      content: Buffer.from(file.content).toString('base64'),
      branch
    };
    
    if (file.sha) {
      body.sha = file.sha;
    }
    
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${file.path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'NicheDigger-PSEO-Agent'
        },
        body: JSON.stringify(body)
      }
    );
    
    const data = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(data.message || `GitHub API error: ${response.status}`);
    }
    
    return {
      success: true,
      url: data.content?.html_url
    };
  } catch (error: any) {
    console.error('[RTD Publisher] Error creating/updating file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 更新 mkdocs.yml 的 nav 配置
 */
async function updateMkDocsNav(
  config: RTDPublishConfig,
  newPage: { title: string; path: string }
): Promise<void> {
  const { docsPath = 'docs' } = config;
  const mkdocsPath = 'mkdocs.yml';
  
  try {
    const existing = await getFileFromGitHub(config, mkdocsPath);
    if (!existing.exists || !existing.content) {
      console.log('[RTD Publisher] mkdocs.yml not found, skipping nav update');
      return;
    }
    
    let content = existing.content;
    
    // 简单的 YAML 处理 - 在 nav 部分添加新页面
    // 注意：这是简化实现，生产环境应使用 yaml 库
    const navMatch = content.match(/nav:\s*\n([\s\S]*?)(?=\n[a-z]|\n$|$)/i);
    if (navMatch) {
      // 检查是否已存在
      if (!content.includes(newPage.path)) {
        // 根据路径前缀添加到对应区域
        const pathPrefix = newPage.path.split('/')[0];
        const navEntry = `  - ${newPage.title}: ${newPage.path}\n`;
        
        // 找到对应区域或添加到末尾
        const sectionRegex = new RegExp(`(- ${pathPrefix.charAt(0).toUpperCase() + pathPrefix.slice(1)}:[\\s\\S]*?)(\\n  - [A-Z]|\\n[a-z]|$)`, 'i');
        const sectionMatch = content.match(sectionRegex);
        
        if (sectionMatch) {
          // 在区域末尾添加
          content = content.replace(sectionMatch[0], sectionMatch[1] + navEntry + sectionMatch[2]);
        }
        
        await createOrUpdateFile(
          config,
          { path: mkdocsPath, content, sha: existing.sha },
          `[NicheDigger] Add ${newPage.title} to nav`
        );
      }
    }
  } catch (error) {
    console.error('[RTD Publisher] Error updating mkdocs.yml:', error);
    // 非致命错误，继续执行
  }
}

/**
 * 发布文章到 Read the Docs (通过 GitHub)
 */
export async function publishToRTD(
  article: ArticleContent,
  config: RTDPublishConfig
): Promise<{
  success: boolean;
  url?: string;
  rtdUrl?: string;
  githubUrl?: string;
  filePath?: string;
  error?: string;
}> {
  const {
    githubToken,
    repoOwner,
    repoName,
    docsPath = 'docs',
    pathPrefix = 'lab'
  } = config;

  if (!githubToken || !repoOwner || !repoName) {
    return {
      success: false,
      error: 'GitHub Token, repo owner, and repo name are required'
    };
  }

  try {
    console.log(`[RTD Publisher] 🚀 Publishing "${article.title}" to ${repoOwner}/${repoName}`);
    
    // 1. 生成 slug 和文件路径
    const slug = generateSlug(article.keyword, article.urlSlug);
    const fileName = `${slug}.md`;
    const filePath = `${docsPath}/${pathPrefix}/${fileName}`;
    
    // 2. 检查文件是否已存在
    const existing = await getFileFromGitHub(config, filePath);
    
    // 3. 生成 Markdown 内容
    const markdownContent = generateMkDocsPage(article, config);
    
    // 4. 创建或更新文件
    const result = await createOrUpdateFile(
      config,
      {
        path: filePath,
        content: markdownContent,
        sha: existing.sha
      },
      existing.exists
        ? `[NicheDigger] Update: ${article.title}`
        : `[NicheDigger] Add: ${article.title}`
    );
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }
    
    // 5. 更新 mkdocs.yml nav（可选）
    await updateMkDocsNav(config, {
      title: article.title,
      path: `${pathPrefix}/${fileName}`
    });
    
    // 6. 构建 RTD URL
    // 格式：https://{project-name}.readthedocs.io/en/latest/{path}/
    const rtdProjectName = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const rtdUrl = `https://${rtdProjectName}.readthedocs.io/en/latest/${pathPrefix}/${slug}/`;
    
    console.log(`[RTD Publisher] ✅ Published successfully!`);
    console.log(`[RTD Publisher] 📄 GitHub: ${result.url}`);
    console.log(`[RTD Publisher] 🌐 RTD URL (after build): ${rtdUrl}`);
    
    return {
      success: true,
      url: rtdUrl,
      rtdUrl,
      githubUrl: result.url,
      filePath
    };
    
  } catch (error: any) {
    console.error('[RTD Publisher] ❌ Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * 批量发布多篇文章到 RTD
 */
export async function batchPublishToRTD(
  articles: ArticleContent[],
  config: RTDPublishConfig
): Promise<{
  success: boolean;
  results: Array<{
    keyword: string;
    success: boolean;
    url?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}> {
  const results = [];
  let succeeded = 0;
  let failed = 0;
  
  for (const article of articles) {
    // 添加延迟避免 GitHub API 限流
    if (results.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const result = await publishToRTD(article, config);
    
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
    
    results.push({
      keyword: article.keyword,
      success: result.success,
      url: result.url,
      error: result.error
    });
  }
  
  return {
    success: failed === 0,
    results,
    summary: {
      total: articles.length,
      succeeded,
      failed
    }
  };
}

/**
 * 检查 RTD 构建状态
 */
export async function checkRTDBuildStatus(
  projectSlug: string,
  rtdToken?: string
): Promise<{
  success: boolean;
  building: boolean;
  lastBuild?: {
    id: string;
    state: string;
    success: boolean;
    created: string;
  };
  error?: string;
}> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    
    if (rtdToken) {
      headers['Authorization'] = `Token ${rtdToken}`;
    }
    
    const response = await fetch(
      `https://readthedocs.org/api/v3/projects/${projectSlug}/builds/?limit=1`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`RTD API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    const lastBuild = data.results?.[0];
    
    return {
      success: true,
      building: lastBuild?.state === 'building' || lastBuild?.state === 'triggered',
      lastBuild: lastBuild ? {
        id: lastBuild.id,
        state: lastBuild.state,
        success: lastBuild.success,
        created: lastBuild.created
      } : undefined
    };
  } catch (error: any) {
    return {
      success: false,
      building: false,
      error: error.message
    };
  }
}
