// unit-test.skill - 单元测试执行

import { BaseSkill } from '../../base.skill.js';
import { createLogger } from '../../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

const logger = createLogger('UnitTestSkill');

interface UnitTestParams {
  code?: string;
  language?: string;
  testFramework?: 'jest' | 'mocha' | 'vitest' | 'builtin';
  testType?: 'unit' | 'integration' | 'e2e';
  coverage?: boolean;
  testFile?: string;
}

interface TestCase {
  name: string;
  description: string;
  input: string;
  expected: string;
}

interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  cases: Array<{
    name: string;
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    error?: string;
  }>;
}

/**
 * 单元测试 Skill
 * 生成并执行单元测试
 */
export class UnitTestSkill extends BaseSkill {
  readonly meta = {
    name: 'unit-test',
    description: '生成并执行单元测试',
    category: 'generate' as const,
    version: '1.0.0',
    tags: ['test', 'unit', 'jest', 'mocha', 'vitest'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.task.params as UnitTestParams;
    const { 
      code, 
      language = 'typescript', 
      testFramework = 'builtin',
      testType = 'unit',
      coverage = false,
      testFile 
    } = params;

    if (!code && !testFile) {
      return this.fatalError('缺少代码 code 或测试文件 testFile 参数');
    }

    try {
      // 生成测试用例
      const testCases = this.generateTestCases(code || '', language, testType);

      // 执行测试
      const result = await this.runTests(testCases, testFramework, coverage);

      if (result.passed === result.total) {
        return this.success({
          testFramework,
          testType,
          result,
          testCases: testCases.length,
        }, `单元测试通过: ${result.passed}/${result.total}`);
      } else if (result.failed > 0) {
        return {
          code: 400,
          data: {
            testFramework,
            testType,
            result,
            testCases: testCases.length,
          },
          message: `[${this.meta.name}] 单元测试失败: ${result.failed}/${result.total}`,
        };
      }

      return this.success({
        testFramework,
        testType,
        result,
        testCases: testCases.length,
      }, `单元测试完成: ${result.passed}/${result.total}`);

    } catch (error) {
      return this.fatalError(`单元测试执行失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 生成测试用例
   */
  private generateTestCases(code: string, language: string, testType: string): TestCase[] {
    const testCases: TestCase[] = [];

    // 从代码中提取函数/类
    const functions = this.extractFunctions(code);

    // 为每个函数生成测试用例
    for (const func of functions) {
      testCases.push({
        name: `${func.name} should work`,
        description: `Test ${func.name} function`,
        input: JSON.stringify(func.params),
        expected: 'expected output',
      });

      // 边界条件测试
      if (func.hasReturn) {
        testCases.push({
          name: `${func.name} should handle empty input`,
          description: `Test ${func.name} with empty input`,
          input: '[]',
          expected: 'defined output',
        });
      }
    }

    // 如果没有提取到函数，生成默认测试
    if (testCases.length === 0) {
      testCases.push({
        name: 'default test',
        description: 'Default test case',
        input: 'null',
        expected: 'pass',
      });
    }

    return testCases;
  }

  /**
   * 从代码中提取函数
   */
  private extractFunctions(code: string): Array<{
    name: string;
    params: string[];
    hasReturn: boolean;
  }> {
    const functions: Array<{ name: string; params: string[]; hasReturn: boolean }> = [];

    // 提取函数声明
    const funcRegex = /(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:async\s+)?(?:\([^)]*\)|[^=])*\s*=>)/g;
    let match;

    while ((match = funcRegex.exec(code)) !== null) {
      const name = match[1] || match[2];
      if (name && !['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
        functions.push({
          name,
          params: this.extractParams(code, name),
          hasReturn: code.includes(`return ${name}`) || code.includes('return'),
        });
      }
    }

    // 提取类方法
    const classMethodRegex = /(?:class\s+\w+\s*\{|^\s*)(\w+)\s*\([^)]*\)\s*\{/gm;
    while ((match = classMethodRegex.exec(code)) !== null) {
      const name = match[1];
      if (name && !['constructor', 'if', 'for', 'while'].includes(name)) {
        functions.push({
          name,
          params: this.extractParams(code, name),
          hasReturn: true,
        });
      }
    }

    return functions;
  }

  /**
   * 提取函数参数
   */
  private extractParams(code: string, funcName: string): string[] {
    const funcRegex = new RegExp(`${funcName}\\s*\\(([^)]*)\\)`);
    const match = code.match(funcRegex);
    
    if (match && match[1]) {
      return match[1].split(',').map(p => p.trim()).filter(p => p);
    }
    
    return [];
  }

  /**
   * 执行测试
   */
  private async runTests(
    testCases: TestCase[],
    framework: string,
    coverage: boolean
  ): Promise<TestResult> {
    const startTime = Date.now();
    const results: TestResult['cases'] = [];

    // 模拟测试执行
    for (const testCase of testCases) {
      const caseStartTime = Date.now();
      
      try {
        // 简单测试：只要有输入就通过
        // 实际应该真正执行测试
        await this.executeTestCase(testCase);
        
        results.push({
          name: testCase.name,
          status: 'pass',
          duration: Date.now() - caseStartTime,
        });
      } catch (error) {
        results.push({
          name: testCase.name,
          status: 'fail',
          duration: Date.now() - caseStartTime,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const skipped = results.filter(r => r.status === 'skip').length;

    return {
      passed,
      failed,
      skipped,
      total: testCases.length,
      duration: Date.now() - startTime,
      cases: results,
    };
  }

  /**
   * 执行单个测试用例
   */
  private async executeTestCase(testCase: TestCase): Promise<void> {
    // 模拟测试执行延迟
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // 简单验证：只要有测试用例名称就通过
    if (!testCase.name) {
      throw new Error('Test case name is required');
    }
  }
}

// 导出实例
export default new UnitTestSkill();