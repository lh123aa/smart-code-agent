// demand-analysis.skill - 需求分析组合 Skill
// 负责分析已采集的需求，生成需求报告

import { BaseSkill } from '../base.skill.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

/**
 * 渲染 Markdown 格式的报告
 */
function renderReportMarkdown(report: Record<string, unknown>): string {
  const lines: string[] = [];
  
  // 标题
  lines.push(`# ${report.projectName} - 需求分析报告`);
  lines.push('');
  lines.push(`> 生成时间: ${new Date((report.createdAt as string) || Date.now()).toLocaleString('zh-CN')}`);
  lines.push('');
  
  // 基本信息
  lines.push('## 1. 基本信息');
  lines.push('');
  lines.push(`| 项目名称 | ${report.projectName} |`);
  lines.push(`| -------- | ------------------- |`);
  lines.push(`| 项目类型 | ${report.projectType} |`);
  lines.push(`| 技术栈 | ${(report.techStack as string[] || []).join(', ') || '未指定'} |`);
  lines.push('');
  lines.push(`**项目描述**`);
  lines.push('');
  lines.push((report.description as string) || '暂无描述');
  lines.push('');
  
  // 功能需求
  lines.push('## 2. 功能需求');
  lines.push('');
  
  const features = report.coreFeatures as string[] || [];
  if (features.length > 0) {
    lines.push('**核心功能**');
    lines.push('');
    features.forEach((feature, index) => {
      lines.push(`${index + 1}. ${feature}`);
    });
    lines.push('');
  }
  
  const funcReqs = report.functionalRequirements as string;
  if (funcReqs) {
    lines.push('**详细需求**');
    lines.push('');
    lines.push(funcReqs);
    lines.push('');
  }
  
  // 风险评估
  const risks = report.risks as string[] || [];
  if (risks.length > 0) {
    lines.push('## 3. 风险评估');
    lines.push('');
    risks.forEach((risk, index) => {
      lines.push(`${index + 1}. ${risk}`);
    });
    lines.push('');
  }
  
  // 建议
  const suggestions = report.suggestions as string[] || [];
  if (suggestions.length > 0) {
    lines.push('## 4. 建议');
    lines.push('');
    suggestions.forEach((suggestion, index) => {
      lines.push(`${index + 1}. ${suggestion}`);
    });
    lines.push('');
  }
  
  // 页脚
  lines.push('---');
  lines.push(`*版本: ${report.version}*`);
  
  return lines.join('\n');
}

/**
 * 需求分析组合 Skill
 * 
 * 分析流程：
 * 1. 获取已采集的需求数据
 * 2. 使用 analyze-demand 分析
 * 3. 生成需求报告
 * 4. 保存报告到上下文
 */
