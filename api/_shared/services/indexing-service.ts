import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/indexing'];

// 平台方统一调用的服务账号配置
// 建议从环境变量读取
const SERVICE_ACCOUNT = {
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

/**
 * 通知 Google 索引新的或更新的 URL
 * @param url 要索引的 URL
 * @param type 'URL_UPDATED' (新增或更新) 或 'URL_DELETED' (删除)
 */
export async function notifyGoogleIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  if (!SERVICE_ACCOUNT.client_email || !SERVICE_ACCOUNT.private_key) {
    console.warn('[IndexingService] ⚠️ Google Service Account credentials missing. Skipping indexing.');
    return { success: false, error: 'Credentials missing' };
  }

  try {
    const auth = new google.auth.JWT({
      email: SERVICE_ACCOUNT.client_email,
      key: SERVICE_ACCOUNT.private_key,
      scopes: SCOPES,
    });

    const indexing = google.indexing({ version: 'v3', auth });
    
    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type,
      },
    });

    console.log(`[IndexingService] ✅ Indexing request sent for ${url}:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`[IndexingService] ❌ Failed to notify Google for ${url}:`, error);
    return { success: false, error: (error as Error).message };
  }
}
