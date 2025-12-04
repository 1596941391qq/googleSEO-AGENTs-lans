# 🎯 Default Prompt Configuration Guide

This guide explains how to configure and customize the default AI prompts used throughout the Google SEO Agent application.

---

## 📂 Where to Configure Default Prompts

### 1. **Frontend Service Layer** (`services/gemini.ts`)

This file contains the **default English prompts** that serve as the base configuration:

```typescript
// Location: services/gemini.ts

export const DEFAULT_GEN_PROMPT_EN = `...`      // Keyword generation prompt
export const DEFAULT_ANALYZE_PROMPT_EN = `...`  // SERP analysis prompt
export const DEFAULT_DEEP_DIVE_PROMPT_EN = `...` // Deep dive strategy prompt
```

**These are the PRIMARY defaults** used when:
- User hasn't created any custom workflow configurations
- Workflow configuration doesn't exist for a specific workflow
- Application is in its initial state

### 2. **Workflow Definitions** (`workflows.ts`)

This file defines the structure of each workflow and references the default prompts:

```typescript
// Location: workflows.ts

export const MINING_WORKFLOW: WorkflowDefinition = {
  nodes: [
    {
      id: 'mining-gen',
      prompt: DEFAULT_GEN_PROMPT_EN,        // References service/gemini.ts
      defaultPrompt: DEFAULT_GEN_PROMPT_EN,
    },
    {
      id: 'mining-analyze',
      prompt: DEFAULT_ANALYZE_PROMPT_EN,    // References service/gemini.ts
      defaultPrompt: DEFAULT_ANALYZE_PROMPT_EN,
    }
  ]
}
```

**Important**: `workflows.ts` imports and references the prompts from `services/gemini.ts`, so you typically **only need to edit `services/gemini.ts`**.

---

## 🛠️ How to Modify Default Prompts

### Step 1: Edit `services/gemini.ts`

Open `services/gemini.ts` and locate the prompt you want to modify:

```typescript
export const DEFAULT_ANALYZE_PROMPT_EN = `
You are a Google SERP Analysis AI Expert.
Estimate "Page 1 Ranking Probability" based on COMPETITION STRENGTH analysis.

**High Probability Indicators (Low Competition)**:
1. **Low Authority Domain Prevalence**: The majority of results (3+ of Top 5) are hosted on **low Domain Authority** sites (e.g., Forums like Reddit, Quora, generic blogs, or social media pages).
2. **Weak On-Page Optimization**: Top 3 results **lack the exact keyword** (or a strong variant) in the Title Tag or H1 Heading.
3. **Non-Commercial Content**: Top results primarily offer non-commercial content, such as **PDFs, basic user guides, unoptimized listing pages, or personal portfolios.**
4. **Low Content Quality**: The content in the Top 5 is generic, outdated, or lacks comprehensive depth (e.g., short articles < 500 words).

**Low Probability Indicators (High Competition)**:
1. **Dominant Authority**: Top 3 results include major brand domains (Amazon, New York Times), **established Government/Education sites (.gov, .edu)**, or universally authoritative sources like **Wikipedia**.
2. **Niche Authority**: Top 5 results are occupied by **highly relevant, established niche authority websites** with robust backlink profiles and high E-E-A-T signals.
3. **High Intent Alignment**: Top results demonstrate **perfect user intent alignment** (e.g., highly optimized 'best X for Y' articles or dedicated product pages).
4. **Exact Match Optimization**: The Top 3 results are **fully optimized** (exact keyword in Title, H1, Meta Description, and URL slug).

**Analysis Framework**:
- Evaluate each indicator systematically
- Weight domain authority and optimization quality heavily
- Consider the overall competitive landscape
- Provide specific evidence from the SERP results

Return: "High", "Medium", or "Low" probability with detailed reasoning.
`;
```

### Step 2: Best Practices for Prompt Engineering

#### ✅ DO:
- Be **specific and detailed** with criteria
- Use **numbered lists** for clarity
- Include **examples** where helpful
- Define **output format** explicitly
- Use **bold** for key terms
- Structure with clear sections

#### ❌ DON'T:
- Use vague language like "good" or "bad" without definition
- Create prompts without clear evaluation criteria
- Forget to specify the expected output format
- Make prompts too long (keep under 1000 words for optimal performance)

### Step 3: Test Your Changes

After modifying the prompt:

1. **Restart the development server**:
   ```bash
   vercel dev
   ```

2. **Test with various keywords**:
   - Run Mining workflow
   - Check if analysis results reflect your new criteria
   - Verify output quality

3. **Monitor logs**:
   - Open browser console (F12)
   - Check for any AI errors or unexpected outputs

---

## 🎨 Available Prompts to Customize

### 1. **Keyword Generation Prompt** (`DEFAULT_GEN_PROMPT_EN`)

**Purpose**: Generates new SEO keywords based on seed keyword

**Current Strategy**:
- Round 1: Direct variations and related terms
- Round 2+: Lateral thinking with SCAMPER method
- Supports horizontal (broad) and vertical (deep) mining strategies

**Key Considerations**:
- Must return valid JSON array
- Should avoid repetition
- Balance creativity with searchability

---

### 2. **SERP Analysis Prompt** (`DEFAULT_ANALYZE_PROMPT_EN`)

**Purpose**: Analyzes Google SERP to estimate ranking probability

