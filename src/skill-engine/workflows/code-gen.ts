// 代码生成工作流

import type { Workflow } from '../../types/index.js';

/**
 * 完整代码生成工作流（含测试闭环）
 * 从代码生成到测试的完整流程，包含错误自动修复循环
 */
export const fullCodeGenerationWorkflow: Workflow = {
  name: 'full-code-generation',
  description: '从代码生成到测试的完整流程，包含测试闭环',
  initialStep: 'code-generate',
  steps: [
    {
      skill: 'code-generate',
      params: { includeTests: true },
      onSuccess: 'error-fix',
      onFail: 'code-generate',
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
      onSuccess: 'code-complete',
      onFail: 'test-result-analyzer',
      retry: 1,
    },
    // 测试闭环：分析失败原因，修复后重试
    {
      skill: 'test-result-analyzer',
      onSuccess: 'error-fix',
      onFail: 'code-complete',
      retry: 1,
    },
    {
      skill: 'code-complete',
      params: { stage: 'code-generation' },
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 简单代码生成工作流
 */
export const simpleCodeGenerationWorkflow: Workflow = {
  name: 'simple-code-generation',
  description: '简单的代码生成流程',
  initialStep: 'generate',
  steps: [
    {
      skill: 'generate',
      onSuccess: 'format',
      onFail: null,
    },
    {
      skill: 'format',
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 测试驱动开发工作流
 * 测试优先的代码开发流程
 */
export const testDrivenDevelopmentWorkflow: Workflow = {
  name: 'test-driven-development',
  description: '测试驱动开发流程：先写测试，再写代码',
  initialStep: 'generate-test',
  steps: [
    {
      skill: 'generate-test',
      params: { testType: 'unit' },
      onSuccess: 'generate-code',
      onFail: 'generate-test',
      retry: 2,
    },
    {
      skill: 'generate-code',
      onSuccess: 'unit-test',
      onFail: 'generate-code',
      retry: 3,
    },
    {
      skill: 'unit-test',
      onSuccess: 'code-complete',
      onFail: 'test-result-analyzer',
      retry: 1,
    },
    {
      skill: 'test-result-analyzer',
      onSuccess: 'generate-code',
      onFail: 'code-complete',
      retry: 1,
    },
    {
      skill: 'code-complete',
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 批量代码生成工作流
 */
export const batchCodeGenerationWorkflow: Workflow = {
  name: 'batch-code-generation',
  description: '批量生成多个代码文件',
  initialStep: 'prepare',
  steps: [
    {
      skill: 'prepare',
      onSuccess: 'generate-batch',
      onFail: null,
    },
    {
      skill: 'generate-batch',
      onSuccess: 'format-batch',
      onFail: 'generate-batch',
      retry: 2,
    },
    {
      skill: 'format-batch',
      onSuccess: 'save-batch',
      onFail: null,
    },
    {
      skill: 'save-batch',
      onSuccess: null,
      onFail: null,
    },
  ],
};

export default {
  fullCodeGenerationWorkflow,
  simpleCodeGenerationWorkflow,
  batchCodeGenerationWorkflow,
};
