// ask-question.skill - 提问

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 提问 Skill
 * 根据场景向用户提问
 */
export class AskQuestionSkill extends BaseSkill {
  readonly meta = {
    name: 'ask-question',
    description: '向用户提出问题并获取回答',
    category: 'ask' as const,
    version: '1.0.0',
    tags: ['ask', 'question', 'prompt', 'user-input'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      question,      // 问题内容
      options,       // 选项（可选）
      default: defaultValue, // 默认值
      required = true, // 是否必填
    } = input.task.params as {
      question?: string;
      options?: string[];
      default?: string;
      required?: boolean;
    };

    if (!question) {
      return this.fatalError('缺少问题内容 question 参数');
    }

    // 构建问题文本
    let questionText = question;
    
    if (options && options.length > 0) {
      questionText += '\n\n选项:\n' + options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
    }

    // 返回需要用户交互的输出
    return this.needInput({
      question: questionText,
      options,
      required,
      default: defaultValue,
    }, '需要用户回答问题');
  }
}

// 导出实例
export default new AskQuestionSkill();
