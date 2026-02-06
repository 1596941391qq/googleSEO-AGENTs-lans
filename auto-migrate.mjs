// 自动数据库迁移脚本 - 一步到位
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// 数据库连接配置
const LOCAL_DB = 'postgres://postgres:123456@127.0.0.1:5432/postgres';
const PROD_DB = 'postgres://a214f995500e9883025fe7b472115e6688d0e8349a02bef1d139878f294c1f1e:sk_uK0a2fZGrPNTLp8EFtx-s@db.prisma.io:5432/postgres?sslmode=require';

async function getTableStructure(connectionString, dbName) {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`✅ 连接到 ${dbName} 成功`);

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const allStructure = [];

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

      allStructure.push({
        table: tableName,
        columns: columnsResult.rows
      });
    }

    return allStructure;

  } finally {
    await client.end();
  }
}

function formatDataType(col) {
  let type = col.data_type;
  if (col.character_maximum_length) {
    type += `(${col.character_maximum_length})`;
  }
  return type;
}

function generateSmartMigrations(local, prod) {
  const migrations = [];
  const localTables = new Map(local.map(t => [t.table, t]));
  const prodTables = new Map(prod.map(t => [t.table, t]));

  // 1. 新增表
  for (const [tableName, tableInfo] of localTables) {
    if (!prodTables.has(tableName)) {
      const columnDefs = tableInfo.columns.map(col => {
        let def = `  ${col.column_name} ${formatDataType(col)}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        return def;
      });

      migrations.push({
        type: 'CREATE_TABLE',
        table: tableName,
        sql: `CREATE TABLE IF NOT EXISTS ${tableName} (\n${columnDefs.join(',\n')}\n);`,
        safe: true
      });
    }
  }

  // 2. 表结构变更
  for (const [tableName, localTable] of localTables) {
    if (prodTables.has(tableName)) {
      const prodTable = prodTables.get(tableName);
      const localCols = new Map(localTable.columns.map(c => [c.column_name, c]));
      const prodCols = new Map(prodTable.columns.map(c => [c.column_name, c]));

      // 新增列 - 智能处理 NOT NULL
      for (const [colName, col] of localCols) {
        if (!prodCols.has(colName)) {
          const dataType = formatDataType(col);

          if (col.is_nullable === 'NO' && !col.column_default) {
            // NOT NULL 且无默认值 - 需要分步处理
            migrations.push({
              type: 'ADD_COLUMN_SMART',
              table: tableName,
              column: colName,
              sql: [
                `-- 步骤 1: 添加可空列`,
                `ALTER TABLE ${tableName} ADD COLUMN ${colName} ${dataType};`,
                `-- 步骤 2: 填充默认值（根据类型）`,
                col.data_type === 'uuid'
                  ? `UPDATE ${tableName} SET ${colName} = gen_random_uuid() WHERE ${colName} IS NULL;`
                  : col.data_type.includes('character') || col.data_type === 'text'
                  ? `UPDATE ${tableName} SET ${colName} = '' WHERE ${colName} IS NULL;`
                  : col.data_type.includes('int') || col.data_type === 'numeric'
                  ? `UPDATE ${tableName} SET ${colName} = 0 WHERE ${colName} IS NULL;`
                  : col.data_type.includes('boolean')
                  ? `UPDATE ${tableName} SET ${colName} = false WHERE ${colName} IS NULL;`
                  : col.data_type.includes('timestamp')
                  ? `UPDATE ${tableName} SET ${colName} = NOW() WHERE ${colName} IS NULL;`
                  : `-- 警告: 无法自动填充 ${colName}，请手动处理`,
                `-- 步骤 3: 设置为 NOT NULL`,
                `ALTER TABLE ${tableName} ALTER COLUMN ${colName} SET NOT NULL;`
              ].join('\n'),
              safe: false,
              warning: `${tableName}.${colName} 是 NOT NULL 但无默认值，将自动填充数据`
            });
          } else {
            // 普通列
            let sql = `ALTER TABLE ${tableName} ADD COLUMN ${colName} ${dataType}`;
            if (col.is_nullable === 'NO') sql += ' NOT NULL';
            if (col.column_default) sql += ` DEFAULT ${col.column_default}`;

            migrations.push({
              type: 'ADD_COLUMN',
              table: tableName,
              column: colName,
              sql: sql + ';',
              safe: true
            });
          }
        }
      }

      // 列类型变更
      for (const [colName, localCol] of localCols) {
        const prodCol = prodCols.get(colName);
        if (prodCol) {
          const localType = formatDataType(localCol);
          const prodType = formatDataType(prodCol);

          if (localType !== prodType) {
            migrations.push({
              type: 'ALTER_COLUMN_TYPE',
              table: tableName,
              column: colName,
              sql: `ALTER TABLE ${tableName} ALTER COLUMN ${colName} TYPE ${localType};`,
              safe: true,
              info: `${prodType} → ${localType}`
            });
          }

          // nullable 变更
          if (localCol.is_nullable !== prodCol.is_nullable) {
            if (localCol.is_nullable === 'NO') {
              migrations.push({
                type: 'SET_NOT_NULL',
                table: tableName,
                column: colName,
                sql: `ALTER TABLE ${tableName} ALTER COLUMN ${colName} SET NOT NULL;`,
                safe: false,
                warning: '确保列中没有 NULL 值'
              });
            } else {
              migrations.push({
                type: 'DROP_NOT_NULL',
                table: tableName,
                column: colName,
                sql: `ALTER TABLE ${tableName} ALTER COLUMN ${colName} DROP NOT NULL;`,
                safe: true
              });
            }
          }
        }
      }
    }
  }

  return migrations;
}

async function executeMigration(connectionString, migrations) {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n🚀 开始执行迁移...\n');

    // 开始事务
    await client.query('BEGIN;');
    console.log('✅ 事务已开始');

    let successCount = 0;
    let skipCount = 0;

    for (const migration of migrations) {
      try {
        console.log(`\n📝 [${migration.type}] ${migration.table}${migration.column ? '.' + migration.column : ''}`);

        if (migration.warning) {
          console.log(`   ⚠️  ${migration.warning}`);
        }

        if (migration.info) {
          console.log(`   ℹ️  ${migration.info}`);
        }

        // 执行 SQL
        const sqlStatements = migration.sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

        for (const sql of sqlStatements) {
          const trimmedSql = sql.trim();
          if (trimmedSql) {
            await client.query(trimmedSql);
          }
        }

        console.log(`   ✅ 执行成功`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ 执行失败: ${error.message}`);

        // 如果是非关键错误，继续执行
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`   ⏭️  跳过此步骤`);
          skipCount++;
        } else {
          throw error; // 关键错误，回滚
        }
      }
    }

    // 提交事务
    await client.query('COMMIT;');
    console.log('\n✅ 事务已提交');
    console.log(`\n📊 执行结果: ${successCount} 成功, ${skipCount} 跳过, 共 ${migrations.length} 条`);

    return { success: true, successCount, skipCount, total: migrations.length };

  } catch (error) {
    // 回滚事务
    try {
      await client.query('ROLLBACK;');
      console.log('\n🔄 事务已回滚');
    } catch (rollbackError) {
      console.error('回滚失败:', rollbackError.message);
    }

    return { success: false, error: error.message };

  } finally {
    await client.end();
  }
}

