import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// 加载环境变量
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

async function createKeywordsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 开始创建 keywords 表...');
    
    const scriptPath = join(process.cwd(), 'scripts', 'create-keywords-table.sql');
    const script = readFileSync(scriptPath, 'utf8');
    
    // 执行整个脚本
    await client.query(script);
    
    console.log('✅ Keywords 表创建成功！');
    console.log('📊 查看统计信息...');
    
    const stats = await client.query('SELECT * FROM keywords_statistics()');
    console.log('统计结果:', JSON.stringify(stats.rows, null, 2));
    
  } catch (error: any) {
    console.error('❌ 创建失败:', error.message);
    if (error.detail) console.error('详情:', error.detail);
    if (error.hint) console.error('提示:', error.hint);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

createKeywordsTable();

