# Migration Guide: GitHub Pages Removal

## Problem

The system was incorrectly using GitHub Pages as a publishing platform. GitHub Pages has been completely removed from the codebase. Only these 4 platforms are now supported:

- **RTD** (Read the Docs)
- **CF Pages** (Cloudflare Pages)
- **Netlify**
- **Vercel**

## Symptoms

If you see errors like:
```
[Platform Rebuild] Triggering rebuild for platform: github_pages
[GitHub Pages] Build trigger failed: 403
```

This means you have **legacy database records** that still reference `github_pages`.

## Solution

### Step 1: Restart Your Server

**CRITICAL**: You must restart your development server to load the updated code.

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev:vercel
# or
vercel dev
```

### Step 2: Run the Migration Script

This script will automatically update all existing `github_pages` records in your database to use supported platforms.

```bash
npx tsx scripts/migrate-remove-github-pages.ts
```

The script will:
1. Find all records with `platform = 'github_pages'`
2. Migrate them based on content type:
   - **Informational content** → CF Pages
   - **Commercial content** → Netlify (preferred) or Vercel (fallback)
3. Set their status to `pending` (requires republishing)

### Step 3: Republish Affected Articles

After migration, affected articles will have `status = 'pending'`. You need to republish them:

1. Go to the Articles page in your UI
2. Find articles that were previously published to GitHub Pages
3. Click the **"Update"** button on each article
4. The system will automatically republish to the new platform

## What Changed

### Code Changes (11 files modified)

1. **Type Definitions**: Removed `'github_pages'` from all platform type unions
2. **Database Constraints**: Updated to only allow 4 platforms
3. **Platform Selection Logic**: Removed github_pages from selection arrays
4. **Deployment Functions**: Removed `enableGitHubPages()` and `triggerGitHubPagesBuild()`
5. **Admin UI**: Removed GitHub Pages from platform config
6. **Safety Check**: Added detection for legacy github_pages records

### Platform Distribution

**信息型内容 (Informational Content)**:
- RTD
- Cloudflare Pages

**商业型内容 (Commercial Content)**:
- Netlify (preferred)
- Vercel (fallback)
- Cloudflare Pages (backup)

## Verification

After completing the migration, verify:

1. No errors mentioning "github_pages" in logs
2. All articles show correct platform (rtd/cf_pages/netlify/vercel)
3. Article updates work without errors
4. New articles publish to correct platforms

## Troubleshooting

### "No platform tokens available"

If the migration script reports no tokens available:

1. Go to Admin panel (`/admin`)
2. Add platform tokens for:
   - Netlify (for commercial content)
   - Vercel (for commercial content)
   - CF Pages (for informational content)
3. Run the migration script again

### "Still seeing github_pages errors"

1. Verify you restarted the server
2. Check if migration script completed successfully
3. Look for any remaining database records:
   ```sql
   SELECT * FROM platform_sites_v2 WHERE platform = 'github_pages';
   ```

### "Article update fails after migration"

This is expected! Articles migrated from github_pages need to be republished:
- Click "Update" button in UI
- System will detect the platform change and republish automatically

## Database Query (Manual Check)

To manually check for remaining github_pages records:

```sql
-- Check platform_sites_v2
SELECT id, site_name, platform, content_type, status
FROM platform_sites_v2
WHERE platform = 'github_pages';

-- Check platform_tokens_v2 (should be empty)
SELECT id, name, platform, status
FROM platform_tokens_v2
WHERE platform = 'github_pages';
```

If you find any records, either:
- Run the migration script again
- Manually update them in the database
- Delete them if they're no longer needed

## Support

If you encounter issues after following this guide:
1. Check server logs for detailed error messages
2. Verify all platform tokens are active in Admin panel
3. Ensure database migration completed successfully
