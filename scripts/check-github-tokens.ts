/**
 * 测试脚本：检查 github_tokens 表数据
 */
import { sql, initPSEOPublishTables } from '../api/lib/database.js';

async function checkGitHubTokens() {
  try {
    console.log('=== 检查 github_tokens 表 ===\n');

    // 初始化表
    await initPSEOPublishTables();
    console.log('✅ 表初始化完成\n');

    // 查询所有表
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%token%'
      ORDER BY table_name
    `;
    console.log('📋 Token 相关表:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');

    // 查询 github_tokens 表结构
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'github_tokens'
      ORDER BY ordinal_position
    `;
    console.log('📋 github_tokens 表结构:');
    columns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    console.log('');

    // 查询 github_tokens 数据
    const githubTokens = await sql`SELECT * FROM github_tokens`;
    console.log(`📊 github_tokens 表中有 ${githubTokens.rows.length} 条记录:`);
    githubTokens.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Name: ${row.name}`);
      console.log(`    Owner: ${row.owner_name}`);
      console.log(`    Status: ${row.status}`);
      console.log(`    Usage: ${row.usage_count}`);
      console.log(`    Created: ${row.created_at}`);
      console.log('');
    });

    // 查询 platform_tokens 表结构
    const platformColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'platform_tokens'
      ORDER BY ordinal_position
    `;
    console.log('📋 platform_tokens 表结构:');
    platformColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    console.log('');

    // 查询 platform_tokens 数据
    const platformTokens = await sql`SELECT * FROM platform_tokens`;
    console.log(`📊 platform_tokens 表中有 ${platformTokens.rows.length} 条记录:`);
    platformTokens.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Platform: ${row.platform}`);
      console.log(`    Name: ${row.name}`);
      console.log(`    Status: ${row.status}`);
      console.log(`    Usage: ${row.usage_count}`);
      console.log(`    Created: ${row.created_at}`);
      console.log('');
    });

    console.log('✅ 检查完成！');
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    process.exit(0);
  }
}

checkGitHubTokens();
