// 完整需求分析工作流

import type { Workflow } from '../../types/index.js';

/**
 * 完整需求分析工作流
 * 从需求采集到用户确认的完整流程
 */
export const fullDemandAnalysisWorkflow: Workflow = {
  name: 'full-demand-analysis',
  description: '从需求采集到用户确认的完整流程',
  initialStep: 'demand-collect',
  steps: [
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
      onSuccess: 'workflow-complete',
      onFail: 'demand-collect',
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
 */
export const demandCollectionWorkflow: Workflow = {
  name: 'demand-collection',
  description: '需求采集流程',
  initialStep: 'start',
  steps: [
    {
      skill: 'start',
      onSuccess: 'ask-demand-type',
      onFail: null,
    },
    {
      skill: 'ask-demand-type',
      params: {
        question: '请描述您的需求类型：页面开发、接口开发、组件封装、还是项目初始化？'
      },
      onSuccess: 'ask-demand-detail',
      onFail: 'start',
    },
    {
      skill: 'ask-demand-detail',
      params: {
        question: '请详细描述您的需求...'
      },
      onSuccess: 'save-demand',
      onFail: 'ask-demand-detail',
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
 */
export const demandAnalysisWorkflow: Workflow = {
  name: 'demand-analysis',
  description: '需求分析流程',
  initialStep: 'start',
  steps: [
    {
      skill: 'start',
      onSuccess: 'search-knowledge',
      onFail: null,
    },
    {
      skill: 'search-knowledge',
      params: { useLocal: true },
      onSuccess: 'analyze-demand',
      onFail: 'web-search',
    },
    {
      skill: 'web-search',
      onSuccess: 'learn-knowledge',
      onFail: 'analyze-demand',
    },
    {
      skill: 'learn-knowledge',
      onSuccess: 'analyze-demand',
      onFail: null,
    },
    {
      skill: 'analyze-demand',
      onSuccess: 'generate-report',
      onFail: null,
    },
    {
      skill: 'generate-report',
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 快速需求分析工作流（不带学习）
 */
export const quickDemandAnalysisWorkflow: Workflow = {
  name: 'quick-demand-analysis',
  description: '快速需求分析（不使用学习）',
  initialStep: 'collect',
  steps: [
    {
      skill: 'collect',
      onSuccess: 'analyze',
      onFail: null,
    },
    {
      skill: 'analyze',
      onSuccess: 'confirm',
      onFail: null,
    },
    {
      skill: 'confirm',
      onSuccess: null,
      onFail: 'collect',
    },
  ],
};

export default {
  fullDemandAnalysisWorkflow,
  demandCollectionWorkflow,
  demandAnalysisWorkflow,
  quickDemandAnalysisWorkflow,
};
