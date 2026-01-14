import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, initPaymentTables } from '../lib/database.js';

/**
 * 处理支付成功回调
 * GET /api/payment/verify-checkout?checkout_id=xxx&302_signature=xxx
 *
 * 这个端点被 success_url 调用（前端页面跳转后调用）
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initPaymentTables();

    const { checkout_id, '302_signature': signature } = req.query;

    console.log('========== verify-checkout START ==========');
    console.log('📍 Query params - checkout_id:', checkout_id);
    console.log('📍 Query params - 302_signature:', signature);

    if (!checkout_id) {
      console.log('❌ checkout_id is missing in query params');
      return res.status(400).json({ error: 'checkout_id is required' });
    }

    console.log('🔍 Verifying checkout:', checkout_id);

    // 从数据库查找订单
    console.log('🗄️  Looking up order in database...');
    console.log('📍 SQL query:', 'SELECT * FROM payment_orders WHERE checkout_id = ?');
    console.log('📍 Parameters:', { checkout_id });

    let orderResult
    try {
      // 先测试简单查询
      console.log('🧪 Testing database connection with simple query...');
      const testResult = await sql`SELECT 1 as test`
      console.log('✅ DB connection test successful:', testResult.rows[0])

      orderResult = await sql`
        SELECT * FROM payment_orders
        WHERE checkout_id = ${checkout_id as string}
      `;
      console.log('✅ DB query executed successfully');
      console.log('📊 Found records:', orderResult.rows.length);
    } catch (dbError) {
      console.error('❌ Database query failed:', dbError);
      console.error('Error name:', dbError instanceof Error ? dbError.name : 'Unknown')
      console.error('Error message:', dbError instanceof Error ? dbError.message : 'Unknown')
      console.error('Error stack:', dbError instanceof Error ? dbError.stack : 'No stack')
      return res.status(500).json({
        error: 'Database query failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown DB error'
      });
    }

    if (orderResult.rows.length === 0) {
      console.log('❌ No order found with checkout_id:', checkout_id);
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // 如果订单已经处理过，直接返回成功
    if (order.status === 'completed') {
      console.log('✅ Order already processed:', checkout_id);
      return res.status(200).json({
        success: true,
        status: 'already_processed',
        order: {
          checkout_id: order.checkout_id,
          plan_id: order.plan_id,
          amount: order.amount,
          paid_at: order.paid_at
        }
      });
    }

    // 调用 302.AI API 验证支付状态
    const apiKey = process.env.PAYMENT_302_API_KEY;
    if (!apiKey) {
      throw new Error('PAYMENT_302_API_KEY not configured');
    }

    // 调用 302.AI API 验证支付状态（使用正确的 API 格式）
    console.log('🔍 Querying 302.AI checkout API for:', checkout_id);

    const verifyResponse = await fetch(`https://api.302.ai/v1/checkout?checkout_id=${checkout_id}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('❌ 302.AI verify error:', verifyResponse.status, errorText);
      return res.status(500).json({
        error: 'Failed to verify payment',
        details: errorText
      });
    }

    const checkoutData = await verifyResponse.json();

    console.log('📊 302.AI Checkout Full Response:', JSON.stringify(checkoutData, null, 2));

    // 302.AI 响应格式：{ code: 0, msg: "success", data: { payment_status: 1, payment_order: "xxx", ... } }
    // payment_status 值: 0=未支付, 1=已支付, 2=已退款（根据实际情况可能有其他值）
    if (checkoutData.code !== 0) {
      console.error('❌ 302.AI API returned error code:', checkoutData.code, checkoutData.msg);
      return res.status(500).json({
        error: 'Payment API error',
        details: checkoutData.msg || 'Unknown error from payment provider'
      });
    }

    const paymentStatus = checkoutData.data?.payment_status;
    console.log('📊 Payment status (payment_status field):', paymentStatus);

    // 严格验证：只有 payment_status = 1 才算支付成功
    if (paymentStatus === 1) {
      console.log('✅ Payment verified as PAID (payment_status=1), processing...');
      await processPaymentSuccess(order);
      console.log('✅ processPaymentSuccess completed - credits added and subscription upgraded');

      return res.status(200).json({
        success: true,
        status: 'payment_verified',
        order: {
          checkout_id: order.checkout_id,
          plan_id: order.plan_id,
          amount: order.amount
        }
      });
    } else if (paymentStatus === 0) {
      console.log('⏳ Payment still pending (payment_status=0)');
      return res.status(200).json({
        success: false,
        status: 'pending',
        message: 'Payment is still pending'
      });
    } else if (paymentStatus === 2) {
      console.log('❌ Payment refunded (payment_status=2)');
      return res.status(200).json({
        success: false,
        status: 'refunded',
        message: 'Payment was refunded'
      });
    } else {
      // 未知的 payment_status
      console.log('⚠️  Unknown payment_status:', paymentStatus);
      return res.status(200).json({
        success: false,
        status: 'unknown',
        message: `Unknown payment status: ${paymentStatus}`
      });
    }

  } catch (error) {
    console.error('========== verify-checkout ERROR ==========');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('==========================================');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to verify checkout',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 处理支付成功后的业务逻辑
 * - 升级用户订阅
 * - 充值 credits
 * - 更新订单状态
 */
