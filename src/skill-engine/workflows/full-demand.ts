// 完整需求分析工作流定义
// 包含：采集 → 分析 → 确认 的完整流程

import type { Workflow } from '../../types/index.js';

/**
 * 完整需求分析工作流
 * 从需求采集到用户确认的完整流程
 * 
 * 流程：
 * 1. demand-collect: 采集用户需求
 * 2. demand-analysis: 分析需求，生成报告
 * 3. demand-confirm: 展示报告并确认
 * 4. 确认后进入代码生成阶段
 */
export const fullDemandAnalysisWorkflow: Workflow = {
  name: 'full-demand-analysis',
  description: '完整需求分析流程：采集 → 分析 → 确认',
  initialStep: 'demand-collect',
  steps: [
    {
      skill: 'demand-collect',
      params: { autoStart: true },
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
        prompt: '需求分析报告已生成，请确认是否符合您的预期？',
        options: ['确认通过', '需要调整']
      },
      onSuccess: 'workflow-complete',
      onFail: 'demand-collect',
      retry: 2,
    },
    {
      skill: 'workflow-complete',
      params: { stage: 'demand' },
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 需求采集工作流
 * 仅采集需求，不进行分析
 */
export const demandCollectionOnlyWorkflow: Workflow = {
  name: 'demand-collection-only',
  description: '仅采集需求',
  initialStep: 'demand-collect',
  steps: [
    {
      skill: 'demand-collect',
      params: { autoStart: true },
      onSuccess: 'save-demand',
      onFail: null,
      retry: 2,
    },
    {
      skill: 'save-demand',
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 需求分析工作流
 * 仅分析已采集的需求
 */
export const demandAnalysisOnlyWorkflow: Workflow = {
  name: 'demand-analysis-only',
  description: '仅分析需求',
  initialStep: 'demand-analysis',
  steps: [
    {
      skill: 'demand-analysis',
      onSuccess: 'demand-confirm',
      onFail: null,
      retry: 2,
    },
    {
      skill: 'demand-confirm',
      params: { 
        prompt: '需求分析报告已生成，请确认？',
        options: ['确认通过', '需要调整']
      },
      onSuccess: 'workflow-complete',
      onFail: 'demand-analysis',
      retry: 2,
    },
    {
      skill: 'workflow-complete',
      params: { stage: 'demand' },
      onSuccess: null,
      onFail: null,
    },
  ],
};

export default {
  fullDemandAnalysisWorkflow,
  demandCollectionOnlyWorkflow,
  demandAnalysisOnlyWorkflow,
};
