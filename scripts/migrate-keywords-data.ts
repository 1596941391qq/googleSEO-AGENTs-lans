#!/usr/bin/env tsx
/**
 * 数据迁移脚本：从 keyword_analysis_cache 迁移到 keywords 表
 */

import { Pool } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ 数据库连接字符串未配置');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
});

async function migrateData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 开始数据迁移...\n');
    
    // 1. 检查源数据
    const cacheCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM keyword_analysis_cache 
      WHERE website_id IS NOT NULL
    `);
    console.log(`📊 keyword_analysis_cache 中有 ${cacheCount.rows[0].count} 条记录\n`);
    
    if (cacheCount.rows[0].count === '0') {
      console.log('⚠️  没有数据需要迁移');
      return;
    }
    
    // 2. 执行迁移
    console.log('🔄 开始迁移数据...');
    const result = await client.query(`
      INSERT INTO keywords (
        user_id,
        website_id,
        keyword,
        volume,
        difficulty,
        cpc,
        probability,
        intent,
        top_domain_type,
        reasoning,
        top_serp_snippets,
        source,
        created_at
      )
      SELECT DISTINCT ON (uw.user_id, kac.keyword)
        uw.user_id,
        kac.website_id,
        kac.keyword,
        kac.dataforseo_volume,
        kac.dataforseo_difficulty,
        kac.dataforseo_cpc,
        COALESCE(kac.agent2_probability, 'Medium'),
        COALESCE(kac.agent2_search_intent, 'Informational'),
        kac.agent2_top_domain_type,
        kac.agent2_reasoning,
        kac.agent2_top_serp_snippets,
        COALESCE(kac.source, 'manual'),
        kac.created_at
      FROM keyword_analysis_cache kac
      INNER JOIN user_websites uw ON kac.website_id = uw.id
      WHERE kac.website_id IS NOT NULL
        AND uw.user_id IS NOT NULL
      ON CONFLICT (user_id, keyword) DO UPDATE SET
        volume = EXCLUDED.volume,
        difficulty = EXCLUDED.difficulty,
        cpc = EXCLUDED.cpc,
        probability = EXCLUDED.probability,
        reasoning = EXCLUDED.reasoning,
        top_domain_type = EXCLUDED.top_domain_type,
        top_serp_snippets = EXCLUDED.top_serp_snippets,
        updated_at = NOW()
      RETURNING id
    `);
    
    console.log(`✅ 成功迁移 ${result.rowCount} 条记录\n`);
    
    // 3. 验证迁移结果
    const keywordsCount = await client.query('SELECT COUNT(*) as count FROM keywords');
    console.log(`📊 keywords 表现在有 ${keywordsCount.rows[0].count} 条记录\n`);
    
    // 4. 显示统计信息
    const stats = await client.query('SELECT * FROM keywords_statistics()');
    console.log('📈 统计信息:');
    console.log(JSON.stringify(stats.rows[0], null, 2));
    
    // 5. 显示按来源分组的数据
    const bySource = await client.query(`
      SELECT source, COUNT(*) as count
      FROM keywords
      GROUP BY source
      ORDER BY count DESC
    `);
    console.log('\n📊 按来源分组:');
    bySource.rows.forEach(row => {
      console.log(`  ${row.source || 'unknown'}: ${row.count}`);
    });
    
    // 6. 显示按概率分组的数据
    const byProbability = await client.query(`
      SELECT probability, COUNT(*) as count
      FROM keywords
      GROUP BY probability
      ORDER BY 
        CASE probability
          WHEN 'High' THEN 1
          WHEN 'Medium' THEN 2
          WHEN 'Low' THEN 3
          ELSE 4
        END
    `);
    console.log('\n📊 按概率分组:');
    byProbability.rows.forEach(row => {
      console.log(`  ${row.probability || 'unknown'}: ${row.count}`);
    });
    
    console.log('\n✅ 数据迁移完成！');
    
  } catch (error: any) {
    console.error('❌ 迁移失败:', error.message);
    if (error.detail) console.error('详情:', error.detail);
    if (error.hint) console.error('提示:', error.hint);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

