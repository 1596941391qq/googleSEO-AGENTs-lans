// 临时脚本：查询数据库结构
const { Client } = require('pg');

async function getTableStructure(connectionString, dbName) {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`\n=== 连接到 ${dbName} 成功 ===\n`);

    // 查询所有表
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`发现 ${tablesResult.rows.length} 个表:\n`);

    const allStructure = [];

    // 查询每个表的列信息
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;

      const columnsResult = await client.query(`
        SELECT
          table_name,
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      console.log(`  - ${tableName} (${columnsResult.rows.length} 列)`);

      allStructure.push({
        table: tableName,
        columns: columnsResult.rows
      });
    }

    return allStructure;

  } catch (error) {
    console.error(`错误 (${dbName}):`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('数据库结构对比工具');
  console.log('='.repeat(60));

  try {
    // 读取本地数据库
    console.log('\n[1/3] 读取本地数据库结构...');
    const localStructure = await getTableStructure(
      'postgres://postgres:123456@127.0.0.1:5432/postgres',
      '本地数据库'
    );

    // 读取线上数据库
    console.log('\n[2/3] 读取线上数据库结构...');
    const prodStructure = await getTableStructure(
      'postgres://a214f995500e9883025fe7b472115e6688d0e8349a02bef1d139878f294c1f1e:sk_uK0a2fZGrPNTLp8EFtx-s@db.prisma.io:5432/postgres?sslmode=require',
      '线上数据库'
    );

    // 保存结果到文件
    const fs = require('fs');
    fs.writeFileSync(
      'db-structure-local.json',
      JSON.stringify(localStructure, null, 2)
    );
    fs.writeFileSync(
      'db-structure-prod.json',
      JSON.stringify(prodStructure, null, 2)
    );

    console.log('\n✅ 数据库结构已保存到文件:');
    console.log('  - db-structure-local.json');
    console.log('  - db-structure-prod.json');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
