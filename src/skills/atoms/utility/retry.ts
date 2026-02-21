// retry.skill - 重试机制

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 重试 Skill
 * 包装一个操作，提供重试能力
 */
export class RetrySkill extends BaseSkill {
  readonly meta = {
    name: 'retry',
    description: '重试执行指定的操作',
    category: 'utility' as const,
    version: '1.0.0',
    tags: ['retry', 'retry', 'attempt', 'utility'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      action,        // 要执行的操作类型
      maxRetries = 3, // 最大重试次数
      delay = 1000,   // 重试间隔(ms)
      backoff = 1.5,  // 退避倍数
      condition,      // 成功的条件
    } = input.task.params as {
      action?: () => Promise<SkillOutput>;
      maxRetries?: number;
      delay?: number;
      backoff?: number;
      condition?: (result: SkillOutput) => boolean;
    };

    if (!action) {
      return this.fatalError('缺少 action 参数');
    }

    let lastError: Error | null = null;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await action();

        // 检查是否成功
        const isSuccess = condition 
          ? condition(result) 
          : result.code === 200;

        if (isSuccess) {
          return {
            ...result,
            data: {
              ...result.data,
              attempts: attempt,
              success: true,
            },
            message: `操作成功，尝试次数: ${attempt}`,
          };
        }

        // 检查是否可重试
        if (result.code === 400) {
          lastError = new Error(result.message);
        } else if (result.code === 500) {
          return this.fatalError(`操作不可重试失败: ${result.message}`, {
            attempts: attempt,
            lastError: lastError?.message,
          });
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // 不是最后一次，等待后重试
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay = Math.floor(currentDelay * backoff);
      }
    }

    return this.fatalError(`重试${maxRetries}次后仍失败: ${lastError?.message || '未知错误'}`, {
      attempts: maxRetries,
      lastError: lastError?.message,
    });
  }
}

// 导出实例
export default new RetrySkill();
