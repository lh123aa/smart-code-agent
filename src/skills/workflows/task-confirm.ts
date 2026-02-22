// task-confirm.skill - 任务确认 Skill
// 展示执行计划，获取用户确认后开始开发

import { BaseSkill } from '../base.skill.js';
import { createLogger } from '../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

const logger = createLogger('TaskConfirmSkill');

/**
 * 任务确认 Skill
 * 
 * 职责：
 * 1. 展示执行计划
 * 2. 获取用户确认
 * 3. 处理调整请求
 * 4. 触发开发流程
 */
export class TaskConfirmSkill extends BaseSkill {
  readonly meta = {
    name: 'task-confirm',
    description: '展示执行计划并获取用户确认',
    category: 'ask' as const,
    version: '1.0.0',
    tags: ['task', 'confirm', 'plan', 'workflow', 'interactive'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { params } = input.task;
    const { userResponse, taskAdjustments } = params as {
      userResponse?: 'start' | 'adjust' | 'replan' | string;
      taskAdjustments?: Array<{ taskId: string; action: 'remove' | 'modify'; data?: unknown }>;
    };

    // 从上下文获取执行计划
    const plan = input.context.writable.plan as Record<string, unknown> | undefined;
    const planMarkdown = input.context.writable.planMarkdown as string | undefined;

    if (!plan && !planMarkdown) {
      return this.fatalError('未找到执行计划，请先执行任务规划');
    }

    // 处理用户响应
    if (userResponse) {
      return this.handleUserResponse(userResponse, taskAdjustments, plan);
    }

    // 首次展示，需要用户确认
    return this.presentPlan(plan, planMarkdown);
  }

  /**
   * 展示计划，请求确认
   */
  private presentPlan(
    plan: Record<string, unknown> | undefined,
    planMarkdown: string | undefined
  ): SkillOutput {
    const summary = this.buildSummary(plan);

    const options = [
      {
        id: 'start',
        label: '🚀 开始执行',
        description: '计划已确认，开始开发任务',
      },
      {
        id: 'adjust',
        label: '✏️ 调整任务',
        description: '修改某些任务的细节或删除部分任务',
      },
      {
        id: 'replan',
        label: '🔄 重新规划',
        description: '重新拆解和规划任务',
      },
    ];

    logger.info('Presenting execution plan for confirmation', {
      projectName: plan?.projectName,
    });

    return this.needInput({
      action: 'confirm-plan',
      summary,
      planMarkdown,
      plan,
      options,
      prompt: '请确认以上执行计划，准备开始开发？',
    }, '执行计划已生成，请确认');
  }

  /**
   * 处理用户响应
   */
  private handleUserResponse(
    response: string,
    taskAdjustments: Array<{ taskId: string; action: string; data?: unknown }> | undefined,
    plan: Record<string, unknown> | undefined
  ): SkillOutput {
    const status = this.parseResponse(response);

    logger.info('User response received', { status, hasAdjustments: !!taskAdjustments });

    switch (status) {
      case 'start':
        return this.success({
          confirmed: true,
          status: 'ready',
          plan,
          confirmedAt: new Date().toISOString(),
          nextStage: 'code-generation',
          message: '✅ 计划已确认，准备开始开发！',
        }, '计划已确认，即将开始开发');

      case 'adjust':
        if (!taskAdjustments || taskAdjustments.length === 0) {
          // 需要用户提供调整内容
          return this.needInput({
            action: 'provide-adjustments',
            plan,
            prompt: '请说明需要调整的内容（可指定任务ID和调整方式）：',
          }, '请提供调整说明');
        }

        // 应用调整
        return this.retryableError('计划需要调整', {
          confirmed: false,
          status: 'needs_adjustment',
          plan,
          taskAdjustments,
          nextStage: 'task-plan',
        });

      case 'replan':
        return this.retryableError('需要重新规划', {
          confirmed: false,
          status: 'needs_replan',
          nextStage: 'task-decompose',
        });

      default:
        return this.presentPlan(plan, undefined);
    }
  }

  /**
   * 解析用户响应
   */
  private parseResponse(response: string): 'start' | 'adjust' | 'replan' {
    const lower = response.toLowerCase();

    if (lower.includes('start') || lower.includes('开始') || lower.includes('执行')) {
      return 'start';
    }

    if (lower.includes('adjust') || lower.includes('调整') || lower.includes('修改')) {
      return 'adjust';
    }

    if (lower.includes('replan') || lower.includes('重新') || lower.includes('规划')) {
      return 'replan';
    }

    return 'start';
  }

  /**
   * 构建摘要
   */
  private buildSummary(plan: Record<string, unknown> | undefined): string {
    if (!plan) return '计划摘要不可用';

    const lines: string[] = [];

    lines.push(`### 📋 ${plan.projectName || '项目'} - 执行计划摘要`);
    lines.push('');
    lines.push(`**总任务数**: ${plan.totalTasks || 0} 个`);
    lines.push(`**执行阶段**: ${plan.totalPhases || 0} 个`);
    lines.push(`**预估工时**: ${plan.estimatedTotalHours || 0} 小时`);
    lines.push('');

    // 阶段概览
    const phases = plan.phases as Array<{ id: string; name: string; tasks: string[]; estimatedHours: number }> | undefined;
    if (phases && phases.length > 0) {
      lines.push('**执行阶段**:')
      lines.push('');
      for (const phase of phases) {
        lines.push(`- ${phase.name}: ${phase.tasks.length} 个任务 (${phase.estimatedHours}h)`);
      }
      lines.push('');
    }

    // 建议
    const recommendations = plan.recommendations as string[] | undefined;
    if (recommendations && recommendations.length > 0) {
      lines.push('**建议**:')
      recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
    }

    return lines.join('\n');
  }
}

// 导出实例
export default new TaskConfirmSkill();
