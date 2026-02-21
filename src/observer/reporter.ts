// 观察者报告生成器

import { FileStorage } from '../storage/index.js';
import { createLogger } from '../utils/logger.js';
import type { StageRecord, UserModification, RunSummary } from '../types/index.js';

const logger = createLogger('ObserverReporter');

/**
 * 统计数据
 */
export interface ReportStatistics {
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  avgRetries: number;
  mostFailedStage: string;
  skillUsageStats: Record<string, number>;
}

/**
 * 观察者报告生成器
 */
export class ObserverReporter {
  private storage: FileStorage;
  private readonly baseDir = 'observer/runs';

  constructor(storage?: FileStorage) {
    this.storage = storage || new FileStorage();
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
   * 生成 HTML 报告
   */
  async generateHTMLReport(traceId: string): Promise<string> {
    const summary = await this.loadSummary(traceId);
    
    if (!summary) {
      return `<!DOCTYPE html>
<html><head><title>运行报告</title></head>
<body><h1>未找到运行记录: ${traceId}</h1></body></html>`;
    }

    return this.buildHTMLReport(summary);
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
   * 生成 HTML 报告
   */
  private buildHTMLReport(summary: RunSummary): string {
    const statusColor = this.getStatusColor(summary.overallStatus);
    const stageRows = summary.stages.map(stage => `
      <tr>
        <td>${stage.stage}</td>
        <td><span class="status status-${stage.status}">${this.formatStatus(stage.status)}</span></td>
        <td>${(stage.duration / 1000).toFixed(2)}s</td>
        <td>${stage.skills.join(', ') || '-'}</td>
      </tr>
    `).join('');

    const modRows = summary.userModifications.length > 0 
      ? summary.userModifications.map(mod => `
        <tr>
          <td>${mod.modifiedFiles.join(', ') || '-'}</td>
          <td>${mod.modificationType}</td>
          <td>${mod.userReason || '-'}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="3">无</td></tr>';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>开发运行报告 - ${summary.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 20px; }
    h2 { color: #555; margin: 20px 0 10px; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .info-item { padding: 10px; background: #f8f9fa; border-radius: 4px; }
    .info-label { color: #666; font-size: 12px; margin-bottom: 4px; }
    .info-value { color: #333; font-size: 16px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 500; color: #555; }
    .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .status-success { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    .status-retry { background: #fff3cd; color: #856404; }
    .status-running { background: #cce5ff; color: #004085; }
    .overall-status { display: inline-block; padding: 8px 16px; border-radius: 4px; font-size: 18px; font-weight: 500; }
    .overall-success { background: #d4edda; color: #155724; }
    .overall-failed { background: #f8d7da; color: #721c24; }
    .overall-partial { background: #fff3cd; color: #856404; }
    .suggestions { background: #e7f3ff; padding: 15px; border-radius: 4px; border-left: 4px solid #2196F3; }
    .suggestions li { margin: 8px 0; }
    .chart-container { height: 300px; display: flex; align-items: flex-end; gap: 10px; padding: 20px; }
    .bar { flex: 1; background: linear-gradient(to top, #4CAF50, #8BC34A); border-radius: 4px 4px 0 0; min-height: 20px; transition: height 0.3s; position: relative; }
    .bar:hover { opacity: 0.8; }
    .bar-label { position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); font-size: 11px; color: #666; white-space: nowrap; }
    .bar-value { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 11px; color: #333; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 开发运行报告</h1>
    
    <div class="card">
      <h2>基本信息</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">项目</div>
          <div class="info-value">${summary.projectName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">运行 ID</div>
          <div class="info-value">${summary.traceId.substring(0, 8)}...</div>
        </div>
        <div class="info-item">
          <div class="info-label">开始时间</div>
          <div class="info-value">${summary.startTime}</div>
        </div>
        <div class="info-item">
          <div class="info-label">总耗时</div>
          <div class="info-value">${(summary.totalDuration / 1000).toFixed(2)}秒</div>
        </div>
        <div class="info-item">
          <div class="info-label">整体状态</div>
          <div class="info-value"><span class="overall-status overall-${summary.overallStatus}">${this.formatStatus(summary.overallStatus)}</span></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>阶段执行详情</h2>
      <table>
        <thead>
          <tr>
            <th>阶段</th>
            <th>状态</th>
            <th>耗时</th>
            <th>调用 Skills</th>
          </tr>
        </thead>
        <tbody>
          ${stageRows}
        </tbody>
      </table>
    </div>

    ${summary.stages.length > 0 ? `
    <div class="card">
      <h2>执行时间分布</h2>
      <div class="chart-container">
        ${summary.stages.map(stage => {
          const maxDuration = Math.max(...summary.stages.map(s => s.duration));
          const height = (stage.duration / maxDuration * 250);
          return `
          <div class="bar" style="height: ${height}px">
            <span class="bar-value">${(stage.duration / 1000).toFixed(1)}s</span>
            <span class="bar-label">${stage.stage}</span>
          </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <div class="card">
      <h2>用户修改记录</h2>
      <table>
        <thead>
          <tr>
            <th>修改文件</th>
            <th>类型</th>
            <th>原因</th>
          </tr>
        </thead>
        <tbody>
          ${modRows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>💡 建议</h2>
      ${this.generateSuggestions(summary) ? `
        <ul class="suggestions">
          ${this.generateSuggestions(summary).split('\n').map(s => s.replace('- ', '<li>')).join('')}
        </ul>
      ` : '<p>暂无建议</p>'}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * 获取状态对应的颜色类
   */
  private getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      success: 'success',
      failed: 'failed',
      retry: 'retry',
      running: 'running',
    };
    return colorMap[status] || 'running';
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
   * 获取统计数据
   */
  async getStatistics(): Promise<ReportStatistics> {
    const runs = await this.listRuns();
    const summaries: RunSummary[] = [];

    for (const run of runs) {
      const summary = await this.loadSummary(run.traceId);
      if (summary) {
        summaries.push(summary);
      }
    }

    if (summaries.length === 0) {
      return {
        totalRuns: 0,
        successRate: 0,
        avgDuration: 0,
        avgRetries: 0,
        mostFailedStage: '-',
        skillUsageStats: {},
      };
    }

    // 计算统计数据
    const successCount = summaries.filter(s => s.overallStatus === 'success').length;
    const totalDuration = summaries.reduce((sum, s) => sum + s.totalDuration, 0);
    const skillUsageStats: Record<string, number> = {};

    // 统计技能使用
    for (const summary of summaries) {
      for (const stage of summary.stages) {
        for (const skill of stage.skills) {
          skillUsageStats[skill] = (skillUsageStats[skill] || 0) + 1;
        }
      }
    }

    // 最常失败的阶段
    const stageFailureCount: Record<string, number> = {};
    for (const summary of summaries) {
      for (const stage of summary.stages) {
        if (stage.status === 'failed') {
          stageFailureCount[stage.stage] = (stageFailureCount[stage.stage] || 0) + 1;
        }
      }
    }
    const mostFailedStage = Object.entries(stageFailureCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    return {
      totalRuns: summaries.length,
      successRate: (successCount / summaries.length) * 100,
      avgDuration: totalDuration / summaries.length,
      avgRetries: 0, // 需要从详细记录计算
      mostFailedStage,
      skillUsageStats,
    };
  }

  /**
   * 列出所有运行
   */
  async listRuns(): Promise<Array<{ traceId: string; time: string }>> {
    const runs = await this.storage.list(this.baseDir);
    return runs.map(r => ({
      traceId: r,
      time: r,
    }));
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
