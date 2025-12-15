import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db.js';
import { generateToken } from '../lib/auth.js';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transferToken } = req.body;
    console.log('[verify-transfer] Received request with token:', transferToken ? 'present' : 'missing');

    if (!transferToken) {
      return res.status(400).json({ error: 'Transfer token required' });
    }

    // 🔧 开发模式：如果收到任何 token，使用假用户登录
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';

    if (isDevelopment) {
      console.log('[verify-transfer] 🔧 Development Mode: Using fake user for any token');

      // 生成 JWT 给假用户
      const fakeUser = {
        userId: 'dev-user-123',
        email: 'dev@example.com',
        name: 'Development User',
        picture: 'https://via.placeholder.com/150'
      };

      const jwtToken = await generateToken(fakeUser.userId, fakeUser.email);

      return res.status(200).json({
        success: true,
        token: jwtToken,
        user: {
          userId: fakeUser.userId,
          email: fakeUser.email,
          name: fakeUser.name,
          picture: fakeUser.picture,
        },
        devMode: true,
      });
    }

    // 1. 计算 SHA256 哈希值
    const tokenHash = crypto
      .createHash('sha256')
      .update(transferToken)
      .digest('hex');

    console.log('[verify-transfer] Token hash:', tokenHash.substring(0, 20) + '...');

    // 2. 在共享数据库中查询 session
    console.log('[verify-transfer] Querying sessions table...');
    const sessionResult = await sql`
      SELECT id, user_id, created_at, expires_at, last_used_at
      FROM sessions
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
    `;

    console.log('[verify-transfer] Session query result, rowCount:', sessionResult.rowCount);

    if (sessionResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid or expired transfer token' });
    }

    const session = sessionResult.rows[0];
    console.log('[verify-transfer] Found session for user_id:', session.user_id);

    // 3. 验证一次性使用 (created_at === last_used_at)
    if (session.created_at.getTime() !== session.last_used_at.getTime()) {
      return res.status(401).json({ error: 'Transfer token already used' });
    }

    // 4. 获取用户信息
    console.log('[verify-transfer] Querying users table...');
    const userResult = await sql`
      SELECT user_id, email, name, picture
      FROM users
      WHERE user_id = ${session.user_id}
    `;

    console.log('[verify-transfer] User query result, rowCount:', userResult.rowCount);

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    console.log('[verify-transfer] Found user:', user.email);

    // 5. 删除 transfer token (一次性使用)
    console.log('[verify-transfer] Deleting session...');
    await sql`DELETE FROM sessions WHERE id = ${session.id}`;

    // 6. 生成长期 JWT token (24小时)
    console.log('[verify-transfer] Generating JWT...');
    const jwtToken = await generateToken(user.user_id, user.email);

    // 7. 返回用户数据和 JWT
    console.log('[verify-transfer] Success! Returning user data');
    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        userId: user.user_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });

  } catch (error: any) {
    console.error('[verify-transfer] ERROR:', error);
    console.error('[verify-transfer] Error message:', error.message);
    console.error('[verify-transfer] Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
