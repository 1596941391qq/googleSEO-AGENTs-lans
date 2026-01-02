import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/request-handler.js';
import {
  getMockKeywords,
  getMockSerpResults,
  getMockSERankingData,
  getMockSEOStrategyReport
} from './_shared/test-data/mock-data.js';

/**
 * Test Agents API (Development Only)
 * Allows testing agent logic with mock data without consuming credits or API calls
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // Security Check: Only allow in development or preview, or with a specific header/secret
  // For safety, we can strictly check NODE_ENV
  const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';

  // NOTE: ENABLE_TEST_MODE env var can be used to force enable it if needed
  if (!isDev && process.env.ENABLE_TEST_MODE !== 'true') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Test agents are only available in development environment'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, input } = req.body;

  try {
    let result;

    switch (mode) {
      case 'agent-1': // Keyword Mining
        result = getMockKeywords(input?.seedKeyword || 'test keyword');
        break;

      case 'agent-2': // SEO Researcher (SERP + Competitors)
        result = {
          serp: getMockSerpResults(input?.keyword || 'test keyword'),
          analysis: "Mock competitor analysis: Competitors focus on comprehensive guides. Gap: Missing video content."
        };
        break;

      case 'agent-3': // Content Writer
        result = {
          content: `# Mock Content for ${input?.keyword || 'test keyword'}\n\nThis is a generated mock article content...`,
          structure: input?.structure || []
        };
        break;

      case 'deep-dive': // Deep Dive Strategy
        result = getMockSEOStrategyReport(input?.keyword || 'test keyword');
        break;

      case 'se-ranking': // SE Ranking Tool
        result = getMockSERankingData(input?.keywords || ['test keyword 1', 'test keyword 2']);
        break;

      default:
        return res.status(400).json({ error: 'Invalid mode', modes: ['agent-1', 'agent-2', 'agent-3', 'deep-dive', 'se-ranking'] });
    }

    return res.json({
      success: true,
      mode,
      isMock: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
