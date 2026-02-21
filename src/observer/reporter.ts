// 观察者报告生成器

import { Storage } from '../storage/index.js';
import { createLogger } from '../utils/logger.js';
import type { StageRecord, UserModification, RunSummary } from '../types/index.js';

const logger = createLogger('ObserverReporter');

/**
 * 观察者报告生成器
 */
export class ObserverReporter {
  private storage: Storage;
  private readonly baseDir = 'observer/runs';

  constructor(storage?: Storage) {
    this.storage = storage || new Storage();
  }

  /**
   * 生成运行报告
   */
  async generateReport(traceId: string): Promise<string> {
    const summary = await this.loadSummary(traceId);
    
    if (!summary) {
      return `# 运行报告\n\n未找到运行记录: ${traceId}`;
    }

    const report = this.buildReport(summary);
    logger.info(`Report generated for: ${traceId}`);
    
    return report;
  }

  /**
   * 生成 Markdown 报告
   */
  private buildReport(summary: RunSummary): string {
    const lines: string[] = [
      '# 开发运行报告',
      '',
      '## 基本信息',
      `- 项目：${summary.projectName}`,
      `- 运行 ID：${summary.traceId}`,
      `- 开始时间：${summary.startTime}`,
      `- 结束时间：${summary.endTime}`,
      `- 总耗时：${(summary.totalDuration / 1000).toFixed(2)}秒`,
      `- 整体状态：${this.formatStatus(summary.overallStatus)}`,
      '',
    ];

    // 阶段执行详情
    lines.push('## 阶段执行详情', '');
    
    for (const stage of summary.stages) {
      lines.push(`### ${stage.stage}`);
      lines.push(`- 耗时：${stage.duration}ms`);
      lines.push(`- 状态：${this.formatStatus(stage.status)}`);
      lines.push(`- 调用 Skills：${stage.skills.join(', ')}`);
      
      if (stage.error) {
        lines.push(`- 错误：${stage.error.message}`);
      }
      
      lines.push('');
    }

    // 用户修改记录
    lines.push('## 用户修改记录', '');
    
    if (summary.userModifications.length === 0) {
      lines.push('无');
    } else {
      for (const mod of summary.userModifications) {
        lines.push(`- 文件：${mod.modifiedFiles.join(', ')}`);
        lines.push(`- 类型：${mod.modificationType}`);
        lines.push(`- 原因：${mod.userReason || '未填写'}`);
        lines.push('');
      }
    }

    // 建议
    const suggestions = this.generateSuggestions(summary);
    lines.push('## 建议（仅供人工分析参考）', '');
    lines.push(suggestions || '暂无建议');

    return lines.join('\n');
  }

  /**
   * 加载运行摘要
   */
  async loadSummary(traceId: string): Promise<RunSummary | null> {
    const summaryPath = `${this.baseDir}/${traceId}/summary.json`;
    return this.storage.load<RunSummary>(summaryPath);
  }

  /**
   * 保存运行摘要
   */
  async saveSummary(summary: RunSummary): Promise<void> {
    const summaryPath = `${this.baseDir}/${summary.traceId}/summary.json`;
    await this.storage.save(summaryPath, summary);
    logger.debug(`Summary saved: ${summary.traceId}`);
  }

  /**
   * 生成摘要
   */
  async createSummary(
    traceId: string,
    projectName: string,
    stages: StageRecord[],
    userModifications: UserModification[]
  ): Promise<RunSummary> {
    const startTime = stages.length > 0 ? new Date(stages[0].startTime).toISOString() : '';
    const endTime = stages.length > 0 
      ? new Date(stages[stages.length - 1].endTime).toISOString() 
      : '';
    const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);

    const overallStatus = stages.every(s => s.status === 'success')
      ? 'success'
      : stages.some(s => s.status === 'failed')
        ? 'failed'
        : 'partial';

    const summary: RunSummary = {
      traceId,
      projectName,
      startTime,
      endTime,
      totalDuration,
      stages,
      overallStatus,
      userModifications,
    };

    await this.saveSummary(summary);
    return summary;
  }

  /**
   * 生成建议
   */
  private generateSuggestions(summary: RunSummary): string {
    const suggestions: string[] = [];

    // 失败阶段
    const failedStages = summary.stages.filter(s => s.status === 'failed');
    if (failedStages.length > 0) {
      suggestions.push(`- 失败阶段：${failedStages.map(s => s.stage).join(', ')}`);
    }

    // 高重试阶段
    const highRetryStages = summary.stages.filter(s => s.status === 'retry');
    if (highRetryStages.length > 0) {
      suggestions.push(`- 需要重试的阶段：${highRetryStages.map(s => s.stage).join(', ')}`);
    }

    // 用户修改频繁
    if (summary.userModifications.length > 3) {
      suggestions.push(`- 用户修改频繁：${summary.userModifications.length} 次，建议分析原因`);
    }

    // 耗时过长的阶段
    const slowStages = summary.stages.filter(s => s.duration > 60000); // 超过1分钟
    if (slowStages.length > 0) {
      suggestions.push(`- 耗时较长阶段：${slowStages.map(s => `${s.stage}(${(s.duration/1000).toFixed(1)}s)`).join(', ')}`);
    }

    return suggestions.length > 0 ? suggestions.join('\n') : '';
  }

  /**
   * 格式化状态
   */
  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      success: '✅ 成功',
      failed: '❌ 失败',
      retry: '🔄 重试中',
      running: '🔵 进行中',
      paused: '⏸️ 已暂停',
      partial: '⚠️ 部分成功',
    };
    return statusMap[status] || status;
  }
}

export default ObserverReporter;
