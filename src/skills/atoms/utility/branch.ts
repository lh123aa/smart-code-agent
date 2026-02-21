// branch.skill - 条件分支

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 条件分支 Skill
 * 根据条件选择不同的执行路径
 */
export class BranchSkill extends BaseSkill {
  readonly meta = {
    name: 'branch',
    description: '根据条件选择不同的执行分支',
    category: 'utility' as const,
    version: '1.0.0',
    tags: ['branch', 'condition', 'if', 'else', 'utility'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      condition,     // 条件函数
      ifTrue,        // 条件为真时执行
      ifFalse,       // 条件为假时执行
      defaultBranch, // 默认分支
    } = input.task.params as {
      condition?: (input: SkillInput) => boolean | Promise<boolean>;
      ifTrue?: () => Promise<SkillOutput>;
      ifFalse?: () => Promise<SkillOutput>;
      defaultBranch?: 'ifTrue' | 'ifFalse';
    };

    if (!condition) {
      return this.fatalError('缺少 condition 参数');
    }

    try {
      // 评估条件
      const conditionResult = await Promise.resolve(condition(input));
      
      // 根据结果选择分支
      let result: SkillOutput;
      
      if (conditionResult) {
        // 条件为真
        if (ifTrue) {
          result = await ifTrue();
        } else if (defaultBranch === 'ifFalse') {
          // 没有 ifTrue，使用默认
          result = this.success({ branch: 'default' }, '使用默认分支');
        } else {
          result = this.success({ branch: 'true', skipped: true }, '条件为真但未定义分支');
        }
      } else {
        // 条件为假
        if (ifFalse) {
          result = await ifFalse();
        } else if (defaultBranch === 'ifTrue') {
          result = this.success({ branch: 'default' }, '使用默认分支');
        } else {
          result = this.success({ branch: 'false', skipped: true }, '条件为假但未定义分支');
        }
      }

      return {
        ...result,
        data: {
          ...result.data,
          conditionResult,
        },
      };

    } catch (error) {
      return this.fatalError(`条件分支执行失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出实例
export default new BranchSkill();
