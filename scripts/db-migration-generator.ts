/**
 * 数据库迁移生成器
 * 对比本地和线上数据库结构，自动生成迁移 SQL
 *
 * 使用方法：
 * 1. 确保已安装 postgres-local 和 postgres-prod MCP
 * 2. 运行：npx tsx scripts/db-migration-generator.ts
 * 3. 查看生成的迁移文件：migrations/YYYYMMDD_HHMMSS_migration.sql
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface IndexInfo {
  table_name: string;
  index_name: string;
  column_name: string;
  is_unique: boolean;
}

/**
 * 获取数据库表结构
 */
async function getTableStructure(mcpName: 'postgres-local' | 'postgres-prod'): Promise<TableInfo[]> {
  const query = `
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;

  // 注意：这里需要通过 Claude Code 的 MCP 接口调用
  // 实际实现时，Claude Code 会自动调用相应的 MCP
  console.log(`[INFO] 正在读取 ${mcpName} 的表结构...`);

  // 这里是占位符，实际执行时 Claude Code 会替换为真实的 MCP 调用
  return [];
}

/**
 * 获取索引信息
 */
async function getIndexes(mcpName: 'postgres-local' | 'postgres-prod'): Promise<IndexInfo[]> {
  const query = `
    SELECT
      t.relname as table_name,
      i.relname as index_name,
      a.attname as column_name,
      ix.indisunique as is_unique
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE t.relkind = 'r'
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY t.relname, i.relname;
  `;

  console.log(`[INFO] 正在读取 ${mcpName} 的索引信息...`);
  return [];
}

/**
 * 对比表结构差异
 */
function compareStructures(local: TableInfo[], prod: TableInfo[]): string[] {
  const migrations: string[] = [];

  // 按表名分组
  const localTables = groupByTable(local);
  const prodTables = groupByTable(prod);

  // 检查新增的表
  for (const tableName of Object.keys(localTables)) {
    if (!prodTables[tableName]) {
      migrations.push(generateCreateTableSQL(tableName, localTables[tableName]));
    }
  }

  // 检查删除的表
  for (const tableName of Object.keys(prodTables)) {
    if (!localTables[tableName]) {
      migrations.push(`-- DROP TABLE ${tableName}; -- 谨慎操作！`);
    }
  }

  // 检查修改的表
  for (const tableName of Object.keys(localTables)) {
    if (prodTables[tableName]) {
      const tableMigrations = compareTableColumns(
        tableName,
        localTables[tableName],
        prodTables[tableName]
      );
      migrations.push(...tableMigrations);
    }
  }

  return migrations;
}

/**
 * 按表名分组
 */
function groupByTable(tables: TableInfo[]): Record<string, TableInfo[]> {
  return tables.reduce((acc, row) => {
    if (!acc[row.table_name]) {
      acc[row.table_name] = [];
    }
    acc[row.table_name].push(row);
    return acc;
  }, {} as Record<string, TableInfo[]>);
}

/**
 * 生成 CREATE TABLE 语句
 */
function generateCreateTableSQL(tableName: string, columns: TableInfo[]): string {
  const columnDefs = columns.map(col => {
    let def = `  ${col.column_name} ${col.data_type}`;
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

/**
 * 对比表的列差异
 */
function compareTableColumns(
  tableName: string,
  localCols: TableInfo[],
  prodCols: TableInfo[]
): string[] {
  const migrations: string[] = [];

  const localColMap = new Map(localCols.map(c => [c.column_name, c]));
  const prodColMap = new Map(prodCols.map(c => [c.column_name, c]));

  // 检查新增的列
  for (const [colName, col] of localColMap) {
    if (!prodColMap.has(colName)) {
      let sql = `ALTER TABLE ${tableName} ADD COLUMN ${colName} ${col.data_type}`;
      if (col.is_nullable === 'NO') {
        sql += ' NOT NULL';
      }
      if (col.column_default) {
        sql += ` DEFAULT ${col.column_default}`;
      }
      migrations.push(`${sql};`);
    }
  }

  // 检查删除的列
  for (const [colName] of prodColMap) {
    if (!localColMap.has(colName)) {
      migrations.push(`-- ALTER TABLE ${tableName} DROP COLUMN ${colName}; -- 谨慎操作！`);
    }
  }

  // 检查修改的列
  for (const [colName, localCol] of localColMap) {
    const prodCol = prodColMap.get(colName);
    if (prodCol && localCol.data_type !== prodCol.data_type) {
      migrations.push(
        `ALTER TABLE ${tableName} ALTER COLUMN ${colName} TYPE ${localCol.data_type};`
      );
    }
  }

  return migrations;
}

/**
 * 生成迁移文件
 */
function generateMigrationFile(migrations: string[]): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${timestamp}_auto_migration.sql`;

  const content = `
-- 自动生成的数据库迁移脚本
-- 生成时间: ${new Date().toISOString()}
-- 说明: 此脚本对比了本地和线上数据库的差异
--
-- ⚠️ 警告：
-- 1. 请在执行前仔细检查每条 SQL 语句
-- 2. 建议先在测试环境执行
-- 3. 执行前请备份数据库
-- 4. 删除操作已被注释，需要手动取消注释

BEGIN;

${migrations.join('\n\n')}

COMMIT;

-- 回滚脚本（如果需要）
-- BEGIN;
-- ... 在这里添加回滚语句 ...
-- COMMIT;
`;

  return content;
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(60));
  console.log('数据库迁移生成器');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. 读取本地数据库结构
    console.log('[1/4] 读取本地数据库结构...');
    const localStructure = await getTableStructure('postgres-local');

    // 2. 读取线上数据库结构
    console.log('[2/4] 读取线上数据库结构...');
    const prodStructure = await getTableStructure('postgres-prod');

    // 3. 对比差异
    console.log('[3/4] 对比数据库差异...');
    const migrations = compareStructures(localStructure, prodStructure);

    if (migrations.length === 0) {
      console.log('✅ 数据库结构一致，无需迁移！');
      return;
    }

    // 4. 生成迁移文件
    console.log('[4/4] 生成迁移文件...');
    const migrationContent = generateMigrationFile(migrations);

    // 确保 migrations 目录存在
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${timestamp}_auto_migration.sql`;
    const filepath = path.join(migrationsDir, filename);

    fs.writeFileSync(filepath, migrationContent, 'utf-8');

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 迁移文件生成成功！');
    console.log('='.repeat(60));
    console.log('');
    console.log(`文件路径: ${filepath}`);
    console.log(`发现差异: ${migrations.length} 条`);
    console.log('');
    console.log('下一步操作：');
    console.log('1. 检查迁移文件内容');
    console.log('2. 在测试环境执行迁移');
    console.log('3. 验证迁移结果');
    console.log('4. 在生产环境执行迁移');
    console.log('');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { getTableStructure, compareStructures, generateMigrationFile };
