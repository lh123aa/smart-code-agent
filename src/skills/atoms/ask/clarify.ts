// ask-clarify.skill - 追问澄清

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 追问澄清 Skill
 * 对用户的回答进行追问澄清
 */
export class AskClarifySkill extends BaseSkill {
  readonly meta = {
    name: 'ask-clarify',
    description: '对用户回答进行追问澄清',
    category: 'ask' as const,
    version: '1.0.0',
    tags: ['ask', 'clarify', 'follow-up', 'user-input'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      context,       // 当前上下文
      missingInfo,   // 缺失的信息
      questions,     // 澄清问题列表
    } = input.task.params as {
      context?: Record<string, unknown>;
      missingInfo?: string[];
      questions?: string[];
    };

    if (!questions || questions.length === 0) {
      return this.success({ needClarify: false }, '无需澄清，信息完整');
    }

    // 构建追问文本
    const questionText = '需要澄清以下信息:\n\n' + 
      questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

    return this.needInput({
      question: questionText,
      missingInfo,
      questions,
      context,
    }, `需要澄清 ${questions.length} 个问题`);
  }
}

// 导出实例
export default new AskClarifySkill();
