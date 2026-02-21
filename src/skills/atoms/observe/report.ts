// observe-report.skill - 观察者报告

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 观察者报告 Skill
 * 生成观察者报告
 */
export class ObserveReportSkill extends BaseSkill {
  readonly meta = {
    name: 'observe-report',
    description: '生成观察者报告',
    category: 'observe' as const,
    version: '1.0.0',
    tags: ['observe', 'report', 'summary', 'metrics'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      type = 'summary', // 报告类型
      includeDetails = true, // 包含详情
    } = input.task.params as {
      type?: string;
      includeDetails?: boolean;
    };

    // 从上下文获取记录
    const records = input.context.writable.observerRecords as Array<{
      stage: string;
      status: string;
      metrics: Record<string, unknown>;
      timestamp: string;
    }> || [];

    // 生成报告
    const report = this.generateReport(records, type, includeDetails);

    return this.success({
      report,
      type,
      totalRecords: records.length,
      generatedAt: new Date().toISOString(),
    }, `观察者报告已生成: ${type}`);
  }

  /**
   * 生成报告
   */
  private generateReport(
    records: Array<{ stage: string; status: string; metrics: Record<string, unknown>; timestamp: string }>,
    type: string,
    includeDetails: boolean
  ): string {
    const lines: string[] = [
      '# 观察者报告',
      '',
      `## 基本信息`,
      `- 生成时间: ${new Date().toISOString()}`,
      `- 报告类型: ${type}`,
      `- 记录数量: ${records.length}`,
      '',
    ];

    // 统计
    const successCount = records.filter(r => r.status === 'success').length;
    const failCount = records.filter(r => r.status === 'failed').length;

    lines.push('## 执行统计');
    lines.push(`- 成功: ${successCount}`);
    lines.push(`- 失败: ${failCount}`);
    lines.push('');

    if (includeDetails) {
      lines.push('## 阶段详情');
      for (const record of records) {
        const statusIcon = record.status === 'success' ? '✅' : record.status === 'failed' ? '❌' : '🔄';
        lines.push(`### ${statusIcon} ${record.stage}`);
        lines.push(`- 状态: ${record.status}`);
        lines.push(`- 时间: ${record.timestamp}`);
        if (Object.keys(record.metrics).length > 0) {
          lines.push(`- 指标: ${JSON.stringify(record.metrics)}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

// 导出实例
export default new ObserveReportSkill();
