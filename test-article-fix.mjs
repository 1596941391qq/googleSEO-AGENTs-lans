import { sql } from './api/lib/database.js';

async function testArticleFix() {
  try {
    console.log('=== 验证文章保存和发布流程修复 ===\n');

    // 1. 查询最近的文章
    const recentArticles = await sql`
      SELECT id, title, status, published_at, site_id, created_at
      FROM published_articles
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('📋 最近的 5 篇文章：');
    recentArticles.rows.forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title}`);
      console.log(`   ID: ${article.id}`);
      console.log(`   状态: ${article.status}`);
      console.log(`   发布时间: ${article.published_at || '未发布'}`);
      console.log(`   Site ID: ${article.site_id || '未绑定'}`);
      console.log(`   创建时间: ${article.created_at}`);
    });

    // 2. 统计不同状态的文章
    const statusStats = await sql`
      SELECT
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN site_id IS NULL THEN 1 END) as without_site_id,
        COUNT(CASE WHEN site_id IS NOT NULL THEN 1 END) as with_site_id
      FROM published_articles
      GROUP BY status
    `;

    console.log('\n\n📊 文章状态统计：');
    statusStats.rows.forEach(stat => {
      console.log(`\n${stat.status}:`);
      console.log(`   总数: ${stat.count}`);
      console.log(`   未绑定 site_id: ${stat.without_site_id}`);
      console.log(`   已绑定 site_id: ${stat.with_site_id}`);
    });

    // 3. 查找需要修复的文章（status='published' 但 site_id=NULL）
    const needFix = await sql`
      SELECT COUNT(*) as count
      FROM published_articles
      WHERE status = 'published' AND site_id IS NULL
    `;

    console.log('\n\n⚠️  需要修复的文章（status=published 但 site_id=NULL）：');
    console.log(`   数量: ${needFix.rows[0].count}`);

    if (needFix.rows[0].count > 0) {
      console.log('\n💡 建议运行数据清理脚本：');
      console.log('   UPDATE published_articles');
      console.log('   SET status = \'draft\', published_at = NULL');
      console.log('   WHERE status = \'published\' AND site_id IS NULL;');
    }

    console.log('\n\n✅ 验证完成！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    process.exit(0);
  }
}

testArticleFix();