async function processPaymentSuccess(order: any) {
  const { user_id, plan_id, checkout_id, amount } = order;

  console.log('💰 Processing payment success:', { user_id, plan_id, amount });

  try {
    // 1. 获取套餐信息
    const planResult = await sql`
      SELECT * FROM subscription_plans WHERE plan_id = ${plan_id}
    `;

    if (planResult.rows.length === 0) {
      throw new Error('Plan not found');
    }

    const plan = planResult.rows[0];
    const creditsToAdd = plan.credits_monthly;

    // 2. 更新或创建用户订阅
    const existingSubscription = await sql`
      SELECT * FROM user_subscriptions
      WHERE user_id = ${user_id} AND status = 'active'
    `;

    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (existingSubscription.rows.length > 0) {
      // 更新现有订阅
      await sql`
        UPDATE user_subscriptions
        SET
          plan_id = ${plan_id},
          current_period_start = ${periodStart},
          current_period_end = ${periodEnd},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${user_id} AND status = 'active'
      `;
      console.log('✅ Updated user subscription');
    } else {
      // 创建新订阅
      await sql`
        INSERT INTO user_subscriptions
          (user_id, plan_id, status, billing_period, current_period_start, current_period_end)
        VALUES
          (${user_id}, ${plan_id}, 'active', 'monthly', ${periodStart}, ${periodEnd})
      `;
      console.log('✅ Created new subscription');
    }

    // 3. 充值 credits
    const creditsResult = await sql`
      SELECT * FROM user_credits WHERE user_id = ${user_id}
    `;

    if (creditsResult.rows.length > 0) {
      const currentCredits = creditsResult.rows[0];
      const newTotal = parseInt(currentCredits.total_credits) + creditsToAdd;

      await sql`
        UPDATE user_credits
        SET
          total_credits = ${newTotal},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${user_id}
      `;

      // 记录充值交易
      const purchaseDescription = `Credits from ${plan.name_en} subscription purchase`;
      await sql`
        INSERT INTO credits_transactions
          (user_id, type, credits_delta, credits_before, credits_after, description, related_entity, related_entity_id)
        VALUES
          (${user_id}, 'purchase', ${creditsToAdd}, ${currentCredits.total_credits}, ${newTotal},
           ${purchaseDescription}, 'payment', ${checkout_id})
      `;

      console.log(`✅ Added ${creditsToAdd} credits (new total: ${newTotal})`);
    } else {
      // 创建 credits 记录
      const nextReset = new Date();
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);

      await sql`
        INSERT INTO user_credits
          (user_id, total_credits, used_credits, bonus_credits, last_reset_at, next_reset_at)
        VALUES
          (${user_id}, ${creditsToAdd}, 0, 0, ${new Date()}, ${nextReset})
      `;

      const initialDescription = `Initial credits from ${plan.name_en} subscription purchase`;
      await sql`
        INSERT INTO credits_transactions
          (user_id, type, credits_delta, credits_before, credits_after, description, related_entity, related_entity_id)
        VALUES
          (${user_id}, 'purchase', ${creditsToAdd}, 0, ${creditsToAdd},
           ${initialDescription}, 'payment', ${checkout_id})
      `;

      console.log(`✅ Created credits account with ${creditsToAdd} credits`);
    }

    // 4. 更新订单状态
    await sql`
      UPDATE payment_orders
      SET
        status = 'completed',
        paid_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE checkout_id = ${checkout_id}
    `;

    console.log('✅ Payment processing completed successfully');

  } catch (error) {
    console.error('❌ Error processing payment:', error);
    throw error;
  }
}
