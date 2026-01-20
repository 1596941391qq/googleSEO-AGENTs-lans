import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Admin 认证 API
 * POST /api/admin/auth - 登录
 * GET /api/admin/auth - 验证 session
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // POST - 登录
  if (req.method === 'POST') {
    try {
      const body = parseRequestBody(req);
      const { username, password } = body;

      if (!username || !password) {
        return sendErrorResponse(res, null, 'Username and password are required', 400);
      }

      // 验证管理员账号
      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return sendErrorResponse(res, null, 'Invalid credentials', 401);
      }

      // 生成 JWT token
      const token = jwt.sign(
        { 
          role: 'admin',
          username,
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        data: {
          token,
          expiresIn: 86400, // 24 hours in seconds
          username
        }
      });
    } catch (error: any) {
      console.error('[Admin Auth] Login error:', error);
      return sendErrorResponse(res, error, 'Login failed', 500);
    }
  }

  // GET - 验证 session
  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendErrorResponse(res, null, 'No token provided', 401);
      }

      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { role: string; username: string };
        
        if (decoded.role !== 'admin') {
          return sendErrorResponse(res, null, 'Not an admin token', 403);
        }

        return res.json({
          success: true,
          data: {
            valid: true,
            username: decoded.username,
            role: decoded.role
          }
        });
      } catch (jwtError) {
        return sendErrorResponse(res, null, 'Invalid or expired token', 401);
      }
    } catch (error: any) {
      console.error('[Admin Auth] Verify error:', error);
      return sendErrorResponse(res, error, 'Verification failed', 500);
    }
  }

  return sendErrorResponse(res, null, 'Method not allowed', 405);
}

/**
 * 验证 Admin Token 的辅助函数（供其他 Admin API 使用）
 */
export function verifyAdminToken(req: VercelRequest): { valid: boolean; username?: string; error?: string } {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'No token provided' };
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string; username: string };
    
    if (decoded.role !== 'admin') {
      return { valid: false, error: 'Not an admin token' };
    }

    return { valid: true, username: decoded.username };
  } catch (error) {
    return { valid: false, error: 'Invalid or expired token' };
  }
}
