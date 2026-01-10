import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { WorkflowConfig } from '../types.js';
import { authenticateRequest } from './_shared/auth.js';
import {
  createWorkflowConfig,
  getUserWorkflowConfigs,
  getWorkflowConfigById,
  updateWorkflowConfig,
  deleteWorkflowConfig,
} from './lib/database.js';
/**
 * Workflow Configuration Management API
 * 
 * Supports CRUD operations for workflow configurations
 * - POST: Create a new workflow configuration
 * - GET: List all configurations or get a specific one
 * - PUT: Update a workflow configuration
 * - DELETE: Delete a workflow configuration
 * 
 * All operations require authentication and are user-scoped.
 */

/**
 * Get authenticated user ID from request
 * Returns userId or null, and error type if authentication failed
 */

/**
 * Workflow Configuration Management API
 * 
 * Supports CRUD operations for workflow configurations
 * - POST: Create a new workflow configuration
 * - GET: List all configurations or get a specific one
 * - PUT: Update a workflow configuration
 * - DELETE: Delete a workflow configuration
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('[workflow-configs] Request received:', {
      method: req.method,
      url: req.url,
      hasAuthHeader: !!(req.headers.authorization || req.headers.Authorization),
      allHeaders: Object.keys(req.headers),
    });

    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    // 认证检查（支持 JWT token 和 API key）
    console.log('[workflow-configs] Starting authentication...');
    const authResult = await authenticateRequest(req);
    console.log('[workflow-configs] Authentication result:', authResult ? {
      userId: authResult.userId,
      authType: authResult.authType,
    } : 'null');

    if (!authResult) {
      console.error('[workflow-configs] Authentication failed');

      // 检查是否是 token 过期
      const authHeader = req.headers.authorization || req.headers.Authorization;
      const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
        const tokenValue = token.substring(7);
        // 尝试解析 token 看是否过期（不验证签名，只看 exp）
        try {
          const parts = tokenValue.split('.');
          if (parts.length === 3) {
            // 在 Node.js/Vercel 环境中，Buffer 总是可用的
            const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
            const payload = JSON.parse(payloadStr);
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
              return res.status(401).json({
                error: 'Unauthorized',
                errorType: 'expired',
                message: 'Token expired. Please refresh your session or re-login.',
              });
            }
          }
        } catch (e) {
          // 无法解析，继续返回通用错误
          console.error('[workflow-configs] Failed to parse token for expiry check:', e);
        }
      }

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization required. Please provide Bearer token (JWT) or API key (nm_live_...) in Authorization header.',
      });
    }

    const userId = authResult.userId;
    const { method } = req;
    const urlPath = req.url?.split('?')[0] || '';
    const configId = urlPath.split('/').pop();

    switch (method) {
      case 'POST':
        return await createConfig(req, res, userId);

      case 'GET':
        if (configId && configId !== 'workflow-configs') {
          return await getConfig(req, res, configId, userId);
        }
        return await listConfigs(req, res, userId);

      case 'PUT':
        if (configId && configId !== 'workflow-configs') {
          return await updateConfig(req, res, configId, userId);
        }
        return res.status(400).json({ error: 'Config ID required for update' });

      case 'DELETE':
        if (configId && configId !== 'workflow-configs') {
          return await deleteConfig(req, res, configId, userId);
        }
        return res.status(400).json({ error: 'Config ID required for delete' });

      default:
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Method ${method} is not supported`
        });
    }
  } catch (error: any) {
    console.error('[workflow-configs] API error:', error);
    console.error('[workflow-configs] Error stack:', error?.stack);
    console.error('[workflow-configs] Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
    });
    return sendErrorResponse(res, error, 'Failed to process workflow config request');
  }
}

/**
 * Create a new workflow configuration
 * POST /api/workflow-configs
 */
async function createConfig(req: VercelRequest, res: VercelResponse, userId: string) {
  const body = parseRequestBody(req);
  const { workflowId, name, nodes } = body;

  // Validate required fields
  if (!workflowId || !name || !nodes) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'workflowId, name, and nodes are required',
      requiredFields: ['workflowId', 'name', 'nodes'],
      example: {
        workflowId: 'mining',
        name: 'My Custom Mining Config',
        nodes: [
          {
            id: 'mining-gen',
            type: 'agent',
            name: 'Keyword Generation Agent',
            prompt: 'Your custom prompt here...'
          }
        ]
      }
    });
  }

  // Validate workflowId
  const validWorkflowIds = ['mining', 'batch', 'deepDive'];
  if (!validWorkflowIds.includes(workflowId)) {
    return res.status(400).json({
      error: 'Invalid workflowId',
      message: `workflowId must be one of: ${validWorkflowIds.join(', ')}`,
      validWorkflowIds
    });
  }

  // Validate nodes structure
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return res.status(400).json({
      error: 'Invalid nodes',
      message: 'nodes must be a non-empty array'
    });
  }

  try {
    // Prepare nodes with required fields
    const preparedNodes = nodes.map((node: any) => ({
      ...node,
      id: node.id || `node-${Date.now()}`,
      type: node.type || 'agent',
      name: node.name || 'Unnamed Node',
      prompt: node.prompt || node.defaultPrompt || '',
      defaultPrompt: node.defaultPrompt || node.prompt || ''
    }));

    // Create config in database
    const dbConfig = await createWorkflowConfig(userId, workflowId, name, preparedNodes);

    // Convert to API response format
    const config: WorkflowConfig = {
      id: dbConfig.id,
      workflowId: dbConfig.workflow_id,
      name: dbConfig.name,
      createdAt: dbConfig.created_at.getTime(),
      updatedAt: dbConfig.updated_at.getTime(),
      nodes: dbConfig.nodes
    };

    return res.status(201).json({
      success: true,
      data: config
    });
  } catch (error: any) {
    console.error('Error creating workflow config:', error);
    // 如果是无效的 UUID 格式，返回更友好的错误信息
    if (error?.code === 'INVALID_USER_ID' || error?.code === '22P02') {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'The user ID in your session token is not in the correct format. Please refresh your session or re-login to get a valid token.',
        errorCode: 'INVALID_USER_ID'
      });
    }
    return sendErrorResponse(res, error, 'Failed to create workflow config');
  }
}

