# CLAUDE.md
## 最高优先级指令（必须严格遵守）

1. **最简单方案优先**
   - 当我让你修复 bug、实现功能时，**永远先用最简单、最直接的方案**。
   - 禁止过度设计、过度抽象、添加不必要的类型、wrapper 函数、设计模式、新组件、新 hooks、新工具函数。
   - 如果可以用一行代码解决，就用一行。
   - 如果我反馈“太复杂了”，立刻简化，不要辩解。

2. **改动必须一步一步来**
   - 每次只修改**一个文件**或**一个非常小的范围**。
   - **改完一个文件后，必须运行 tsc --noEmit** 检查类型错误。
   - 把 tsc 的输出完整展示给我（包括错误信息）。
   - 如果有类型错误，**先修复类型问题**，再继续下一个改动。
   - **禁止一次性改多个文件**。

3. **修复 bug 的强制流程**
   - 在修改任何代码之前，先写一个**能复现这个 bug 的 failing test**（用 jest 或 vitest）。
   - 展示这个 failing test 的代码和运行结果。
   - 然后开始修复，**每次改动后都重新跑测试**。
   - 直到所有测试通过，并且没有引入回归。
   - 最后给我一个总结：改了什么，为什么这样改。但是不用生成多余的总结文件。

4. **动手前必须先告诉我计划**
   - 在开始写代码之前，用**最多 3 条 bullet point** 告诉我你的计划。
   - 计划里必须写清楚：准备改哪个文件、改哪几行、预期效果。
   - 等我确认或回复“可以开始”后再动手。

5. **浏览器验证强制要求（加强版）**
   - localhost:3002 的开发服务器**一直在运行**。
   - **任何涉及页面效果、UI、交互、console、网络、DOM、渲染、样式、bug 验证的任务，必须默认先使用 Browser MCP**。
   - 不要问我“要不要检查页面”，不要假设页面效果，直接进入wsl环境（必须先进入WSL环境，如果进不去则停下来）然后调用 browsermcp 工具打开 http://localhost:3002 并验证。
   - 如果没有调用 Browser MCP，我会认为你没有完成任务。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NicheDigger** (also known as **AI + PSEO Agent**) is a React-based AI-powered automated search traffic infrastructure platform designed for overseas SaaS and cross-border e-commerce. The system uses a multi-agent workshop approach to generate SEO-optimized content and implements a sophisticated "fast/slow knife" publication strategy to exploit legitimate indexing time gaps. The project is deployed on Vercel using serverless functions.

**Product Positioning**: 面向出海 SaaS 与跨境电商的自动化搜索获客基础设施 (Automated search acquisition infrastructure for overseas SaaS and cross-border e-commerce)

**Delivery Goal**: A high-conversion traffic domain with high-quality content, high trust, and commercial intent

### Core Features

- **Dual-Workflow Keyword Mining**: Two distinct modes - Blue Ocean (seed keyword expansion) and Website Audit (competitor gap analysis)
- **4-Phase Workshop Content Generation**: Deep Research → Strategy → Visual (parallel) → Writing
- **Multi-Agent AI System**: SEO Researcher, SEO Strategist, Content Writer, Image Artist
- **Smart Keyword Mining**: SCAMPER循环挖掘 with probability scoring (High/Medium/Low)
- **Competitor Analysis**: Deep SERP analysis with Top 10 domain authority comparison
- **GEO/AIO Optimization**: Geographic and AI-engine specific content optimization
- **Image Generation**: Nano Banana 2 integration for high-quality, low-cost 4K images
- **Fast/Slow Knife Publication Strategy**: Experimental content → Winner selection → URL inheritance
- **High-Trust Platform Carriers**: Cloudflare Pages, Netlify, Vercel

## Architecture

- **Frontend**: React + TypeScript + Vite (port 3000)
- **Backend**: Vercel Serverless Functions (Node.js + TypeScript) in `/api` directory
- **AI Integration**:
  - Google Gemini API with proxy support (302.ai or tu-zi.com) - Primary AI engine
  - Nano Banana 2 API - High-quality image generation (4K, 5-10s, $0.05-0.08/image)
  - Multiple AI Search APIs - Google SERP, ChatGPT, Claude, Perplexity analysis
