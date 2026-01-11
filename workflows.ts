// Workflow Definitions
import { WorkflowDefinition, WorkflowConfig } from "./types";
import { DEFAULT_GEN_PROMPT_EN, DEFAULT_ANALYZE_PROMPT_EN } from "./services/gemini";

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
    },
    {
      id: 'mining-seranking',
      type: 'tool',
      name: 'SEO词研究工具',
      description: 'SE Ranking API - Gets keyword difficulty, volume, CPC, and competition data',
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
    },
    {
      id: 'batch-seranking',
      type: 'tool',
      name: 'SEO词研究工具',
      description: 'SE Ranking API - Gets keyword difficulty, volume, CPC, and competition data',
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
      id: 'deepdive-seranking',
      type: 'tool',
      name: 'SEO词研究工具',
      description: 'SE Ranking API - Gets keyword difficulty, volume, CPC, and competition data',
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
    },
  ],
};

// Export all workflows
export const ALL_WORKFLOWS = [MINING_WORKFLOW, BATCH_WORKFLOW, DEEP_DIVE_WORKFLOW];

// Helper function to get workflow by ID
export function getWorkflowById(id: string): WorkflowDefinition | undefined {
  return ALL_WORKFLOWS.find(w => w.id === id);
}

// Helper function to create default config from workflow
export function createDefaultConfig(workflow: WorkflowDefinition, name: string): WorkflowConfig {
  return {
    id: `${workflow.id}-${Date.now()}`,
    workflowId: workflow.id,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: JSON.parse(JSON.stringify(workflow.nodes)), // Deep clone
  };
}
