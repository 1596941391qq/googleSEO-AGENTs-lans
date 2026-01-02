---
description: Deep Dive workflow data flow with Firecrawl integration
---

# Deep Dive Data Flow

This document describes the upgraded data flow for the Deep Dive workflow, integrating Firecrawl for deep competitor analysis.

## Overview

The Deep Dive workflow now consists of the following enhanced steps:

### Step 1: Search Engine Preferences (Agent 2)
- **Input**: `analyzingSearchPreferences(keyword)`
- **Output**: JSON object describing semantic landscape, ranking factors, and detailed engine strategies (Google, Perplexity, etc.).

### Step 2: Competitor Analysis (Agent 2 - **UPGRADED**)
- **Input**: `analyzeCompetitors(keyword)`
- **Process**:
  1. Fetch SERP results (Google Search).
  2. Extract Top 3 URLs.
  3. **Firecrawl Integration**: Concurrently scrape the full markdown content of the Top 3 pages.
  4. Truncate content to safe token limits (8k chars/page).
  5. Inject full content into Gemini prompt.
- **Output**: `CompetitorAnalysisResult`
  - `winning_formula`: Why they rank #1.
  - `contentGaps`: Topics missing from competitors.
  - `competitor_benchmark`: Detailed structure analysis.

### Step 3: SEO Strategy Generation (Agent 2 - **UPGRADED**)
- **Input**: `generateDeepDiveStrategy(keyword, searchPreferences, competitorAnalysis)`
- **Process**:
  1. Receive `searchPreferences` and `competitorAnalysis` from previous steps.
  2. Inject strictly formatted JSON context into the Prompt.
  3. Instruct AI to specificially address "Content Gaps" found in Step 2.
- **Output**: `SEOStrategyReport` (The blueprint for Agent 3).

### Step 4-8: Content Generation & Review (Agents 3, 4, 5)
- **Input**: The highly tailored `SEOStrategyReport`.
- **Process**: Agent 3 writes content that fills the identified gaps; Agent 4 reviews it; Agent 5 generates images.

## Key Code Changes

- `api/_shared/tools/firecrawl.ts`: Existing tool used.
- `api/_shared/agents/agent-2-seo-researcher.ts`: 
  - `analyzeCompetitors`: Added Firecrawl scraping logic.
  - `generateDeepDiveStrategy`: Added context injection logic.
- `api/_shared/services/deep-dive-service.ts`: Updated orchestration to pass data between steps.

## Verification

To verify this workflow:
1. Trigger a Deep Dive from the UI.
2. Monitor server logs for `[Agent 2] Scraping Top 3 competitors...`.
3. Check the final Strategy Report; it should contain specific insights derived from the full content of competitor pages.
