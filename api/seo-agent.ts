import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executeKeywordMining } from './_shared/services/keyword-mining-service.js';
import { translateKeywordToTarget } from './_shared/gemini.js';
import {
  analyzeRankingProbability,
  generateDeepDiveStrategy,
  extractCoreKeywords
} from './_shared/agents/agent-2-seo-researcher.js';
import { fetchKeywordData } from './_shared/tools/dataforseo.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { KeywordData, IntentType, ProbabilityLevel } from './_shared/types.js';

// Main app URL for credits API
const MAIN_APP_URL = process.env.MAIN_APP_URL || process.env.VITE_MAIN_APP_URL || 'https://niche-mining-web.vercel.app';

// Import workflow config storage (shared with workflow-configs.ts)
// In production, this should be a database
declare const global: any;
if (!global.workflowConfigsStorage) {
  global.workflowConfigsStorage = new Map();
}
const configsStorage = global.workflowConfigsStorage;

/**
 * Map API modes to workflow IDs
 */
const MODE_TO_WORKFLOW_ID: Record<string, string> = {
  'keyword_mining': 'mining',
  'batch_translation': 'batch',
  'deep_dive': 'deepDive'
};

/**
 * Get workflow ID for a given mode
 */
function getWorkflowIdForMode(mode: string): string | null {
  return MODE_TO_WORKFLOW_ID[mode] || null;
}

/**
 * Get credits cost for a mode
 */
function getCreditsCost(mode: string, keywordCount?: number): number {
  const creditsMap: { [key: string]: number } = {
    'keyword_mining': 20,
    'batch_translation': 20,
    'deep_dive': 30,
    'article_generator': 100,
    'website_audit': 30,
  };

  const baseAmount = creditsMap[mode];
  if (!baseAmount) {
    throw new Error(`Invalid mode: ${mode}`);
  }

  // For fixed cost modes
  if (mode === 'deep_dive' || mode === 'article_generator') {
    return baseAmount;
  }

  // For modes based on keyword count (per 10 keywords)
  if (keywordCount && (mode === 'keyword_mining' || mode === 'batch_translation' || mode === 'website_audit')) {
    const multiplier = Math.ceil(keywordCount / 10);
    return baseAmount * multiplier;
  }

  return baseAmount;
}

/**
 * Check user credits balance
 */
async function checkCreditsBalance(token: string): Promise<{ remaining: number; total: number; used: number }> {
  const response = await fetch(`${MAIN_APP_URL}/api/user/dashboard`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch credits' }));
    throw new Error(error.error || 'Failed to fetch credits');
  }

  const data = await response.json();
  return {
    remaining: data.credits?.remaining || 0,
    total: data.credits?.total || 0,
    used: data.credits?.used || 0,
  };
}

/**
 * Consume credits
 */
