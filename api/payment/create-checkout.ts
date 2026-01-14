import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, initPaymentTables } from '../lib/database.js';
import { verifyToken } from '../lib/auth.js';
import crypto from 'crypto';

/**
 * 生成 302.AI API 签名
 * 基于 HMAC-SHA256 算法
 */
function generateSignature(params: Record<string, any>, secret: string): string {
  // 第一步：过滤无效值
  const filteredParams: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    // 排除签名字段本身
    if (key === 'sign' || key === 'signature') continue;

    // 排除空值
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'object' && Object.keys(value).length === 0) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    filteredParams[key] = value;
  }

  // 第二步：按 key ASCII 码排序
  const sortedKeys = Object.keys(filteredParams).sort();

  // 第三步 & 第四步：参数序列化 + URL 编码
  const pairs: string[] = [];
  for (const key of sortedKeys) {
    let value = filteredParams[key];

    // 复杂类型序列化为 JSON（紧凑格式，key 排序）
    if (typeof value === 'object' && value !== null) {
      value = JSON.stringify(value, Object.keys(value).sort());
    } else {
      value = String(value);
    }

    // URL 编码
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);

    pairs.push(`${encodedKey}=${encodedValue}`);
  }

  // 第五步：构建待签名字符串
  const signString = pairs.join('&');

  console.log('🔐 Sign String:', signString);

  // 第六步：HMAC-SHA256 签名
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signString, 'utf-8')
    .digest('hex');

  return signature;
}

/**
 * 创建 302.AI 支付订单
 * POST /api/payment/create-checkout
 *
 * Body: {
 *   "plan_id": "domination" | "professional"
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 确保支付表存在
    await initPaymentTables();

    // 验证用户登录
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = payload.userId;
    const { plan_id } = req.body;
    const validPlanIds = ['pro', 'professional', 'free', 'business'];

    if (!plan_id || !validPlanIds.includes(plan_id)) {
      return res.status(400).json({
        error: 'Invalid plan_id',
        message: `plan_id must be one of: ${validPlanIds.join(', ')}`
      });
    }

    // 获取用户信息
    const userResult = await sql`
      SELECT id, email, name FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // 获取套餐信息
    const planResult = await sql`
      SELECT plan_id, name_en, price FROM subscription_plans
      WHERE plan_id = ${plan_id}
    `;

    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const plan = planResult.rows[0];
    const amount = parseFloat(plan.price);

    // 生成唯一的 request_id
    const request_id = `${plan_id}_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 获取环境变量
    const apiKey = process.env.PAYMENT_302_API_KEY;
    const appId = process.env.PAYMENT_302_APP_ID;
    const secret = process.env.PAYMENT_SECRET || '';  // 密钥
    let baseUrl = process.env.PAYMENT_BASE_URL || 'http://localhost:3000';
    const webhookUrl = process.env.PAYMENT_WEBHOOK_URL;  // Webhook 回调地址

    // 确保 baseUrl 末尾没有斜杠
    baseUrl = baseUrl.replace(/\/$/, '');

    // 验证必需的配置
    if (!apiKey || !appId) {
      console.error('Missing payment configuration');
      return res.status(500).json({
        error: 'Payment configuration error',
        message: 'Please configure PAYMENT_302_API_KEY and PAYMENT_302_APP_ID'
      });
    }

    if (!secret) {
      console.error('❌ PAYMENT_SECRET is not configured!');
      return res.status(500).json({
        error: 'Payment configuration error',
        message: 'PAYMENT_SECRET environment variable is required. Please configure it in Vercel Dashboard.'
      });
    }

    // 构建请求参数（包含 secret，用于签名和发送）
    const requestParams: Record<string, any> = {
      app_id: appId,
      price: Math.round(amount * 100), // 转换为分
      customer: {
        id: userId,
        email: user.email
      },
      request_id,
      success_url: `${baseUrl}/#payment/success`,
      back_url: `${baseUrl}/#payresult`,
      metadata: {
        plan_id,
        user_id: userId,
        plan_name: plan.name_en
      },
      secret: secret  // secret 需要包含在请求中
    };

    // 如果配置了 webhook_url，添加到请求参数
    if (webhookUrl) {
      requestParams.webhook_url = webhookUrl;
      console.log('🔔 Webhook URL configured:', webhookUrl);
    } else {
      console.log('⚠️  Webhook URL not configured - webhook notifications disabled');
    }

    // 生成签名
    const signature = generateSignature(requestParams, secret);

    // 添加签名到请求参数
    const finalParams = {
      ...requestParams,
      signature
    };

    console.log('📤 Request Params:', JSON.stringify(finalParams, null, 2));

    // 调用 302.AI API 创建订单
    const checkoutResponse = await fetch('https://api.302.ai/v1/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(finalParams)
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error('302.AI API error:', errorText);
      return res.status(500).json({
        error: 'Failed to create checkout',
        details: errorText
      });
    }

    const checkoutData = await checkoutResponse.json();

    // 调试：打印完整响应
    console.log('📦 302.AI Response:', JSON.stringify(checkoutData, null, 2));

    // 根据实际 API 响应格式获取字段（key: url, payment_order）
    const checkout_id = checkoutData.checkout_id || checkoutData.id || checkoutData.data?.id || checkoutData.data?.payment_order;
    const checkout_url = checkoutData.checkout_url || checkoutData.url || checkoutData.data?.url;

    if (!checkout_id || !checkout_url) {
      console.error('❌ Missing checkout_id or checkout_url in response:', checkoutData);
      return res.status(500).json({
        error: 'Invalid response from payment provider',
        details: 'Missing checkout_id or checkout_url',
        response: checkoutData
      });
    }

    // 保存订单到数据库
    await sql`
      INSERT INTO payment_orders
        (checkout_id, user_id, plan_id, amount, request_id, metadata, payment_url, status)
      VALUES
        (${checkout_id}, ${userId}, ${plan_id}, ${amount}, ${request_id},
         ${JSON.stringify({
      plan_name: plan.name_en,
      customer_email: user.email
    })}, ${checkout_url}, 'pending')
    `;

    console.log('✅ Payment order created:', {
      checkout_id,
      user_id: userId,
      plan_id,
      amount
    });

    return res.status(200).json({
      success: true,
      checkout_id,
      checkout_url,
      amount,
      plan_id
    });

  } catch (error) {
    console.error('Create checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to create checkout',
      details: errorMessage
    });
  }
}
