/**
 * WordPress 发布适配器 (使用 REST API + Application Passwords)
 */

interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
  publishStatus?: 'publish' | 'draft' | 'pending' | 'private';
}

/**
 * 发布文章到 WordPress
 */
export async function publishToWordPress(
  article: { title: string; content: string; metaDescription?: string; keyword?: string },
  config: WordPressConfig
) {
  const { siteUrl, username, applicationPassword, publishStatus = 'draft' } = config;

  if (!siteUrl || !username || !applicationPassword) {
    throw new Error('WordPress siteUrl, username, and applicationPassword are required');
  }

  // 清理 URL，确保没有末尾斜杠
  const cleanSiteUrl = siteUrl.replace(/\/$/, '');
  // 在 Node.js 环境中，Buffer 是全局可用的
  const authHeader = 'Basic ' + Buffer.from(`${username}:${applicationPassword}`).toString('base64');

  try {
    // 1. 准备文章数据
    const postData = {
      title: article.title,
      content: article.content,
      status: publishStatus,
      excerpt: article.metaDescription || '',
      // 这里的 meta 字段需要 WordPress REST API 显式支持或通过插件（如 Yoast SEO）暴露
      meta: {
        _yoast_wpseo_metadesc: article.metaDescription || '',
        _yoast_wpseo_focuskw: article.keyword || '',
      }
    };

    // 2. 发送请求到 WordPress REST API
    const response = await fetch(`${cleanSiteUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      throw new Error(`Failed to publish to WordPress: ${JSON.stringify(data)}`);
    }

    console.log('[WordPressPublisher] ✅ Article published:', data.link);
    return {
      success: true,
      url: data.link,
      id: data.id,
      editUrl: `${cleanSiteUrl}/wp-admin/post.php?post=${data.id}&action=edit`
    };
  } catch (error) {
    console.error('[WordPressPublisher] ❌ Error:', error);
    throw error;
  }
}