async function consumeCredits(
  token: string,
  modeId: string,
  description: string,
  amount: number
): Promise<{ remaining: number; used: number }> {
  const response = await fetch(`${MAIN_APP_URL}/api/credits/consume`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credits: amount,
      description,
      relatedEntity: 'seo_agent_api',
      modeId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to consume credits' }));

    if (error.error === 'Insufficient credits') {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    throw new Error(error.error || 'Failed to consume credits');
  }

  const result = await response.json();
  return {
    remaining: result.remaining,
    used: result.used,
  };
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Unified SEO Agent API
 * 
 * Supports three modes:
 * 1. keyword_mining - Generate and analyze SEO keywords
 * 2. batch_translation - Translate and analyze keywords in batch
 * 3. deep_dive - Generate comprehensive SEO content strategy
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        message: 'Only POST method is supported'
      });
    }

    // Extract and validate token
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization token required. Please provide Bearer token in Authorization header.'
      });
    }

    const body = parseRequestBody(req);
    const { mode, skipCreditsCheck } = body;

    if (!mode) {
      return res.status(400).json({
        error: 'Missing required field: mode',
        message: 'Please specify mode: keyword_mining, batch_translation, or deep_dive',
        supportedModes: ['keyword_mining', 'batch_translation', 'deep_dive']
      });
    }

    // Check credits balance (unless explicitly skipped for testing)
    if (!skipCreditsCheck) {
      try {
        const credits = await checkCreditsBalance(token);
        const requiredCredits = getCreditsCost(mode, body.keywords?.split(',').length || body.seedKeyword ? 10 : undefined);

        if (credits.remaining < requiredCredits) {
          return res.status(402).json({
            error: 'Insufficient credits',
            message: `This operation requires ${requiredCredits} credits, but you only have ${credits.remaining} credits remaining`,
            required: requiredCredits,
            remaining: credits.remaining,
            rechargeUrl: `${MAIN_APP_URL}/console/pricing`
          });
        }
      } catch (creditsError: any) {
        console.error('Credits check error:', creditsError);
        // If credits check fails, continue but log warning
        // In production, you might want to fail here
      }
    }

    // Route to appropriate handler based on mode
    switch (mode) {
      case 'keyword_mining':
        return await handleKeywordMining(req, res, body);

      case 'batch_translation':
        return await handleBatchTranslation(req, res, body);

      case 'deep_dive':
        return await handleDeepDive(req, res, body);

      default:
        return res.status(400).json({
          error: 'Invalid mode',
          message: `Mode "${mode}" is not supported`,
          supportedModes: ['keyword_mining', 'batch_translation', 'deep_dive']
        });
    }
  } catch (error: any) {
    console.error('SEO Agent API error:', error);
    return sendErrorResponse(res, error, 'Failed to process SEO agent request');
  }
}

/**
 * Get prompt from workflow config or use default
 */
function getPromptFromConfig(
  workflowConfig: any,
  nodeId: string,
  defaultPrompt: string
): string {
  if (!workflowConfig || !workflowConfig.nodes) {
    return defaultPrompt;
  }

  const node = workflowConfig.nodes.find((n: any) => n.id === nodeId);
  return node?.prompt || node?.defaultPrompt || defaultPrompt;
}

/**
 * Load workflow config by ID
 */
function loadWorkflowConfig(configId: string): any {
  return configsStorage.get(configId) || null;
}

/**
 * Handle Keyword Mining Mode
 * Generates SEO keywords based on seed keyword and analyzes ranking probability
 */
