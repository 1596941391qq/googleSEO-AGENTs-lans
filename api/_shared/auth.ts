import type { VercelRequest } from '@vercel/node';
import { verifyToken } from '../lib/auth.ts';
import { getApiKeyByHash, updateApiKeyLastUsed, getUserById } from '../lib/db.ts';
import { createHash } from 'crypto';

/**
 * 认证结果
 */
export interface AuthResult {
  userId: string;
  authType: 'jwt' | 'api_key';
  apiKeyId?: string;
}

/**
 * 从请求中提取并验证认证信息
 * 支持 JWT token 和 API key 两种方式
 */
export async function authenticateRequest(req: VercelRequest): Promise<AuthResult | null> {
  // VercelRequest headers 可能是小写的 'authorization' 或大写的 'Authorization'
  // 并且可能是 string 或 string[]
  const authHeaderRaw = req.headers.authorization || req.headers.Authorization;
  const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;

  console.log('[authenticateRequest] All headers:', Object.keys(req.headers));
  console.log('[authenticateRequest] Authorization header present:', !!authHeader);
  console.log('[authenticateRequest] Authorization header value:', authHeader ? (typeof authHeader === 'string' ? authHeader.substring(0, 30) + '...' : String(authHeader)) : 'null');

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    console.log('[authenticateRequest] No valid Bearer token in header');
    return null;
  }

  const token = authHeader.substring(7);
  console.log('[authenticateRequest] Token extracted, length:', token.length, 'starts with:', token.substring(0, 20) + '...');

  // 尝试作为 JWT token 验证
  try {
    console.log('[authenticateRequest] Attempting JWT verification...');
    const payload = await verifyToken(token);
    if (payload) {
      console.log('[authenticateRequest] JWT verification successful, userId:', payload.userId);

      // JWT token 验证成功即可，不需要检查用户是否存在于本地数据库
      // 因为 JWT token 本身已经证明了用户的身份（由主应用签发）
      // 如果需要在本地数据库中有用户记录，可以在需要时自动创建
      console.log('[authenticateRequest] JWT token is valid, authentication successful');
      return {
        userId: payload.userId,
        authType: 'jwt',
      };
    } else {
      console.log('[authenticateRequest] JWT verification returned null (token invalid but not expired)');
    }
  } catch (error: any) {
    // JWT 验证失败
    console.error('[authenticateRequest] JWT verification error:', error);
    console.error('[authenticateRequest] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      code: error?.code,
      isExpired: error?.isExpired,
    });

    // 如果是过期错误，不尝试 API key，直接返回 null
    // 让调用者知道是过期，可以返回更明确的错误信息
    if (error?.code === 'ERR_JWT_EXPIRED' || error?.isExpired) {
      console.log('[authenticateRequest] Token expired, not trying API key');
      // 返回 null，但会在响应中提供更明确的错误信息
      return null;
    }
    // 其他错误继续尝试 API key
  }

  // 尝试作为 API key 验证
  try {
    // API key 格式: nm_live_<hex>
    if (token.startsWith('nm_live_')) {
      const keyHash = createHash('sha256').update(token).digest('hex');
      const apiKey = await getApiKeyByHash(keyHash);

      if (apiKey && apiKey.is_active) {
        // 检查是否过期
        if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
          return null;
        }

        // 更新最后使用时间（异步，不阻塞）
        updateApiKeyLastUsed(apiKey.id).catch((err) => {
          console.error('Failed to update API key last used:', err);
        });

        // 获取用户信息
        const user = await getUserById(apiKey.user_id);
        if (user) {
          return {
            userId: apiKey.user_id,
            authType: 'api_key',
            apiKeyId: apiKey.id,
          };
        }
      }
    }
  } catch (error) {
    // API key 验证失败
    console.error('API key verification error:', error);
  }

  return null;
}

/**
 * 从请求中提取 token（用于向后兼容）
 */
export function extractToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