/**
 * List all workflow configurations
 * GET /api/workflow-configs
 */
async function listConfigs(req: VercelRequest, res: VercelResponse, userId: string) {
  const { workflowId } = req.query;

  try {
    const dbConfigs = await getUserWorkflowConfigs(
      userId,
      workflowId && typeof workflowId === 'string' ? workflowId : undefined
    );

    // Convert to API response format
    const configs: WorkflowConfig[] = dbConfigs.map((dbConfig) => ({
      id: dbConfig.id,
      workflowId: dbConfig.workflow_id,
      name: dbConfig.name,
      createdAt: dbConfig.created_at.getTime(),
      updatedAt: dbConfig.updated_at.getTime(),
      nodes: dbConfig.nodes
    }));

    return res.json({
      success: true,
      data: configs,
      count: configs.length
    });
  } catch (error: any) {
    console.error('Error listing workflow configs:', error);
    return sendErrorResponse(res, error, 'Failed to list workflow configs');
  }
}

/**
 * Get a specific workflow configuration
 * GET /api/workflow-configs/:id
 */
async function getConfig(req: VercelRequest, res: VercelResponse, configId: string, userId: string) {
  try {
    const dbConfig = await getWorkflowConfigById(configId, userId);

    if (!dbConfig) {
      return res.status(404).json({
        error: 'Config not found',
        message: `Workflow configuration with ID "${configId}" not found`
      });
    }

    // Convert to API response format
    const config: WorkflowConfig = {
      id: dbConfig.id,
      workflowId: dbConfig.workflow_id,
      name: dbConfig.name,
      createdAt: dbConfig.created_at.getTime(),
      updatedAt: dbConfig.updated_at.getTime(),
      nodes: dbConfig.nodes
    };

    return res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    console.error('Error getting workflow config:', error);
    return sendErrorResponse(res, error, 'Failed to get workflow config');
  }
}

/**
 * Update a workflow configuration
 * PUT /api/workflow-configs/:id
 */
async function updateConfig(req: VercelRequest, res: VercelResponse, configId: string, userId: string) {
  const body = parseRequestBody(req);
  const { name, nodes } = body;

  try {
    // Prepare updates
    const updates: { name?: string; nodes?: any[] } = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (nodes !== undefined) {
      if (!Array.isArray(nodes)) {
        return res.status(400).json({
          error: 'Invalid nodes',
          message: 'nodes must be an array'
        });
      }
      updates.nodes = nodes.map((node: any) => ({
        ...node,
        id: node.id || `node-${Date.now()}`,
        type: node.type || 'agent',
        name: node.name || 'Unnamed Node',
        prompt: node.prompt || node.defaultPrompt || '',
        defaultPrompt: node.defaultPrompt || node.prompt || ''
      }));
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'Please provide name or nodes to update'
      });
    }

    // Update config in database
    const dbConfig = await updateWorkflowConfig(configId, userId, updates);

    if (!dbConfig) {
      return res.status(404).json({
        error: 'Config not found',
        message: `Workflow configuration with ID "${configId}" not found`
      });
    }

    // Convert to API response format
    const updatedConfig: WorkflowConfig = {
      id: dbConfig.id,
      workflowId: dbConfig.workflow_id,
      name: dbConfig.name,
      createdAt: dbConfig.created_at.getTime(),
      updatedAt: dbConfig.updated_at.getTime(),
      nodes: dbConfig.nodes
    };

    return res.json({
      success: true,
      data: updatedConfig
    });
  } catch (error: any) {
    console.error('Error updating workflow config:', error);
    return sendErrorResponse(res, error, 'Failed to update workflow config');
  }
}

/**
 * Delete a workflow configuration
 * DELETE /api/workflow-configs/:id
 */
async function deleteConfig(req: VercelRequest, res: VercelResponse, configId: string, userId: string) {
  try {
    const deleted = await deleteWorkflowConfig(configId, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Config not found',
        message: `Workflow configuration with ID "${configId}" not found`
      });
    }

    return res.json({
      success: true,
      message: 'Configuration deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting workflow config:', error);
    return sendErrorResponse(res, error, 'Failed to delete workflow config');
  }
}

