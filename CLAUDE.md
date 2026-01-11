# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google SEO Agent is a React-based AI-powered content creation platform that uses multi-agent system to generate SEO-optimized content. The system consists of 4 specialized AI agents that collaborate to research, write, review, and enhance content with images. The project is deployed on Vercel using serverless functions.

### Core Features

- **Multi-Agent AI System**: 4 specialized agents (SEO Researcher, Content Writer, Quality Reviewer, Image Creative Director)
- **Complete Content Pipeline**: 8-step workflow from keyword research to publication
- **Smart Keyword Mining**: Identify blue ocean keywords with AI analysis
- **Competitor Analysis**: Deep SERP analysis and content gap identification
- **GEO/AIO Optimization**: Geographic and AI-engineine specific content optimization
- **Image Generation**: Nano Banana 2 integration for high-quality, low-cost images
- **Platform Integration**: One-click publishing to multiple platforms

## Architecture

- **Frontend**: React + TypeScript + Vite (port 3000)
- **Backend**: Vercel Serverless Functions (Node.js + TypeScript) in `/api` directory
- **AI Integration**:
  - Google Gemini API with proxy support (302.ai) - Primary AI engine
  - Nano Banana 2 API - High-quality image generation (4K, 5-10s, $0.05-0.08/image)
  - Multiple AI Search APIs - Google SERP, ChatGPT, Claude, Perplexity analysis
- **Database**: PostgreSQL (shared with niche-mining project)
  - User authentication (shared)
  - Keywords & projects
  - Content drafts & versions
  - Image assets & metadata
  - Publication records
- **Authentication**: Cross-project auth with niche-mining (shared database + JWT)
- **Deployment**: Vercel with automatic builds and environment variable management

### Multi-Agent System Architecture

```
User Request → Keyword Mining → Agent Orchestration → Content Generation → Quality Review → Image Enhancement → Publication
                  ↓                      ↓                    ↓                  ↓                    ↓              ↓
           Blue Ocean          SEO Researcher       Content Writer    Quality Reviewer   Image Creative    Platform
           Keywords            Agent (Agent 1)       Agent (Agent 2)  Agent (Agent 3)    Director (Ag 4)  Publisher
```

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

### Existing SEO 功能 (Current)

- `/api/generate-keywords` - Generate SEO keywords using Gemini API
- `/api/analyze-ranking` - Analyze keyword ranking probability
- `/api/deep-dive-strategy` - Generate detailed content strategy
- `/api/translate-prompt` - Translate and optimize system instructions
- `/api/translate-text` - Translate text between languages
- `/api/seo-agent` - Unified SEO agent API (keyword_mining, batch_translation, deep_dive modes)

### New AI Agent System (To Be Implemented)

- `/api/agents/orchestrate` - Main orchestrator for multi-agent workflow
- `/api/agents/seo-researcher` - Agent 1: SEO research & competitor analysis
- `/api/agents/content-writer` - Agent 2: Content generation
- `/api/agents/quality-reviewer` - Agent 3: Quality checks & scoring
- `/api/agents/image-creative` - Agent 4: Image generation & integration

### Content Pipeline APIs (To Be Implemented)

- `/api/pipeline/search-preferences` - Step 1: Analyze search engine preferences
- `/api/pipeline/competitor-analysis` - Step 2: Competitor structure analysis
- `/api/pipeline/keyword-optimization` - Step 3: Keyword density & LSI optimization
- `/api/pipeline/geo-optimization` - Step 4: Geographic content optimization
- `/api/pipeline/aio-optimization` - Step 5: AI-engine optimization
- `/api/pipeline/content-generation` - Step 6: Generate final article
- `/api/pipeline/quality-check` - Step 7: Quality scoring & verification
- `/api/pipeline/image-generation` - Step 8: Generate & integrate images

### Publication & Tracking (To Be Implemented)

- `/api/publish/configure` - Configure platform parameters
- `/api/publish/execute` - Publish content to platform
- `/api/track/rankings` - Track keyword rankings
- `/api/publish/history` - Get publication history

