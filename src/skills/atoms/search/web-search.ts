// web-search.skill - Web搜索 Skill
// 调用宿主的WebSearch能力进行搜索

import { BaseSkill } from '../../base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * Web搜索 Skill
 * 用于在知识库中没有找到答案时，通过Web搜索补充知识
 */
export class WebSearchSkill extends BaseSkill {
  readonly meta = {
    name: 'web-search',
    description: '通过Web搜索获取外部知识',
    category: 'search' as const,
    version: '1.0.0',
    tags: ['search', 'web', 'external', 'learning'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { query, maxResults = 5 } = input.task.params as {
      query?: string;
      maxResults?: number;
    };

    if (!query) {
      return this.fatalError('缺少搜索查询 query 参数');
    }

    // 检查是否有可用的Web搜索能力
    // 这里会调用宿主提供的工具，如果没有则返回错误
    const webSearch = input.context.readOnly.webSearch as (
      (query: string, numResults?: number) => Promise<Array<{ title: string; url: string; content: string }>>
    ) | undefined;

    if (!webSearch) {
      // 返回需要外部搜索的信号
      return this.needInput({
        requiresExternalSearch: true,
        query,
        maxResults,
        reason: 'Web搜索需要宿主提供工具支持',
      }, '需要调用外部Web搜索');
    }

    try {
      // 执行Web搜索
      const results = await webSearch(query, maxResults);

      return this.success({
        query,
        results: results.map(r => ({
          title: r.title,
          url: r.url,
          content: r.content.substring(0, 500), // 限制内容长度
        })),
        count: results.length,
        needsLearning: results.length > 0,
      }, `Web搜索完成，找到 ${results.length} 条结果`);
    } catch (error) {
      return this.fatalError(`Web搜索失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出实例
export default new WebSearchSkill();
