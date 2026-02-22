// test-confirm.skill - 测试计划确认
// 展示测试计划，获取用户确认

import { BaseSkill } from '../base.skill.js';
import { createLogger } from '../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

const logger = createLogger('TestConfirmSkill');

/**
 * 测试层级
 */
type TestLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

/**
 * 测试计划确认参数
 */
interface TestConfirmParams {
  testPlan?: {
    projectName: string;
    totalEstimatedTime: string;
    testItems: Array<{
      level: TestLevel;
      name: string;
      required: boolean;
    }>;
    targetScore: number;
  };
  autoConfirm?: boolean;
}

/**
 * 测试计划确认 Skill
 * 展示测试计划，等待用户确认
 */
export class TestConfirmSkill extends BaseSkill {
  readonly meta = {
    name: 'test-confirm',
    description: '测试计划确认 - 展示计划并获取用户确认',
    category: 'ask' as const,
    version: '1.0.0',
    tags: ['test', 'confirm', 'workflow', 'quality'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.task.params as TestConfirmParams;
    const { autoConfirm = false } = params;

    // 从上下文获取测试计划
    const testPlan = (params.testPlan || input.context.readOnly.testPlan) as {
      projectName: string;
      totalEstimatedTime: string;
      testItems: Array<{
        level: TestLevel;
        name: string;
        required: boolean;
      }>;
      targetScore: number;
    } | undefined;

    if (!testPlan) {
      return this.fatalError('未找到测试计划，请先生成测试计划');
    }

    // 自动确认模式
    if (autoConfirm) {
      logger.info('Test plan auto-confirmed');
      return this.success({
        confirmed: true,
        testPlan,
        testLevels: testPlan.testItems.map((item) => item.level),
        nextStage: 'test-orchestrator',
      }, '测试计划已自动确认，开始执行测试');
    }

    // 检查用户是否已确认
    const userAnswer = input.task.params.answer as string | undefined;
    if (userAnswer) {
      return this.handleUserResponse(userAnswer, testPlan);
    }

    // 生成确认提示
    const confirmPrompt = this.generateConfirmPrompt(testPlan);

    return this.needInput({
      prompt: confirmPrompt,
      options: ['开始测试', '调整计划', '跳过测试'],
      testPlan,
      testLevels: testPlan.testItems.map((item) => item.level),
    }, '请确认测试计划');
  }

  /**
   * 处理用户响应
   */
  private handleUserResponse(
    answer: string,
    testPlan: {
      projectName: string;
      totalEstimatedTime: string;
      testItems: Array<{ level: TestLevel; name: string; required: boolean }>;
      targetScore: number;
    }
  ): SkillOutput {
    const confirmed = answer.includes('开始') || answer.includes('确认');

    if (confirmed) {
      return this.success({
        confirmed: true,
        testPlan,
        testLevels: testPlan.testItems.map((item) => item.level),
        nextStage: 'test-orchestrator',
      }, '测试计划已确认，准备执行测试');
    }

    if (answer.includes('跳过')) {
      return this.success({
        confirmed: false,
        skipped: true,
        testPlan,
        nextStage: 'delivery',
      }, '已跳过测试阶段');
    }

    // 需要调整计划
    return this.retryableError('用户需要调整测试计划', {
      confirmed: false,
      needsAdjustment: true,
      testPlan,
    });
  }

  /**
   * 生成确认提示
   */
  private generateConfirmPrompt(testPlan: {
    projectName: string;
    totalEstimatedTime: string;
    testItems: Array<{ level: TestLevel; name: string; required: boolean }>;
    targetScore: number;
  }): string {
    const lines: string[] = [];

    lines.push('📋 测试计划确认');
    lines.push('');
    lines.push(`项目: ${testPlan.projectName}`);
    lines.push(`预计耗时: ${testPlan.totalEstimatedTime}`);
    lines.push(`目标分数: ${testPlan.targetScore} 分`);
    lines.push('');
    lines.push('测试项目:');

    for (const item of testPlan.testItems) {
      const marker = item.required ? '✓' : '○';
      lines.push(`  ${marker} ${item.level} ${item.name}`);
    }

    lines.push('');
    lines.push('是否开始执行测试？');

    return lines.join('\n');
  }
}

// 导出实例
export default new TestConfirmSkill();
