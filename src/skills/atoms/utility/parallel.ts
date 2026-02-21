// parallel.skill - 并行执行

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 并行执行 Skill
 * 同时执行多个操作
 */
export class ParallelSkill extends BaseSkill {
  readonly meta = {
    name: 'parallel',
    description: '并行执行多个操作',
    category: 'utility' as const,
    version: '1.0.0',
    tags: ['parallel', 'concurrent', 'batch', 'utility'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      tasks,           // 要并行执行的任务数组
      stopOnFail = false, // 失败时是否停止其他任务
      combineResults = true, // 是否合并结果
    } = input.task.params as {
      tasks?: Array<() => Promise<SkillOutput>>;
      stopOnFail?: boolean;
      combineResults?: boolean;
    };

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return this.fatalError('缺少 tasks 参数或 tasks 为空数组');
    }

    const results: Array<{ index: number; result: SkillOutput }> = [];
    let hasFailure = false;

    try {
      // 并行执行所有任务
      const promises = tasks.map(async (task, index) => {
        if (stopOnFail && hasFailure) {
          return;
        }

        try {
          const result = await task();
          results.push({ index, result });

          // 检查是否失败
          if (result.code !== 200 && stopOnFail) {
            hasFailure = true;
          }
        } catch (error) {
          const errorResult: SkillOutput = {
            code: 500,
            data: {},
            message: `任务 ${index} 执行异常: ${error instanceof Error ? error.message : String(error)}`,
          };
          results.push({ index, result: errorResult });

          if (stopOnFail) {
            hasFailure = true;
          }
        }
      });

      await Promise.all(promises);

      // 按索引排序结果
      results.sort((a, b) => a.index - b.index);

      // 汇总结果
      const successCount = results.filter(r => r.result.code === 200).length;
      const failCount = results.length - successCount;

      if (combineResults) {
        return {
          code: hasFailure ? 400 : 200,
          data: {
            results: results.map(r => ({
              index: r.index,
              code: r.result.code,
              message: r.result.message,
              data: r.result.data,
            })),
            summary: {
              total: tasks.length,
              success: successCount,
              failed: failCount,
            },
          },
          message: `并行执行完成: ${successCount} 成功, ${failCount} 失败`,
        };
      } else {
        // 返回第一个成功的结果
        const firstSuccess = results.find(r => r.result.code === 200);
        if (firstSuccess) {
          return firstSuccess.result;
        }
        
        return this.fatalError('所有并行任务均失败', {
          results: results.map(r => r.result),
        });
      }

    } catch (error) {
      return this.fatalError(`并行执行异常: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出实例
export default new ParallelSkill();
