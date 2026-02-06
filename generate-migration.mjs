// 数据库结构对比和迁移生成脚本
import fs from 'fs';

function loadStructure(filename) {
  const content = fs.readFileSync(filename, 'utf-8');
  return JSON.parse(content);
}

function compareStructures(local, prod) {
  const migrations = [];
  const warnings = [];

  // 创建表名映射
  const localTables = new Map(local.map(t => [t.table, t]));
  const prodTables = new Map(prod.map(t => [t.table, t]));

  // 1. 检查本地有但线上没有的表（需要在线上创建）
  console.log('\n=== 本地新增的表（需要同步到线上） ===\n');
  for (const [tableName, tableInfo] of localTables) {
    if (!prodTables.has(tableName)) {
      console.log(`  ✅ ${tableName}`);
      migrations.push(generateCreateTableSQL(tableInfo));
    }
  }

  // 2. 检查线上有但本地没有的表（可能需要删除或本地缺失）
  console.log('\n=== 线上独有的表（本地缺失） ===\n');
  for (const [tableName] of prodTables) {
    if (!localTables.has(tableName)) {
      console.log(`  ⚠️  ${tableName}`);
      warnings.push(`-- 警告: 线上有表 ${tableName}，但本地没有`);
      warnings.push(`-- 如果需要删除，取消下面的注释:`);
      warnings.push(`-- DROP TABLE IF EXISTS ${tableName} CASCADE;`);
      warnings.push('');
    }
  }

  // 3. 检查两边都有的表，对比列差异
  console.log('\n=== 表结构差异 ===\n');
  for (const [tableName, localTable] of localTables) {
    if (prodTables.has(tableName)) {
      const prodTable = prodTables.get(tableName);
      const tableMigrations = compareTableColumns(tableName, localTable, prodTable);
      if (tableMigrations.length > 0) {
        console.log(`  🔄 ${tableName} (${tableMigrations.length} 个变更)`);
        migrations.push(...tableMigrations);
      }
    }
  }

  return { migrations, warnings };
}

function generateCreateTableSQL(tableInfo) {
  const tableName = tableInfo.table;
  const columns = tableInfo.columns;

  const columnDefs = columns.map(col => {
    let def = `  ${col.column_name} ${formatDataType(col)}`;

    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }

    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }

    return def;
  });

  return `
-- 创建新表: ${tableName}
CREATE TABLE IF NOT EXISTS ${tableName} (
${columnDefs.join(',\n')}
);
`;
}

function formatDataType(col) {
  let type = col.data_type;

  if (col.character_maximum_length) {
    type += `(${col.character_maximum_length})`;
  }

  return type;
}

function compareTableColumns(tableName, localTable, prodTable) {
  const migrations = [];

  const localCols = new Map(localTable.columns.map(c => [c.column_name, c]));
  const prodCols = new Map(prodTable.columns.map(c => [c.column_name, c]));

  // 检查本地新增的列
  for (const [colName, col] of localCols) {
    if (!prodCols.has(colName)) {
      let sql = `ALTER TABLE ${tableName} ADD COLUMN ${colName} ${formatDataType(col)}`;

      if (col.is_nullable === 'NO') {
        sql += ' NOT NULL';
      }

      if (col.column_default) {
        sql += ` DEFAULT ${col.column_default}`;
      }

      migrations.push(`${sql};`);
    }
  }

  // 检查线上独有的列（可能需要删除）
  for (const [colName] of prodCols) {
    if (!localCols.has(colName)) {
      migrations.push(`-- 警告: 线上有列 ${tableName}.${colName}，但本地没有`);
      migrations.push(`-- ALTER TABLE ${tableName} DROP COLUMN ${colName};`);
    }
  }

  // 检查列类型变化
  for (const [colName, localCol] of localCols) {
    const prodCol = prodCols.get(colName);
    if (prodCol) {
      const localType = formatDataType(localCol);
      const prodType = formatDataType(prodCol);

      if (localType !== prodType) {
        migrations.push(`-- 列类型变化: ${tableName}.${colName} (${prodType} → ${localType})`);
        migrations.push(`ALTER TABLE ${tableName} ALTER COLUMN ${colName} TYPE ${localType};`);
      }

      // 检查 nullable 变化
      if (localCol.is_nullable !== prodCol.is_nullable) {
        if (localCol.is_nullable === 'NO') {
          migrations.push(`ALTER TABLE ${tableName} ALTER COLUMN ${colName} SET NOT NULL;`);
        } else {
          migrations.push(`ALTER TABLE ${tableName} ALTER COLUMN ${colName} DROP NOT NULL;`);
        }
      }
    }
  }

  return migrations;
}

function generateMigrationFile(migrations, warnings) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${timestamp}_auto_migration.sql`;

  const content = `-- ============================================================
-- 自动生成的数据库迁移脚本
-- ============================================================
-- 生成时间: ${new Date().toISOString()}
-- 说明: 此脚本对比了本地和线上数据库的差异
--
-- ⚠️  警告：
-- 1. 请在执行前仔细检查每条 SQL 语句
-- 2. 建议先在测试环境执行
-- 3. 执行前请备份数据库
-- 4. 删除操作已被注释，需要手动取消注释
-- ============================================================

BEGIN;

${warnings.length > 0 ? '-- ============================================================\n-- 警告信息\n-- ============================================================\n\n' + warnings.join('\n') + '\n\n' : ''}${migrations.length > 0 ? '-- ============================================================\n-- 迁移语句\n-- ============================================================\n\n' + migrations.join('\n\n') : '-- 没有需要迁移的内容'}

COMMIT;

-- ============================================================
-- 回滚脚本（如果需要）
-- ============================================================
-- BEGIN;
-- ... 在这里添加回滚语句 ...
-- COMMIT;
`;

  // 确保 migrations 目录存在
  if (!fs.existsSync('migrations')) {
    fs.mkdirSync('migrations', { recursive: true });
  }

  const filepath = `migrations/${filename}`;
  fs.writeFileSync(filepath, content, 'utf-8');

  return { filename, filepath, content };
}

async function main() {
  console.log('='.repeat(60));
  console.log('数据库迁移 SQL 生成器');
  console.log('='.repeat(60));

  try {
    // 加载结构文件
    console.log('\n[1/3] 加载数据库结构文件...');
    const localStructure = loadStructure('db-structure-local.json');
    const prodStructure = loadStructure('db-structure-prod.json');

    console.log(`  ✅ 本地: ${localStructure.length} 个表`);
    console.log(`  ✅ 线上: ${prodStructure.length} 个表`);

    // 对比差异
    console.log('\n[2/3] 对比数据库差异...');
    const { migrations, warnings } = compareStructures(localStructure, prodStructure);

    if (migrations.length === 0 && warnings.length === 0) {
      console.log('\n✅ 数据库结构一致，无需迁移！');
      return;
    }

    // 生成迁移文件
    console.log('\n[3/3] 生成迁移文件...');
    const result = generateMigrationFile(migrations, warnings);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 迁移文件生成成功！');
    console.log('='.repeat(60));
    console.log(`\n文件路径: ${result.filepath}`);
    console.log(`迁移语句: ${migrations.length} 条`);
    console.log(`警告信息: ${warnings.length} 条`);
    console.log('\n下一步操作：');
    console.log('1. 检查迁移文件内容');
    console.log('2. 在本地测试迁移');
    console.log('3. 验证迁移结果');
    console.log('4. 在生产环境执行迁移');
    console.log('');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
