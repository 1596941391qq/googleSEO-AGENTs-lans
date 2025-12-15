import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 导出 SQL 查询函数 (模拟 tagged template 语法)
export const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
  const client = await pool.connect();
  try {
    // 构建查询字符串，替换参数占位符
    let query = strings[0];
    for (let i = 0; i < values.length; i++) {
      query += `$${i + 1}${strings[i + 1]}`;
    }

    const result = await client.query(query, values);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } finally {
    client.release();
  }
};

// 测试数据库连接
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
