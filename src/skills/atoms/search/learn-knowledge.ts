// learn-knowledge.skill - 学习知识 Skill
// 将Web搜索结果结构化存储到知识库

import { BaseSkill } from '../../base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';
import { KnowledgeBase } from '../../../knowledge/base.js';

/**
 * 学习知识 Skill
 * 将外部获取的知识存储到本地知识库
 */
export class LearnKnowledgeSkill extends BaseSkill {
  readonly meta = {
    name: 'learn-knowledge',
    description: '将外部知识存储到本地知识库',
    category: 'search' as const,
    version: '1.0.0',
    tags: ['learning', 'knowledge', 'store', 'external'],
  };

  private knowledgeBase: KnowledgeBase | null = null;

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      topic, 
      content, 
      keywords = [],
      source = 'web',
      sourceUrl,
    } = input.task.params as {
      topic?: string;
      content?: string;
      keywords?: string[];
      source?: 'web' | 'manual' | 'learned';
      sourceUrl?: string;
    };

    if (!topic || !content) {
      return this.fatalError('缺少学习参数: topic 和 content 为必填');
    }

    try {
      // 初始化知识库
      if (!this.knowledgeBase) {
        this.knowledgeBase = new KnowledgeBase();
      }

      // 提取关键词（如果没有提供）
      const extractedKeywords = keywords.length > 0 
        ? keywords 
        : this.extractKeywords(content, topic);

      // 生成摘要
      const summary = this.generateSummary(content);

      // 添加到知识库
      const id = await this.knowledgeBase.add({
        topic,
        content,
        summary,
        keywords: extractedKeywords,
        source,
        sourceUrl,
      });

      return this.success({
        learned: true,
        knowledgeId: id,
        topic,
        keywords: extractedKeywords,
        summary: summary.substring(0, 100) + '...',
      }, `知识学习完成: ${topic}`);
    } catch (error) {
      return this.fatalError(`学习知识失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string, topic: string): string[] {
    const keywords = new Set<string>();
    
    // 添加主题词
    keywords.add(topic.toLowerCase());

    // 简单关键词提取：提取长度3-15的词
    const words = content.split(/[\s,.,，、\n\r]+/);
    for (const word of words) {
      const trimmed = word.trim();
      if (trimmed.length >= 3 && trimmed.length <= 15) {
        keywords.add(trimmed.toLowerCase());
      }
    }

    // 限制关键词数量
    return Array.from(keywords).slice(0, 10);
  }

  /**
   * 生成摘要
   */
  private generateSummary(content: string): string {
    // 取前200字作为摘要
    const cleaned = content.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= 200) {
      return cleaned;
    }
    return cleaned.substring(0, 200) + '...';
  }
}

// 导出实例
export default new LearnKnowledgeSkill();
