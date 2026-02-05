/**
 * PSEO 发布系统 - 简化的数据库层
 * 
 * 核心改进：
 * 1. GitHub Token 和 Netlify Token 1对1 绑定
 * 2. 只支持 Netlify 平台
 * 3. 移除内容类型分类
 * 4. 自动迁移旧数据
 */

import { sql } from './database.js';

// 初始化标志
let initialized = false;
let initializing: Promise<void> | null = null;

// ============================================================================
// 自动初始化和迁移
// ============================================================================

/**
 * 初始化表结构并自动迁移旧数据
 * 在应用启动时自动调用
 */
async function initializeAndMigrate() {
  if (initialized) return;
  if (initializing) {
    await initializing;
    return;
  }

  initializing = (async () => {
    try {
      console.log('[Token Manager] 🚀 Initializing tables...');

      // 1. 检查新表是否存在
      const tableCheck = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('github_tokens', 'netlify_tokens')
        AND table_schema = 'public'
      `;

      const hasGithubTokens = tableCheck.rows.some(r => r.table_name === 'github_tokens');
      const hasNetlifyTokens = tableCheck.rows.some(r => r.table_name === 'netlify_tokens');

      // 2. 如果新表不存在，需要迁移
      if (!hasGithubTokens || !hasNetlifyTokens) {
        console.log('[Token Manager] 📦 Running automatic migration...');

        // 创建临时新表
        await sql`
          CREATE TABLE IF NOT EXISTS github_tokens_new (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL UNIQUE,
            token_encrypted TEXT NOT NULL,
            owner_name VARCHAR(100) NOT NULL,
            netlify_token_id UUID,
            usage_count INT DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS netlify_tokens_new (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL UNIQUE,
            token_encrypted TEXT NOT NULL,
            github_token_id UUID,
            usage_count INT DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;

        // 迁移数据（如果旧表存在）
        try {
          // 迁移 GitHub Tokens
          const githubResult = await sql`
            INSERT INTO github_tokens_new (id, name, token_encrypted, owner_name, usage_count, status, created_at, updated_at)
            SELECT id, name, token_encrypted, owner_name, usage_count, status, created_at, updated_at
            FROM github_tokens
            ON CONFLICT (name) DO NOTHING
          `;
          console.log(`[Token Manager] ✅ Migrated ${githubResult.count} GitHub tokens`);
        } catch (e) {
          console.log('[Token Manager] ℹ️  No old github_tokens table to migrate');
        }

        try {
          // 迁移 Netlify Tokens
          const netlifyResult = await sql`
            INSERT INTO netlify_tokens_new (id, name, token_encrypted, usage_count, status, created_at, updated_at)
            SELECT id, name, token_encrypted, usage_count, status, created_at, updated_at
            FROM platform_tokens_v2
            WHERE platform = 'netlify'
            ON CONFLICT (name) DO NOTHING
          `;
          console.log(`[Token Manager] ✅ Migrated ${netlifyResult.count} Netlify tokens`);
        } catch (e) {
          console.log('[Token Manager] ℹ️  No old platform_tokens_v2 table to migrate');
        }

        // 删除旧表，重命名新表
        await sql`DROP TABLE IF EXISTS github_tokens CASCADE`;
        await sql`ALTER TABLE github_tokens_new RENAME TO github_tokens`;
        
        await sql`DROP TABLE IF EXISTS netlify_tokens CASCADE`;
        await sql`ALTER TABLE netlify_tokens_new RENAME TO netlify_tokens`;

        // 添加外键约束
        await sql`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'github_tokens_netlify_fk'
            ) THEN
              ALTER TABLE github_tokens 
              ADD CONSTRAINT github_tokens_netlify_fk 
              FOREIGN KEY (netlify_token_id) REFERENCES netlify_tokens(id) ON DELETE SET NULL;
            END IF;
          END $$
        `;

        await sql`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'netlify_tokens_github_fk'
            ) THEN
              ALTER TABLE netlify_tokens 
              ADD CONSTRAINT netlify_tokens_github_fk 
              FOREIGN KEY (github_token_id) REFERENCES github_tokens(id) ON DELETE SET NULL;
            END IF;
          END $$
        `;

        // 清理无用表
        console.log('[Token Manager] 🗑️  Cleaning up old tables...');
        await sql`DROP TABLE IF EXISTS platform_tokens_v2 CASCADE`;
        await sql`DROP TABLE IF EXISTS platform_sites_v2 CASCADE`;
        await sql`DROP TABLE IF EXISTS project_site_bindings_v2 CASCADE`;
        await sql`DROP TABLE IF EXISTS keywords CASCADE`;
        await sql`DROP TABLE IF EXISTS publications CASCADE`;

        console.log('[Token Manager] ✅ Migration completed successfully!');
      } else {
        console.log('[Token Manager] ✅ Tables already initialized');
      }

      initialized = true;
    } catch (error) {
      console.error('[Token Manager] ❌ Initialization failed:', error);
      throw error;
    } finally {
      initializing = null;
    }
  })();

  await initializing;
}

// ============================================================================
// 类型定义
// ============================================================================

export interface GitHubToken {
  id: string;
  name: string;
  token_encrypted: string;
  owner_name: string;
  netlify_token_id: string | null;
  usage_count: number;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

export interface NetlifyToken {
  id: string;
  name: string;
  token_encrypted: string;
  github_token_id: string | null;
  usage_count: number;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

export interface TokenPair {
  github_token: GitHubToken;
  netlify_token: NetlifyToken;
}

// ============================================================================
// Token CRUD
// ============================================================================

export async function createGitHubToken(data: {
  name: string;
  token: string;
  owner_name: string;
}): Promise<GitHubToken> {
  await initializeAndMigrate();
  
  const tokenEncrypted = Buffer.from(data.token).toString('base64');
  
  const result = await sql<GitHubToken>`
    INSERT INTO github_tokens (name, token_encrypted, owner_name)
    VALUES (${data.name}, ${tokenEncrypted}, ${data.owner_name})
    RETURNING *
  `;
  
  return result.rows[0];
}

export async function getAllGitHubTokens(): Promise<GitHubToken[]> {
  await initializeAndMigrate();
  
  const result = await sql<GitHubToken>`
    SELECT * FROM github_tokens ORDER BY created_at DESC
  `;
  return result.rows;
}

export async function createNetlifyToken(data: {
  name: string;
  token: string;
}): Promise<NetlifyToken> {
  await initializeAndMigrate();
  
  const tokenEncrypted = Buffer.from(data.token).toString('base64');
  
  const result = await sql<NetlifyToken>`
    INSERT INTO netlify_tokens (name, token_encrypted)
    VALUES (${data.name}, ${tokenEncrypted})
    RETURNING *
  `;
  
  return result.rows[0];
}

export async function getAllNetlifyTokens(): Promise<NetlifyToken[]> {
  await initializeAndMigrate();
  
  const result = await sql<NetlifyToken>`
    SELECT * FROM netlify_tokens ORDER BY created_at DESC
  `;
  return result.rows;
}

// ============================================================================
// Token 绑定管理
// ============================================================================

export async function bindTokens(
  githubTokenId: string,
  netlifyTokenId: string
): Promise<{ success: boolean; error?: string }> {
  await initializeAndMigrate();
  
  try {
    const [githubCheck, netlifyCheck] = await Promise.all([
      sql<GitHubToken>`SELECT * FROM github_tokens WHERE id = ${githubTokenId}`,
      sql<NetlifyToken>`SELECT * FROM netlify_tokens WHERE id = ${netlifyTokenId}`
    ]);

    if (githubCheck.rows.length === 0) {
      return { success: false, error: 'GitHub Token not found' };
    }
    if (netlifyCheck.rows.length === 0) {
      return { success: false, error: 'Netlify Token not found' };
    }

    const githubToken = githubCheck.rows[0];
    const netlifyToken = netlifyCheck.rows[0];

    if (githubToken.netlify_token_id && githubToken.netlify_token_id !== netlifyTokenId) {
      return { success: false, error: 'GitHub Token is already bound to another Netlify Token' };
    }
    if (netlifyToken.github_token_id && netlifyToken.github_token_id !== githubTokenId) {
      return { success: false, error: 'Netlify Token is already bound to another GitHub Token' };
    }

    await sql`
      UPDATE github_tokens 
      SET netlify_token_id = ${netlifyTokenId}, updated_at = NOW()
      WHERE id = ${githubTokenId}
    `;

    await sql`
      UPDATE netlify_tokens 
      SET github_token_id = ${githubTokenId}, updated_at = NOW()
      WHERE id = ${netlifyTokenId}
    `;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unbindTokens(
  githubTokenId: string
): Promise<{ success: boolean; error?: string }> {
  await initializeAndMigrate();
  
  try {
    const githubToken = await sql<GitHubToken>`
      SELECT * FROM github_tokens WHERE id = ${githubTokenId}
    `;

    if (githubToken.rows.length === 0) {
      return { success: false, error: 'GitHub Token not found' };
    }

    const netlifyTokenId = githubToken.rows[0].netlify_token_id;

    await sql`
      UPDATE github_tokens 
      SET netlify_token_id = NULL, updated_at = NOW()
      WHERE id = ${githubTokenId}
    `;

    if (netlifyTokenId) {
      await sql`
        UPDATE netlify_tokens 
        SET github_token_id = NULL, updated_at = NOW()
        WHERE id = ${netlifyTokenId}
      `;
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllTokenPairs(): Promise<{
  bound: TokenPair[];
  unboundGithub: GitHubToken[];
  unboundNetlify: NetlifyToken[];
}> {
  await initializeAndMigrate();
  
  const [githubTokens, netlifyTokens] = await Promise.all([
    getAllGitHubTokens(),
    getAllNetlifyTokens()
  ]);

  const bound: TokenPair[] = [];
  const unboundGithub: GitHubToken[] = [];
  const unboundNetlify: NetlifyToken[] = [];

  for (const github of githubTokens) {
    if (github.netlify_token_id) {
      const netlify = netlifyTokens.find(n => n.id === github.netlify_token_id);
      if (netlify) {
        bound.push({ github_token: github, netlify_token: netlify });
      }
    } else {
      unboundGithub.push(github);
    }
  }

  for (const netlify of netlifyTokens) {
    if (!netlify.github_token_id) {
      unboundNetlify.push(netlify);
    }
  }

  return { bound, unboundGithub, unboundNetlify };
}

export async function getAvailableTokenPair(): Promise<TokenPair | null> {
  await initializeAndMigrate();

  // 从 platform_sites 表查询绑定关系
  const result = await sql<any>`
    SELECT
      g.*,
      row_to_json(p.*) as netlify_token
    FROM github_tokens g
    JOIN platform_sites ps ON ps.github_token_id = g.id
    JOIN platform_tokens p ON ps.platform_token_id = p.id
    WHERE g.status = 'active'
      AND p.status = 'active'
      AND ps.status = 'active'
      AND p.platform = 'netlify'
    ORDER BY g.usage_count ASC, g.created_at ASC
    LIMIT 1
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return {
    github_token: result.rows[0],
    netlify_token: result.rows[0].netlify_token
  };
}

// ============================================================================
// 辅助函数
// ============================================================================

export function decryptToken(encryptedToken: string): string {
  return Buffer.from(encryptedToken, 'base64').toString('utf-8');
}

export async function incrementTokenUsage(githubTokenId: string, netlifyTokenId: string): Promise<void> {
  await initializeAndMigrate();

  await sql`
    UPDATE github_tokens
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = ${githubTokenId}
  `;

  await sql`
    UPDATE platform_tokens
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = ${netlifyTokenId}
  `;
}

export async function updateGitHubTokenStatus(
  tokenId: string,
  status: 'active' | 'disabled'
): Promise<GitHubToken | null> {
  await initializeAndMigrate();
  
  const result = await sql<GitHubToken>`
    UPDATE github_tokens 
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${tokenId}
    RETURNING *
  `;
  return result.rows[0] || null;
}

export async function updateNetlifyTokenStatus(
  tokenId: string,
  status: 'active' | 'disabled'
): Promise<NetlifyToken | null> {
  await initializeAndMigrate();
  
  const result = await sql<NetlifyToken>`
    UPDATE netlify_tokens 
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${tokenId}
    RETURNING *
  `;
  return result.rows[0] || null;
}

export async function deleteGitHubToken(tokenId: string): Promise<boolean> {
  await initializeAndMigrate();
  
  const result = await sql`
    DELETE FROM github_tokens WHERE id = ${tokenId} RETURNING id
  `;
  return result.rows.length > 0;
}

export async function deleteNetlifyToken(tokenId: string): Promise<boolean> {
  await initializeAndMigrate();
  
  const result = await sql`
    DELETE FROM netlify_tokens WHERE id = ${tokenId} RETURNING id
  `;
  return result.rows.length > 0;
}

