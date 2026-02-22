// quality-scorer.skill - 质量评分计算
// 综合各层测试结果，计算最终质量评分

import { BaseSkill } from '../base.skill.js';
import { createLogger } from '../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

const logger = createLogger('QualityScorerSkill');

/**
 * 测试层级
 */
type TestLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

/**
 * 层级评分结果
 */
interface LevelScore {
  level: TestLevel;
  name: string;
  score: number; // 0-100
  weight: number;
  passed: boolean;
  details?: Record<string, unknown>;
}

/**
 * 质量评分结果
 */
interface QualityScore {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  passed: boolean;
  levelScores: LevelScore[];
  breakdown: {
    category: string;
    score: number;
    weight: number;
    contribution: number;
  }[];
  summary: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  deliveryReady: boolean;
  issues: {
    critical: number;
    major: number;
    minor: number;
  };
}

/**
 * 质量评分参数
 */
interface QualityScorerParams {
  testResults?: {
    levelResults: Array<{
      level: TestLevel;
      name: string;
      score: number;
      status: string;
      details?: Record<string, unknown>;
    }>;
  };
  targetScore?: number;
}

/**
 * 质量评分 Skill
 * 计算综合质量评分，生成评分报告
 */
export class QualityScorerSkill extends BaseSkill {
  readonly meta = {
    name: 'quality-scorer',
    description: '质量评分计算 - 综合各层测试结果计算质量评分',
    category: 'analyze' as const,
    version: '1.0.0',
    tags: ['quality', 'score', 'analyze', 'workflow'],
  };

  // 各层级权重配置
  private readonly levelWeights: Record<TestLevel, { weight: number; name: string }> = {
    'L1': { weight: 0.10, name: '语法检查' },
    'L2': { weight: 0.10, name: '类型检查' },
    'L3': { weight: 0.25, name: '单元测试' },
    'L4': { weight: 0.15, name: '集成测试' },
    'L5': { weight: 0.15, name: '端到端测试' },
    'L6': { weight: 0.15, name: '性能测试' },
    'L7': { weight: 0.10, name: '安全扫描' },
  };

