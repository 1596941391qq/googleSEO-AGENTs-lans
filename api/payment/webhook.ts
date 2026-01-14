import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, initPaymentTables } from '../lib/database.js';

/**
 * 302.AI Webhook 接收端点
 * POST /api/payment/webhook
 *
 * 接收支付成功通知
 * Header: 302_signature - 用于验证请求真实性
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initPaymentTables();

    const signature = req.headers['302_signature'];
    console.log('========== WEBHOOK RECEIVED ==========');
    console.log('📨 Signature:', signature);

    const webhookData = req.body;
    console.log('📊 Webhook data:', JSON.stringify(webhookData, null, 2));

    // 提取 checkout_id（可能在不同字段）
    const checkout_id = webhookData.checkout_id || webhookData.id || webhookData.data?.id || webhookData.data?.payment_order;
    console.log('📍 checkout_id:', checkout_id);

    if (!checkout_id) {
      console.error('❌ No checkout_id in webhook data');
      return res.status(400).json({ error: 'checkout_id not found in webhook data' });
    }

    // 查找订单
    const orderResult = await sql`
      SELECT * FROM payment_orders
      WHERE checkout_id = ${checkout_id}
    `;

    if (orderResult.rows.length === 0) {
      console.error('❌ Order not found:', checkout_id);
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // 如果订单已处理，直接返回成功
    if (order.status === 'completed') {
      console.log('✅ Order already processed:', checkout_id);
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // 验证支付状态（从 webhook 数据或重新查询 API）
    // 302.AI status 返回值: failed, pending, completed
    const status = webhookData.status || webhookData.data?.status || 'unknown';

    console.log('📊 Webhook payment status:', status);

    // 严格验证：只有 'completed' 状态才算支付成功
    if (status === 'completed') {
      console.log('✅ Webhook verified as COMPLETED, processing payment...');
      await processPaymentSuccess(order);
      console.log('✅ Webhook processPaymentSuccess completed - credits added and subscription upgraded');

      return res.status(200).json({
        success: true,
        message: 'Payment processed successfully - credits added and subscription upgraded'
      });
    } else if (status === 'pending') {
      console.log('⏳ Webhook: Payment still pending');
      return res.status(200).json({
        success: true,
        message: 'Webhook received but payment is still pending'
      });
    } else if (status === 'failed') {
      console.log('❌ Webhook: Payment failed');
      return res.status(200).json({
        success: true,
        message: 'Payment failed - no action taken'
      });
    } else {
      console.log('⚠️  Webhook: Unknown payment status:', status);
      return res.status(200).json({
        success: true,
        message: 'Webhook received with unknown status'
      });
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Webhook processing failed',
      details: errorMessage
    });
  }
}

/**
 * 处理支付成功（同 verify-checkout.ts）
 */
async function processPaymentSuccess(order: any) {
  const { user_id, plan_id, checkout_id, amount } = order;

  console.log('💰 Processing payment success:', { user_id, plan_id, amount });

  try {
    const planResult = await sql`
      SELECT * FROM subscription_plans WHERE plan_id = ${plan_id}
    `;

    if (planResult.rows.length === 0) {
      throw new Error('Plan not found');
    }

    const plan = planResult.rows[0];
    const creditsToAdd = plan.credits_monthly;

    // 更新订阅
    const existingSubscription = await sql`
      SELECT * FROM user_subscriptions
      WHERE user_id = ${user_id} AND status = 'active'
    `;

    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (existingSubscription.rows.length > 0) {
      await sql`
        UPDATE user_subscriptions
        SET
          plan_id = ${plan_id},
          current_period_start = ${periodStart},
          current_period_end = ${periodEnd},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${user_id} AND status = 'active'
      `;
    } else {
      await sql`
        INSERT INTO user_subscriptions
          (user_id, plan_id, status, billing_period, current_period_start, current_period_end)
        VALUES
          (${user_id}, ${plan_id}, 'active', 'monthly', ${periodStart}, ${periodEnd})
      `;
    }

    // 充值 credits
    const creditsResult = await sql`
      SELECT * FROM user_credits WHERE user_id = ${user_id}
    `;

    if (creditsResult.rows.length > 0) {
      const currentCredits = creditsResult.rows[0];
      const newTotal = parseInt(currentCredits.total_credits) + creditsToAdd;

      await sql`
        UPDATE user_credits
        SET total_credits = ${newTotal}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${user_id}
      `;

      const purchaseDescription = `Credits from subscription purchase`;
      await sql`
        INSERT INTO credits_transactions
          (user_id, type, credits_delta, credits_before, credits_after, description, related_entity, related_entity_id)
        VALUES
          (${user_id}, 'purchase', ${creditsToAdd}, ${currentCredits.total_credits}, ${newTotal},
           ${purchaseDescription}, 'payment', ${checkout_id})
      `;
    } else {
      const nextReset = new Date();
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);

      await sql`
        INSERT INTO user_credits
          (user_id, total_credits, used_credits, bonus_credits, last_reset_at, next_reset_at)
        VALUES
          (${user_id}, ${creditsToAdd}, 0, 0, ${new Date()}, ${nextReset})
      `;

      const initialDescription = `Initial credits from subscription purchase`;
      await sql`
        INSERT INTO credits_transactions
          (user_id, type, credits_delta, credits_before, credits_after, description, related_entity, related_entity_id)
        VALUES
          (${user_id}, 'purchase', ${creditsToAdd}, 0, ${creditsToAdd},
           ${initialDescription}, 'payment', ${checkout_id})
      `;
    }

    // 更新订单状态
    await sql`
      UPDATE payment_orders
      SET status = 'completed', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE checkout_id = ${checkout_id}
    `;

    console.log('✅ Payment processing completed');

  } catch (error) {
    console.error('❌ Error processing payment:', error);
    throw error;
  }
}
