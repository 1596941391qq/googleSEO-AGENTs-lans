/**
 * Medium 发布适配器
 */

interface MediumPublishConfig {
  integrationToken: string;
  publishStatus?: 'public' | 'draft' | 'unlisted';
  notifyFollowers?: boolean;
}

/**
 * 发布文章到 Medium
 * @param article 包含 title, content, images 的对象
 * @param config 包含 integrationToken 的配置
 */
export async function publishToMedium(
  article: { title: string; content: string; images: any[]; keyword?: string },
  config: MediumPublishConfig
) {
  const { integrationToken, publishStatus = 'draft', notifyFollowers = false } = config;

  if (!integrationToken) {
    throw new Error('Medium Integration Token is required');
  }

  try {
    // 1. 获取用户信息以获取 authorId
    const userResponse = await fetch('https://api.medium.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${integrationToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    const userData = (await userResponse.json()) as any;
    if (!userResponse.ok || !userData.data?.id) {
      throw new Error(`Failed to fetch Medium user: ${JSON.stringify(userData)}`);
    }

    const authorId = userData.data.id;

    // 2. 准备发布内容
    // Medium 支持 HTML 或 Markdown
    // 注意：Medium API 限制较多，大型文章可能需要处理图片上传
    const postBody = {
      title: article.title,
      contentFormat: 'html',
      content: `<h1>${article.title}</h1>\n${article.content}`,
      publishStatus,
      notifyFollowers,
      tags: article.keyword ? [article.keyword.substring(0, 25)] : [],
    };

    // 3. 发布文章
    const publishResponse = await fetch(`https://api.medium.com/v1/users/${authorId}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integrationToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(postBody),
    });

    const publishData = (await publishResponse.json()) as any;
    if (!publishResponse.ok) {
      throw new Error(`Failed to publish to Medium: ${JSON.stringify(publishData)}`);
    }

    console.log('[MediumPublisher] ✅ Article published:', publishData.data.url);
    return {
      success: true,
      url: publishData.data.url,
      id: publishData.data.id
    };
  } catch (error) {
    console.error('[MediumPublisher] ❌ Error:', error);
    throw error;
  }
}