export class DemandAnalysisSkill extends BaseSkill {
  readonly meta = {
    name: 'demand-analysis',
    description: '分析需求并生成需求报告',
    category: 'analyze' as const,
    version: '1.0.0',
    tags: ['demand', 'analysis', 'report', 'workflow'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { params } = input.task;
    const { demandData, autoGenerate = false } = params as {
      demandData?: Record<string, unknown>;
      autoGenerate?: boolean;
    };

    // 从上下文获取已采集的需求
    const collectedDemand = input.context.readOnly.collectedDemand;
    if (!collectedDemand && !demandData) {
      return this.fatalError('未找到已采集的需求数据，请先执行需求采集');
    }

    // 合并需求数据
    const demand = (demandData || collectedDemand) as Record<string, unknown>;

    // 分析需求
    const analysis = this.analyzeDemand(demand);

    // 生成报告
    const report = this.generateReport(demand, analysis);

    // 渲染 Markdown
    const reportMarkdown = renderReportMarkdown(report);

    return this.success({
      analysis,
      report,
      reportMarkdown,
      nextStage: 'demand-confirm',
    }, '需求分析完成，报告已生成');
  }

  /**
   * 分析需求
   */
  private analyzeDemand(demand: Record<string, unknown>): Record<string, unknown> {
    const analysis: Record<string, unknown> = {
      projectType: demand.projectType || 'unknown',
      complexity: this.assessComplexity(demand),
      priority: this.assessPriority(demand),
      risks: this.identifyRisks(demand),
      suggestions: this.generateSuggestions(demand),
    };

    return analysis;
  }

  /**
   * 评估复杂度
   */
  private assessComplexity(demand: Record<string, unknown>): string {
    const features = demand.features as string[] || [];
    const requirements = demand.requirements as string || '';
    const techStack = demand.techStack as string[] || [];

    let score = 0;

    // 功能点数量
    if (features.length >= 5) score += 2;
    else if (features.length >= 3) score += 1;

    // 需求复杂度
    if (requirements.length > 500) score += 2;
    else if (requirements.length > 200) score += 1;

    // 技术栈数量
    if (techStack.length >= 4) score += 2;
    else if (techStack.length >= 2) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * 评估优先级
   */
  private assessPriority(demand: Record<string, unknown>): string {
    const requirements = demand.requirements as string || '';
    const lower = requirements.toLowerCase();

    // 高优先级关键词
    const highPriority = ['核心', '关键', '主要功能', '基础', '必选'];
    const lowPriority = ['可选', '增强', '优化', '后续'];

    for (const kw of highPriority) {
      if (lower.includes(kw)) return 'high';
    }

    for (const kw of lowPriority) {
      if (lower.includes(kw)) return 'low';
    }

    return 'medium';
  }

  /**
   * 识别风险
   */
  private identifyRisks(demand: Record<string, unknown>): string[] {
    const risks: string[] = [];
    const requirements = demand.requirements as string || '';
    const techStack = demand.techStack as string[] || [];

    // 技术风险
    if (techStack.length > 4) {
      risks.push('技术栈较多，可能增加维护成本');
    }

    // 需求风险
    if ((requirements.length < 50) && (!demand.features || (demand.features as string[]).length === 0)) {
      risks.push('需求描述较为简略，可能存在理解偏差');
    }

    // 第三方依赖风险
    if (requirements.includes('第三方') || requirements.includes('集成')) {
      risks.push('涉及第三方集成，可能存在接口兼容性风险');
    }

    return risks;
  }

  /**
   * 生成建议
   */
  private generateSuggestions(demand: Record<string, unknown>): string[] {
    const suggestions: string[] = [];
    const projectType = demand.projectType as string || '';
    const techStack = demand.techStack as string[] || [];

    // 根据项目类型建议
    switch (projectType) {
      case 'page':
        suggestions.push('建议先进行 UI 设计评审');
        suggestions.push('考虑响应式设计需求');
        break;
      case 'api':
        suggestions.push('建议先定义接口文档');
        suggestions.push('考虑 API 版本管理策略');
        break;
      case 'component':
        suggestions.push('建议先编写组件 Props 接口定义');
        suggestions.push('考虑组件的单元测试覆盖');
        break;
      case 'project':
        suggestions.push('建议先搭建项目骨架');
        suggestions.push('配置统一的代码规范和 CI/CD');
        break;
    }

    // 根据技术栈建议
    if (techStack.includes('React')) {
      suggestions.push('推荐使用 TypeScript 提高代码质量');
    }
    if (techStack.includes('Node')) {
      suggestions.push('注意处理异步错误和内存泄漏');
    }

    return suggestions;
  }

  /**
   * 生成报告
   */
  private generateReport(
    demand: Record<string, unknown>,
    analysis: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      projectName: demand.name || '未命名项目',
      projectType: demand.projectType || 'unknown',
      description: demand.description || '',
      techStack: demand.techStack || [],
      coreFeatures: demand.features || [],
      functionalRequirements: demand.requirements || '',
      performance: '',
      security: '',
      compatibility: '',
      risks: analysis.risks as string[] || [],
      suggestions: analysis.suggestions as string[] || [],
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}

// 导出实例
export default new DemandAnalysisSkill();