- **Data Sources**:
  - DataForSEO - Keyword research data (volume, difficulty, SERP analysis)
  - SE-ranking - Alternative keyword research source
  - Firecrawl - Website content crawling for Website Audit mode
- **Database**: PostgreSQL (shared with niche-mining project)
  - User authentication (shared)
  - Keywords & projects
  - Content drafts & versions
  - Image assets & metadata
  - Publication records
- **Authentication**: Cross-project auth with niche-mining (shared database + JWT)
- **Deployment**: Vercel with automatic builds and environment variable management

### System Architecture: Three Layers

**Layer 1: 挖词 (Keyword Mining) - COMPLETED**

Two distinct workflows:

**链路 A: 蓝海模式 (Blue Ocean Mode)**
```
User Input (Seed Keyword)
  → Agent 1 (Gemini): Semantic expansion (SCAMPER)
  → Get keyword data (DataForSEO/SE-ranking)
  → Agent 2 (SEO Researcher): SERP audit (Top 10 domain analysis)
  → Output: Ranking Probability (High/Medium/Low)
```

**链路 B: 存量拓新 (Website Audit Mode)**
```
User Input (Domain URL)
  → Firecrawl: Crawl user website content
  → DataForSEO: Get competitor keywords
  → Agent 1: Gap Analysis (identify missing high-value keywords)
  → Agent 2 (SEO Researcher): SERP audit + authority comparison
  → Output: Ranking Probability (High/Medium/Low)
```

**Layer 2: 图文 (Content Generation) - COMPLETED**

4-Phase Workshop Approach:
```
Phase 1: Deep Research (SEO Researcher)
  → SERP insights (Google Top 10)
  → Search engine preference analysis (Google vs AI search)
  → Data profiling (Volume, Difficulty via DataForSEO)

Phase 2: Strategy (SEO Strategist)
  → "Big fish eats small fish" strategy
  → Content blueprint (H1, H2-H3 outline, Meta description)
  → Reference source integration

Phase 3: Visual (Image Artist) - PARALLEL with Phase 4
  → Extract visual themes from strategy
  → Generate Nano Banana 2 prompts
  → Parallel image generation (4-6 images)

Phase 4: Writing (Content Writer)
  → Synthesize research + strategy + visuals
  → Quality pre-control (not post-audit)
  → 3D optimization injection (GEO, AIO, LSI)
  → Auto-archive to database
```

**Layer 3: 发布 (Publication) - NOT COMPLETED**

See detailed strategy in `docs/NICHEDIGGER内容发布策略(3).md` and `docs/Read the Docs 自动化发布 SOP.md`

## Key Commands

### Development

```bash
# Full development (frontend + API) - RECOMMENDED
npm run dev:vercel
# or
vercel dev

# Frontend only development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel
```

## API Endpoints

All API endpoints are in `/api` directory and follow Vercel serverless function patterns:

### Existing SEO 功能 (Current - COMPLETED)

- `/api/generate-keywords` - Generate SEO keywords using Gemini API (SCAMPER expansion)
- `/api/analyze-ranking` - Analyze keyword ranking probability (SERP audit + authority comparison)
- `/api/deep-dive-strategy` - Generate detailed content strategy (content blueprint)
- `/api/translate-prompt` - Translate and optimize system instructions
- `/api/translate-text` - Translate text between languages
- `/api/seo-agent` - Unified SEO agent API (keyword_mining, batch_translation, deep_dive modes)

### 认证功能 (Existing - COMPLETED)

- `/api/auth/verify-transfer` - Verify transfer token from main app
- `/api/auth/session` - Validate JWT session
- `/api/init-db` - Initialize database tables (run once)

### To Be Implemented (NOT COMPLETED)

The following features are described in documentation but not yet implemented:

**Publication System - Multi-Platform** (Implemented ✅):
- ✅ MkDocs publishing to Cloudflare Pages/Netlify/Vercel
- ✅ Automated GitHub repository creation and management
- ✅ Platform-specific deployment triggers
- ✅ Fast/Slow knife URL paths (/lab/, /guide/, /compare/, /tool/)
- ✅ Internal link generation (单向漏斗原则)
- ⏳ Ranking tracking and winner selection (TODO)
- ⏳ URL inheritance via 301/Canonical (TODO)

