// 工作流执行器 - 按步骤执行工作流

import { createLogger } from '../utils/logger.js';
import type { SkillInput, SkillOutput, Workflow, WorkflowExecution } from '../types/index.js';
import { SkillRegistry } from './registry.js';
import { SkillExecutor } from './executor.js';
import { WorkflowParser } from './parser.js';
import { WorkflowStateManager } from './state.js';

const logger = createLogger('WorkflowExecutor');

/**
 * 工作流执行器选项
 */
export interface WorkflowExecutorOptions {
  /** 默认超时时间 */
  defaultTimeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 自动保存状态 */
  autoSaveState?: boolean;
  /** 状态管理器 */
  stateManager?: WorkflowStateManager;
}

/**
 * 默认选项
 */
const defaultOptions = {
  defaultTimeout: 60000,
  maxRetries: 3,
  autoSaveState: true,
};

/**
 * 工作流执行器
 */
export class WorkflowExecutor {
  private registry: SkillRegistry;
  private executor: SkillExecutor;
  private parser: WorkflowParser;
  private stateManager: WorkflowStateManager;
  private options: WorkflowExecutorOptions;

  constructor(
    registry: SkillRegistry,
    executor: SkillExecutor,
    options?: WorkflowExecutorOptions
  ) {
    this.registry = registry;
    this.executor = executor;
    this.parser = new WorkflowParser();
    this.options = { ...defaultOptions, ...options };
    this.stateManager = options?.stateManager || new WorkflowStateManager();
  }

  /**
   * 执行工作流
   */
  async execute(
    workflow: Workflow,
    input: SkillInput
  ): Promise<SkillOutput> {
    const execution: WorkflowExecution = {
      workflowName: workflow.name,
      traceId: input.traceId,
      currentStep: workflow.initialStep,
      status: 'running',
      context: {},
      startTime: Date.now(),
      stepsExecuted: [],
    };

    logger.info(`Starting workflow: ${workflow.name}`, { traceId: input.traceId });

    try {
      // 验证工作流
      const validation = this.parser.validate(workflow);
      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // 初始化上下文
      let currentInput = this.buildInitialInput(workflow, input);

      // 执行步骤
      let currentStepName: string | null = workflow.initialStep;

      while (currentStepName) {
        const step = workflow.steps.find(s => s.skill === currentStepName);
        if (!step) {
          throw new Error(`Step "${currentStepName}" not found`);
        }

        execution.currentStep = currentStepName;
        logger.debug(`Executing workflow step: ${currentStepName}`);

        try {
          // 构建步骤输入
          const stepParams = step.params || {};
          const stepInput = this.buildStepInput(currentInput, stepParams);

          // 执行 Skill
          const result = await this.executor.execute(step.skill, stepInput, {
            timeout: this.options.defaultTimeout,
            maxRetries: step.retry,
          });

          execution.stepsExecuted.push(currentStepName);

          // 处理结果
          if (result.code === 200) {
            // 成功，流转到下一步
            currentStepName = step.onSuccess ?? null;
            
            // 更新上下文
            if (result.data) {
              currentInput = this.mergeContext(currentInput, result.data);
            }
          } else if (result.code === 300) {
            // 需要用户交互，暂停
            execution.status = 'paused';
            await this.saveState(execution);
            
            logger.info(`Workflow paused at step: ${currentStepName}`, { traceId: input.traceId });
            
            return {
              code: 300,
              data: {
                execution,
                result,
              },
              message: `Workflow paused at step "${currentStepName}": ${result.message}`,
            };
          } else if (result.code === 400) {
            // 可重试失败
            logger.warn(`Step "${currentStepName}" failed with retryable error`, {
              message: result.message,
              traceId: input.traceId,
            });
            
            currentStepName = step.onFail ?? null;
          } else {
            // 不可重试失败
            throw new Error(result.message);
          }

          // 保存状态
          if (this.options.autoSaveState) {
            await this.saveState(execution);
          }

        } catch (error) {
          logger.error(`Workflow step "${currentStepName}" threw exception`, {
            error: error instanceof Error ? error.message : String(error),
            traceId: input.traceId,
          });

          // 尝试失败分支
          if (step.onFail) {
            currentStepName = step.onFail;
          } else {
            throw error;
          }
        }
      }

      // 工作流完成
      execution.status = 'success';
      execution.endTime = Date.now();

      await this.saveState(execution);

      logger.info(`Workflow completed: ${workflow.name}`, {
        traceId: input.traceId,
        duration: execution.endTime - execution.startTime,
      });

      return {
        code: 200,
        data: {
          execution,
          context: currentInput.context,
        },
        message: `Workflow "${workflow.name}" completed successfully`,
      };

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.error = error instanceof Error ? error.message : String(error);

      await this.saveState(execution);

      logger.error(`Workflow failed: ${workflow.name}`, {
        error: execution.error,
        traceId: input.traceId,
      });

      return {
        code: 500,
        data: { execution },
        message: `Workflow failed: ${execution.error}`,
      };
    }
  }

  /**
   * 从保存的状态恢复执行
   */
  async resume(traceId: string, _additionalInput?: Partial<SkillInput>): Promise<SkillOutput> {
    const execution = await this.stateManager.load(traceId);
    if (!execution) {
      return {
        code: 500,
        data: {},
        message: `No saved execution found for traceId: ${traceId}`,
      };
    }

    if (execution.status !== 'paused') {
      return {
        code: 400,
        data: {},
        message: `Cannot resume execution with status: ${execution.status}`,
      };
    }

    // 重新执行（简化版本，实际需要更复杂的恢复逻辑）
    logger.info(`Resuming workflow: ${execution.workflowName}`, { traceId });

    return {
      code: 200,
      data: { execution },
      message: 'Workflow resumed',
    };
  }

  /**
   * 构建初始输入
   */
  private buildInitialInput(workflow: Workflow, input: SkillInput): SkillInput {
    return {
      ...input,
      task: {
        ...input.task,
        target: workflow.name,
        // 保留原有参数
      },
    };
  }

  /**
   * 构建步骤输入
   */
  private buildStepInput(baseInput: SkillInput, params: Record<string, unknown>): SkillInput {
    return {
      ...baseInput,
      task: {
        ...baseInput.task,
        params: {
          ...baseInput.task.params,
          ...params,
        },
      },
    };
  }

  /**
   * 合并上下文
   */
  private mergeContext(input: SkillInput, data: Record<string, unknown>): SkillInput {
    // 特殊处理：将 collectedData 移动到 readOnly context
    let readOnlyUpdate = {};
    if (data.collectedData) {
      readOnlyUpdate = { collectedDemand: data.collectedData };
    }
    if (data.report) {
      readOnlyUpdate = { ...readOnlyUpdate, demandReport: data.report };
    }
    
    return {
      ...input,
      context: {
        readOnly: {
          ...input.context.readOnly,
          ...readOnlyUpdate,
        },
        writable: {
          ...input.context.writable,
          ...data,
        },
      },
    };
  }

  /**
   * 保存执行状态
   */
  private async saveState(execution: WorkflowExecution): Promise<void> {
    try {
      await this.stateManager.save(execution);
    } catch (error) {
      logger.warn('Failed to save workflow state', {
        error: error instanceof Error ? error.message : String(error),
        traceId: execution.traceId,
      });
    }
  }
}

export default WorkflowExecutor;
