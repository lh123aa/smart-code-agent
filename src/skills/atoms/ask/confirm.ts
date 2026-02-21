// ask-confirm.skill - 确认

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 确认 Skill
 * 向用户确认某个操作或结果
 */
export class AskConfirmSkill extends BaseSkill {
  readonly meta = {
    name: 'ask-confirm',
    description: '向用户确认操作或结果',
    category: 'ask' as const,
    version: '1.0.0',
    tags: ['ask', 'confirm', 'yes-no', 'user-input'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      prompt,       // 确认提示
      options = ['确认', '取消'], // 确认选项
      default: defaultValue, // 默认选项
    } = input.task.params as {
      prompt?: string;
      options?: string[];
      default?: string;
    };

    if (!prompt) {
      return this.fatalError('缺少确认提示 prompt 参数');
    }

    // 返回需要用户确认的输出
    return this.needInput({
      prompt,
      options,
      default: defaultValue || options[0],
    }, prompt);
  }
}

// 导出实例
export default new AskConfirmSkill();