**Website Data & Task Dashboard** (Low priority, incomplete):
- Website Data: Full metrics overview, ranking distribution, high-value keywords, AI opportunity insights
- Task Dashboard: Multi-task management, parallel agent execution monitoring

## Environment Variables

Required for local development and Vercel deployment:

```env
# Gemini API (Primary AI Engine)
# 代理商选择: "302" (默认) 或 "tuzi"
GEMINI_PROXY_PROVIDER=302
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_TUZI_API_KEY=your_tuzi_api_key_here  # 可选，tu-zi.com 专用 Key
GEMINI_PROXY_URL=https://api.302.ai  # 可选，自定义代理 URL


# Nano Banana 2 API (Image Generation)
NANO_BANANA_API_KEY=your_nano_banana_api_key
NANO_BANANA_API_URL=https://api.nanobanana.com/v2/images

# Data Sources (Required for keyword research)
DATAFORSEO_LOGIN=your_dataforseo_login
DATAFORSEO_PASSWORD=your_dataforseo_password
SE_RANKING_API_KEY=your_se_ranking_api_key  # Alternative to DataForSEO
FIRECRAWL_API_KEY=your_firecrawl_api_key  # For Website Audit mode

# AI Search APIs (Optional - for enhanced analysis)
OPENAI_API_KEY=your_openai_key  # For ChatGPT analysis
CLAUDE_API_KEY=your_claude_key  # For Claude analysis
PERPLEXITY_API_KEY=your_perplexity_key  # For Perplexity analysis
SERPER_API_KEY=your_serper_key  # For Google SERP
SERPAPI_KEY=your_serpapi_key    # Alternative Google SERP

# Authentication (must match niche-mining project)
POSTGRES_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret_key
MAIN_APP_URL=http://localhost:3000

# Admin Console (PSEO Publishing Pool Management)
ADMIN_USERNAME=admin                         # Admin 登录用户名
ADMIN_PASSWORD=your_secure_password          # Admin 登录密码

# Publication Platform Tokens are managed via Admin Console (/admin)
# No need to configure here - Admin manages token pool in database

# Development mode
NODE_ENV=development
ENABLE_DEV_AUTO_LOGIN=true

# Frontend
VITE_MAIN_APP_URL=http://localhost:3000
```

**Important**:

- `POSTGRES_URL` and `JWT_SECRET` must be identical to the main app (niche-mining)
- `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` are required for keyword research (volume, difficulty, SERP data)
- `FIRECRAWL_API_KEY` is required for Website Audit mode (crawling user websites)
- Nano Banana 2 API is critical for image generation feature
- AI Search APIs are optional but recommended for enhanced competitor analysis

## Code Structure

### Frontend (To Be Refactored from Single File)

- `App.tsx` - Main React application (currently monolithic, to be refactored)
- `components/` - UI components
  - `workflow/` - Workflow orchestration UI components
  - `agents/` - Agent status & progress components
  - `content-editor/` - Content preview and editing components
  - `publication/` - Platform configuration & publishing components
- `contexts/AuthContext.tsx` - Authentication context provider
- `types.ts` - Shared TypeScript interfaces and enums
- `index.tsx` - React app entry point (wrapped with AuthProvider)
- `index.html` - HTML template

### Backend API

- `api/_shared/gemini.ts` - Gemini API service wrapper with all AI functions
- `api/_shared/request-handler.ts` - Common request/response utilities
- `api/_shared/types.ts` - API-specific TypeScript types
- `api/_shared/serp.ts` - SERP analysis utilities
- `api/lib/database.js` - PostgreSQL database connection (pg library)
- `api/lib/auth.ts` - JWT token generation and verification

#### Existing APIs (COMPLETED)

- `api/auth/verify-transfer.ts` - Transfer token verification endpoint
- `api/auth/session.ts` - Session validation endpoint
- `api/init-db.ts` - Database initialization script
- Individual API endpoint files (`generate-keywords.ts`, `analyze-ranking.ts`, `deep-dive-strategy.ts`, etc.)

**Note**: The actual implementation uses a unified `/api/seo-agent` endpoint rather than separate agent/pipeline endpoints. The 4-phase workshop approach is implemented within the existing API structure.

