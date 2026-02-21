// Smart Code Agent 插件主类

import { v4 as uuidv4 } from 'uuid';
import { Storage } from './storage/index.js';
import { Logger } from './utils/logger.js';
import { SkillRegistry } from './skill-engine/registry.js';
import { SkillExecutor } from './skill-engine/executor.js';
import { SkillComposer } from './skill-engine/composer.js';
import { WorkflowExecutor } from './skill-engine/workflow-executor.js';
import { WorkflowStateManager } from './skill-engine/state.js';
import { KnowledgeBase } from './knowledge/base.js';
import { ObserverRecorder } from './observer/recorder.js';
import { ObserverReporter } from './observer/reporter.js';
import { UserModificationRecorder } from './observer/user-modifications.js';
import { LLMBridge } from './mcp/llm-bridge.js';
import type { 
  StartParams, 
  RunResult, 
  UserFeedback,
  SkillInput 
} from './types/index.js';

const logger = new Logger('SmartCodeAgent');

/**
 * Smart Code Agent 插件主类
 */
export class SmartCodeAgent {
  // 核心组件
  private storage: Storage;
  private skillRegistry: SkillRegistry;
  private skillExecutor: SkillExecutor;
  private skillComposer: SkillComposer;
  private workflowExecutor: WorkflowExecutor;
  private workflowStateManager: WorkflowStateManager;
  
  // 功能模块
  private knowledgeBase: KnowledgeBase;
  private observerRecorder: ObserverRecorder;
  private observerReporter: ObserverReporter;
  private userModificationRecorder: UserModificationRecorder;
  private llmBridge: LLMBridge;

  // 状态
  private initialized: boolean = false;

  constructor() {
    // 初始化存储
    this.storage = new Storage();

    // 初始化 Skill 引擎
    this.skillRegistry = new SkillRegistry();
    this.skillExecutor = new SkillExecutor(this.skillRegistry);
    this.skillComposer = new SkillComposer(this.skillRegistry);
    this.workflowStateManager = new WorkflowStateManager(this.storage);
    this.workflowExecutor = new WorkflowExecutor(
      this.skillRegistry,
      this.skillExecutor,
      { stateManager: this.workflowStateManager }
    );

    // 初始化功能模块
    this.knowledgeBase = new KnowledgeBase(this.storage);
    this.observerRecorder = new ObserverRecorder(this.storage);
    this.observerReporter = new ObserverReporter(this.storage);
    this.userModificationRecorder = new UserModificationRecorder(this.storage);
    this.llmBridge = new LLMBridge();
  }

  /**
   * 初始化插件
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('SmartCodeAgent already initialized');
      return;
    }

    logger.info('Initializing SmartCodeAgent...');
    
    // TODO: 加载内置 Skill
    // await this.loadBuiltinSkills();

    this.initialized = true;
    logger.info('SmartCodeAgent initialized successfully');
  }

  /**
   * 启动开发流程
   */
  async start(params: StartParams): Promise<RunResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const traceId = uuidv4();
    logger.info(`Starting development flow: ${params.projectType}`, { traceId });

    try {
      // 1. 初始化上下文
      const context = this.buildInitialContext(params);

      // 2. 构建 Skill 输入
      const input: SkillInput = {
        config: {},
        context: {
          readOnly: {},
          writable: context,
        },
        task: {
          taskId: uuidv4(),
          taskName: 'start',
          target: params.initialDemand || '',
          params: params as unknown as Record<string, unknown>,
          timeout: 300000,
          maxRetry: 3,
        },
        snapshotPath: `snapshots/${traceId}`,
        traceId,
      };

      // 3. 记录开始
      await this.observerRecorder.startStage(traceId, 'start', ['start']);

      // 4. TODO: 执行需求分析工作流
      // const workflow = this.getWorkflow('full-demand-analysis');
      // const result = await this.workflowExecutor.execute(workflow, input);

      // 模拟执行
      await this.simulateExecution(traceId, params);

      // 5. 记录结束
      await this.observerRecorder.endStage(traceId, 'start', 'success');

      // 6. 询问用户反馈
      await this.promptFeedback(traceId);

      return {
        traceId,
        status: 'success',
        output: { traceId, projectType: params.projectType },
      };

    } catch (error) {
      logger.error('Development flow failed', { 
        error: error instanceof Error ? error.message : String(error),
        traceId 
      });

      await this.observerRecorder.endStage(traceId, 'start', 'failed', {}, {
        type: 'Error',
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        traceId,
        status: 'failed',
        output: {},
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * 恢复中断的流程
   */
  async resume(traceId: string): Promise<RunResult> {
    const execution = await this.workflowStateManager.load(traceId);
    
    if (!execution) {
      return {
        traceId,
        status: 'failed',
        output: {},
        errors: ['No saved execution found'],
      };
    }

    const result = await this.workflowExecutor.resume(traceId);

    return {
      traceId,
      status: result.code === 200 ? 'success' : 'failed',
      output: result.data,
      errors: result.code !== 200 ? [result.message] : undefined,
    };
  }

  /**
   * 获取观察者报告
   */
  async getReport(traceId?: string): Promise<string> {
    if (traceId) {
      return this.observerReporter.generateReport(traceId);
    }

    // 返回最近运行的报告
    const executions = await this.workflowStateManager.list();
    if (executions.length === 0) {
      return '# 观察者报告\n\n暂无运行记录';
    }

    return this.observerReporter.generateReport(executions[0].traceId);
  }

  /**
   * 提交用户反馈
   */
  async submitFeedback(traceId: string, feedback: UserFeedback): Promise<void> {
    const stage = feedback.stage || 'code';
    await this.userModificationRecorder.record(traceId, {
      projectId: '',
      traceId,
      stage: stage as 'demand' | 'code' | 'test' | 'delivery',
      modifiedFiles: [],
      modificationType: 'modify',
      userReason: feedback.content,
    });

    logger.info('Feedback submitted', { traceId, type: feedback.type });
  }

  /**
   * 注册 Skill
   */
  registerSkill(skill: unknown): void {
    this.skillRegistry.register(skill as any);
  }

  /**
   * 设置 MCP 客户端
   */
  setMCPClient(client: unknown): void {
    this.llmBridge.setMCPClient(client as any);
    logger.info('MCP client configured');
  }

  /**
   * 构建初始上下文
   */
  private buildInitialContext(params: StartParams): Record<string, unknown> {
    return {
      projectType: params.projectType,
      initialDemand: params.initialDemand,
      projectPath: params.projectPath || process.cwd(),
      startTime: Date.now(),
    };
  }

  /**
   * 模拟执行（TODO: 替换为实际工作流执行）
   */
  private async simulateExecution(traceId: string, params: StartParams): Promise<void> {
    logger.info('Simulating execution...', { traceId });
    
    // 模拟不同阶段的执行
    const stages = ['demand-collection', 'demand-analysis', 'code-generation', 'testing'];
    
    for (const stage of stages) {
      await this.observerRecorder.startStage(traceId, stage, []);
      await new Promise(resolve => setTimeout(resolve, 100)); // 模拟耗时
      await this.observerRecorder.endStage(traceId, stage, 'success', {
        simulated: true,
      });
    }

    // 创建摘要
    const records = await this.observerRecorder.getAllRecords(traceId);
    await this.observerReporter.createSummary(
      traceId,
      `project-${params.projectType}`,
      records,
      []
    );
  }

  /**
   * 提示用户反馈
   */
  private async promptFeedback(traceId: string): Promise<void> {
    logger.info('Please provide feedback for this run');
    // TODO: 实现实际的反馈收集机制
  }
}

export default SmartCodeAgent;
