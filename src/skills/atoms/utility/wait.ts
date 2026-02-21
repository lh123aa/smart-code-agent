// wait.skill - 等待/暂停

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 等待 Skill
 */
export class WaitSkill extends BaseSkill {
  readonly meta = {
    name: 'wait',
    description: '等待指定时间后继续执行',
    category: 'utility' as const,
    version: '1.0.0',
    tags: ['wait', 'delay', 'sleep', 'utility'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { duration, reason } = input.task.params as {
      duration?: number;
      reason?: string;
    };

    if (!duration || duration <= 0) {
      return this.fatalError('等待时间 duration 必须大于 0');
    }

    // 最大等待 5 分钟
    const maxWait = 5 * 60 * 1000;
    const actualDuration = Math.min(duration, maxWait);

    try {
      await new Promise(resolve => setTimeout(resolve, actualDuration));

      return this.success({
        waited: actualDuration,
        reason: reason || '无',
      }, `等待完成: ${actualDuration}ms${reason ? ` (${reason})` : ''}`);

    } catch (error) {
      return this.fatalError(`等待失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出实例
export default new WaitSkill();
