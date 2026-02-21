// 代码生成工作流

import type { Workflow } from '../../types/index.js';

/**
 * 完整代码生成工作流
 * 从代码生成到测试的完整流程
 */
export const fullCodeGenerationWorkflow: Workflow = {
  name: 'full-code-generation',
  description: '从代码生成到测试的完整流程',
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
      onFail: 'error-fix',
      retry: 3,
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
