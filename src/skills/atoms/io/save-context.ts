// save-context.skill - 保存上下文

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 保存上下文 Skill
 */
export class SaveContextSkill extends BaseSkill {
  readonly meta = {
    name: 'save-context',
    description: '保存数据到上下文',
    category: 'io' as const,
    version: '1.0.0',
    tags: ['context', 'save', 'store', 'state'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      key,          // 键名
      value,        // 值
      namespace = 'writable', // 命名空间
    } = input.task.params as {
      key?: string;
      value?: unknown;
      namespace?: string;
    };

    if (!key) {
      return this.fatalError('缺少键名 key 参数');
    }

    // 保存到上下文
    if (namespace === 'writable') {
      input.context.writable[key] = value;
    } else if (namespace === 'readOnly') {
      // 谨慎修改只读上下文
      return this.fatalError('不能直接修改只读上下文');
    }

    return this.success({
      saved: true,
      key,
      namespace,
      value,
    }, `已保存到上下文: ${key}`);
  }
}

// 导出实例
export default new SaveContextSkill();
