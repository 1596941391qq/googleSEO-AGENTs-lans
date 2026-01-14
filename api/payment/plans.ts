import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, initPaymentTables } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initPaymentTables();

    const result = await sql`
      SELECT plan_id, name_en, name_zh, price, credits_monthly, description
      FROM subscription_plans
      ORDER BY price ASC
    `;

    const plans = result.rows.map((plan) => ({
      plan_id: plan.plan_id,
      name_en: plan.name_en,
      name_zh: plan.name_zh,
      price:
        typeof plan.price === 'string'
          ? parseFloat(plan.price)
          : typeof plan.price === 'number'
          ? plan.price
          : 0,
      credits_monthly: plan.credits_monthly || 0,
      description: plan.description || '',
    }));

    return res.status(200).json({ success: true, plans });
  } catch (error: any) {
    console.error('[payment/plans] Error loading plans:', error);
    return res.status(500).json({
      error: 'Failed to load payment plans',
      details: error.message || 'Unknown error',
    });
  }
}