### Database Schema (Implemented Tables)

The following tables are actually implemented in the system:

#### Content & Publication Tables

```sql
-- Published articles (article storage with publication metadata)
CREATE TABLE published_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  images JSONB, -- Array of image objects
  keyword VARCHAR(500),
  tone VARCHAR(100),
  visual_style VARCHAR(100),
  target_audience VARCHAR(100),
  target_market VARCHAR(100),
  status VARCHAR(50), -- draft, published, failed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  url_slug VARCHAR(500),
  website_id UUID REFERENCES user_websites(id),
  content_type VARCHAR(20), -- 'informational' | 'commercial'
  site_id UUID REFERENCES platform_sites(id)
);

-- Execution tasks (background task tracking)
CREATE TABLE execution_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(100), -- 'article-generator', 'keyword-mining', etc.
  status VARCHAR(50), -- pending, running, completed, failed
  state JSONB, -- Task state and results
  params JSONB, -- Input parameters
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User websites
CREATE TABLE user_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  website_domain VARCHAR(255) NOT NULL,
  website_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### PSEO Platform Management Tables

```sql
-- GitHub tokens (repository management)
CREATE TABLE github_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  token_encrypted TEXT NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  usage_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Platform tokens (RTD, Netlify, Vercel, CF Pages)
CREATE TABLE platform_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('rtd', 'cf_pages', 'netlify', 'vercel')),
  name VARCHAR(100) NOT NULL UNIQUE,
  token_encrypted TEXT NOT NULL,
  usage_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Platform sites (deployment targets)
CREATE TABLE platform_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_token_id UUID NOT NULL REFERENCES github_tokens(id) ON DELETE CASCADE,
  platform_token_id UUID REFERENCES platform_tokens(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('rtd', 'cf_pages', 'netlify', 'vercel')),
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('informational', 'commercial')),
  site_name VARCHAR(200) NOT NULL,
  site_url VARCHAR(500) DEFAULT '',
  repo_name VARCHAR(100) NOT NULL,
  docs_path VARCHAR(100) DEFAULT 'docs',
  branch VARCHAR(100) DEFAULT 'main',
  platform_project_id VARCHAR(200), -- Netlify/Vercel project ID for rebuilds
  usage_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Website-site bindings (associates user websites with platform sites)
CREATE TABLE website_site_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('informational', 'commercial')),
  site_id UUID NOT NULL REFERENCES platform_sites(id) ON DELETE CASCADE,
  UNIQUE (website_id, content_type),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Other Tables

Additional tables exist for:
- `workflow_configs` - Workflow configuration storage
- `subscription_plans`, `payment_orders`, `user_subscriptions`, `user_credits` - Payment/billing
- `website_keywords`, `website_pages`, `article_rankings` - SEO data tracking
- `api_keys` - API key management
- `user_preferences` - User settings
- Various cache tables for domain analysis

**Note**: The following tables from the original design were never implemented:
- `projects`, `keywords` - Keyword mining data is stored in `execution_tasks` instead
- `content_drafts` - Drafts are stored in `execution_tasks` and `published_articles`
- `images` - Images are stored in the `images` JSONB column of `published_articles`
- `publications`, `ranking_records` - Publication tracking not yet implemented

### Key Features Implementation

#### Completed Features (已完成)

**1. Keyword Mining (挖词)**

- **Blue Ocean Mode**: SCAMPER semantic expansion from seed keywords
- **Website Audit Mode**: Gap analysis using Firecrawl + DataForSEO competitor data
- **SERP Audit**: Top 10 domain authority analysis and ranking probability scoring
- **Multi-language Support**: 10+ target languages with cross-market insights
- **Batch Processing**: Processes keywords in batches to avoid API rate limits
- **Data Integration**: DataForSEO/SE-ranking for volume, difficulty, and SERP data

**2. Content Generation (图文)**

- **4-Phase Workshop**: Deep Research → Strategy → Visual (parallel) → Writing
- **SEO Researcher**: SERP insights, search engine preference analysis, data profiling
- **SEO Strategist**: "Big fish eats small fish" strategy, content blueprint generation
- **Image Artist**: Nano Banana 2 integration with parallel 4K image generation (4-6 images)
- **Content Writer**: Quality pre-control, 3D optimization (GEO, AIO, LSI), auto-archive to database
- **Reference Integration**: Support for document/URL injection and target market selection

