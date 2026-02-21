// 完整开发流程工作流

import type { Workflow } from '../../types/index.js';

/**
 * 完整开发流程
 * 从需求到交付的完整流程
 */
export const fullDevelopmentWorkflow: Workflow = {
  name: 'full-development',
  description: '从需求采集到产物交付的完整开发流程',
  initialStep: 'demand-collect',
  steps: [
    // ===== 需求阶段 =====
    {
      skill: 'demand-collect',
      params: { scenario: 'auto-detect' },
      onSuccess: 'demand-analysis',
      onFail: null,
      retry: 2,
    },
    {
      skill: 'demand-analysis',
      onSuccess: 'demand-confirm',
      onFail: 'demand-collect',
      retry: 2,
    },
    {
      skill: 'demand-confirm',
      params: {
        prompt: '需求分析报告已生成，是否确认？',
        options: ['确认通过', '需求调整']
      },
      onSuccess: 'task-plan',
      onFail: 'demand-collect',
    },
    {
      skill: 'task-plan',
      onSuccess: 'code-generation',
      onFail: null,
    },

    // ===== 代码生成阶段 =====
    {
      skill: 'code-generation',
      onSuccess: 'error-fix',
      onFail: 'code-generation',
      retry: 3,
    },
    {
      skill: 'error-fix',
      onSuccess: 'code-format',
      onFail: 'error-fix',
      retry: 3,
    },
    {
      skill: 'code-format',
      onSuccess: 'unit-test',
      onFail: 'code-format',
      retry: 2,
    },
    {
      skill: 'unit-test',
      onSuccess: 'file-write',
      onFail: 'error-fix',
      retry: 3,
    },

    // ===== 文件写入阶段 =====
    {
      skill: 'file-write',
      onSuccess: 'integration-test',
      onFail: 'file-write',
      retry: 3,
    },

    // ===== 测试阶段 =====
    {
      skill: 'integration-test',
      onSuccess: 'acceptance-test',
      onFail: 'fix-integration',
      retry: 2,
    },
    {
      skill: 'fix-integration',
      onSuccess: 'integration-test',
      onFail: 'task-plan',
      retry: 2,
    },
    {
      skill: 'acceptance-test',
      onSuccess: 'delivery',
      onFail: 'fix-acceptance',
      retry: 3,
    },
    {
      skill: 'fix-acceptance',
      onSuccess: 'acceptance-test',
      onFail: 'demand-analysis',
      retry: 2,
    },

    // ===== 交付阶段 =====
    {
      skill: 'delivery',
      params: { stage: 'complete' },
      onSuccess: 'observe-record',
      onFail: null,
    },
    {
      skill: 'observe-record',
      params: { stage: 'delivery-complete' },
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 简化开发流程
 * 跳过测试的快速流程
 */
export const quickDevelopmentWorkflow: Workflow = {
  name: 'quick-development',
  description: '快速开发流程（跳过部分测试）',
  initialStep: 'demand',
  steps: [
    {
      skill: 'demand',
      onSuccess: 'generate',
      onFail: null,
    },
    {
      skill: 'generate',
      onSuccess: 'fix',
      onFail: null,
    },
    {
      skill: 'fix',
      onSuccess: 'format',
      onFail: null,
    },
    {
      skill: 'format',
      onSuccess: 'save',
      onFail: null,
    },
    {
      skill: 'save',
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 迭代开发流程
 * 用于已有项目的功能迭代
 */
export const iterativeDevelopmentWorkflow: Workflow = {
  name: 'iterative-development',
  description: '现有项目的功能迭代流程',
  initialStep: 'analyze-existing',
  steps: [
    {
      skill: 'analyze-existing',
      onSuccess: 'collect-changes',
      onFail: null,
    },
    {
      skill: 'collect-changes',
      onSuccess: 'plan-changes',
      onFail: null,
    },
    {
      skill: 'plan-changes',
      onSuccess: 'generate-changes',
      onFail: null,
    },
    {
      skill: 'generate-changes',
      onSuccess: 'apply-changes',
      onFail: 'generate-changes',
      retry: 2,
    },
    {
      skill: 'apply-changes',
      onSuccess: 'test-changes',
      onFail: null,
    },
    {
      skill: 'test-changes',
      onSuccess: null,
      onFail: 'fix-changes',
    },
    {
      skill: 'fix-changes',
      onSuccess: 'test-changes',
      onFail: null,
    },
  ],
};

/**
 * 工作流导出
 */
export const workflows = {
  fullDevelopmentWorkflow,
  quickDevelopmentWorkflow,
  iterativeDevelopmentWorkflow,
};

export default workflows;