**Current Framework** (Updated with your rules):
- ✅ **High Probability Indicators**: Low authority domains, weak optimization, non-commercial content, low quality
- ✅ **Low Probability Indicators**: Dominant authority, niche expertise, perfect intent alignment, exact match optimization

**Key Considerations**:
- Must evaluate actual SERP data
- Should provide specific evidence
- Return one of: "High", "Medium", "Low"

---

### 3. **Deep Dive Strategy Prompt** (`DEFAULT_DEEP_DIVE_PROMPT_EN`)

**Purpose**: Creates comprehensive SEO content strategy

**Current Focus**:
- Page title and meta description optimization
- Content structure planning
- Long-tail keyword identification
- User intent analysis

**Key Considerations**:
- Should match search intent
- Provide actionable content structure
- Include realistic word count recommendations

---

## 🔄 Prompt Priority System

Understanding the priority order helps you predict which prompt will be used:

```
Priority 1: User's Active Workflow Configuration
   ↓ (if exists, use this)
Priority 2: Saved Workflow Configuration
   ↓ (if user loaded a saved config)
Priority 3: Default Prompts from services/gemini.ts
   ↓ (fallback default)
```

### Example Flow:

```typescript
// When mining executes:
getWorkflowPrompt('mining', 'mining-analyze', DEFAULT_ANALYZE_PROMPT_EN)
  ↓
  Check: Is there an active workflow config for 'mining'?
    ├─ YES → Use config.nodes.find(n => n.id === 'mining-analyze').prompt
    └─ NO  → Use DEFAULT_ANALYZE_PROMPT_EN
```

---

## 🚀 Advanced: Dynamic Prompt Modification

### Option 1: User-Configurable Prompts (UI)

Users can customize prompts via:
1. **Settings Panel** (Homepage) - For Mining workflow
2. **Workflow Configuration Page** - For all workflows

These override the defaults at **runtime** without code changes.

### Option 2: Programmatic Prompt Injection

You can inject additional context dynamically in the code:

```typescript
// Example: api/_shared/gemini.ts

const strategyGuidance =
  miningStrategy === 'horizontal'
    ? 'Explore DIFFERENT topics...'
    : 'Go DEEPER into the SAME topic...';

const userGuidance = userSuggestion
  ? `USER GUIDANCE: ${userSuggestion}`
  : '';

const finalPrompt = `${basePrompt}\n${strategyGuidance}\n${userGuidance}`;
```

This is already implemented for:
- `wordsPerRound` (5-20 keywords)
- `miningStrategy` (horizontal vs vertical)
- `userSuggestion` (real-time guidance)

---

## 📊 Monitoring Prompt Performance

### 1. Check Analysis Quality

After modifying the analysis prompt, verify:
- Are HIGH probability keywords actually rankable?
- Are LOW probability keywords correctly identified as competitive?
- Is the reasoning detailed and evidence-based?

### 2. Review API Logs

```bash
# In Vercel dev console
vercel logs
```

Look for:
- JSON parsing errors
- AI refusal or confusion
- Rate limit issues

### 3. User Feedback

The best validation is real-world results:
- Do users find valuable keywords?
- Are analysis results accurate?
- Is the reasoning helpful?

---

## 🎯 Your Updated Analysis Prompt (Current Configuration)

You've successfully updated the `DEFAULT_ANALYZE_PROMPT_EN` with enhanced criteria:

✅ **Added**: Detailed 4-point framework for both High and Low probability
✅ **Improved**: Specific examples (Reddit, Quora, .gov, .edu)
✅ **Enhanced**: Clear evaluation criteria (domain authority, on-page optimization)
✅ **Better**: Analysis framework with systematic evaluation

**Result**: The AI now has much clearer guidance for identifying blue ocean opportunities vs high competition keywords.

---

## 📝 Quick Reference

| Prompt Type | File | Line | Purpose |
|-------------|------|------|---------|
| Keyword Generation | `services/gemini.ts` | ~165 | Generate new keywords |
| SERP Analysis | `services/gemini.ts` | ~178 | Analyze competition |
| Deep Dive Strategy | `services/gemini.ts` | ~203 | Create content strategy |
| Translation | `workflows.ts` | ~51 | Translate keywords |
| Intent Analysis | `workflows.ts` | ~71 | Analyze search intent |

---

## 💡 Tips for Optimal Results

1. **Be Specific**: Instead of "good content", say "articles > 1500 words with 5+ headings"
2. **Use Examples**: Reference real sites like "Reddit, Quora" rather than "forums"
3. **Test Iteratively**: Make small changes, test, refine
4. **Monitor Consistency**: Ensure AI returns consistent formats
5. **Balance Detail**: Too short = vague, too long = confused AI

---

## 🆘 Troubleshooting

### Issue: AI returns incorrect format
**Solution**: Add explicit format instructions with examples

### Issue: Analysis too lenient/strict
**Solution**: Adjust weight/priority of indicators in prompt

### Issue: Prompts not applying
**Solution**:
1. Check if user has active workflow config (overrides default)
2. Restart dev server
3. Clear localStorage if needed

---

## 📚 Additional Resources

- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Google Gemini Best Practices](https://ai.google.dev/docs/prompt_best_practices)
- Project Documentation: `CLAUDE.md`

---

**Last Updated**: Based on your optimization requirements (High/Low Probability Indicators)