**3. Authentication & Infrastructure**

- Cross-project auth with niche-mining via transfer tokens
- Development mode with auto-login enabled
- PostgreSQL database with shared user authentication

#### Features Not Yet Implemented (未完成)

**Publication Strategy (发布) - See `docs/` for detailed strategy**

**Fast/Slow Knife Mechanism (快慢刀机制)**:
- **Theory**: Exploit legitimate indexing time gap (Indexing Lag Abuse)
  - Google's flow: Discovery → Index → Initial ranking → Trust evaluation (7-30 days)
  - Low-competition SERPs prioritize "similarity matching" over authority
  - Faceted navigation gets indexed first, evaluated later
- **Structure**:
  - `/lab/` or `/test/` - Experimental content (short-term exposure, disposable)
  - `/guide/`, `/tool/`, `/compare/`, `/live/` - Long-term conversion zones
  - URL inheritance (not content inheritance) via 301 redirects or Canonical tags
- **Process**:
  1. Deploy 20-50 experimental articles to `/lab/` paths
  2. Monitor for 7-14 days
  3. Identify winners (Top 50 ranking or real clicks)
  4. Upgrade winner content to data-backed depth
  5. Inherit URL to permanent paths via 301/Canonical
  6. Delete or noindex losers

**Platform Carriers (载体)**:
- **Current Platforms**: Cloudflare Pages, Netlify, Vercel
- Strategy: Use infrastructure-type platforms with inherent Google trust
- Automated deployment via GitHub integration

**Internal Link Architecture**:
- **Single-direction funnel**: lab → guide/tool → compare/live (never reverse)
- **Keyword cluster boost**: Multiple lab pages → one guide hub page
- **Faceted navigation**: Facets only link to hub, not to each other
- **Anchor text**: Mix exact match with semantic descriptions (1:1 ratio)

**Website Data & Task Dashboard** (Low priority):
- Full metrics overview, ranking distribution, AI opportunity insights
- Multi-task parallel execution (up to 5 tasks simultaneously)

## Development Patterns

### API Handler Pattern

All API endpoints follow this structure:

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  parseRequestBody,
  setCorsHeaders,
  handleOptions,
  sendErrorResponse,
} from "./_shared/request-handler";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);
    if (req.method === "OPTIONS") return handleOptions(res);
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    const body = parseRequestBody(req);
    // Process request
    return res.json({ result });
  } catch (error) {
    return sendErrorResponse(res, error, "Error message");
  }
}
```

### Gemini API Integration

All AI functions use the shared `callGeminiAPI` wrapper in `api/_shared/gemini.ts` which handles:

- Proxy URL configuration (302.ai or tu-zi.com)
- API key management
- JSON response parsing
- Error handling and logging
- Request batching for rate limit management

### 4-Phase Workshop Pattern

The content generation follows a workshop orchestration pattern:

```typescript
// Phase 1: Deep Research (SEO Researcher)
const research = await callGeminiAPI({
  prompt: serpAnalysisPrompt,
  // SERP data, competitor analysis, volume/difficulty data
});

// Phase 2: Strategy (SEO Strategist)
const strategy = await callGeminiAPI({
  prompt: strategyPrompt,
  context: research,
  // Content blueprint, H1/H2/H3 outline, meta description
});

// Phase 3 & 4: Parallel execution
const [images, content] = await Promise.all([
  generateImages(strategy.visualThemes), // Image Artist
  generateContent(research, strategy), // Content Writer
]);

