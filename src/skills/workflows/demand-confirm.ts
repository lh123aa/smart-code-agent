// demand-confirm.skill - 需求确认组合 Skill
// 负责向用户展示需求报告并确认

import { BaseSkill } from '../base.skill.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

/**
 * 需求确认组合 Skill
 * 
 * 确认流程：
 * 1. 获取需求报告
 * 2. 展示报告给用户
 * 3. 等待用户确认或调整
 * 4. 根据用户反馈决定下一步
 */
export class DemandConfirmSkill extends BaseSkill {
  readonly meta = {
    name: 'demand-confirm',
    description: '展示需求报告并获取用户确认',
    category: 'ask' as const,
    version: '1.1.0',
    tags: ['demand', 'confirm', 'report', 'workflow'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { params } = input.task;
    const { 
      report,
      reportMarkdown,
      prompt = '请确认以下需求分析报告',
      options = ['确认通过', '需要调整'],
      autoConfirm = false,
    } = params as {
      report?: Record<string, unknown>;
      reportMarkdown?: string;
      prompt?: string;
      options?: string[];
      autoConfirm?: boolean;
    };

    // 从上下文获取报告
    const contextReport = input.context.readOnly.demandReport as Record<string, unknown> | undefined;
    const contextMarkdown = input.context.readOnly.demandReportMarkdown as string | undefined;
    const analysisData = input.context.writable.analysis as Record<string, unknown> | undefined;

    const finalReport = report || contextReport || (analysisData?.report as Record<string, unknown> | undefined);
    const finalMarkdown = reportMarkdown || contextMarkdown;

    // 自动确认模式（用于测试或自动化流程）
    if (autoConfirm) {
      return this.success({
        confirmed: true,
        report: finalReport || {},
        autoConfirmed: true,
        nextStage: 'code-generation',
      }, '需求已自动确认');
    }

    if (!finalReport && !finalMarkdown && !analysisData) {
      return this.fatalError('未找到需求报告，请先执行需求分析');
    }

    // 检查用户是否已经确认
    const userAnswer = params.answer as string | undefined;
    if (userAnswer) {
      return this.handleUserResponse(userAnswer, finalReport);
    }

    // 需要用户确认
    return this.needInput({
      prompt,
      options,
      report: finalReport,
      reportMarkdown: finalMarkdown,
      analysis: analysisData,
    }, prompt);
  }

  /**
   * 处理用户响应
   */
  private handleUserResponse(answer: string, report: Record<string, unknown> | undefined): SkillOutput {
    // 判断用户是否确认
    const confirmed = answer.includes('确认') || answer.includes('通过') || answer.includes('是');
    
    if (confirmed) {
      return this.success({
        confirmed: true,
        report: report || {},
        nextStage: 'code-generation',
      }, '需求已确认，开始代码生成');
    }

    // 用户需要调整
    return this.retryableError('用户需要调整需求', {
      confirmed: false,
      report: report || {},
      needsAdjustment: true,
      feedback: answer,
    });
  }
}

// 导出实例
export default new DemandConfirmSkill();