### 认证功能 (Existing)

- `/api/auth/verify-transfer` - Verify transfer token from main app
- `/api/auth/session` - Validate JWT session
- `/api/init-db` - Initialize database tables (run once)

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

# Publication Platforms (Optional)
WORDPRESS_CLIENT_ID=your_wordpress_client_id
WORDPRESS_CLIENT_SECRET=your_wordpress_client_secret
MEDIUM_API_KEY=your_medium_integration_token
GHOST_ADMIN_API_KEY=your_ghost_admin_api_key

# Development mode
NODE_ENV=development
ENABLE_DEV_AUTO_LOGIN=true

# Frontend
VITE_MAIN_APP_URL=http://localhost:3000
```

**Important**:

- `POSTGRES_URL` and `JWT_SECRET` must be identical to the main app (niche-mining)
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
- `api/lib/db.ts` - PostgreSQL database connection (pg library)
- `api/lib/auth.ts` - JWT token generation and verification

#### New: Agent System

- `api/agents/_shared/orchestrator.ts` - Multi-agent orchestration logic
- `api/agents/seo-researcher.ts` - Agent 1: SEO research & competitor analysis
- `api/agents/content-writer.ts` - Agent 2: Content generation
- `api/agents/quality-reviewer.ts` - Agent 3: Quality checks & scoring
- `api/agents/image-creative.ts` - Agent 4: Image generation & integration

#### New: Content Pipeline

- `api/pipeline/_shared/pipeline-manager.ts` - Pipeline state management
- `api/pipeline/search-preferences.ts` - Step 1: Search engine preference analysis
- `api/pipeline/competitor-analysis.ts` - Step 2: Competitor structure analysis
- `api/pipeline/keyword-optimization.ts` - Step 3: Keyword density & LSI
- `api/pipeline/geo-optimization.ts` - Step 4: Geographic optimization
- `api/pipeline/aio-optimization.ts` - Step 5: AI-engine optimization
- `api/pipeline/content-generation.ts` - Step 6: Final article generation
- `api/pipeline/quality-check.ts` - Step 7: Quality scoring
- `api/pipeline/image-generation.ts` - Step 8: Image generation & integration

#### New: Publication & Tracking

- `api/publish/configure.ts` - Platform configuration
- `api/publish/execute.ts` - Publish content
- `api/publish/history.ts` - Publication history
- `api/track/rankings.ts` - Keyword ranking tracking

#### Existing APIs

- `api/auth/verify-transfer.ts` - Transfer token verification endpoint
- `api/auth/session.ts` - Session validation endpoint
- `api/init-db.ts` - Database initialization script
- Individual API endpoint files (`generate-keywords.ts`, `analyze-ranking.ts`, etc.)

### Database Schema (To Be Implemented)

```sql
-- Keywords & Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  seed_keyword VARCHAR(500),
  target_language VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  keyword VARCHAR(500) NOT NULL,
  translation VARCHAR(500),
  intent VARCHAR(50),
  volume INTEGER,
  probability VARCHAR(20),
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Content & Versions
CREATE TABLE content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  keyword_id UUID REFERENCES keywords(id),
  title VARCHAR(500),
  content TEXT,
  meta_description TEXT,
  url_slug VARCHAR(500),
  version INTEGER DEFAULT 1,
  status VARCHAR(50), -- draft, reviewing, approved, published
  quality_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Images & Assets
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id UUID REFERENCES content_drafts(id),
  prompt TEXT,
  image_url VARCHAR(1000),
  alt_text VARCHAR(500),
  position INTEGER, -- Order in article
  metadata JSONB, -- Storage EXIF, dimensions, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Publications
CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id UUID REFERENCES content_drafts(id),
  platform VARCHAR(100), -- wordpress, medium, ghost, etc.
  platform_post_id VARCHAR(255),
  post_url VARCHAR(1000),
  status VARCHAR(50), -- pending, published, failed
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ranking Tracking
CREATE TABLE ranking_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID REFERENCES keywords(id),
  publication_id UUID REFERENCES publications(id),
  search_engine VARCHAR(50), -- google, chatgpt, claude, perplexity
  position INTEGER,
  traffic INTEGER,
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

