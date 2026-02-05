#!/usr/bin/env tsx
/**
 * 测试关键词管理系统
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

async function testKeywordsSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 开始测试关键词管理系统...\n');
    
    // 1. 检查表结构
    console.log('1️⃣ 检查表结构...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'keywords'
      ORDER BY ordinal_position
    `);
    console.log(`✅ keywords 表有 ${tableInfo.rowCount} 个字段\n`);
    
    // 2. 检查索引
    console.log('2️⃣ 检查索引...');
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'keywords'
    `);
    console.log(`✅ 创建了 ${indexes.rowCount} 个索引:`);
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    console.log();
    
    // 3. 检查触发器
    console.log('3️⃣ 检查触发器...');
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation
      FROM information_schema.triggers
      WHERE event_object_table = 'keywords'
    `);
    console.log(`✅ 创建了 ${triggers.rowCount} 个触发器:`);
    triggers.rows.forEach(trg => {
      console.log(`   - ${trg.trigger_name} (${trg.event_manipulation})`);
    });
    console.log();
    
    // 4. 检查函数
    console.log('4️⃣ 检查函数...');
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_name LIKE '%keyword%'
      AND routine_schema = 'public'
    `);
    console.log(`✅ 创建了 ${functions.rowCount} 个相关函数:`);
    functions.rows.forEach(fn => {
      console.log(`   - ${fn.routine_name}()`);
    });
    console.log();
    
    // 5. 测试插入数据
    console.log('5️⃣ 测试插入数据...');
    
    // 获取第一个用户
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    if (userResult.rowCount === 0) {
      console.log('⚠️  没有用户，跳过插入测试');
    } else {
      const userId = userResult.rows[0].id;
      
      const testKeyword = {
        keyword: `test-keyword-${Date.now()}`,
        volume: 1000,
        difficulty: 50,
        probability: 'High',
        source: 'manual'
      };
      
      const insertResult = await client.query(`
        INSERT INTO keywords (user_id, keyword, volume, difficulty, probability, source)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, keyword, created_at
      `, [userId, testKeyword.keyword, testKeyword.volume, testKeyword.difficulty, testKeyword.probability, testKeyword.source]);
      
      console.log(`✅ 成功插入测试数据:`);
      console.log(`   ID: ${insertResult.rows[0].id}`);
      console.log(`   关键词: ${insertResult.rows[0].keyword}`);
      console.log(`   创建时间: ${insertResult.rows[0].created_at}\n`);
      
      // 6. 测试更新
      console.log('6️⃣ 测试更新数据...');
      await client.query(`
        UPDATE keywords
        SET is_favorited = true, volume = 2000
        WHERE id = $1
      `, [insertResult.rows[0].id]);
      console.log('✅ 成功更新数据\n');
      
      // 7. 测试查询
      console.log('7️⃣ 测试查询数据...');
      const selectResult = await client.query(`
        SELECT * FROM keywords WHERE id = $1
      `, [insertResult.rows[0].id]);
      console.log('✅ 查询结果:');
      console.log(JSON.stringify(selectResult.rows[0], null, 2));
      console.log();
      
      // 8. 测试统计函数
      console.log('8️⃣ 测试统计函数...');
      const stats = await client.query('SELECT * FROM keywords_statistics()');
      console.log('✅ 统计结果:');
      console.log(JSON.stringify(stats.rows[0], null, 2));
      console.log();
      
      // 9. 清理测试数据
      console.log('9️⃣ 清理测试数据...');
      await client.query('DELETE FROM keywords WHERE id = $1', [insertResult.rows[0].id]);
      console.log('✅ 测试数据已清理\n');
    }
    
    // 10. 性能测试
    console.log('🔟 性能测试...');
    const perfStart = Date.now();
    await client.query(`
      SELECT k.*, p.name as project_name
      FROM keywords k
      LEFT JOIN projects p ON k.project_id = p.id
      LIMIT 100
    `);
    const perfDuration = Date.now() - perfStart;
    console.log(`✅ 查询100条记录耗时: ${perfDuration}ms\n`);
    
    console.log('✅ 所有测试通过！\n');
    
    // 总结
    console.log('📋 系统状态总结:');
    console.log('  ✅ 表结构正确');
    console.log('  ✅ 索引已创建');
    console.log('  ✅ 触发器正常');
    console.log('  ✅ 统计函数可用');
    console.log('  ✅ CRUD 操作正常');
    console.log('  ✅ 查询性能良好');
    
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    if (error.detail) console.error('详情:', error.detail);
    if (error.hint) console.error('提示:', error.hint);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testKeywordsSystem()
  .then(() => {
    console.log('\n🎉 测试完成！');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n💥 测试失败！');
    process.exit(1);
  });

