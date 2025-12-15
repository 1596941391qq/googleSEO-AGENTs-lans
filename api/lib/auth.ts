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

// 生成 JWT Token (24小时有效期)
export async function generateToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

// 验证 JWT Token
export async function verifyToken(token: string): Promise<AppJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AppJWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
