// Workflow Definitions
import { WorkflowDefinition } from "../types";
import { 
  DEFAULT_GEN_PROMPT_EN, 
  DEFAULT_ANALYZE_PROMPT_EN,
  KEYWORD_MINING_PROMPTS,
  DEFAULT_SERP_ANALYSIS 
} from "../services/prompts/index";

// === Mining Workflow ===
export const MINING_WORKFLOW: WorkflowDefinition = {
  id: 'mining',
  name: 'Keyword Mining Workflow',
  description: 'Generate keywords, research with SEO tools, search SERP, and analyze ranking probability',
  nodes: [
    {
      id: 'mining-gen',
      type: 'agent',
      name: 'Keyword Generation Agent',
      description: 'Generates high-potential keywords in target language',
      configurable: true,
      prompt: DEFAULT_GEN_PROMPT_EN,
      defaultPrompt: DEFAULT_GEN_PROMPT_EN,
      promptZh: KEYWORD_MINING_PROMPTS.base.zh.trim(),
      defaultPromptZh: KEYWORD_MINING_PROMPTS.base.zh.trim(),
    },
    {
      id: 'mining-keyword-research',
      type: 'tool',
      name: 'Keyword Research Tool',
      description: 'DataForSEO API (primary) with SE-Ranking fallback - Gets keyword difficulty, volume, CPC, and competition data',
      configurable: false,
      isSystem: true,
    },
    {
      id: 'mining-serp',
      type: 'tool',
      name: 'SERP Search Tool',
      description: 'Fetches real Google search results for keywords',
      configurable: false,
    },
    {
      id: 'mining-analyze',
      type: 'agent',
      name: 'SERP Analysis Agent',
      description: 'Analyzes competition and estimates ranking probability',
      configurable: true,
      prompt: DEFAULT_ANALYZE_PROMPT_EN,
      defaultPrompt: DEFAULT_ANALYZE_PROMPT_EN,
      promptZh: DEFAULT_SERP_ANALYSIS.zh.trim(),
      defaultPromptZh: DEFAULT_SERP_ANALYSIS.zh.trim(),
    },
  ],
};

// === Batch Translation Workflow ===
// OPTIMIZED: Merged batch-intent into batch-analyze to reduce LLM calls
export const BATCH_WORKFLOW: WorkflowDefinition = {
  id: 'batch',
  name: 'Batch Translation Workflow',
  description: 'Translate keywords, research with SEO tools, search SERP, and analyze opportunities',
  nodes: [
    {
      id: 'batch-translate',
      type: 'agent',
      name: 'Translation Agent',
      description: 'Translates keywords to target market language',
      configurable: true,
      prompt: `You are a professional translator specializing in SEO keywords.
Translate the given keyword to the target language while preserving search intent.
Ensure the translation is natural and commonly used by native speakers.`,
      defaultPrompt: `You are a professional translator specializing in SEO keywords.
Translate the given keyword to the target language while preserving search intent.
Ensure the translation is natural and commonly used by native speakers.`,
      promptZh: `你是一位专业的SEO关键词翻译专家。
将给定的关键词翻译成目标语言，同时保留搜索意图。
确保翻译自然，并且是母语使用者常用的表达方式。`,
      defaultPromptZh: `你是一位专业的SEO关键词翻译专家。
将给定的关键词翻译成目标语言，同时保留搜索意图。
确保翻译自然，并且是母语使用者常用的表达方式。`,
    },
    {
      id: 'batch-keyword-research',
      type: 'tool',
      name: 'Keyword Research Tool',
      description: 'DataForSEO API (primary) with SE-Ranking fallback - Gets keyword difficulty, volume, CPC, and competition data',
      configurable: false,
      isSystem: true,
    },
    {
      id: 'batch-serp',
      type: 'tool',
      name: 'SERP Search Tool',
      description: 'Fetches real Google search results for translated keywords',
      configurable: false,
    },
    {
      id: 'batch-analyze',
      type: 'agent',
      name: 'Intent & Competition Analysis Agent',
      description: 'Analyzes search intent, SERP competition, and assigns ranking probability',
      configurable: true,
      prompt: DEFAULT_ANALYZE_PROMPT_EN,
      defaultPrompt: DEFAULT_ANALYZE_PROMPT_EN,
      promptZh: DEFAULT_SERP_ANALYSIS.zh.trim(),
      defaultPromptZh: DEFAULT_SERP_ANALYSIS.zh.trim(),
    },
  ],
};

// === Deep Dive Workflow ===
// OPTIMIZED: Merged deepdive-extract into deepdive-strategy (output includes core_keywords)
// OPTIMIZED: Merged deepdive-intent into single analysis step
export const DEEP_DIVE_WORKFLOW: WorkflowDefinition = {
  id: 'deepDive',
  name: 'Deep Dive Strategy Workflow',
  description: 'Generate content strategy with core keywords, research with SEO tools, verify SERP, analyze ranking',
  nodes: [
    {
      id: 'deepdive-strategy',
      type: 'agent',
      name: 'Content Strategy Agent',
      description: 'Creates SEO content strategy with embedded core keywords',
      configurable: true,

    },
    {
      id: 'deepdive-keyword-research',
      type: 'tool',
      name: 'Keyword Research Tool',
      description: 'DataForSEO API (primary) with SE-Ranking fallback - Gets keyword difficulty, volume, CPC, and competition data',
      configurable: false,
      isSystem: true,
    },
    {
      id: 'deepdive-serp',
      type: 'tool',
      name: 'SERP Verification Tool',
      description: 'Searches real SERP for each core keyword',
      configurable: false,
    },
    {
      id: 'deepdive-analyze',
      type: 'agent',
      name: 'SERP Analysis Agent',
      description: 'Analyzes SERP competition and estimates ranking probability',
      configurable: true,
      prompt: DEFAULT_ANALYZE_PROMPT_EN,
      defaultPrompt: DEFAULT_ANALYZE_PROMPT_EN,
      promptZh: DEFAULT_SERP_ANALYSIS.zh.trim(),
      defaultPromptZh: DEFAULT_SERP_ANALYSIS.zh.trim(),
    },
  ],
};


