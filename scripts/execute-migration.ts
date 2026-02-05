/**
 * 执行数据库迁移脚本
 * 清理已弃用的 github_pages 平台绑定
 * 
 * 使用方法：
 * 1. 从 Vercel 获取 POSTGRES_URL 环境变量
 * 2. 运行: POSTGRES_URL="your_url" npx tsx scripts/execute-migration.ts
 * 或者在 Windows PowerShell:
 * $env:POSTGRES_URL="your_url"; npx tsx scripts/execute-migration.ts
 */

import { sql } from '../api/lib/database.js';

// 检查环境变量
if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.error('❌ 错误: 未找到数据库连接字符串');
  console.error('');
  console.error('请按以下步骤操作:');
  console.error('');
  console.error('1. 登录 Vercel Dashboard: https://vercel.com/dashboard');
  console.error('2. 进入项目 -> Settings -> Environment Variables');
  console.error('3. 复制 POSTGRES_URL 的值');
  console.error('4. 在 PowerShell 中运行:');
  console.error('   $env:POSTGRES_URL="postgres://..."; npx tsx scripts/execute-migration.ts');
  console.error('');
  console.error('或者创建 .env 文件:');
  console.error('   POSTGRES_URL=postgres://...');
  console.error('');
  process.exit(1);
}

