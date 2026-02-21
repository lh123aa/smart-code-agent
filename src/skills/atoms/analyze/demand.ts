// analyze-demand.skill - 分析需求

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 分析需求 Skill
 * 分析用户需求，提取关键信息
 */
export class AnalyzeDemandSkill extends BaseSkill {
  readonly meta = {
    name: 'analyze-demand',
    description: '分析用户需求，提取关键信息',
    category: 'analyze' as const,
    version: '1.0.0',
    tags: ['analyze', 'demand', 'parse', 'extract'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { demand, type } = input.task.params as {
      demand?: string;
      type?: string;
    };

    if (!demand) {
      return this.fatalError('缺少需求内容 demand 参数');
    }

    // 提取关键信息
    const analysis = this.extractKeyInfo(demand, type);

    return this.success({
      originalDemand: demand,
      type: analysis.type,
      keywords: analysis.keywords,
      entities: analysis.entities,
      requirements: analysis.requirements,
      analysisComplete: true,
    }, '需求分析完成');
  }

  /**
   * 提取关键信息
   */
  private extractKeyInfo(demand: string, type?: string) {
    // 简单提取，实际可接入 LLM
    const keywords: string[] = [];
    const entities: Record<string, string> = {};
    const requirements: string[] = [];

    // 检测类型
    const detectedType = type || this.detectType(demand);

    // 提取关键词
    const techKeywords = ['react', 'vue', 'angular', 'node', 'python', 'java', 'api', '数据库', '前端', '后端'];
    for (const kw of techKeywords) {
      if (demand.toLowerCase().includes(kw.toLowerCase())) {
        keywords.push(kw);
      }
    }

    // 提取实体
    if (demand.includes('页面') || demand.includes('page')) {
      entities['target'] = 'page';
    }
    if (demand.includes('接口') || demand.includes('api')) {
      entities['target'] = 'api';
    }
    if (demand.includes('组件') || demand.includes('component')) {
      entities['target'] = 'component';
    }

    // 提取需求
    if (demand.includes('增删改查')) {
      requirements.push('CRUD完整功能');
    }
    if (demand.includes('登录') || demand.includes('auth')) {
      requirements.push('用户认证');
    }
    if (demand.includes('权限')) {
      requirements.push('权限控制');
    }

    return {
      type: detectedType,
      keywords,
      entities,
      requirements,
    };
  }

  /**
   * 检测需求类型
   */
  private detectType(demand: string): string {
    const lower = demand.toLowerCase();
    
    if (lower.includes('页面') || lower.includes('page') || lower.includes('ui') || lower.includes('界面')) {
      return 'page';
    }
    if (lower.includes('接口') || lower.includes('api') || lower.includes('后端')) {
      return 'api';
    }
    if (lower.includes('组件') || lower.includes('component')) {
      return 'component';
    }
    if (lower.includes('项目') || lower.includes('project') || lower.includes('初始化')) {
      return 'project';
    }
    
    return 'unknown';
  }
}

// 导出实例
export default new AnalyzeDemandSkill();
