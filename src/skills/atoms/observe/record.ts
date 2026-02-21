// observe-record.skill - 观察者记录

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 观察者记录 Skill
 * 记录阶段执行数据
 */
export class ObserveRecordSkill extends BaseSkill {
  readonly meta = {
    name: 'observe-record',
    description: '记录观察者阶段数据',
    category: 'observe' as const,
    version: '1.0.0',
    tags: ['observe', 'record', 'monitor', 'metrics'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      stage,        // 阶段名称
      status = 'running', // 状态
      metrics = {}, // 指标
      skills = [],  // 执行的 skills
    } = input.task.params as {
      stage?: string;
      status?: string;
      metrics?: Record<string, unknown>;
      skills?: string[];
    };

    if (!stage) {
      return this.fatalError('缺少阶段名称 stage 参数');
    }

    // 记录数据到上下文
    const record = {
      stage,
      status,
      metrics,
      skills,
      timestamp: new Date().toISOString(),
      traceId: input.traceId,
    };

    // 保存到可写上下文
    const existingRecords = (input.context.writable.observerRecords as Array<typeof record> || []);
    existingRecords.push(record);

    return this.success({
      recorded: true,
      stage,
      status,
      totalRecords: existingRecords.length,
    }, `观察者记录已保存: ${stage}`);
  }
}

// 导出实例
export default new ObserveRecordSkill();
