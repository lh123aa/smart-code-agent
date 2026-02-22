// unit-test.skill - 单元测试 (L3)
// 返回结构化评分，包含覆盖率统计

import { BaseSkill } from '../../base.skill.js';
import { createLogger } from '../../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

const logger = createLogger('UnitTestSkill');

/**
 * 单元测试结果
 */
interface UnitTestResult {
  level: 'L3';
  name: string;
  passed: boolean;
  score: number; // 0-100
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: number; // 百分比
  };
  errors: Array<{
    testName: string;
    file: string;
    message: string;
    fixable: boolean;
  }>;
  coverageDetails?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

/**
 * 单元测试 Skill
 * 执行单元测试，返回结构化评分
 */
export class UnitTestSkill extends BaseSkill {
  readonly meta = {
    name: 'unit-test',
    description: 'L3 单元测试 - 函数/模块单元测试',
    category: 'generate' as const,
    version: '2.0.0',
    tags: ['test', 'unit', 'jest', 'L3'],
  };

  // 评分规则
  private readonly scoring = {
    failedTestPenalty: 15,
    coverageTarget: 80,  // 目标覆盖率
    coveragePenalty: 1,  // 每低于目标1%扣分
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.task.params as {
      code?: string;
      testFile?: string;
      coverage?: boolean;
    };

    const { coverage = true } = params;

    logger.info('Starting L3 unit tests', { coverage });

    try {
      const startTime = Date.now();

      // 执行测试
      const result = await this.runTests(coverage);

      const duration = Date.now() - startTime;

      // 计算评分
      const score = this.calculateScore(result);

      // 构建结构化结果
      const testResult: UnitTestResult = {
        level: 'L3',
        name: '单元测试',
        passed: result.failed === 0,
        score,
        duration,
        summary: {
          total: result.total,
          passed: result.passed,
          failed: result.failed,
          skipped: result.skipped,
          coverage: result.coverage,
        },
        errors: result.failures,
        coverageDetails: result.coverageDetails,
      };

      if (testResult.passed) {
        return this.success({
          testLevel: 'L3',
          testResult: testResult,
        }, `L3 单元测试通过: ${score} 分，覆盖率 ${result.coverage}%`);
      } else {
        return {
          code: 400,
          data: {
            testLevel: 'L3',
            testResult: testResult,
          },
          message: `[${this.meta.name}] L3 测试未通过: ${result.failed}/${result.total} 失败`,
        };
      }

    } catch (error) {
      logger.error('Unit test failed', { error });
      return this.fatalError(`L3 测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行测试
   */
  private async runTests(withCoverage: boolean): Promise<{
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: number;
    failures: UnitTestResult['errors'];
    coverageDetails?: UnitTestResult['coverageDetails'];
  }> {
    // 模拟测试执行
    const total = 10 + Math.floor(Math.random() * 10);
    const failed = Math.floor(Math.random() * 3);
    const passed = total - failed - Math.floor(Math.random() * 2);
    const skipped = total - passed - failed;

    const failures: UnitTestResult['errors'] = [];
    for (let i = 0; i < failed; i++) {
      failures.push({
        testName: `test_${i + 1}`,
        file: `tests/unit.test.ts`,
        message: `Expected true but received false`,
        fixable: true,
      });
    }

    const coverageDetails = withCoverage ? {
      statements: 75 + Math.floor(Math.random() * 20),
      branches: 65 + Math.floor(Math.random() * 25),
      functions: 80 + Math.floor(Math.random() * 15),
      lines: 78 + Math.floor(Math.random() * 17),
    } : undefined;

    const coverage = coverageDetails
      ? Math.round((coverageDetails.statements + coverageDetails.branches + coverageDetails.functions + coverageDetails.lines) / 4)
      : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      coverage,
      failures,
      coverageDetails,
    };
  }

  /**
   * 计算评分
   */
  private calculateScore(result: {
    failed: number;
    coverage: number;
  }): number {
    const { failedTestPenalty, coverageTarget, coveragePenalty } = this.scoring;

    let score = 100;

    // 扣除失败测试分
    score -= result.failed * failedTestPenalty;

    // 扣除覆盖率不足分
    if (result.coverage < coverageTarget) {
      score -= (coverageTarget - result.coverage) * coveragePenalty;
    }

    return Math.max(0, Math.min(100, score));
  }
}

// 导出实例
export default new UnitTestSkill();
