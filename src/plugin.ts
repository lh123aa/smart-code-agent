// Smart Code Agent 插件主类

import { v4 as uuidv4 } from 'uuid';
import { FileStorage } from './storage/index.js';
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

// 导入所有原子 Skills（实例）
import askQuestionSkill from './skills/atoms/ask/question.js';
import askClarifySkill from './skills/atoms/ask/clarify.js';
import askConfirmSkill from './skills/atoms/ask/confirm.js';
import readFileSkill from './skills/atoms/io/read-file.js';
import writeFileSkill from './skills/atoms/io/write-file.js';
import listDirSkill from './skills/atoms/io/list-dir.js';
import analyzeDemandSkill from './skills/atoms/analyze/demand.js';
import generateCodeSkill from './skills/atoms/generate/code.js';
import generateTestSkill from './skills/atoms/generate/test.js';
import errorFixSkill from './skills/atoms/generate/error-fix.js';
import unitTestSkill from './skills/atoms/generate/unit-test.js';
import integrationTestSkill from './skills/atoms/generate/integration-test.js';
import acceptanceTestSkill from './skills/atoms/generate/acceptance-test.js';
import testResultAnalyzerSkill from './skills/atoms/generate/test-result-analyzer.js';
import lintSkill from './skills/atoms/generate/lint.js';
import typeCheckSkill from './skills/atoms/generate/type-check.js';
import formatCodeSkill from './skills/atoms/format/code.js';
import codeFormatSkill from './skills/atoms/format/code-standardize.js';
import prettierFormatSkill from './skills/atoms/format/prettier-format.js';
import fileIOSkill from './skills/atoms/io/file-io.js';
import observeRecordSkill from './skills/atoms/observe/record.js';
import observeReportSkill from './skills/atoms/observe/report.js';
import waitSkill from './skills/atoms/utility/wait.js';
import retrySkill from './skills/atoms/utility/retry.js';
import branchSkill from './skills/atoms/utility/branch.js';
import parallelSkill from './skills/atoms/utility/parallel.js';

// 导入组合 Skills（实例）
import demandCollectSkill from './skills/workflows/demand-collect.js';
import demandAnalysisSkill from './skills/workflows/demand-analysis.js';
import demandConfirmSkill from './skills/workflows/demand-confirm.js';
import smartAnalysisSkill from './skills/workflows/smart-analysis.js';

// 导入工作流
import { fullDemandAnalysisWorkflow, demandCollectionWorkflow } from './skill-engine/workflows/demand.js';
import { fullCodeGenerationWorkflow, testDrivenDevelopmentWorkflow } from './skill-engine/workflows/code-gen.js';

import type { 
  StartParams, 
  RunResult, 
  UserFeedback,
  SkillInput,
  Workflow 
} from './types/index.js';

const logger = new Logger('SmartCodeAgent');

/**
 * Smart Code Agent 插件主类
 */
export class SmartCodeAgent {
  // 核心组件
  private storage: FileStorage;
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

  // 工作流注册表
  private workflows: Map<string, Workflow> = new Map();

  // 状态
  private initialized: boolean = false;

  constructor() {
    // 初始化存储
    this.storage = new FileStorage();

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

    // 注册工作流
    this.registerWorkflows();
  }

  /**
   * 注册内置工作流
   */
  private registerWorkflows(): void {
    this.workflows.set('full-demand-analysis', fullDemandAnalysisWorkflow);
    this.workflows.set('demand-collection', demandCollectionWorkflow);
    this.workflows.set('full-code-generation', fullCodeGenerationWorkflow);
    this.workflows.set('test-driven-development', testDrivenDevelopmentWorkflow);
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
    
    // 加载内置 Skills
    await this.loadBuiltinSkills();

    this.initialized = true;
    logger.info('SmartCodeAgent initialized successfully');
  }

  /**
   * 加载内置 Skills
   */
  private async loadBuiltinSkills(): Promise<void> {
    // 注册原子 Skills（使用导入的实例）
    const atomicSkills = [
      // Ask 类
      askQuestionSkill,
      askClarifySkill,
      askConfirmSkill,
      
      // IO 类
      readFileSkill,
      writeFileSkill,
      listDirSkill,
      
      // Analyze 类
      analyzeDemandSkill,
      
      // Generate 类
      generateCodeSkill,
      generateTestSkill,
      errorFixSkill,
      unitTestSkill,
      integrationTestSkill,
      acceptanceTestSkill,
      testResultAnalyzerSkill,
      lintSkill,
      typeCheckSkill,
      
      // Format 类
      formatCodeSkill,
      codeFormatSkill,
      prettierFormatSkill,
      
      // IO 类
      readFileSkill,
      writeFileSkill,
      listDirSkill,
      fileIOSkill,
      
      // Observe 类
      observeRecordSkill,
      observeReportSkill,
      
      // Utility 类
      waitSkill,
      retrySkill,
      branchSkill,
      parallelSkill,
    ];

    // 注册组合 Skills（使用导入的实例）
    const workflowSkills = [
      demandCollectSkill,
      demandAnalysisSkill,
      demandConfirmSkill,
      smartAnalysisSkill,
    ];

    // 批量注册
    [...atomicSkills, ...workflowSkills].forEach(skill => {
      this.skillRegistry.register(skill);
    });

    logger.info(`Loaded ${atomicSkills.length + workflowSkills.length} builtin skills`);
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
          params: {
            projectType: params.projectType,
            initialDemand: params.initialDemand,
            projectPath: params.projectPath,
          },
          timeout: 300000,
          maxRetry: 3,
        },
        snapshotPath: `snapshots/${traceId}`,
        traceId,
      };

      // 3. 记录开始
      await this.observerRecorder.startStage(traceId, 'demand-workflow', ['demand-collect', 'demand-analysis', 'demand-confirm']);

      // 4. 执行需求分析工作流
      const workflow = this.workflows.get('full-demand-analysis');
      
      if (!workflow) {
        throw new Error('Workflow not found: full-demand-analysis');
      }

      const result = await this.workflowExecutor.execute(workflow, input);

      // 5. 记录结束
      const status = result.code === 200 ? 'success' : 'failed';
      await this.observerRecorder.endStage(traceId, 'demand-workflow', status, result.data);

      // 6. 创建摘要报告
      const records = await this.observerRecorder.getAllRecords(traceId);
      await this.observerReporter.createSummary(
        traceId,
        params.projectType,
        records,
        []
      );

      // 7. 返回结果
      return {
        traceId,
        status: result.code === 200 ? 'success' : 'failed',
        output: {
          traceId,
          projectType: params.projectType,
          workflowResult: result.data,
          report: await this.observerReporter.generateReport(traceId),
        },
        errors: result.code !== 200 ? [result.message] : undefined,
      };

    } catch (error) {
      logger.error('Development flow failed', { 
        error: error instanceof Error ? error.message : String(error),
        traceId 
      });

      await this.observerRecorder.endStage(traceId, 'demand-workflow', 'failed', {}, {
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
   * 提示用户反馈（占位符方法）
   */
  private async promptFeedback(traceId: string): Promise<void> {
    logger.debug('Feedback prompt called', { traceId });
    // 用户反馈通过 Observer 模块的 userFeedback skill 收集
  }
}

export default SmartCodeAgent;
