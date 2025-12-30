import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/request-handler.js';
import { MINING_WORKFLOW, BATCH_WORKFLOW, DEEP_DIVE_WORKFLOW } from '../workflows.js';

/**
 * Workflow Definitions API
 * 
 * Returns the structure and definition of available workflows
 * GET /api/workflows
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method not allowed',
        message: 'Only GET method is supported'
      });
    }

    const { id } = req.query;

    // If specific workflow ID requested
    if (id) {
      const workflowId = id as string;
      let workflow;

      switch (workflowId) {
        case 'mining':
          workflow = MINING_WORKFLOW;
          break;
        case 'batch':
          workflow = BATCH_WORKFLOW;
          break;
        case 'deepDive':
          workflow = DEEP_DIVE_WORKFLOW;
          break;
        default:
          return res.status(404).json({
            error: 'Workflow not found',
            message: `Workflow with ID "${workflowId}" not found`,
            availableWorkflows: ['mining', 'batch', 'deepDive']
          });
      }

      return res.json({
        success: true,
        data: workflow
      });
    }

    // Return all workflows
    return res.json({
      success: true,
      data: {
        workflows: [
          {
            id: MINING_WORKFLOW.id,
            name: MINING_WORKFLOW.name,
            description: MINING_WORKFLOW.description,
            nodes: MINING_WORKFLOW.nodes.map(node => ({
              id: node.id,
              type: node.type,
              name: node.name,
              description: node.description,
              configurable: node.configurable,
              defaultPrompt: node.defaultPrompt
            }))
          },
          {
            id: BATCH_WORKFLOW.id,
            name: BATCH_WORKFLOW.name,
            description: BATCH_WORKFLOW.description,
            nodes: BATCH_WORKFLOW.nodes.map(node => ({
              id: node.id,
              type: node.type,
              name: node.name,
              description: node.description,
              configurable: node.configurable,
              defaultPrompt: node.defaultPrompt
            }))
          },
          {
            id: DEEP_DIVE_WORKFLOW.id,
            name: DEEP_DIVE_WORKFLOW.name,
            description: DEEP_DIVE_WORKFLOW.description,
            nodes: DEEP_DIVE_WORKFLOW.nodes.map(node => ({
              id: node.id,
              type: node.type,
              name: node.name,
              description: node.description,
              configurable: node.configurable,
              defaultPrompt: node.defaultPrompt
            }))
          }
        ]
      }
    });
  } catch (error: any) {
    console.error('Workflows API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