async function executeMigration() {
  console.log('='.repeat(60));
  console.log('开始执行迁移：清理已弃用的 github_pages 平台');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 步骤 1: 查看受影响的站点数量
    console.log('📊 步骤 1: 检查受影响的站点数量...');
    const sitesResult = await sql`
      SELECT 
        COUNT(*) as total_github_pages_sites,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sites,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_sites
      FROM platform_sites 
      WHERE platform = 'github_pages'
    `;
    console.log('   总 github_pages 站点数:', sitesResult.rows[0].total_github_pages_sites);
    console.log('   活跃站点数:', sitesResult.rows[0].active_sites);
    console.log('   待处理站点数:', sitesResult.rows[0].pending_sites);
    console.log('');

    // 步骤 2: 查看受影响的绑定关系数量
    console.log('📊 步骤 2: 检查受影响的绑定关系...');
    const bindingsResult = await sql`
      SELECT 
        COUNT(*) as total_bindings,
        COUNT(DISTINCT website_id) as affected_websites
      FROM website_site_bindings 
      WHERE site_id IN (
        SELECT id FROM platform_sites WHERE platform = 'github_pages'
      )
    `;
    console.log('   总绑定关系数:', bindingsResult.rows[0].total_bindings);
    console.log('   受影响的网站数:', bindingsResult.rows[0].affected_websites);
    console.log('');

    // 步骤 3: 查看受影响的文章数量
    console.log('📊 步骤 3: 检查受影响的文章...');
    const articlesResult = await sql`
      SELECT 
        COUNT(DISTINCT pa.id) as affected_articles,
        COUNT(DISTINCT pa.project_id) as affected_projects
      FROM published_articles pa
      WHERE pa.project_id IN (
        SELECT DISTINCT website_id 
        FROM website_site_bindings 
        WHERE site_id IN (
          SELECT id FROM platform_sites WHERE platform = 'github_pages'
        )
      )
    `;
    console.log('   受影响的文章数:', articlesResult.rows[0].affected_articles);
    console.log('   受影响的项目数:', articlesResult.rows[0].affected_projects);
    console.log('');

    // 确认是否继续
    console.log('⚠️  准备执行迁移操作（修改数据）...');
    console.log('');

    // 步骤 4: 标记所有 github_pages 站点为已弃用
    console.log('🔄 步骤 4: 标记 github_pages 站点为已弃用...');
    const updateResult = await sql`
      UPDATE platform_sites 
      SET 
        status = 'deprecated', 
        updated_at = NOW() 
      WHERE platform = 'github_pages'
        AND status != 'deprecated'
      RETURNING id, site_name, platform
    `;
    console.log(`   ✅ 已更新 ${updateResult.rows.length} 个站点状态为 deprecated`);
    if (updateResult.rows.length > 0) {
      console.log('   更新的站点:');
      updateResult.rows.forEach((row, index) => {
        console.log(`     ${index + 1}. ${row.site_name} (${row.id})`);
      });
    }
    console.log('');

    // 步骤 5: 删除 github_pages 站点的绑定关系
    console.log('🔄 步骤 5: 删除 github_pages 站点的绑定关系...');
    const deleteResult = await sql`
      DELETE FROM website_site_bindings 
      WHERE site_id IN (
        SELECT id FROM platform_sites WHERE platform = 'github_pages'
      )
      RETURNING id, website_id, site_id
    `;
    console.log(`   ✅ 已删除 ${deleteResult.rows.length} 个绑定关系`);
    console.log('');

    // 验证 1: 确认没有 active 状态的 github_pages 站点
    console.log('✅ 验证 1: 检查是否还有活跃的 github_pages 站点...');
    const verifyActive = await sql`
      SELECT COUNT(*) as remaining_active_github_pages
      FROM platform_sites 
      WHERE platform = 'github_pages' 
        AND status = 'active'
    `;
    const remainingActive = parseInt(verifyActive.rows[0].remaining_active_github_pages);
    if (remainingActive === 0) {
      console.log('   ✅ 通过：没有活跃的 github_pages 站点');
    } else {
      console.log(`   ❌ 失败：仍有 ${remainingActive} 个活跃的 github_pages 站点`);
    }
    console.log('');

    // 验证 2: 确认没有 github_pages 的绑定关系
    console.log('✅ 验证 2: 检查是否还有 github_pages 的绑定关系...');
    const verifyBindings = await sql`
      SELECT COUNT(*) as remaining_github_pages_bindings
      FROM website_site_bindings 
      WHERE site_id IN (
        SELECT id FROM platform_sites WHERE platform = 'github_pages'
      )
    `;
    const remainingBindings = parseInt(verifyBindings.rows[0].remaining_github_pages_bindings);
    if (remainingBindings === 0) {
      console.log('   ✅ 通过：没有 github_pages 的绑定关系');
    } else {
      console.log(`   ❌ 失败：仍有 ${remainingBindings} 个 github_pages 的绑定关系`);
    }
    console.log('');

    // 验证 3: 查看当前所有活跃平台的分布
    console.log('✅ 验证 3: 当前所有平台的分布...');
    const platformDistribution = await sql`
      SELECT 
        platform,
        status,
        COUNT(*) as site_count
      FROM platform_sites
      GROUP BY platform, status
      ORDER BY platform, status
    `;
    console.log('   平台分布:');
    platformDistribution.rows.forEach(row => {
      console.log(`     ${row.platform} (${row.status}): ${row.site_count} 个站点`);
    });
    console.log('');

    // 验证 4: 查看当前所有活跃绑定的平台分布
    console.log('✅ 验证 4: 当前所有活跃绑定的平台分布...');
    const bindingDistribution = await sql`
      SELECT 
        ps.platform,
        wsb.content_type,
        COUNT(*) as binding_count
      FROM website_site_bindings wsb
      JOIN platform_sites ps ON wsb.site_id = ps.id
      GROUP BY ps.platform, wsb.content_type
      ORDER BY ps.platform, wsb.content_type
    `;
    if (bindingDistribution.rows.length > 0) {
      console.log('   绑定分布:');
      bindingDistribution.rows.forEach(row => {
        console.log(`     ${row.platform} (${row.content_type}): ${row.binding_count} 个绑定`);
      });
    } else {
      console.log('   当前没有活跃的绑定关系');
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ 迁移完成！');
    console.log('='.repeat(60));
    console.log('');
    console.log('📝 下一步操作：');
    console.log('   1. 用户更新旧文章时，系统会自动检测到没有可用的平台绑定');
    console.log('   2. update-published.ts 会返回 FORCE_REPUBLISH 错误');
    console.log('   3. 前端会自动调用 publishArticle 重新发布到新平台');
    console.log('   4. 新的绑定关系会自动创建并保存到数据库');
    console.log('');
    console.log('⚠️  注意事项：');
    console.log('   - 旧的 GitHub 仓库不会被删除（保留历史数据）');
    console.log('   - 旧的 github_pages 站点记录保留但标记为 deprecated');
    console.log('   - 用户的文章数据不受影响');
    console.log('   - 下次更新时会自动迁移到新平台（CF Pages/Netlify/Vercel）');
    console.log('');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
}

// 执行迁移
executeMigration()
  .then(() => {
    console.log('✅ 脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

