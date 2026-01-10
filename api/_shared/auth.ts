import type { VercelRequest } from '@vercel/node';
import { verifyToken } from '../lib/auth.js';
import { getApiKeyByHash, updateApiKeyLastUsed, getUserById } from '../lib/database.js';
import { createHash } from 'crypto';

/**
 * 将测试用户 ID 转换为有效的 UUID（仅开发模式）
 */
function normalizeUserId(userId: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
  
  // 验证是否是有效的 UUID 格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i; // 简化正则，或者使用完整的
  const fullUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // 开发模式下的测试用户特殊处理
  if (isDevelopment && (userId === '12345' || !fullUuidRegex.test(userId))) {
    // 使用固定的测试用户 UUID
    const testUUID = 'b61cbbf9-15b0-4353-8d49-89952042cf75';
    return testUUID;
  }
  
  return userId;
}

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

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  // 尝试作为 JWT token 验证
  try {
    const payload = await verifyToken(token);
    if (payload) {
      return {
        userId: normalizeUserId(payload.userId),
        authType: 'jwt',
      };
    }
  } catch (error: any) {
    // JWT 验证失败
    if (error?.code === 'ERR_JWT_EXPIRED' || error?.isExpired) {
      return null;
    }
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
        updateApiKeyLastUsed(apiKey.id).catch(() => {});

        return {
          userId: normalizeUserId(apiKey.user_id),
          authType: 'api_key',
          apiKeyId: apiKey.id,
        };
      }
    }
  } catch (error) {
    // API key 验证失败
  }

  return null;
}

/**
 * 从请求中提取 token（用于向后兼容）
 */
export function extractToken(req: VercelRequest): string | null {
  const authHeaderRaw = req.headers.authorization || req.headers.Authorization;
  const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;
  
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
