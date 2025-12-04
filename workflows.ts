// Workflow Definitions
import { WorkflowDefinition, WorkflowConfig } from "./types";
import { DEFAULT_GEN_PROMPT_EN, DEFAULT_ANALYZE_PROMPT_EN, DEFAULT_DEEP_DIVE_PROMPT_EN } from "./services/gemini";

// === Mining Workflow ===
export const MINING_WORKFLOW: WorkflowDefinition = {
  id: 'mining',
  name: 'Keyword Mining Workflow',
  description: 'Generate keywords, search SERP, and analyze ranking probability',
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
export const BATCH_WORKFLOW: WorkflowDefinition = {
  id: 'batch',
  name: 'Batch Translation Workflow',
  description: 'Translate keywords, search SERP, and analyze opportunities',
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
      id: 'batch-serp',
      type: 'tool',
      name: 'SERP Search Tool',
      description: 'Fetches real Google search results for translated keywords',
      configurable: false,
    },
    {
      id: 'batch-intent',
      type: 'agent',
      name: 'Intent Analysis Agent',
      description: 'Predicts user search intent and analyzes SERP match',
      configurable: true,
      prompt: `You are a Search Intent Analysis expert.
Analyze what users are looking for when they search this keyword.
Evaluate whether the SERP results match the predicted intent.`,
      defaultPrompt: `You are a Search Intent Analysis expert.
Analyze what users are looking for when they search this keyword.
Evaluate whether the SERP results match the predicted intent.`,
    },
    {
      id: 'batch-analyze',
      type: 'agent',
      name: 'Competition Analysis Agent',
      description: 'Analyzes SERP competition and assigns probability',
      configurable: true,
      prompt: DEFAULT_ANALYZE_PROMPT_EN,
      defaultPrompt: DEFAULT_ANALYZE_PROMPT_EN,
    },
  ],
};

// === Deep Dive Workflow ===
export const DEEP_DIVE_WORKFLOW: WorkflowDefinition = {
  id: 'deepDive',
  name: 'Deep Dive Strategy Workflow',
  description: 'Generate content strategy, extract core keywords, verify SERP, analyze ranking probability',
  nodes: [
    {
      id: 'deepdive-strategy',
      type: 'agent',
      name: 'Content Strategy Agent',
      description: 'Creates comprehensive SEO content strategy',
      configurable: true,
      prompt: DEFAULT_DEEP_DIVE_PROMPT_EN,
      defaultPrompt: DEFAULT_DEEP_DIVE_PROMPT_EN,
    },
    {
      id: 'deepdive-extract',
      type: 'agent',
      name: 'Core Keyword Extractor',
      description: 'Extracts 5-8 core keywords from content strategy',
      configurable: true,
      prompt: `You are an SEO keyword extraction specialist.
Extract the 5-8 most important keywords from the given content strategy.
Focus on keywords that are critical for ranking and content optimization.
Return ONLY a JSON array of keywords.`,
      defaultPrompt: `You are an SEO keyword extraction specialist.
Extract the 5-8 most important keywords from the given content strategy.
Focus on keywords that are critical for ranking and content optimization.
Return ONLY a JSON array of keywords.`,
    },
    {
      id: 'deepdive-serp',
      type: 'tool',
      name: 'SERP Verification Tool',
      description: 'Searches real SERP for each core keyword',
      configurable: false,
    },
    {
      id: 'deepdive-intent',
      type: 'agent',
      name: 'Intent & Probability Agent',
      description: 'Analyzes search intent, content match, and ranking probability',
      configurable: true,
      prompt: `You are a comprehensive SEO analysis expert.
Analyze:
1. User search intent for the keyword
2. Whether the proposed content matches this intent
3. Overall probability of ranking on page 1 based on SERP competition

Provide detailed reasoning for each aspect.`,
      defaultPrompt: `You are a comprehensive SEO analysis expert.
Analyze:
1. User search intent for the keyword
2. Whether the proposed content matches this intent
3. Overall probability of ranking on page 1 based on SERP competition

Provide detailed reasoning for each aspect.`,
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