async function handleKeywordMining(
  req: VercelRequest,
  res: VercelResponse,
  body: any
) {
  const token = extractToken(req);
  const {
    seedKeyword,
    targetLanguage = 'en',
    systemInstruction,
    workflowConfigId,
    workflowConfig,
    existingKeywords = [],
    roundIndex = 1,
    wordsPerRound = 10,
    miningStrategy = 'horizontal',
    userSuggestion = '',
    uiLanguage = 'en',
    // Optional: analyze ranking probability
    analyzeRanking = true,
    skipCreditsCheck = false,
    industry,
    additionalSuggestions
  } = body;

  // Validate required fields
  if (!seedKeyword) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'seedKeyword is required for keyword_mining mode',
      requiredFields: ['seedKeyword'],
      optionalFields: [
        'systemInstruction',
        'workflowConfigId',
        'workflowConfig',
        'targetLanguage',
        'existingKeywords',
        'roundIndex',
        'wordsPerRound',
        'miningStrategy',
        'userSuggestion',
        'uiLanguage',
        'analyzeRanking'
      ]
    });
  }

  // Get expected workflow ID for this mode
  const expectedWorkflowId = getWorkflowIdForMode('keyword_mining');

  // Load workflow config if provided
  let activeConfig: any = null;
  if (workflowConfigId) {
    activeConfig = loadWorkflowConfig(workflowConfigId);
    if (!activeConfig) {
      return res.status(404).json({
        error: 'Workflow config not found',
        message: `Workflow configuration with ID "${workflowConfigId}" not found`
      });
    }
    if (activeConfig.workflowId !== expectedWorkflowId) {
      return res.status(400).json({
        error: 'Invalid workflow config',
        message: `Workflow config is for "${activeConfig.workflowId}" workflow, but keyword_mining mode requires "${expectedWorkflowId}" workflow`,
        expectedWorkflowId,
        providedWorkflowId: activeConfig.workflowId,
        mode: 'keyword_mining'
      });
    }
  } else if (workflowConfig) {
    if (workflowConfig.workflowId && workflowConfig.workflowId !== expectedWorkflowId) {
      return res.status(400).json({
        error: 'Invalid workflow config',
        message: `Workflow config is for "${workflowConfig.workflowId}" workflow, but keyword_mining mode requires "${expectedWorkflowId}" workflow`,
        expectedWorkflowId,
        providedWorkflowId: workflowConfig.workflowId,
        mode: 'keyword_mining'
      });
    }
    activeConfig = workflowConfig;
  }

  // Get system instructions from config or use provided/default
  const genPrompt = activeConfig
    ? getPromptFromConfig(activeConfig, 'mining-gen', systemInstruction || 'Generate high-potential SEO keywords.')
    : systemInstruction || 'Generate high-potential SEO keywords.';

  const analyzePrompt = activeConfig
    ? getPromptFromConfig(activeConfig, 'mining-analyze', systemInstruction || 'Analyze SEO ranking opportunities.')
    : systemInstruction || 'Analyze SEO ranking opportunities.';

  try {
    // Execute Keyword Mining using Service
    const result = await executeKeywordMining({
      seedKeyword,
      targetLanguage,
      systemInstruction: genPrompt,
      existingKeywords,
      roundIndex,
      wordsPerRound,
      miningStrategy,
      userSuggestion,
      uiLanguage,
      industry,
      additionalSuggestions,
      analyzeRanking,
      analyzePrompt
    });

    const analyzedKeywords = result.keywords;

    // Consume credits after successful operation
    if (!body.skipCreditsCheck && token) {
      try {
        const keywordCount = analyzedKeywords.length;
        const creditsAmount = getCreditsCost('keyword_mining', keywordCount);
        await consumeCredits(
          token,
          'keyword_mining',
          `Keyword Mining - "${seedKeyword}" (${keywordCount} keywords, ${targetLanguage.toUpperCase()})`,
          creditsAmount
        );
      } catch (creditsError: any) {
        console.error('Failed to consume credits:', creditsError);
        // Return success but include warning in response
        return res.json({
          success: true,
          mode: 'keyword_mining',
          warning: 'Operation completed but credits consumption failed',
          creditsError: creditsError.message,
          data: {
            keywords: analyzedKeywords,
            count: analyzedKeywords.length,
            seedKeyword,
            targetLanguage,
            roundIndex
          }
        });
      }
    }

    return res.json({
      success: true,
      mode: 'keyword_mining',
      data: {
        keywords: analyzedKeywords,
        count: analyzedKeywords.length,
        seedKeyword,
        targetLanguage,
        roundIndex
      }
    });
  } catch (error: any) {
    console.error('Keyword mining error:', error);
    return sendErrorResponse(res, error, 'Failed to generate keywords');
  }
}

/**
 * Handle Batch Translation Mode
 * Translates keywords to target language and analyzes ranking probability
 */
