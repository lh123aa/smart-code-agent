// 透明开发流程工作流定义
// 包含：需求澄清 → 需求采集 → 需求分析 → 需求确认 → 任务拆解 → 任务规划 → 任务确认 → 代码生成 → 测试阶段

import type { Workflow } from '../../types/index.js';

/**
 * 完整透明开发工作流（含测试阶段）
 * 
 * 流程图：
 * 
 *   初始需求
 *      ↓
 *   demand-clarify (需求澄清 - 分析关键点，生成问题)
 *      ↓ [用户互动]
 *   demand-collect (需求采集 - 收集用户回答)
 *      ↓
 *   demand-analysis (需求分析 - 生成需求报告)
 *      ↓
 *   demand-confirm (需求确认 - 展示报告，用户确认)
 *      ↓ [用户确认]
 *   task-decompose (任务拆解 - 拆解为开发任务)
 *      ↓
 *   task-plan (任务规划 - 生成执行计划)
 *      ↓
 *   task-confirm (任务确认 - 展示计划，用户确认)
 *      ↓ [用户确认]
 *   code-generation (代码生成)
 *      ↓
 *   test-plan (测试计划生成)
 *      ↓
 *   test-confirm (测试计划确认)
 *      ↓ [用户确认]
 *   test-orchestrator (测试执行)
 *      ↓
 *   quality-scorer (质量评分)
 *      ↓
 *   [评分 >= 90?] ──是──→ delivery (交付)
 *      │
 *      否
 *      ↓
 *   test-fix-loop (修复循环)
 *      ↓
 *   [重新测试]
 */
