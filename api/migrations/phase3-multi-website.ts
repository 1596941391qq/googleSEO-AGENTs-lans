/**
 * Phase 3.1: 多网站管理功能 - 数据库迁移脚本
 *
 * 功能：
 * 1. 扩展 user_websites 表，添加 is_default 和 last_accessed_at 字段
 * 2. 创建 user_preferences 表用于存储用户偏好设置
 *
 * 执行方式：访问 /api/migrations/phase3-multi-website
 */

import { Client } from 'pg';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

export default async function handler(req: any, res: any) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!connectionString) {
    return res.status(500).json({
      error: 'Database connection string not found',
      message: 'Please set POSTGRES_URL or DATABASE_URL environment variable'
    });
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ||
          connectionString.includes('ssl=true') ||
          connectionString.includes('vercel') ? {
      rejectUnauthorized: false
    } : undefined
  });

  try {
    await client.connect();
    const results: any[] = [];

    // ==========================================
    // Step 1: 扩展 user_websites 表
    // ==========================================
    console.log('[Migration] Step 1: Adding columns to user_websites table...');

    try {
      // 添加 is_default 字段
      await client.query(`
        ALTER TABLE user_websites
        ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false
      `);
      results.push({ step: 1.1, status: 'success', message: 'Added is_default column' });
    } catch (error: any) {
      results.push({ step: 1.1, status: 'skipped', message: error.message });
    }

    try {
      // 添加 last_accessed_at 字段
      await client.query(`
        ALTER TABLE user_websites
        ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP
      `);
      results.push({ step: 1.2, status: 'success', message: 'Added last_accessed_at column' });
    } catch (error: any) {
      results.push({ step: 1.2, status: 'skipped', message: error.message });
    }

    // ==========================================
    // Step 2: 创建用户偏好表
    // ==========================================
    console.log('[Migration] Step 2: Creating user_preferences table...');

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          default_website_id UUID REFERENCES user_websites(id) ON DELETE SET NULL,
          last_selected_website_id UUID REFERENCES user_websites(id) ON DELETE SET NULL,
          ui_settings JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      results.push({ step: 2.1, status: 'success', message: 'Created user_preferences table' });
    } catch (error: any) {
      results.push({ step: 2.1, status: 'error', message: error.message });
    }

    // ==========================================
    // Step 3: 创建索引
    // ==========================================
    console.log('[Migration] Step 3: Creating indexes...');

    try {
      // 确保每个用户只有一个默认网站（使用部分索引）
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_default_website
        ON user_websites(user_id)
        WHERE is_default = true
      `);
      results.push({ step: 3.1, status: 'success', message: 'Created idx_user_default_website' });
    } catch (error: any) {
      results.push({ step: 3.1, status: 'skipped', message: error.message });
    }

    try {
      // user_preferences 表的索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_preferences_default_website
        ON user_preferences(default_website_id)
      `);
      results.push({ step: 3.2, status: 'success', message: 'Created idx_user_preferences_default_website' });
    } catch (error: any) {
      results.push({ step: 3.2, status: 'skipped', message: error.message });
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_preferences_last_selected
        ON user_preferences(last_selected_website_id)
      `);
      results.push({ step: 3.3, status: 'success', message: 'Created idx_user_preferences_last_selected' });
    } catch (error: any) {
      results.push({ step: 3.3, status: 'skipped', message: error.message });
    }

    // ==========================================
    // Step 4: 数据迁移
    // ==========================================
    console.log('[Migration] Step 4: Migrating existing data...');

    try {
      // 为已有用户创建 user_preferences 记录
      const existingUsersResult = await client.query(`
        SELECT DISTINCT user_id FROM user_websites
      `);

      for (const row of existingUsersResult.rows) {
        const userId = row.user_id;

        // 检查是否已有 user_preferences 记录
        const prefCheck = await client.query(`
          SELECT user_id FROM user_preferences WHERE user_id = $1
        `, [userId]);

        if (prefCheck.rows.length === 0) {
          // 获取该用户的第一个网站
          const firstWebsite = await client.query(`
            SELECT id FROM user_websites
            WHERE user_id = $1
            ORDER BY created_at ASC
            LIMIT 1
          `, [userId]);

          if (firstWebsite.rows.length > 0) {
            await client.query(`
              INSERT INTO user_preferences (user_id, default_website_id, last_selected_website_id)
              VALUES ($1, $2, $2)
              ON CONFLICT (user_id) DO NOTHING
            `, [userId, firstWebsite.rows[0].id]);

            results.push({
              step: 4,
              status: 'success',
              message: `Created preference for user ${userId}`
            });
          }
        }
      }
    } catch (error: any) {
      results.push({ step: 4, status: 'warning', message: error.message });
    }

    // ==========================================
    // 验证迁移结果
    // ==========================================
    console.log('[Migration] Step 5: Verifying migration...');

    const verificationResults: any = {};

    try {
      // 检查 user_websites 表结构
      const columnsResult = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'user_websites'
        AND column_name IN ('is_default', 'last_accessed_at')
      `);
      verificationResults.user_websites_columns = columnsResult.rows;
    } catch (error: any) {
      verificationResults.user_websites_columns = { error: error.message };
    }

    try {
      // 检查 user_preferences 表是否存在
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'user_preferences'
        )
      `);
      verificationResults.user_preferences_exists = tableCheck.rows[0].exists;
    } catch (error: any) {
      verificationResults.user_preferences_exists = { error: error.message };
    }

    try {
      // 统计数据
      const stats = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM user_websites) as total_websites,
          (SELECT COUNT(*) FROM user_websites WHERE is_default = true) as default_websites,
          (SELECT COUNT(*) FROM user_preferences) as total_preferences
      `);
      verificationResults.stats = stats.rows[0];
    } catch (error: any) {
      verificationResults.stats = { error: error.message };
    }

    await client.end();

    return res.status(200).json({
      success: true,
      message: 'Phase 3.1 migration completed successfully',
      results,
      verification: verificationResults
    });

  } catch (error: any) {
    console.error('[Migration] Error:', error);
    await client.end();

    return res.status(500).json({
      success: false,
      error: error.message,
      details: {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      }
    });
  }
}
