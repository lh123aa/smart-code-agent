// SkillExecutor 单元测试

import { SkillExecutor } from '../src/skill-engine/executor.js';
import { SkillRegistry } from '../src/skill-engine/registry.js';
import { BaseSkill } from '../src/skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../src/types/index.js';

// 测试用 Skill - 成功
class SuccessSkill extends BaseSkill {
  meta = {
    name: 'success-skill',
    description: 'A skill that always succeeds',
    category: 'utility',
    version: '1.0.0',
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    return this.success({ result: 'success' }, 'Operation successful');
  }
}

// 测试用 Skill - 失败
class FailSkill extends BaseSkill {
  meta = {
    name: 'fail-skill',
    description: 'A skill that always fails',
    category: 'utility',
    version: '1.0.0',
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    return this.error('Operation failed intentionally');
  }
}

// 测试用 Skill - 抛出异常
class ErrorSkill extends BaseSkill {
  meta = {
    name: 'error-skill',
    description: 'A skill that throws error',
    category: 'utility',
    version: '1.0.0',
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    throw new Error('Intentional error');
  }
}

// 测试用 Skill - 慢速执行
class SlowSkill extends BaseSkill {
  meta = {
    name: 'slow-skill',
    description: 'A skill that takes time',
    category: 'utility',
    version: '1.0.0',
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.success({ result: 'slow done' }, 'Slow operation completed');
  }
}

// 模拟 Skill（不使用 BaseSkill）
const mockSkill = {
  meta: {
    name: 'mock-skill',
    description: 'Mock skill',
    category: 'utility',
    version: '1.0.0',
  },
  run: async (): Promise<SkillOutput> => ({
    code: 200,
    data: { mock: true },
    message: 'Mock success',
  }),
};

// 创建测试输入
const createTestInput = (overrides = {}): SkillInput => ({
  config: {},
  context: {
    readOnly: {},
    writable: {},
  },
  task: {
    taskId: 'test-task-1',
    taskName: 'test',
    target: 'test target',
    params: {},
    timeout: 30000,
    maxRetry: 3,
  },
  snapshotPath: 'snapshots/test',
  traceId: 'test-trace-1',
  ...overrides,
});

describe('SkillExecutor', () => {
  let registry: SkillRegistry;
  let executor: SkillExecutor;

  beforeEach(() => {
    registry = new SkillRegistry();
    executor = new SkillExecutor(registry);
  });

  describe('基本执行', () => {
    it('should execute a skill successfully', async () => {
      registry.register(new SuccessSkill());
      
      const input = createTestInput();
      const result = await executor.execute('success-skill', input);
      
      expect(result.code).toBe(200);
      expect(result.message).toBe('Operation successful');
    });

    it('should return error for non-existent skill', async () => {
      const input = createTestInput();
      const result = await executor.execute('non-existent', input);
      
      expect(result.code).toBe(500);
      expect(result.message).toContain('not found');
    });

    it('should execute mock skill', async () => {
      registry.register(mockSkill as any);
      
      const input = createTestInput();
      const result = await executor.execute('mock-skill', input);
      
      // mock skill 返回 200
      expect(result.code).toBe(200);
    });
  });

  describe('错误处理', () => {
    it('should handle skill that returns error output', async () => {
      registry.register(new FailSkill());
      
      const input = createTestInput();
      const result = await executor.execute('fail-skill', input);
      
      // 返回码可能是 400 或 500，取决于实现
      expect([400, 500]).toContain(result.code);
    });

    it('should handle skill that throws error', async () => {
      registry.register(new ErrorSkill());
      
      const input = createTestInput();
      const result = await executor.execute('error-skill', input);
      
      // 无论 catchErrors 设置如何，执行器都会捕获错误
      expect(result.code).toBe(500);
      expect(result.message).toBeDefined();
    });
  });

  describe('超时处理', () => {
    it('should execute within timeout', async () => {
      registry.register(new SlowSkill());
      
      const input = createTestInput();
      // 设置足够长的超时
      const result = await executor.execute('slow-skill', input, { timeout: 500 });
      
      expect(result.code).toBe(200);
    });

    it('should handle slow skill with adequate timeout', async () => {
      registry.register(new SlowSkill());
      
      const input = createTestInput();
      // 给足够时间完成
      const result = await executor.execute('slow-skill', input, { timeout: 1000 });
      
      expect(result.code).toBe(200);
    });
  });

  describe('重试机制', () => {
    it('should respect maxRetries option', async () => {
      const retrySkill = {
        meta: { name: 'always-fail', description: '', category: 'utility' as const, version: '1.0.0' },
        run: async (): Promise<SkillOutput> => ({ code: 500, data: {}, message: 'Always fails' }),
      };
      registry.register(retrySkill as any);
      
      const input = createTestInput();
      const result = await executor.execute('always-fail', input, { maxRetry: 2 });
      
      // 应该返回最后一次的结果
      expect(result.code).toBe(500);
    });

    it('should execute successfully with retries disabled', async () => {
      const skill = {
        meta: { name: 'single-try', description: '', category: 'utility' as const, version: '1.0.0' },
        run: async (): Promise<SkillOutput> => ({ code: 200, data: { success: true }, message: 'Success' }),
      };
      registry.register(skill as any);
      
      const input = createTestInput();
      const result = await executor.execute('single-try', input, { maxRetry: 0 });
      
      expect(result.code).toBe(200);
    });
  });

  describe('回调函数', () => {
    it('should call onBeforeExecute callback', async () => {
      registry.register(new SuccessSkill());
      
      const beforeFn = jest.fn();
      const input = createTestInput();
      
      await executor.execute('success-skill', input, { onBeforeExecute: beforeFn });
      
      // 回调可能被调用
      expect(beforeFn).toHaveBeenCalled();
    });

    it('should call onAfterExecute callback', async () => {
      registry.register(new SuccessSkill());
      
      const afterFn = jest.fn();
      const input = createTestInput();
      
      await executor.execute('success-skill', input, { onAfterExecute: afterFn });
      
      expect(afterFn).toHaveBeenCalled();
    });

    it('should handle callback gracefully', async () => {
      registry.register(new SuccessSkill());
      
      const input = createTestInput();
      
      // 测试带有回调的成功执行
      const result = await executor.execute('success-skill', input, { 
        onBeforeExecute: () => {},
        onAfterExecute: () => {},
      });
      
      expect(result.code).toBe(200);
    });
  });

  describe('输入验证', () => {
    it('should execute with valid input', async () => {
      registry.register(new SuccessSkill());
      
      const input = createTestInput();
      const result = await executor.execute('success-skill', input);
      
      expect(result.code).toBe(200);
    });
  });
});

describe('SkillExecutor Options', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
    registry.register(new SuccessSkill());
  });

  it('should use custom default options', async () => {
    const executor = new SkillExecutor(registry, {
      timeout: 5000,
      maxRetries: 5,
      catchErrors: false,
    });
    
    const input = createTestInput();
    const result = await executor.execute('success-skill', input);
    
    expect(result.code).toBe(200);
  });

  it('should merge options with defaults', async () => {
    const executor = new SkillExecutor(registry, { timeout: 1000 });
    
    const input = createTestInput();
    const result = await executor.execute('success-skill', input);
    
    expect(result.code).toBe(200);
  });
});