  // 评分等级配置
  private readonly gradeConfig: Record<'A' | 'B' | 'C' | 'D' | 'F', {
    min: number;
    label: string;
    deliveryReady: boolean;
  }> = {
    'A': { min: 90, label: '优秀', deliveryReady: true },
    'B': { min: 80, label: '良好', deliveryReady: true },
    'C': { min: 70, label: '合格', deliveryReady: true },
    'D': { min: 60, label: '需改进', deliveryReady: false },
    'F': { min: 0, label: '不合格', deliveryReady: false },
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.task.params as QualityScorerParams;
    const { targetScore = 90 } = params;

    // 从上下文获取测试结果
    const testResults = (params.testResults || input.context.readOnly.testResults) as {
      levelResults?: Array<{
        level: TestLevel;
        name: string;
        score: number;
        status: string;
        details?: Record<string, unknown>;
      }>;
    } | undefined;

    if (!testResults || !testResults.levelResults) {
      return this.fatalError('未找到测试结果，请先执行测试');
    }

    logger.info('Calculating quality score', {
      levelsCount: testResults.levelResults.length,
      targetScore,
    });

    try {
      // 计算各层级评分
      const levelScores = this.calculateLevelScores(testResults.levelResults);

      // 计算综合评分
      const overallScore = this.calculateOverallScore(levelScores);

      // 确定等级
      const grade = this.determineGrade(overallScore);

      // 生成评分分解
      const breakdown = this.generateBreakdown(levelScores);

      // 生成总结
      const summary = this.generateSummary(levelScores, overallScore, grade);

      // 统计问题数量
      const issues = this.countIssues(testResults.levelResults);

      const qualityScore: QualityScore = {
        overallScore,
        grade,
        passed: overallScore >= targetScore,
        levelScores,
        breakdown,
        summary,
        deliveryReady: this.gradeConfig[grade].deliveryReady,
        issues,
      };

      // 生成评分展示
      const scoreDisplay = this.renderScoreDisplay(qualityScore);

      if (qualityScore.passed) {
        return this.success({
          qualityScore,
          scoreDisplay,
          nextStage: 'test-report-generator',
        }, `质量评分: ${overallScore} 分 (${grade}级 - ${this.gradeConfig[grade].label})`);
      } else {
        return {
          code: 400,
          data: {
            qualityScore,
            scoreDisplay,
            nextStage: 'test-fix-loop',
          },
          message: `[${this.meta.name}] 质量评分未达标: ${overallScore} 分 (${grade}级)，目标 ${targetScore} 分`,
        };
      }

    } catch (error) {
      logger.error('Failed to calculate quality score', { error });
      return this.fatalError(`质量评分计算失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 计算各层级评分
   */
  private calculateLevelScores(
    levelResults: Array<{
      level: TestLevel;
      name: string;
      score: number;
      status: string;
      details?: Record<string, unknown>;
    }>
  ): LevelScore[] {
    return levelResults.map(result => {
      const config = this.levelWeights[result.level] || { weight: 0.1, name: result.name };
      return {
        level: result.level,
        name: config.name,
        score: result.score,
        weight: config.weight,
        passed: result.status === 'passed',
        details: result.details,
      };
    });
  }

  /**
   * 计算综合评分
   */
  private calculateOverallScore(levelScores: LevelScore[]): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const level of levelScores) {
      totalScore += level.score * level.weight;
      totalWeight += level.weight;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * 确定等级
   */
  private determineGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 生成分解报告
   */
  private generateBreakdown(levelScores: LevelScore[]): QualityScore['breakdown'] {
    return levelScores.map(level => ({
      category: `${level.level} ${level.name}`,
      score: level.score,
      weight: level.weight,
      contribution: Math.round(level.score * level.weight * 100) / 100,
    }));
  }

  /**
   * 生成总结
   */
  private generateSummary(
    levelScores: LevelScore[],
    overallScore: number,
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
  ): QualityScore['summary'] {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    for (const level of levelScores) {
      if (level.score >= 90) {
        strengths.push(`${level.name}表现优秀 (${level.score}分)`);
      } else if (level.score < 70) {
        weaknesses.push(`${level.name}需要改进 (${level.score}分)`);
        recommendations.push(`提升${level.name}覆盖率或修复相关问题`);
      } else if (level.score < 80) {
        weaknesses.push(`${level.name}有提升空间 (${level.score}分)`);
      }
    }

    // 根据等级给出总体建议
    if (grade === 'F') {
      recommendations.unshift('建议重新审视需求分析和代码实现');
    } else if (grade === 'D') {
      recommendations.unshift('建议修复关键问题后重新测试');
    } else if (grade === 'C') {
      recommendations.unshift('建议优化测试覆盖率');
    }

    if (strengths.length === 0) {
      strengths.push('暂无明显优势项');
    }

    return { strengths, weaknesses, recommendations };
  }

  /**
   * 统计问题数量
   */
  private countIssues(
    levelResults: Array<{ level?: TestLevel; status: string; details?: Record<string, unknown> }>
  ): { critical: number; major: number; minor: number } {
    let critical = 0;
    let major = 0;
    let minor = 0;

    for (const result of levelResults) {
      if (result.status === 'failed') {
        // 根据层级判断问题严重程度
        if (['L1', 'L2', 'L7'].includes(result.level || '')) {
          critical++;
        } else if (['L3', 'L4'].includes(result.level || '')) {
          major++;
        } else {
          minor++;
        }
      }
    }

    return { critical, major, minor };
  }

  /**
   * 渲染评分展示
   */
  private renderScoreDisplay(score: QualityScore): string {
    const lines: string[] = [];
    const gradeEmoji: Record<string, string> = {
      'A': '🏆',
      'B': '👍',
      'C': '✓',
      'D': '⚠️',
      'F': '❌',
    };

    lines.push('\n╔══════════════════════════════════════════════════════════╗');
    lines.push(`║  质量评分报告                                            ║`);
    lines.push('╠══════════════════════════════════════════════════════════╣');
    lines.push(`║  总分: ${String(score.overallScore).padStart(3)} 分  等级: ${gradeEmoji[score.grade]} ${score.grade} (${this.gradeConfig[score.grade].label})${' '.repeat(20)}║`);
    lines.push(`║  交付就绪: ${score.deliveryReady ? '✓ 是' : '✗ 否'}${' '.repeat(44)}║`);
    lines.push('╠══════════════════════════════════════════════════════════╣');
    lines.push('║  分项评分:                                               ║');

    for (const level of score.levelScores) {
      const statusIcon = level.passed ? '✓' : '✗';
      const scoreBar = this.generateScoreBar(level.score);
      lines.push(`║  ${statusIcon} ${level.level} ${level.name}: ${String(level.score).padStart(3)}分 ${scoreBar}║`);
    }

    lines.push('╠══════════════════════════════════════════════════════════╣');
    lines.push(`║  问题统计: 严重 ${score.issues.critical} | 主要 ${score.issues.major} | 次要 ${score.issues.minor}${' '.repeat(16)}║`);
    lines.push('╚══════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }

  /**
   * 生成评分条
   */
  private generateScoreBar(score: number): string {
    const filled = Math.floor(score / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ' ';
  }
}

// 导出实例
export default new QualityScorerSkill();
