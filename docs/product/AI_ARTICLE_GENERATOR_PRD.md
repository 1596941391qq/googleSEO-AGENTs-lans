# 🚀 AI Article Generator (Formally Deep Dive) PRD

**Date**: 2026-01-02
**Version**: 1.0 (Refactored from Deep Dive)
**Status**: Planning

---

## 1. Product Definition

*   **New Name**: AI Visual Article (AI 图文工场)
*   **Core Value**: Generate highly formatted, SEO-optimized articles with intelligently inserted AI images from a single keyword.
*   **User Goal**: "Input keyword -> Get a ready-to-publish article with images."

## 2. User Experience Flow

### Phase 1: Input Configuration
A clean, focused input screen.
*   **Core Input**: Keyword (e.g., "Best SEO Tools").
*   **Options** (Collapsible):
    *   **Tone**: Professional, Casual, Persuasive.
    *   **Target Audience**: Beginners, Experts.
    *   **Visual Style**: Realistic, Minimalist, Cyberpunk, Watercolor.
*   **Action**: "Generate Visual Article".

### Phase 2: Visualized Agent Stream (The "Feed")
A vertical feed of "UI Cards" showing the team of agents at work.
*   **Sidebar**: **HIDDEN** to provide an immersive experience.
*   **Agent 1 (Tracker)**: *Checking requirements...* (Brief toast)
*   **Agent 2 (Researcher) Cards**:
    *   **SERP Card**: Shows top 3 scraped competitors with thumbnails (Firecrawl data).
    *   **Data Card**: "Volume: 1200, KD: 45".
*   **Agent 2 (Strategist) Card**:
    *   **Outline Card**: A visual tree of H1 > H2 > H3.
    *   **Strategy Highlight**: "Gap found: Competitors miss video tutorials. We will add a 'How-to' section."
*   **Agent 3 (Writer) Card**:
    *   **Streaming Text**: Real-time typing effect of the article body.
*   **Agent 5 (Artist) Cards**:
    *   **Prompting**: "Designing image for H2: 'A team using analytics dashboard'..."
    *   **Generation**: Placeholder blur -> High-res image reveal.
    *   **Placement**: Image logically inserted between relevant paragraphs.

### Phase 3: Result & Delivery
*   **Layout**: Medium-style clean reading interface.
*   **Content**: 
    *   Title (H1)
    *   Intro
    *   Image 1 (e.g., after Intro)
    *   H2 Section
    *   Image 2 (e.g., mid-article)
    *   ...
    *   Conclusion
*   **Actions**: Export Markdown, Export HTML, Regenerate Specific Image.

## 3. Technical Specs

### Image Generation Logic
*   **Constraint**: 2-3 images per article.
*   **Logic**: Agent 5 analyzes the generated *Structure* (Strategy) to pick the best 2-3 spots (e.g., after Intro, middle H2, before Conclusion) *before* asking Agent 3 to write, OR inserts placeholders during writing.
*   **Implementation**: 
    1.  Agent 2 generates Outline.
    2.  Agent 5 selects 2-3 H2 headers to visualize.
    3.  Agent 5 generates prompts for these headers.
    4.  Agent 5 generates images in parallel.
    5.  Agent 3 writes content.
    6.  Frontend assembles text + images.

### UI Components
*   `ArticleGeneratorLayout`: Main wrapper, no sidebar.
*   `AgentStreamFeed`: Container for agent cards.
*   `AgentCard`: Generic card component.
    *   `SerpCard`
    *   `OutlineCard`
    *   `StreamingTextCard`
    *   `ImageGenCard`
*   `ArticlePreview`: Final render.

## 4. Next Steps
1.  **Refactor App.tsx**: Add routing/state for `mode === 'article-generator'`.
2.  **Build UI**: Implement the Feed and Cards.
3.  **Wire up Agents**: Ensure Agent 5 fires correctly and images are passed to the final output.
