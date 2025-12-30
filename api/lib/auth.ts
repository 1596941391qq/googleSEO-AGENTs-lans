import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export interface AppJWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// 生成 JWT Token
// 开发模式下使用更长的有效期（30天），生产环境使用24小时
export async function generateToken(userId: string, email: string): Promise<string> {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
  const expirationTime = isDevelopment ? '30d' : '24h';
  
  console.log(`[generateToken] Generating token with expiration: ${expirationTime} (development: ${isDevelopment})`);
  
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(JWT_SECRET);

  return token;
}

// 验证 JWT Token
// 返回 payload 或 null，如果过期则抛出错误以便调用者知道是过期
// 开发模式下，即使过期也允许通过（方便本地测试）
export async function verifyToken(token: string): Promise<AppJWTPayload | null> {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
  
  try {
    console.log('[verifyToken] Verifying token, length:', token.length);
    console.log('[verifyToken] JWT_SECRET configured:', !!process.env.JWT_SECRET);
    console.log('[verifyToken] Development mode:', isDevelopment);
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    console.log('[verifyToken] Token verified successfully, payload:', {
      userId: payload.userId,
      email: payload.email,
      exp: payload.exp,
    });
    return payload as unknown as AppJWTPayload;
  } catch (error: any) {
    console.error('[verifyToken] Token verification failed:', {
      message: error.message,
      code: error.code,
      name: error.name,
    });
    
    // 如果是过期错误
    if (error.code === 'ERR_JWT_EXPIRED') {
      console.error('[verifyToken] Token has expired');
      
      // 开发模式下，即使过期也允许通过（方便本地测试）
      if (isDevelopment) {
        console.log('[verifyToken] 🔧 Development mode: Allowing expired token');
        try {
          // 不验证过期时间，只验证签名和基本格式
          const parts = token.split('.');
          if (parts.length === 3) {
            // 使用 Buffer 解析 payload（在 Node.js/Vercel 环境中可用）
            const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
            const payload = JSON.parse(payloadStr);
            console.log('[verifyToken] Using expired token payload in dev mode:', {
              userId: payload.userId,
              email: payload.email,
            });
            return payload as unknown as AppJWTPayload;
          }
        } catch (parseError) {
          console.error('[verifyToken] Failed to parse expired token in dev mode:', parseError);
        }
      }
      
      // 生产环境或解析失败，抛出过期错误
      const expiredError: any = new Error('Token expired');
      expiredError.code = 'ERR_JWT_EXPIRED';
      expiredError.isExpired = true;
      throw expiredError;
    } else if (error.code === 'ERR_JWT_INVALID') {
      console.error('[verifyToken] Token is invalid');
    }
    
    return null;
  }
}
