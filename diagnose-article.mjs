import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL);

try {
  const result = await sql`
    SELECT
      pa.id,
      pa.title,
      pa.status,
      pa.url_slug,
      pa.site_id,
      ps.site_url,
      ps.platform_project_id,
      ps.repo_name,
      ps.status as site_status
    FROM published_articles pa
    LEFT JOIN platform_sites ps ON pa.site_id = ps.id
    WHERE pa.id = '9485f02f-249d-4155-baab-e71f8fe9d3da'
  `;

  console.log('文章数据诊断结果：');
  console.log(JSON.stringify(result[0], null, 2));

  const article = result[0];

  console.log('\n问题分析：');
  if (!article.site_id) {
    console.log('❌ site_id 为空 - 文章没有关联到任何平台站点');
  }
  if (!article.site_url) {
    console.log('❌ site_url 为空 - 无法构建文章 URL');
  }
  if (!article.platform_project_id) {
    console.log('❌ platform_project_id 为空 - 无法从 Netlify API 获取');
  }
  if (article.status !== 'published') {
    console.log(`⚠️ 文章状态是 "${article.status}"，不是 "published"`);
  }

} catch (error) {
  console.error('查询失败:', error.message);
} finally {
  await sql.end();
}
