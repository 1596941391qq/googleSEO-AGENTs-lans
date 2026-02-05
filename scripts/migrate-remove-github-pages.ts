/**
 * Migration Script: Remove GitHub Pages Platform
 *
 * This script migrates all existing platform_sites records that use 'github_pages'
 * to use 'netlify' or 'vercel' instead (for commercial content) or 'cf_pages' (for informational content).
 *
 * Run this script once to clean up legacy data after removing GitHub Pages support.
 *
 * Usage:
 *   npx tsx scripts/migrate-remove-github-pages.ts
 */

import { Pool } from 'pg';

// 硬编码数据库连接（从 .env 文件）
const DATABASE_URL = 'postgres://postgres:123456@127.0.0.1:5432/postgres';

// 创建数据库连接池
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

async function migrateGitHubPagesRecords() {
  console.log('🔄 Starting migration: Remove GitHub Pages platform...\n');

  try {
    // 1. Check how many github_pages records exist
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM platform_sites WHERE platform = 'github_pages'`
    );
    const count = parseInt(countResult.rows[0]?.count || '0');

    if (count === 0) {
      console.log('✅ No github_pages records found. Migration not needed.');
      return;
    }

    console.log(`📊 Found ${count} records with platform = 'github_pages'\n`);

    // 2. Get all github_pages sites with their content type
    const sitesResult = await pool.query(
      `SELECT id, site_name, content_type, status, repo_name
       FROM platform_sites
       WHERE platform = 'github_pages'
       ORDER BY content_type, created_at`
    );

    console.log('📋 Records to migrate:');
    sitesResult.rows.forEach((site: any) => {
      console.log(`  - ${site.site_name} (${site.content_type}, status: ${site.status})`);
    });
    console.log('');

    // 3. Get available platform tokens for migration
    const netlifyTokens = await pool.query(
      `SELECT id FROM platform_tokens
       WHERE platform = 'netlify' AND status = 'active'
       ORDER BY usage_count ASC
       LIMIT 1`
    );

    const vercelTokens = await pool.query(
      `SELECT id FROM platform_tokens
       WHERE platform = 'vercel' AND status = 'active'
       ORDER BY usage_count ASC
       LIMIT 1`
    );

    const cfPagesTokens = await pool.query(
      `SELECT id FROM platform_tokens
       WHERE platform = 'cf_pages' AND status = 'active'
       ORDER BY usage_count ASC
       LIMIT 1`
    );

    console.log('🔑 Available platform tokens:');
    console.log(`  - Netlify: ${netlifyTokens.rows.length > 0 ? '✅' : '❌'}`);
    console.log(`  - Vercel: ${vercelTokens.rows.length > 0 ? '✅' : '❌'}`);
    console.log(`  - CF Pages: ${cfPagesTokens.rows.length > 0 ? '✅' : '❌'}`);
    console.log('');

    // 4. Migrate each record
    let migratedCount = 0;
    let errorCount = 0;

    for (const site of sitesResult.rows) {
      try {
        let newPlatform: string;
        let newPlatformTokenId: string | null = null;

        // Choose platform based on content type
        if (site.content_type === 'informational') {
          // Informational content -> CF Pages
          if (cfPagesTokens.rows.length > 0) {
            newPlatform = 'cf_pages';
            newPlatformTokenId = cfPagesTokens.rows[0].id;
          } else {
            console.warn(`  ⚠️  No CF Pages token available for ${site.site_name}, skipping...`);
            errorCount++;
            continue;
          }
        } else {
          // Commercial content -> Netlify (preferred) or Vercel
          if (netlifyTokens.rows.length > 0) {
            newPlatform = 'netlify';
            newPlatformTokenId = netlifyTokens.rows[0].id;
          } else if (vercelTokens.rows.length > 0) {
            newPlatform = 'vercel';
            newPlatformTokenId = vercelTokens.rows[0].id;
          } else if (cfPagesTokens.rows.length > 0) {
            newPlatform = 'cf_pages';
            newPlatformTokenId = cfPagesTokens.rows[0].id;
          } else {
            console.warn(`  ⚠️  No platform tokens available for ${site.site_name}, skipping...`);
            errorCount++;
            continue;
          }
        }

        // Update the record
        await pool.query(
          `UPDATE platform_sites
           SET platform = $1, platform_token_id = $2, status = 'pending'
           WHERE id = $3`,
          [newPlatform, newPlatformTokenId, site.id]
        );

        console.log(`  ✅ Migrated ${site.site_name}: github_pages → ${newPlatform}`);
        migratedCount++;

      } catch (error: any) {
        console.error(`  ❌ Failed to migrate ${site.site_name}:`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`  - Total records: ${count}`);
    console.log(`  - Successfully migrated: ${migratedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log('');

    if (migratedCount > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('⚠️  IMPORTANT: Migrated sites have status = "pending"');
      console.log('   You need to republish these articles to deploy them to the new platforms.');
      console.log('   Use the "Update" button in the UI to republish each article.');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await pool.end();
  }
}

// Run migration
migrateGitHubPagesRecords()
  .then(() => {
    console.log('\n✅ Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