### Key Features Implementation

#### Current Features (Phase 1 - Completed)

1. **Keyword Generation**: Uses Gemini API to generate keywords in target languages with search volume estimates
2. **Ranking Analysis**: Analyzes SERP competition and assigns probability scores (High/Medium/Low)
3. **Content Strategy**: Generates detailed SEO content plans with H1 titles, meta descriptions, and content structure
4. **Multi-language Support**: Supports 10+ target languages with UI in Chinese/English
5. **Batch Processing**: Processes keywords in batches to avoid API rate limits
6. **Cross-Project Authentication**: Shares login state with niche-mining via transfer tokens (dev mode: auto-login enabled)

#### New Features (Phase 2 - To Implement)

**Multi-Agent AI System (4 Agents)**

1. **SEO Researcher Agent** (`api/agents/seo-researcher.ts`)

   - Search engine preference analysis (Google vs ChatGPT vs Claude vs Perplexity)
   - Top 10 competitor structure extraction
   - Content framework identification
   - Content gap analysis
   - Keyword & LSI keyword extraction
   - GEO/AIO optimization recommendations

2. **Content Writer Agent** (`api/agents/content-writer.ts`)

   - Draft generation based on SEO recommendations
   - Follow competitor structure and style
   - Inject target keywords at optimal positions
   - Apply GEO optimizations (local content, case studies, regional data)
   - Apply AIO optimizations (Q&A format, structured data, AI-friendly language)

3. **Quality Reviewer Agent** (`api/agents/quality-reviewer.ts`)

   - Keyword density verification (target: 1-2%)
   - AI probability detection (use Gemini to detect AI-written content)
   - GEO/AIO compliance checks
   - Readability score (Flesch Reading Ease)
   - Quality scoring (0-100)
   - Improvement suggestions

4. **Image Creative Director Agent** (`api/agents/image-creative.ts`)
   - Extract 4-6 visual themes from content
   - Generate optimized Nano Banana 2 prompts for each theme
   - Call Nano Banana 2 API (parallel requests for speed)
   - Download and add metadata to images
   - Plan image positions within article

**Complete Content Creation Pipeline (8 Steps)**

1. **Search Engine Preference Analysis**

   - Analyze ranking factors for Google vs ChatGPT vs Claude vs Perplexity
   - Generate tailored optimization strategies for each engine

2. **Competitor Analysis**

   - Fetch Top 10 SERP results
   - Extract content structure (H1, H2, H3 hierarchy)
   - Identify content framework and style patterns
   - Find content gaps and opportunities

3. **Keyword Optimization**

   - Calculate optimal keyword density (1-2%)
   - Identify LSI keywords
   - Plan keyword placement (title, headings, first paragraph, conclusion)

4. **GEO Optimization**

   - Add geographic references (cities, landmarks)
   - Include local case studies
   - Incorporate regional statistics/data
   - Use localized language and expressions

5. **AIO (AI Engine Optimization)**

   - Structure content in Q&A format
   - Optimize for answer boxes (featured snippets)
   - Use AI-friendly language and sentence structures
   - Add schema.org structured data markup
   - Optimize citations and references

6. **Content Generation**

   - Synthesize all optimization recommendations
   - Generate final article with all enhancements applied
   - Ensure natural flow and readability

7. **Quality Check**

   - Verify keyword density compliance
   - Check AI probability score
   - Validate GEO/AIO optimizations
   - Calculate overall quality score (0-100)
   - Generate improvement suggestions if score < 80

8. **Image Generation**
   - Extract 4-6 visual themes from content
   - Generate Nano Banana 2 prompts
   - Call API in parallel (4-6 images simultaneously)
   - Download and process images
   - Add EXIF metadata
   - Plan and insert image positions

**User Workflow (4 Phases)**

1. **Phase 1: Keyword Mining** (Existing)

   - Input: Website URL or seed keyword
   - Process: Identify blue ocean keywords
   - Output: User selects target keywords

