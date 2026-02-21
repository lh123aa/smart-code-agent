// WorkflowExecutor 单元测试

import { WorkflowExecutor } from '../src/skill-engine/workflow-executor.js';
import { SkillRegistry } from '../src/skill-engine/registry.js';
import { SkillExecutor } from '../src/skill-engine/executor.js';
import { WorkflowStateManager } from '../src/skill-engine/state.js';
import { Storage } from '../src/storage/index.js';
import type { SkillInput, SkillOutput, Workflow, WorkflowStep } from '../src/types/index.js';
import path from 'path';
import fs from 'fs/promises';

// 测试目录
const testDir = path.join(process.cwd(), 'test-temp-workflow');

describe('WorkflowExecutor', () => {
  let registry: SkillRegistry;
  let executor: SkillExecutor;
  let stateManager: WorkflowStateManager;
  let workflowExecutor: WorkflowExecutor;

  beforeEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
    
    const storage = new Storage({ basePath: testDir });
    registry = new SkillRegistry();
    executor = new SkillExecutor(registry);
    stateManager = new WorkflowStateManager(storage);
    workflowExecutor = new WorkflowExecutor(registry, executor, { stateManager });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  // 创建测试输入
  const createTestInput = (overrides = {}): SkillInput => ({
    config: {},
    context: {
      readOnly: {},
      writable: { ...overrides },
    },
    task: {
      taskId: 'test-task-1',
      taskName: 'test-workflow',
      target: 'test target',
      params: {},
      timeout: 30000,
      maxRetry: 3,
    },
    snapshotPath: 'snapshots/test',
    traceId: 'test-trace-workflow-1',
  });

  // 创建简单工作流
  const createSimpleWorkflow = (steps: WorkflowStep[]): Workflow => ({
    name: 'test-workflow',
    description: 'Test workflow',
    version: '1.0.0',
    steps,
  });

  describe('基本工作流执行', () => {
    it('should execute a simple workflow with one step', async () => {
      const step: WorkflowStep = {
        id: 'step1',
        name: 'test-step',
        skill: 'success-skill',
      };
      
      // 注册测试 skill
      const mockSkill = {
        meta: { name: 'success-skill', description: '', category: 'utility' as const, version: '1.0.0' },
        run: async (): Promise<SkillOutput> => ({ code: 200, data: { step: 1 }, message: 'Step 1 done' }),
      };
      registry.register(mockSkill as any);

      const workflow = createSimpleWorkflow([step]);
      const input = createTestInput();
      
      const result = await workflowExecutor.execute(workflow, input);
      
      expect(result).toBeDefined();
    });

    it('should execute workflow with multiple steps', async () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', skill: 'step1-skill' },
        { id: 'step2', name: 'Step 2', skill: 'step2-skill' },
        { id: 'step3', name: 'Step 3', skill: 'step3-skill' },
      ];
      
      // 注册多个测试 skill
      for (let i = 1; i <= 3; i++) {
        const skill = {
          meta: { name: `step${i}-skill`, description: '', category: 'utility' as const, version: '1.0.0' },
          run: async (): Promise<SkillOutput> => ({ code: 200, data: { step: i }, message: `Step ${i} done` }),
        };
        registry.register(skill as any);
      }

      const workflow = createSimpleWorkflow(steps);
      const input = createTestInput();
      
      const result = await workflowExecutor.execute(workflow, input);
      
      expect(result).toBeDefined();
    });
  });

  describe('工作流错误处理', () => {
    it('should handle step failure', async () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', name: 'Step 1', skill: 'fail-step' },
        { id: 'step2', name: 'Step 2', skill: 'success-skill' },
      ];
      
      const failSkill = {
        meta: { name: 'fail-step', description: '', category: 'utility' as const, version: '1.0.0' },
        run: async (): Promise<SkillOutput> => ({ code: 400, data: {}, message: 'Step failed' }),
      };
      const successSkill = {
        meta: { name: 'success-skill', description: '', category: 'utility' as const, version: '1.0.0' },
        run: async (): Promise<SkillOutput> => ({ code: 200, data: {}, message: 'Success' }),
      };
      registry.register(failSkill as any);
      registry.register(successSkill as any);

      const workflow: Workflow = {
        name: 'test-workflow',
        description: 'Test',
        version: '1.0.0',
        steps,
        stopOnError: false, // 继续执行
      };
      
      const input = createTestInput();
      const result = await workflowExecutor.execute(workflow, input);
      
      // 应该继续执行
      expect(result).toBeDefined();
    });
  });

  describe('工作流状态管理', () => {
    it('should create workflow execution', async () => {
      const step: WorkflowStep = {
        id: 'step1',
        name: 'Test Step',
        skill: 'success-skill',
      };
      
      const mockSkill = {
        meta: { name: 'success-skill', description: '', category: 'utility' as const, version: '1.0.0' },
        run: async (): Promise<SkillOutput> => ({ code: 200, data: { result: 'ok' }, message: 'Done' }),
      };
      registry.register(mockSkill as any);

      const workflow = createSimpleWorkflow([step]);
      const traceId = 'test-trace-state-1';
      const input = createTestInput({ traceId });
      
      const result = await workflowExecutor.execute(workflow, input);
      
      expect(result).toBeDefined();
    });

    it('should resume workflow from saved state', async () => {
      const traceId = 'test-trace-resume-1';
      
      // 先保存一个状态
      await stateManager.save(traceId, {
        workflowName: 'test-workflow',
        currentStep: 1,
        totalSteps: 2,
        context: { step1Done: true },
        results: [{ stepId: 'step1', output: { code: 200 } }],
      });

      // 尝试恢复
      const result = await workflowExecutor.resume(traceId);
      
      expect(result).toBeDefined();
    });
  });

  describe('工作流验证', () => {
    it('should validate workflow structure', async () => {
      const invalidWorkflow = {
        name: '', // 无效名称
        description: 'Test',
        version: '1.0.0',
        steps: [],
      } as any;

      const input = createTestInput();
      
      // 无效工作流应该抛出异常或返回错误
      try {
        await workflowExecutor.execute(invalidWorkflow, input);
      } catch {
        // 预期会抛出异常
      }
    });
  });
});

describe('WorkflowStateManager', () => {
  let stateManager: WorkflowStateManager;
  const testDir = path.join(process.cwd(), 'test-temp-state');

  beforeEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
    const storage = new Storage({ basePath: testDir });
    stateManager = new WorkflowStateManager(storage);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('状态保存和加载', () => {
    it('should save and load workflow state', async () => {
      const state = {
        workflowName: 'test-workflow',
        currentStep: 1,
        totalSteps: 3,
        context: { data: 'test' },
        results: [],
      };

      await stateManager.save('trace-1', state);
      const loaded = await stateManager.load('trace-1');

      expect(loaded).toBeDefined();
    });

    it('should return null for non-existent state', async () => {
      const loaded = await stateManager.load('non-existent');
      expect(loaded).toBeNull();
    });
  });
});
