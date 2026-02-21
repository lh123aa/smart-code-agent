// knowledge-search.skill - 知识库搜索 Skill
// 在本地知识库中搜索相关知识

import { BaseSkill } from '../../base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';
import { KnowledgeBase } from '../../../knowledge/base.js';

/**
 * 知识库搜索 Skill
 * 在本地知识库中搜索相关知识
 */
export class KnowledgeSearchSkill extends BaseSkill {
  readonly meta = {
    name: 'knowledge-search',
    description: '在本地知识库中搜索相关知识',
    category: 'search' as const,
    version: '1.0.0',
    tags: ['search', 'knowledge', 'local', 'learning'],
  };

  // 知识库实例缓存
  private knowledgeBase: KnowledgeBase | null = null;

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { query, useLocal = true } = input.task.params as {
      query?: string;
      useLocal?: boolean;
    };

    if (!query) {
      return this.fatalError('缺少搜索查询 query 参数');
    }

    // 如果不使用本地知识库，跳过
    if (!useLocal) {
      return this.success({
        skipped: true,
        reason: '未启用本地知识库搜索',
      }, '跳过本地知识库搜索');
    }

    try {
      // 初始化知识库
      if (!this.knowledgeBase) {
        this.knowledgeBase = new KnowledgeBase();
      }

      // 搜索知识
      const result = await this.knowledgeBase.search(query);

      if (result) {
        return this.success({
          found: true,
          knowledge: {
            id: result.id,
            topic: result.topic,
            content: result.content,
            summary: result.summary,
            keywords: result.keywords,
            source: result.source,
            usageCount: result.usageCount,
          },
          nextAction: 'use-knowledge',
        }, `找到相关知识: ${result.topic}`);
      }

      // 未找到知识
      return this.success({
        found: false,
        query,
        nextAction: 'web-search',
      }, '本地知识库中未找到相关知识');
    } catch (error) {
      return this.fatalError(`知识库搜索失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出实例
export default new KnowledgeSearchSkill();