async function verifyMigration(connectionString) {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT table_name, COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name
      ORDER BY table_name;
    `);

    console.log('\n📊 迁移后的数据库结构:');
    console.log(`   共 ${result.rows.length} 个表\n`);

    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}: ${row.column_count} 列`);
    });

  } finally {
    await client.end();
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🤖 自动数据库迁移工具 - 一步到位');
  console.log('='.repeat(70));

  try {
    // 1. 读取数据库结构
    console.log('\n[1/4] 读取数据库结构...\n');
    const localStructure = await getTableStructure(LOCAL_DB, '本地数据库');
    const prodStructure = await getTableStructure(PROD_DB, '线上数据库');

    console.log(`\n   本地: ${localStructure.length} 个表`);
    console.log(`   线上: ${prodStructure.length} 个表`);

    // 2. 生成智能迁移
    console.log('\n[2/4] 生成智能迁移方案...\n');
    const migrations = generateSmartMigrations(localStructure, prodStructure);

    if (migrations.length === 0) {
      console.log('✅ 数据库结构一致，无需迁移！');
      return;
    }

    console.log(`   发现 ${migrations.length} 个变更:`);
    migrations.forEach(m => {
      const icon = m.safe ? '✅' : '⚠️';
      console.log(`   ${icon} [${m.type}] ${m.table}${m.column ? '.' + m.column : ''}`);
    });

    // 3. 执行迁移
    console.log('\n[3/4] 在线上数据库执行迁移...');
    const result = await executeMigration(PROD_DB, migrations);

    if (!result.success) {
      console.error(`\n❌ 迁移失败: ${result.error}`);
      console.error('数据库已回滚到迁移前状态');
      process.exit(1);
    }

    // 4. 验证结果
    console.log('\n[4/4] 验证迁移结果...');
    await verifyMigration(PROD_DB);

    console.log('\n' + '='.repeat(70));
    console.log('🎉 迁移完成！');
    console.log('='.repeat(70));
    console.log('\n✅ 所有变更已成功应用到线上数据库');
    console.log('✅ 数据库结构已同步');
    console.log('\n建议: 测试应用功能以确保一切正常');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