2. **Phase 2: Content Generation** (New)

   - Process: 4 agents collaborate (orchestrated workflow)
   - UI: Real-time progress display with agent status
   - Output: Preview and edit content before finalizing

3. **Phase 3: Publication** (New)

   - Select target platform (WordPress, Medium, Ghost, etc.)
   - Configure publication parameters
   - One-click publish
   - Retrieve published URL

4. **Phase 4: Tracking** (Optional, New)
   - Monitor keyword rankings
   - Track organic traffic
   - Check AI engine citations
   - Generate performance reports

**Nano Banana 2 Integration**

- Model: Fast generation (5-10 seconds per image)
- Quality: 4K resolution
- Cost: $0.05-0.08 per image
- API: Parallel request support for batch generation
- Workflow: Auto-extract themes → Generate prompts → Call API → Download → Add metadata → Position in content

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

### Agent System Pattern (New)

Each agent follows this structure:

```typescript
import { AgentInput, AgentOutput } from "./types";

export async function runAgent(input: AgentInput): Promise<AgentOutput> {
  // 1. Validate input
  // 2. Call Gemini API with agent-specific prompt
  // 3. Parse and validate output
  // 4. Return structured result with metadata
}
```

### Pipeline Orchestration Pattern (New)

```typescript
import { runAgent } from "./agents";

export async function executePipeline(
  input: PipelineInput
): Promise<PipelineOutput> {
  const steps = [
    { agent: "seo-researcher", name: "Search Preferences" },
    { agent: "seo-researcher", name: "Competitor Analysis" },
    { agent: "content-writer", name: "Keyword Optimization" },
    // ... etc
  ];

  const results = {};
  for (const step of steps) {
    results[step.name] = await runAgent({ ...input, context: results });
  }

  return results;
}
```

### Gemini API Integration

All AI functions use the shared `callGeminiAPI` wrapper in `api/_shared/gemini.ts` which handles:

- Proxy URL configuration
- API key management
- JSON response parsing
- Error handling and logging
- Request batching for rate limit management

### Nano Banana 2 Integration Pattern

```typescript
export async function generateImages(themes: string[]): Promise<Image[]> {
  const requests = themes.map((theme) =>
    fetch(NANO_BANANA_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.NANO_BANANA_API_KEY}` },
      body: JSON.stringify({ prompt: generateOptimizedPrompt(theme) }),
    })
  );

  const responses = await Promise.all(requests);
  return await Promise.all(responses.map((r) => downloadAndProcessImage(r)));
}
```

## Important Notes

### Performance & Optimization

- API functions have 60-second timeout limit (Vercel serverless constraint)
- Keywords are processed in batches of 3 to avoid rate limits
- Image generation uses parallel requests (4-6 images simultaneously)
- Pipeline orchestration should support checkpoint/resume for long-running workflows
- Consider using Vercel Cron Jobs for background tasks (ranking tracking)

### Architecture Considerations

- Multi-agent system requires careful state management (consider Redux or Zustand for frontend)
- Pipeline progress should be streamed to frontend via WebSocket or Server-Sent Events
- Large content drafts may exceed Vercel response size limits (consider pagination or streaming)
- Image storage: Use Vercel Blob or external CDN (Cloudflare R2, AWS S3)

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

### Phase 2 Implementation Priorities

1. **Priority 1**: Agent system core (4 agents + orchestrator)
2. **Priority 2**: Content pipeline (8 steps)
3. **Priority 3**: Database expansion (new tables)
4. **Priority 4**: Frontend refactoring (modularize App.tsx)
5. **Priority 5**: Publication integrations (WordPress, Medium, Ghost)
6. **Priority 6**: Ranking tracking system
7. **Priority 7**: Performance optimization and monitoring

### Cost Estimates

- Gemini API: ~$0.001-0.002 per 1K tokens (flash model)
- Nano Banana 2: $0.05-0.08 per image (4-6 images per article = $0.20-0.48)
- Vercel Serverless: Free tier generous, paid for high traffic
- Total per article: ~$0.50-1.00 in AI costs (estimated)
