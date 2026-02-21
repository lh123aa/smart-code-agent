// generate-test.skill - 生成测试

import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 生成测试 Skill
 * 根据代码生成测试用例
 */
export class GenerateTestSkill extends BaseSkill {
  readonly meta = {
    name: 'generate-test',
    description: '根据代码生成测试用例',
    category: 'generate' as const,
    version: '1.0.0',
    tags: ['generate', 'test', 'unit-test', 'testing'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { 
      code,        // 代码
      type = 'unit', // 测试类型
      framework = 'jest', // 测试框架
      language = 'typescript', // 语言
    } = input.task.params as {
      code?: string;
      type?: string;
      framework?: string;
      language?: string;
    };

    if (!code) {
      return this.fatalError('缺少代码 code 参数');
    }

    // 生成测试代码
    const testCode = this.generateTest(code, type, framework, language);

    return this.success({
      testCode,
      type,
      framework,
      testCases: this.countTestCases(testCode),
    }, `测试代码生成完成: ${type} (${framework})`);
  }

  /**
   * 生成测试代码
   */
  private generateTest(code: string, type: string, framework: string, language: string): string {
    // 简单提取函数名
    const functionMatch = code.match(/export\s+(?:const|function|class)\s+(\w+)/);
    const functionName = functionMatch ? functionMatch[1] : 'Component';

    if (framework === 'jest' && language === 'typescript') {
      return `// Generated Test
import { ${functionName} } from './${functionName}';

describe('${functionName}', () => {
  it('should render correctly', () => {
    // TODO: Add test implementation
    expect(true).toBe(true);
  });

  it('should handle props', () => {
    // TODO: Add test for props
    expect(true).toBe(true);
  });

  it('should handle events', () => {
    // TODO: Add test for events
    expect(true).toBe(true);
  });
});
`;
    }

    // 默认返回占位符
    return `// Generated Test
// TODO: Implement actual test generation`;
  }

  /**
   * 统计测试用例数量
   */
  private countTestCases(testCode: string): number {
    const matches = testCode.match(/it\(|test\(/g);
    return matches ? matches.length : 0;
  }
}

// 导出实例
export default new GenerateTestSkill();
