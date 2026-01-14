import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 支付系统健康检查
 * GET /api/payment/health
 *
 * 用于诊断支付系统配置
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = {
      PAYMENT_302_API_KEY: process.env.PAYMENT_302_API_KEY ? '✅ Configured' : '❌ Missing',
      PAYMENT_302_APP_ID: process.env.PAYMENT_302_APP_ID ? '✅ Configured' : '❌ Missing',
      PAYMENT_SECRET: process.env.PAYMENT_SECRET ? '✅ Configured' : '❌ Missing',
      PAYMENT_BASE_URL: process.env.PAYMENT_BASE_URL || '❌ Missing',
    };

    const errors = [];
    if (!process.env.PAYMENT_302_API_KEY) errors.push('PAYMENT_302_API_KEY is missing');
    if (!process.env.PAYMENT_302_APP_ID) errors.push('PAYMENT_302_APP_ID is missing');
    if (!process.env.PAYMENT_SECRET) errors.push('PAYMENT_SECRET is missing');
    if (!process.env.PAYMENT_BASE_URL) errors.push('PAYMENT_BASE_URL is missing');

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      config,
      errors,
      isHealthy: errors.length === 0
    });

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
