/**
 * Workflow Utility Functions
 * 
 * Helper functions for workflow configuration and display
 */

import { WorkflowNode } from '../types';

/**
 * Get the prompt text for a workflow node based on UI language
 * 
 * @param node - The workflow node
 * @param uiLanguage - The UI language ('zh' or 'en')
 * @returns The prompt text in the appropriate language
 */
export function getNodePrompt(node: WorkflowNode, uiLanguage: 'zh' | 'en'): string {
  if (!node.prompt) return '';
  
  if (uiLanguage === 'zh' && node.promptZh) {
    return node.promptZh;
  }
  
  return node.prompt;
}

/**
 * Get the default prompt text for a workflow node based on UI language
 * 
 * @param node - The workflow node
 * @param uiLanguage - The UI language ('zh' or 'en')
 * @returns The default prompt text in the appropriate language
 */
export function getNodeDefaultPrompt(node: WorkflowNode, uiLanguage: 'zh' | 'en'): string {
  if (!node.defaultPrompt) return '';
  
  if (uiLanguage === 'zh' && node.defaultPromptZh) {
    return node.defaultPromptZh;
  }
  
  return node.defaultPrompt;
}

/**
 * Get the node name with language-specific formatting
 * 
 * @param node - The workflow node
 * @param uiLanguage - The UI language ('zh' or 'en')
 * @returns The formatted node name
 */
export function getNodeDisplayName(node: WorkflowNode, uiLanguage: 'zh' | 'en'): string {
  // You can add language-specific name mappings here if needed
  return node.name;
}

/**
 * Get translated labels for workflow configuration UI
 * 
 * @param uiLanguage - The UI language ('zh' or 'en')
 * @returns Object containing translated labels
 */
export function getWorkflowConfigLabels(uiLanguage: 'zh' | 'en') {
  return {
    agentPrompt: uiLanguage === 'zh' ? 'Agent提示词' : 'Agent Prompt',
    resetToDefault: uiLanguage === 'zh' ? 'AI 优化提示词' : 'AI Optimize Prompt',
    saveConfig: uiLanguage === 'zh' ? '保存配置' : 'Save Configuration',
    configName: uiLanguage === 'zh' ? '配置名称' : 'Configuration Name',
    savedConfigs: uiLanguage === 'zh' ? 'Agent配置存档' : 'Saved Configurations',
    loadConfig: uiLanguage === 'zh' ? '加载' : 'Load',
    deleteConfig: uiLanguage === 'zh' ? '删除' : 'Delete',
    advancedConfig: uiLanguage === 'zh' ? '高级配置' : 'Advanced Configuration',
    step: uiLanguage === 'zh' ? '第' : 'Step',
    stepSuffix: uiLanguage === 'zh' ? '步' : '',
  };
}

