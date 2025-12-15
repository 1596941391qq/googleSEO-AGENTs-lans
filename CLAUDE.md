# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google SEO Agent is a React-based SEO keyword research and analysis tool that uses Google Gemini API to generate keywords, analyze ranking probabilities, and create content strategies. The project is deployed on Vercel using serverless functions.

## Architecture

- **Frontend**: React + TypeScript + Vite (port 3000)
- **Backend**: Vercel Serverless Functions (Node.js + TypeScript) in `/api` directory
- **AI Integration**: Google Gemini API with proxy support (302.ai)
- **Authentication**: Cross-project auth with niche-mining (shared database + JWT)
- **Deployment**: Vercel with automatic builds and environment variable management

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

### SEO功能
- `/api/generate-keywords` - Generate SEO keywords using Gemini API
- `/api/analyze-ranking` - Analyze keyword ranking probability
- `/api/deep-dive-strategy` - Generate detailed content strategy
- `/api/translate-prompt` - Translate and optimize system instructions
- `/api/translate-text` - Translate text between languages

### 认证功能
- `/api/auth/verify-transfer` - Verify transfer token from main app
- `/api/auth/session` - Validate JWT session
- `/api/init-db` - Initialize database tables (run once)

## Environment Variables

Required for local development and Vercel deployment:

```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_PROXY_URL=https://api.302.ai
GEMINI_MODEL=gemini-2.5-flash

# Authentication (must match niche-mining project)
POSTGRES_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret_key
MAIN_APP_URL=http://localhost:3000

# Development mode
NODE_ENV=development
ENABLE_DEV_AUTO_LOGIN=true

# Frontend
VITE_MAIN_APP_URL=http://localhost:3000
```

**Important**: `POSTGRES_URL` and `JWT_SECRET` must be identical to the main app (niche-mining).

## Code Structure

### Frontend (Single File Architecture)
- `App.tsx` - Main React application containing all UI components, state management, and API calls
- `AuthStatusBar.tsx` - Login status bar component
- `contexts/AuthContext.tsx` - Authentication context provider
- `types.ts` - Shared TypeScript interfaces and enums
- `index.tsx` - React app entry point (wrapped with AuthProvider)
- `index.html` - HTML template

### Backend API
- `api/_shared/gemini.ts` - Gemini API service wrapper with all AI functions
- `api/_shared/request-handler.ts` - Common request/response utilities
- `api/_shared/types.ts` - API-specific TypeScript types
- `api/lib/db.ts` - PostgreSQL database connection (pg library)
- `api/lib/auth.ts` - JWT token generation and verification
- `api/auth/verify-transfer.ts` - Transfer token verification endpoint
- `api/auth/session.ts` - Session validation endpoint
- `api/init-db.ts` - Database initialization script
- Individual API endpoint files (`generate-keywords.ts`, `analyze-ranking.ts`, etc.)

### Key Features Implementation

1. **Keyword Generation**: Uses Gemini API to generate keywords in target languages with search volume estimates
2. **Ranking Analysis**: Analyzes SERP competition and assigns probability scores (High/Medium/Low)
3. **Content Strategy**: Generates detailed SEO content plans with H1 titles, meta descriptions, and content structure
4. **Multi-language Support**: Supports 10+ target languages with UI in Chinese/English
5. **Batch Processing**: Processes keywords in batches to avoid API rate limits
6. **Cross-Project Authentication**: Shares login state with niche-mining via transfer tokens (dev mode: auto-login enabled)

## Development Patterns

### API Handler Pattern
All API endpoints follow this structure:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = parseRequestBody(req);
    // Process request
    return res.json({ result });
  } catch (error) {
    return sendErrorResponse(res, error, 'Error message');
  }
}
```

### Gemini API Integration
All AI functions use the shared `callGeminiAPI` wrapper in `api/_shared/gemini.ts` which handles:
- Proxy URL configuration
- API key management
- JSON response parsing
- Error handling and logging
- Request batching for rate limit management

## Important Notes

- API functions have 60-second timeout limit (Vercel serverless constraint)
- Keywords are processed in batches of 3 to avoid rate limits
- All API responses include CORS headers for frontend integration
- Environment variables are automatically injected by Vercel in production
- The project uses path alias `@/` mapped to project root in TypeScript and Vite configs