// Auto-archive to database
await saveToDatabase({ content, images, metadata });
```

## Important Notes

### Key SEO Concepts & Strategies

**Exploitable Search Engine Behaviors**:
1. **Indexing Lag Abuse (合法时��差)**: Google's evaluation happens in stages - initial ranking based on relevance/usefulness (immediate), trust evaluation via E-E-A-T (7-30 days later)
2. **SERP Chaos = Hub Page Hunger**: When SERPs are mixed (forums, PDFs, no authority), Google desperately needs a "center page" to organize the knowledge graph
3. **Faceted Navigation Tolerance**: Google indexes first, evaluates later - allows temporary ranking before quality assessment
4. **Cumulative Punishment Model**: Penalties accumulate over time, not instant judgment - allows exploitation window
5. **Internal Links = Importance Signal**: PageRank flows through internal links - more quality internal links = higher perceived importance

**Structural Gray-Hat Approach (结构灰帽)**:
- Not black-hat spam, but strategic use of legitimate platform trust
- Exploit timing gaps and structural signals, not deceptive content
- Use high-trust infrastructure platforms (Read the Docs, GitHub Pages)
- Create genuinely useful content, just optimized for indexing speed

## Important Notes

### Performance & Optimization

- API functions have 60-second timeout limit (Vercel serverless constraint)
- Keywords are processed in batches of 3 to avoid rate limits
- Image generation uses parallel requests (4-6 images simultaneously) via Promise.all
- DataForSEO API calls should be cached when possible to reduce costs
- Phase 3 & 4 of workshop run in parallel for optimal performance

### Architecture Considerations

- Unified `/api/seo-agent` endpoint handles multiple modes (keyword_mining, batch_translation, deep_dive)
- 4-phase workshop approach is implemented as sequential + parallel execution (Phase 1 → Phase 2 → Parallel[Phase 3, Phase 4])
- Content drafts and images are auto-archived to database after generation
- Large content responses are handled via direct database storage with reference IDs

### Security & Validation

- Validate all user inputs before passing to AI agents
- Sanitize HTML content before storage (prevent XSS)
- Rate limit API calls per user to prevent abuse
- Secure Nano Banana 2 API key (use environment variables)
- Implement content moderation filters

### Development Best Practices

- All API responses include CORS headers for frontend integration
- Environment variables are automatically injected by Vercel in production
- The project uses path alias `@/` mapped to project root in TypeScript and Vite configs
- **Authentication**: Uses `pg` library for database (not `@vercel/postgres`), development mode enabled by default
- **First-time setup**: Run `http://localhost:3002/api/init-db` to create database tables
- **Auth setup guide**: See `AUTH_SETUP_SIMPLE.md` for quick configuration (5 minutes)
- **Testing**: Test each agent independently before integrating into pipeline
- **Monitoring**: Add error tracking (Sentry) and analytics (Vercel Analytics)

### Implementation Priorities

**Current Status**:
- ✅ **Completed**: Keyword Mining (挖词) - Both Blue Ocean and Website Audit modes
- ✅ **Completed**: Content Generation (图文) - 4-phase workshop with all agents
- ❌ **Not Completed**: Publication System (发布) - Fast/slow knife strategy

**Next Priorities**:
1. **Priority 1**: Publication automation system
   - Read the Docs integration and automated deployment
   - Fast/slow knife URL inheritance mechanism (7-14 day monitoring)
   - Internal link structure automation (single-direction funnel)
   - Winner selection and 301/Canonical inheritance
2. **Priority 2**: Platform carrier integrations
   - GitHub Pages, GitLab Pages automation
   - Cloudflare Pages, Netlify, Vercel deployment
3. **Priority 3**: Ranking tracking and analytics
   - Google SERP position monitoring
   - AI search engine citation tracking (ChatGPT, Claude, Perplexity)
   - Winner/loser identification automation
4. **Priority 4**: Website Data & Task Dashboard (Low priority)
   - Full metrics overview and ranking distribution
   - Multi-task parallel execution monitoring

### Cost Estimates

- Gemini API: ~$0.001-0.002 per 1K tokens (flash model)
- Nano Banana 2: $0.05-0.08 per image (4-6 images per article = $0.20-0.48)
- DataForSEO: Variable pricing based on API calls (keyword data, SERP analysis)
- Firecrawl: Variable pricing based on pages crawled (Website Audit mode)
- Vercel Serverless: Free tier generous, paid for high traffic
- Total per article: ~$0.50-1.50 in AI costs (estimated, including data sources)

### Additional Resources

For detailed implementation strategies, see:
- `docs/AI + PSEO Agent：自动化搜索流量基础设施白皮书.md` - Complete product vision and architecture
- `docs/NICHEDIGGER内容发布策略(3).md` - Fast/slow knife publication strategy and internal linking