export const transparentDevelopmentWorkflow: Workflow = {
  name: 'transparent-development',
  description: '透明开发流程：需求 → 确认 → 任务 → 确认 → 开发 → 测试 → 交付',
  initialStep: 'demand-clarify',
  steps: [
    // ===== 需求阶段 =====
    {
      skill: 'demand-clarify',
      params: { autoStart: true },
      onSuccess: 'demand-collect',
      onFail: null,
      retry: 2,
    },
    {
      skill: 'demand-collect',
      onSuccess: 'demand-analysis',
      onFail: 'demand-clarify',
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
        options: ['确认通过', '需要调整', '重新澄清']
      },
      onSuccess: 'task-decompose',
      onFail: 'demand-clarify',
    },

    // ===== 任务规划阶段 =====
    {
      skill: 'task-decompose',
      onSuccess: 'task-plan',
      onFail: null,
    },
    {
      skill: 'task-plan',
      onSuccess: 'task-confirm',
      onFail: 'task-decompose',
    },
    {
      skill: 'task-confirm',
      params: {
        prompt: '执行计划已生成，确认后开始开发？',
        options: ['开始执行', '调整任务', '重新规划']
      },
      onSuccess: 'code-generation',
      onFail: 'task-decompose',
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
      onSuccess: 'test-plan',
      onFail: 'code-format',
      retry: 2,
    },

    // ===== 测试阶段 =====
    {
      skill: 'test-plan',
      onSuccess: 'test-confirm',
      onFail: null,
    },
    {
      skill: 'test-confirm',
      params: {
        prompt: '测试计划已生成，是否开始执行测试？',
        options: ['开始测试', '调整计划', '跳过测试']
      },
      onSuccess: 'test-orchestrator',
      onFail: 'test-plan',
    },
    {
      skill: 'test-orchestrator',
      params: { targetScore: 90 },
      onSuccess: 'quality-scorer',
      onFail: 'test-fix-loop',
    },
    {
      skill: 'quality-scorer',
      params: { targetScore: 90 },
      onSuccess: 'delivery',
      onFail: 'test-fix-loop',
    },
    {
      skill: 'test-fix-loop',
      params: { targetScore: 90, maxRounds: 5 },
      onSuccess: 'test-orchestrator',
      onFail: 'manual-fix-required',
    },

    // ===== 人工修复分支 =====
    {
      skill: 'manual-fix-required',
      params: { prompt: '自动修复已达到最大次数，需要人工介入' },
      onSuccess: null,
      onFail: null,
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
 * 仅需求分析工作流
 * 只执行需求分析阶段，不进入开发
 */
export const demandOnlyWorkflow: Workflow = {
  name: 'demand-only',
  description: '仅执行需求分析和确认，不进入开发',
  initialStep: 'demand-clarify',
  steps: [
    {
      skill: 'demand-clarify',
      params: { autoStart: true },
      onSuccess: 'demand-collect',
      onFail: null,
      retry: 2,
    },
    {
      skill: 'demand-collect',
      onSuccess: 'demand-analysis',
      onFail: 'demand-clarify',
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
        prompt: '需求分析报告已生成，请确认？',
        options: ['确认通过', '需要调整']
      },
      onSuccess: 'workflow-complete',
      onFail: 'demand-clarify',
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
 * 任务规划工作流
 * 从已确认的需求开始，进行任务拆解和规划
 */
export const taskPlanningWorkflow: Workflow = {
  name: 'task-planning',
  description: '从已确认的需求开始任务规划和确认',
  initialStep: 'task-decompose',
  steps: [
    {
      skill: 'task-decompose',
      onSuccess: 'task-plan',
      onFail: null,
    },
    {
      skill: 'task-plan',
      onSuccess: 'task-confirm',
      onFail: 'task-decompose',
    },
    {
      skill: 'task-confirm',
      params: {
        prompt: '执行计划已生成，确认？',
        options: ['确认开始', '重新规划']
      },
      onSuccess: 'workflow-complete',
      onFail: 'task-decompose',
    },
    {
      skill: 'workflow-complete',
      params: { stage: 'planning' },
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 测试工作流
 * 独立执行测试阶段
 */
export const testWorkflow: Workflow = {
  name: 'test-workflow',
  description: '独立测试流程：计划 → 确认 → 执行 → 评分 → 修复循环',
  initialStep: 'test-plan',
  steps: [
    {
      skill: 'test-plan',
      onSuccess: 'test-confirm',
      onFail: null,
    },
    {
      skill: 'test-confirm',
      params: {
        prompt: '测试计划已生成，是否开始执行？',
        options: ['开始测试', '调整计划']
      },
      onSuccess: 'test-orchestrator',
      onFail: 'test-plan',
    },
    {
      skill: 'test-orchestrator',
      params: { targetScore: 90 },
      onSuccess: 'quality-scorer',
      onFail: 'test-fix-loop',
    },
    {
      skill: 'quality-scorer',
      params: { targetScore: 90 },
      onSuccess: 'workflow-complete',
      onFail: 'test-fix-loop',
    },
    {
      skill: 'test-fix-loop',
      params: { targetScore: 90, maxRounds: 5 },
      onSuccess: 'test-orchestrator',
      onFail: 'workflow-failed',
    },
    {
      skill: 'workflow-complete',
      params: { stage: 'test' },
      onSuccess: null,
      onFail: null,
    },
    {
      skill: 'workflow-failed',
      params: { stage: 'test', reason: 'exceeded-max-fix-rounds' },
      onSuccess: null,
      onFail: null,
    },
  ],
};

/**
 * 原有的完整需求分析工作流（保留兼容）
 */
export const fullDemandAnalysisWorkflow: Workflow = {
  name: 'full-demand-analysis',
  description: '完整需求分析流程：澄清 → 采集 → 分析 → 确认',
  initialStep: 'demand-clarify',
  steps: [
    {
      skill: 'demand-clarify',
      params: { autoStart: true },
      onSuccess: 'demand-collect',
      onFail: null,
      retry: 2,
    },
    {
      skill: 'demand-collect',
      onSuccess: 'demand-analysis',
      onFail: 'demand-clarify',
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
      onFail: 'demand-clarify',
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
  description: '仅采集需求，不进行分析',
  initialStep: 'demand-clarify',
  steps: [
    {
      skill: 'demand-clarify',
      params: { autoStart: true },
      onSuccess: 'demand-collect',
      onFail: null,
      retry: 2,
    },
    {
      skill: 'demand-collect',
      onSuccess: 'save-demand',
      onFail: null,
    },
    {
      skill: 'save-demand',
      onSuccess: null,
      onFail: null,
    },
  ],
};

export default {
  transparentDevelopmentWorkflow,
  demandOnlyWorkflow,
  taskPlanningWorkflow,
  testWorkflow,
  fullDemandAnalysisWorkflow,
  demandCollectionWorkflow,
};
