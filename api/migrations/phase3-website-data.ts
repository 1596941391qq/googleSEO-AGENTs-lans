/**
 * Phase 3.2: Website Data 增强 - 数据库迁移脚本
 *
 * 功能：
 * 1. 创建 domain_overview_cache 表 - 缓存域名概览数据
 * 2. 创建 domain_keywords_cache 表 - 缓存域名关键词排名数据
 * 3. 创建 domain_competitors_cache 表 - 缓存竞争对手数据
 *
 * 执行方式：访问 /api/migrations/phase3-website-data
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
    // Step 1: 创建域名概览缓存表
    // ==========================================
    console.log('[Migration] Step 1: Creating domain_overview_cache table...');

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS domain_overview_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,

          -- 流量数据
          organic_traffic INTEGER DEFAULT 0,
          paid_traffic INTEGER DEFAULT 0,
          total_traffic INTEGER DEFAULT 0,

          -- 关键词数据
          total_keywords INTEGER DEFAULT 0,
          new_keywords INTEGER DEFAULT 0,
          lost_keywords INTEGER DEFAULT 0,
          improved_keywords INTEGER DEFAULT 0,
          declined_keywords INTEGER DEFAULT 0,

          -- 排名数据
          avg_position DECIMAL(5,2) DEFAULT 0,
          traffic_cost DECIMAL(10,2) DEFAULT 0,

          -- 排名分布
          top3_count INTEGER DEFAULT 0,
          top10_count INTEGER DEFAULT 0,
          top50_count INTEGER DEFAULT 0,
          top100_count INTEGER DEFAULT 0,

          -- 缓存控制
          data_date DATE DEFAULT CURRENT_DATE,
          data_updated_at TIMESTAMP DEFAULT NOW(),
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',

          created_at TIMESTAMP DEFAULT NOW(),

          CONSTRAINT unique_website_overview_date UNIQUE (website_id, data_date)
        )
      `);
      results.push({ step: 1.1, status: 'success', message: 'Created domain_overview_cache table' });
    } catch (error: any) {
      results.push({ step: 1.1, status: 'error', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_overview_website ON domain_overview_cache(website_id)`);
      results.push({ step: 1.2, status: 'success', message: 'Created idx_domain_overview_website' });
    } catch (error: any) {
      results.push({ step: 1.2, status: 'skipped', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_overview_date ON domain_overview_cache(data_date)`);
      results.push({ step: 1.3, status: 'success', message: 'Created idx_domain_overview_date' });
    } catch (error: any) {
      results.push({ step: 1.3, status: 'skipped', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_overview_expires ON domain_overview_cache(cache_expires_at)`);
      results.push({ step: 1.4, status: 'success', message: 'Created idx_domain_overview_expires' });
    } catch (error: any) {
      results.push({ step: 1.4, status: 'skipped', message: error.message });
    }

    // ==========================================
    // Step 2: 创建域名关键词缓存表
    // ==========================================
    console.log('[Migration] Step 2: Creating domain_keywords_cache table...');

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS domain_keywords_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          keyword_id UUID REFERENCES website_keywords(id) ON DELETE SET NULL,

          -- 关键词信息
          keyword VARCHAR(500) NOT NULL,

          -- SE-Ranking 排名数据
          current_position INTEGER DEFAULT 0,
          previous_position INTEGER DEFAULT 0,
          position_change INTEGER DEFAULT 0,

          -- 搜索量与难度
          search_volume INTEGER DEFAULT 0,
          cpc DECIMAL(10,2) DEFAULT 0,
          competition DECIMAL(5,2) DEFAULT 0,
          difficulty INTEGER DEFAULT 0,

          -- 流量占比
          traffic_percentage DECIMAL(5,2) DEFAULT 0,

          -- 排名URL
          ranking_url VARCHAR(1000),

          -- 趋势数据
          position_change_7d INTEGER DEFAULT 0,
          position_change_30d INTEGER DEFAULT 0,

          -- 历史数据
          ranking_history JSONB,

          -- 缓存控制
          data_updated_at TIMESTAMP DEFAULT NOW(),
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',

          created_at TIMESTAMP DEFAULT NOW(),

          CONSTRAINT unique_website_domain_keyword UNIQUE (website_id, keyword)
        )
      `);
      results.push({ step: 2.1, status: 'success', message: 'Created domain_keywords_cache table' });
    } catch (error: any) {
      results.push({ step: 2.1, status: 'error', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_keywords_website ON domain_keywords_cache(website_id)`);
      results.push({ step: 2.2, status: 'success', message: 'Created idx_domain_keywords_website' });
    } catch (error: any) {
      results.push({ step: 2.2, status: 'skipped', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_keywords_keyword_id ON domain_keywords_cache(keyword_id)`);
      results.push({ step: 2.3, status: 'success', message: 'Created idx_domain_keywords_keyword_id' });
    } catch (error: any) {
      results.push({ step: 2.3, status: 'skipped', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_keywords_position ON domain_keywords_cache(current_position)`);
      results.push({ step: 2.4, status: 'success', message: 'Created idx_domain_keywords_position' });
    } catch (error: any) {
      results.push({ step: 2.4, status: 'skipped', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_keywords_expires ON domain_keywords_cache(cache_expires_at)`);
      results.push({ step: 2.5, status: 'success', message: 'Created idx_domain_keywords_expires' });
    } catch (error: any) {
      results.push({ step: 2.5, status: 'skipped', message: error.message });
    }

    // ==========================================
    // Step 3: 创建竞争对手缓存表
    // ==========================================
    console.log('[Migration] Step 3: Creating domain_competitors_cache table...');

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS domain_competitors_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,

          -- 竞争对手信息
          competitor_domain VARCHAR(255) NOT NULL,
          competitor_title VARCHAR(500),

          -- 对比数据
          common_keywords INTEGER DEFAULT 0,
          organic_traffic INTEGER DEFAULT 0,
          total_keywords INTEGER DEFAULT 0,

          -- 差距分析
          gap_keywords INTEGER DEFAULT 0,
          gap_traffic INTEGER DEFAULT 0,

          -- 缓存控制
          data_updated_at TIMESTAMP DEFAULT NOW(),
          cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',

          created_at TIMESTAMP DEFAULT NOW(),

          CONSTRAINT unique_website_competitor UNIQUE (website_id, competitor_domain)
        )
      `);
      results.push({ step: 3.1, status: 'success', message: 'Created domain_competitors_cache table' });
    } catch (error: any) {
      results.push({ step: 3.1, status: 'error', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_competitors_website ON domain_competitors_cache(website_id)`);
      results.push({ step: 3.2, status: 'success', message: 'Created idx_domain_competitors_website' });
    } catch (error: any) {
      results.push({ step: 3.2, status: 'skipped', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_competitors_domain ON domain_competitors_cache(competitor_domain)`);
      results.push({ step: 3.3, status: 'success', message: 'Created idx_domain_competitors_domain' });
    } catch (error: any) {
      results.push({ step: 3.3, status: 'skipped', message: error.message });
    }

    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_domain_competitors_expires ON domain_competitors_cache(cache_expires_at)`);
      results.push({ step: 3.4, status: 'success', message: 'Created idx_domain_competitors_expires' });
    } catch (error: any) {
      results.push({ step: 3.4, status: 'skipped', message: error.message });
    }

    // ==========================================
    // 验证迁移结果
    // ==========================================
    console.log('[Migration] Step 4: Verifying migration...');

    const verificationResults: any = {};

    try {
      const tables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name IN ('domain_overview_cache', 'domain_keywords_cache', 'domain_competitors_cache')
      `);
      verificationResults.tables_created = tables.rows.map((r: any) => r.table_name);
    } catch (error: any) {
      verificationResults.tables_created = { error: error.message };
    }

    try {
      const stats = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM domain_overview_cache) as overview_count,
          (SELECT COUNT(*) FROM domain_keywords_cache) as keywords_count,
          (SELECT COUNT(*) FROM domain_competitors_cache) as competitors_count
      `);
      verificationResults.stats = stats.rows[0];
    } catch (error: any) {
      verificationResults.stats = { error: error.message };
    }

    await client.end();

    return res.status(200).json({
      success: true,
      message: 'Phase 3.2 migration completed successfully',
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
