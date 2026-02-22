// demand-confirm.skill - 需求确认组合 Skill
// 展示需求报告，获取用户确认或调整意见

import { BaseSkill } from '../base.skill.js';
import { createLogger } from '../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

const logger = createLogger('DemandConfirmSkill');

/**
 * 确认状态
 */
type ConfirmStatus = 'pending' | 'confirmed' | 'needs_adjustment' | 'needs_reclarify';

/**
 * 需求确认 Skill
 * 
 * 确认流程：
 * 1. 展示需求报告（Markdown格式）
 * 2. 提供确认选项
 * 3. 处理用户反馈
 * 4. 决定下一步
 */
export class DemandConfirmSkill extends BaseSkill {
  readonly meta = {
    name: 'demand-confirm',
    description: '展示需求报告并获取用户确认',
    category: 'ask' as const,
    version: '2.0.0',
    tags: ['demand', 'confirm', 'report', 'workflow', 'interactive'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { params } = input.task;
    const { 
      userResponse,       // 用户响应
      adjustmentNotes,    // 调整说明
    } = params as {
      userResponse?: 'confirm' | 'adjust' | 'reclarify' | string;
      adjustmentNotes?: string;
    };

    // 从上下文获取报告
    const report = input.context.readOnly.demandReport as Record<string, unknown> | undefined;
    const reportMarkdown = input.context.readOnly.demandReportMarkdown as string | undefined;
    const analysisData = input.context.writable.analysis as Record<string, unknown> | undefined;

    // 合并报告数据
    const finalReport = report || analysisData?.report;
    const finalMarkdown = reportMarkdown || analysisData?.reportMarkdown;

    if (!finalReport && !finalMarkdown && !analysisData) {
      return this.fatalError('未找到需求报告，请先执行需求分析');
    }

    // 处理用户响应
    if (userResponse) {
      return this.handleUserResponse(
        userResponse, 
        adjustmentNotes, 
        finalReport as Record<string, unknown>,
        finalMarkdown as string
      );
    }

    // 首次展示，需要用户确认
    return this.presentReport(finalReport as Record<string, unknown>, finalMarkdown as string);
  }

  /**
   * 展示报告，请求用户确认
   */
  private presentReport(
    report: Record<string, unknown>,
    reportMarkdown?: string
  ): SkillOutput {
    // 构建确认提示
    const summary = this.buildSummary(report);
    
    // 确认选项
    const options = [
      {
        id: 'confirm',
        label: '✅ 确认通过，继续拆解任务',
        description: '需求报告已完整，开始任务拆解',
      },
      {
        id: 'adjust',
        label: '✏️ 需要调整部分内容',
        description: '基本正确，但需要修改某些细节',
      },
      {
        id: 'reclarify',
        label: '🔄 重新澄清需求',
        description: '需求理解有偏差，需要重新沟通',
      },
    ];

    logger.info('Presenting demand report for confirmation', {
      projectName: report.projectName,
    });

    return this.needInput({
      action: 'confirm-demand',
      summary,
      reportMarkdown,
      report,
      options,
      prompt: '请确认以上需求分析报告是否符合您的预期？',
    }, '需求分析报告已生成，请确认');
  }

  /**
   * 处理用户响应
   */
  private handleUserResponse(
    response: string,
    adjustmentNotes: string | undefined,
    report: Record<string, unknown>,
    reportMarkdown: string | undefined
  ): SkillOutput {
    const status = this.parseResponse(response);
    
    logger.info('User response received', { status, adjustmentNotes });

    switch (status) {
      case 'confirmed':
        return this.success({
          confirmed: true,
          status: 'confirmed',
          report,
          reportMarkdown,
          confirmedAt: new Date().toISOString(),
          nextStage: 'task-decompose',
        }, '✅ 需求已确认，开始任务拆解');

      case 'needs_adjustment':
        if (!adjustmentNotes) {
          // 需要用户提供调整说明
          return this.needInput({
            action: 'provide-adjustment',
            report,
            prompt: '请说明需要调整的内容：',
          }, '请提供调整说明');
        }
        
        // 返回调整需求，由工作流决定如何处理
        return this.retryableError('需求需要调整', {
          confirmed: false,
          status: 'needs_adjustment',
          report,
          adjustmentNotes,
          nextStage: 'demand-analysis',
        });

      case 'needs_reclarify':
        return this.retryableError('需要重新澄清需求', {
          confirmed: false,
          status: 'needs_reclarify',
          report,
          nextStage: 'demand-clarify',
        });

      default:
        // 无法识别的响应，重新展示
        return this.presentReport(report, reportMarkdown);
    }
  }

  /**
   * 解析用户响应
   */
  private parseResponse(response: string): ConfirmStatus {
    const lower = response.toLowerCase();
    
    if (lower.includes('confirm') || lower.includes('确认') || lower.includes('通过')) {
      return 'confirmed';
    }
    
    if (lower.includes('adjust') || lower.includes('调整') || lower.includes('修改')) {
      return 'needs_adjustment';
    }
    
    if (lower.includes('reclarify') || lower.includes('重新') || lower.includes('澄清')) {
      return 'needs_reclarify';
    }
    
    return 'pending';
  }

  /**
   * 构建摘要
   */
  private buildSummary(report: Record<string, unknown>): string {
    const lines: string[] = [];
    
    lines.push(`### 📋 ${report.projectName || '未命名项目'}`);
    lines.push('');
    lines.push(`**项目类型**: ${this.formatProjectType(report.projectType as string)}`);
    
    if (report.objectives && Array.isArray(report.objectives)) {
      lines.push('');
      lines.push('**项目目标**:');
      report.objectives.slice(0, 3).forEach((obj: string) => {
        lines.push(`- ${obj}`);
      });
    }
    
    if (report.functionalRequirements && Array.isArray(report.functionalRequirements)) {
      lines.push('');
      lines.push(`**功能需求**: ${report.functionalRequirements.length} 项`);
    }
    
    if (report.risks && Array.isArray(report.risks) && report.risks.length > 0) {
      lines.push('');
      lines.push(`**风险项**: ${report.risks.length} 项需要注意`);
    }
    
    return lines.join('\n');
  }

  /**
   * 格式化项目类型
   */
  private formatProjectType(type: string | undefined): string {
    const typeMap: Record<string, string> = {
      page: '前端页面',
      api: 'API服务',
      component: '组件库',
      project: '完整项目',
    };
    return typeMap[type || ''] || type || '未指定';
  }
}

// 导出实例
export default new DemandConfirmSkill();