async function handleBatchTranslation(
  req: VercelRequest,
  res: VercelResponse,
  body: any
) {
  const token = extractToken(req);
  const {
    keywords,
    targetLanguage = 'en',
    systemInstruction,
    workflowConfigId,
    workflowConfig,
    uiLanguage = 'en',
    skipCreditsCheck = false
  } = body;

  // Validate required fields
  if (!keywords) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'keywords is required for batch_translation mode',
      requiredFields: ['keywords'],
      optionalFields: ['systemInstruction', 'workflowConfigId', 'workflowConfig', 'targetLanguage', 'uiLanguage'],
      example: {
        keywords: 'coffee shop, espresso machine, latte art',
        systemInstruction: 'Analyze SEO opportunities...',
        targetLanguage: 'ko',
        uiLanguage: 'zh'
      }
    });
  }

  // Get expected workflow ID for this mode
  const expectedWorkflowId = getWorkflowIdForMode('batch_translation');

  // Load workflow config if provided
  let activeConfig: any = null;
  if (workflowConfigId) {
    activeConfig = loadWorkflowConfig(workflowConfigId);
    if (!activeConfig) {
      return res.status(404).json({
        error: 'Workflow config not found',
        message: `Workflow configuration with ID "${workflowConfigId}" not found`
      });
    }
    if (activeConfig.workflowId !== expectedWorkflowId) {
      return res.status(400).json({
        error: 'Invalid workflow config',
        message: `Workflow config is for "${activeConfig.workflowId}" workflow, but batch_translation mode requires "${expectedWorkflowId}" workflow`,
        expectedWorkflowId,
        providedWorkflowId: activeConfig.workflowId,
        mode: 'batch_translation'
      });
    }
  } else if (workflowConfig) {
    if (workflowConfig.workflowId && workflowConfig.workflowId !== expectedWorkflowId) {
      return res.status(400).json({
        error: 'Invalid workflow config',
        message: `Workflow config is for "${workflowConfig.workflowId}" workflow, but batch_translation mode requires "${expectedWorkflowId}" workflow`,
        expectedWorkflowId,
        providedWorkflowId: workflowConfig.workflowId,
        mode: 'batch_translation'
      });
    }
    activeConfig = workflowConfig;
  }

  // Get system instructions from config or use provided/default
  const analyzePrompt = activeConfig
    ? getPromptFromConfig(activeConfig, 'batch-analyze', systemInstruction || 'Analyze SEO ranking opportunities.')
    : systemInstruction || 'Analyze SEO ranking opportunities.';

  // Parse keywords if it's a string
  const keywordList = typeof keywords === 'string'
    ? keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
    : Array.isArray(keywords)
      ? keywords.filter((k: any) => k && k.trim && k.trim().length > 0)
      : [];

  if (keywordList.length === 0) {
    return res.status(400).json({
      error: 'Invalid keywords format',
      message: 'keywords must be a comma-separated string or an array of strings'
    });
  }

  try {
    // Step 1: Translate all keywords
    const TRANSLATION_BATCH_SIZE = 5;
    const translatedResults: Array<{ original: string; translated: string; translationBack: string }> = [];

    for (let i = 0; i < keywordList.length; i += TRANSLATION_BATCH_SIZE) {
      const batch = keywordList.slice(i, i + TRANSLATION_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((keyword: string) => translateKeywordToTarget(keyword, targetLanguage))
      );
      translatedResults.push(...batchResults);
      if (i + TRANSLATION_BATCH_SIZE < keywordList.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Step 2: Convert to KeywordData format
    const keywordsForAnalysis: KeywordData[] = translatedResults.map((result, index) => ({
      id: `bt-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      keyword: result.translated,
      translation: result.original,
      intent: IntentType.INFORMATIONAL,
      volume: 0,
    }));

    // Step 3: Fetch SE Ranking data
    let serankingDataMap = new Map<string, any>();
    const keywordsToAnalyze: KeywordData[] = [];
    const skippedKeywords: KeywordData[] = [];

    try {
      const translatedKeywordsList = keywordsForAnalysis.map(k => k.keyword);
      const dataForSEOResults = await fetchKeywordData(translatedKeywordsList, 2840, 'en'); // US location

      dataForSEOResults.forEach(data => {
        if (data.keyword) {
          serankingDataMap.set(data.keyword.toLowerCase(), data);
        }
      });

      for (const keyword of keywordsForAnalysis) {
        const serankingData = serankingDataMap.get(keyword.keyword.toLowerCase());

        if (serankingData) {
          keyword.serankingData = {
            is_data_found: serankingData.is_data_found,
            volume: serankingData.volume,
            cpc: serankingData.cpc,
            competition: serankingData.competition,
            difficulty: serankingData.difficulty,
            history_trend: serankingData.history_trend,
          };

          if (serankingData.volume) {
            keyword.volume = serankingData.volume;
          }

          if (serankingData.difficulty && serankingData.difficulty > 40) {
            keyword.probability = ProbabilityLevel.LOW;
            keyword.reasoning = `Keyword Difficulty (${serankingData.difficulty}) is too high (>40).`;
            skippedKeywords.push(keyword);
            continue;
          }
        }
        keywordsToAnalyze.push(keyword);
      }
    } catch (serankingError) {
      console.warn('[SE Ranking] API call failed, proceeding with all keywords');
      keywordsToAnalyze.push(...keywordsForAnalysis);
    }

    // Step 4: Analyze ranking probability
    let analyzedKeywords: KeywordData[] = [];
    if (keywordsToAnalyze.length > 0) {
      analyzedKeywords = await analyzeRankingProbability(
        keywordsToAnalyze,
        analyzePrompt,
        uiLanguage,
        targetLanguage
      );
    }

    const allKeywords = [...analyzedKeywords, ...skippedKeywords];

    // Consume credits after successful operation
    if (!body.skipCreditsCheck && token) {
      try {
        const keywordCount = allKeywords.length;
        const creditsAmount = getCreditsCost('batch_translation', keywordCount);
        await consumeCredits(
          token,
          'batch_translation',
          `Batch Translation - ${keywordCount} keywords (${targetLanguage.toUpperCase()})`,
          creditsAmount
        );
      } catch (creditsError: any) {
        console.error('Failed to consume credits:', creditsError);
        // Return success but include warning in response
        return res.json({
          success: true,
          mode: 'batch_translation',
          warning: 'Operation completed but credits consumption failed',
          creditsError: creditsError.message,
          data: {
            keywords: allKeywords,
            translationResults: translatedResults,
            total: allKeywords.length,
            targetLanguage
          }
        });
      }
    }

    return res.json({
      success: true,
      mode: 'batch_translation',
      data: {
        keywords: allKeywords,
        translationResults: translatedResults,
        total: allKeywords.length,
        targetLanguage
      }
    });
  } catch (error: any) {
    console.error('Batch translation error:', error);
    return sendErrorResponse(res, error, 'Failed to translate and analyze keywords');
  }
}

/**
 * Handle Deep Dive Mode
 * Generates comprehensive SEO content strategy for a keyword
 */
async function handleDeepDive(
  req: VercelRequest,
  res: VercelResponse,
  body: any
) {
  const token = extractToken(req);
  const {
    keyword,
    targetLanguage = 'en',
    uiLanguage = 'en',
    strategyPrompt,
    workflowConfigId,
    workflowConfig,
    skipCreditsCheck = false
  } = body;

  // Validate required fields
  if (!keyword) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'keyword is required for deep_dive mode',
      requiredFields: ['keyword'],
      optionalFields: ['targetLanguage', 'uiLanguage', 'strategyPrompt', 'workflowConfigId', 'workflowConfig'],
      example: {
        keyword: {
          id: 'kw-123',
          keyword: 'coffee shop',
          translation: '咖啡店',
          intent: 'Commercial',
          volume: 1000
        },
        targetLanguage: 'ko',
        uiLanguage: 'zh'
      }
    });
  }

  // Get expected workflow ID for this mode
  const expectedWorkflowId = getWorkflowIdForMode('deep_dive');

  // Load workflow config if provided
  let activeConfig: any = null;
  if (workflowConfigId) {
    activeConfig = loadWorkflowConfig(workflowConfigId);
    if (!activeConfig) {
      return res.status(404).json({
        error: 'Workflow config not found',
        message: `Workflow configuration with ID "${workflowConfigId}" not found`
      });
    }
    if (activeConfig.workflowId !== expectedWorkflowId) {
      return res.status(400).json({
        error: 'Invalid workflow config',
        message: `Workflow config is for "${activeConfig.workflowId}" workflow, but deep_dive mode requires "${expectedWorkflowId}" workflow`,
        expectedWorkflowId,
        providedWorkflowId: activeConfig.workflowId,
        mode: 'deep_dive'
      });
    }
  } else if (workflowConfig) {
    if (workflowConfig.workflowId && workflowConfig.workflowId !== expectedWorkflowId) {
      return res.status(400).json({
        error: 'Invalid workflow config',
        message: `Workflow config is for "${workflowConfig.workflowId}" workflow, but deep_dive mode requires "${expectedWorkflowId}" workflow`,
        expectedWorkflowId,
        providedWorkflowId: workflowConfig.workflowId,
        mode: 'deep_dive'
      });
    }
    activeConfig = workflowConfig;
  }

  // Get strategy prompt from config or use provided/default
  const finalStrategyPrompt = activeConfig
    ? getPromptFromConfig(activeConfig, 'deepdive-strategy', strategyPrompt || 'Generate comprehensive SEO content strategy.')
    : strategyPrompt || 'Generate comprehensive SEO content strategy.';

  // Convert keyword to KeywordData format if it's a string
  let keywordData: KeywordData;
  if (typeof keyword === 'string') {
    keywordData = {
      id: `kw-${Date.now()}`,
      keyword: keyword,
      translation: keyword,
      intent: IntentType.INFORMATIONAL,
      volume: 0
    };
  } else {
    keywordData = keyword as KeywordData;
  }

  try {
    // Step 1: Generate strategy report
    const report = await generateDeepDiveStrategy(
      keywordData,
      uiLanguage,
      targetLanguage,
      finalStrategyPrompt
    );

    // Step 2: Extract core keywords
    const coreKeywords = await extractCoreKeywords(report, targetLanguage, uiLanguage);

    // Step 3: Fetch DataForSEO data for core keywords
    let serankingDataMap = new Map();
    try {
      const { locationCode, languageCode } = await import('./_shared/tools/dataforseo.js').then(m => m.getDataForSEOLocationAndLanguage(targetLanguage));
      const dataForSEOResults = await fetchKeywordData(coreKeywords, locationCode, languageCode);
      dataForSEOResults.forEach(data => {
        if (data.keyword) {
          serankingDataMap.set(data.keyword.toLowerCase(), data);
        }
      });
    } catch (dataForSEOError) {
      console.warn('[DataForSEO] API call failed for deep dive');
    }

    // Step 4: Analyze core keywords with SERP
    const coreKeywordsData: KeywordData[] = coreKeywords.map((kw, idx) => ({
      id: `cd-${Date.now()}-${idx}`,
      keyword: kw,
      translation: kw,
      intent: IntentType.INFORMATIONAL,
      volume: 0,
      serankingData: serankingDataMap.get(kw.toLowerCase())
    }));

    // Analyze ranking probability for core keywords
    let analyzedCoreKeywords: KeywordData[] = [];
    if (coreKeywordsData.length > 0) {
      try {
        analyzedCoreKeywords = await analyzeRankingProbability(
          coreKeywordsData,
          'Analyze SEO ranking opportunities for these keywords.',
          uiLanguage,
          targetLanguage
        );
      } catch (analysisError) {
        console.warn('Core keywords analysis failed:', analysisError);
        analyzedCoreKeywords = coreKeywordsData;
      }
    }

    // Consume credits after successful operation
    if (!body.skipCreditsCheck && token) {
      try {
        const creditsAmount = getCreditsCost('deep_dive');
        const keywordText = typeof keyword === 'string' ? keyword : keyword.keyword;
        await consumeCredits(
          token,
          'deep_mining',
          `Deep Dive Strategy - "${keywordText}" (${targetLanguage.toUpperCase()})`,
          creditsAmount
        );
      } catch (creditsError: any) {
        console.error('Failed to consume credits:', creditsError);
        // Return success but include warning in response
        return res.json({
          success: true,
          mode: 'deep_dive',
          warning: 'Operation completed but credits consumption failed',
          creditsError: creditsError.message,
          data: {
            report,
            coreKeywords: analyzedCoreKeywords,
            keyword: keywordData.keyword,
            targetLanguage
          }
        });
      }
    }

    return res.json({
      success: true,
      mode: 'deep_dive',
      data: {
        report,
        coreKeywords: analyzedCoreKeywords,
        keyword: keywordData.keyword,
        targetLanguage
      }
    });
  } catch (error: any) {
    console.error('Deep dive error:', error);
    return sendErrorResponse(res, error, 'Failed to generate deep dive strategy');
  }
}

