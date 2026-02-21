// type-check.skill - TypeScript 类型检查

import { BaseSkill } from '../../base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

interface TypeCheckParams {
  files?: string[];
  project?: string;
  noEmit?: boolean;
  skipLibCheck?: boolean;
  maxErrors?: number;
}

interface TypeError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

interface TypeCheckResult {
  success: boolean;
  fileCount: number;
  errorCount: number;
  warningCount: number;
  errors: TypeError[];
  compilationTime: number;
  suggestions?: Array<{
    file: string;
    line: number;
    message: string;
    fix: string;
  }>;
}

/**
 * TypeScript 类型检查 Skill
 */
export class TypeCheckSkill extends BaseSkill {
  readonly meta = {
    name: 'type-check',
    description: 'TypeScript 类型检查和错误修复建议',
    category: 'generate' as const,
    version: '1.0.0',
    tags: ['typescript', 'type', 'check', 'type-check'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.task.params as TypeCheckParams;
    const { 
      files = ['src/**/*.ts'], 
      project = './tsconfig.json',
      noEmit = true,
      skipLibCheck = true,
      maxErrors = 100
    } = params;

    try {
      // 模拟 TypeScript 类型检查
      const result = this.simulateTypeCheck(files, project);
      const resultData = result as unknown as Record<string, unknown>;

      if (result.errorCount > maxErrors) {
        return {
          code: 400,
          data: resultData,
          message: `[${this.meta.name}] 错误数量超过阈值 (${result.errorCount} > ${maxErrors})`,
        };
      }

      if (result.errorCount > 0) {
        return {
          code: 400,
          data: resultData,
          message: `[${this.meta.name}] 发现 ${result.errorCount} 个类型错误`,
        };
      }

      return this.success(resultData, `类型检查完成：${result.errorCount} 错误，${result.warningCount} 警告`);

    } catch (error) {
      return this.fatalError(`类型检查失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 模拟类型检查
   */
  private simulateTypeCheck(files: string[], project: string): TypeCheckResult {
    const errors: TypeError[] = [];
    let warnings = 0;

    for (const file of files) {
      // 模拟一些常见的类型错误
      if (file.includes('any')) {
        errors.push({
          file,
          line: 5,
          column: 10,
          message: "Type 'any' is not allowed. Use 'unknown' instead.",
          code: 'TS7045',
          severity: 'error',
        });
      }

      if (file.includes('null')) {
        errors.push({
          file,
          line: 10,
          column: 15,
          message: "Object is possibly 'null'",
          code: 'TS2531',
          severity: 'error',
        });
      }

      if (file.includes('undefined')) {
        errors.push({
          file,
          line: 15,
          column: 20,
          message: "Property 'prop' does not exist on type 'undefined'",
          code: 'TS2339',
          severity: 'error',
        });
      }

      if (file.includes('import')) {
        warnings++;
      }
    }

    return {
      success: errors.length === 0,
      fileCount: files.length,
      errorCount: errors.length,
      warningCount: warnings,
      errors,
      compilationTime: Math.random() * 1000 + 500,
      suggestions: errors.length > 0 ? this.generateSuggestions(errors) : undefined,
    };
  }

  /**
   * 生成修复建议
   */
  private generateSuggestions(errors: TypeError[]): TypeCheckResult['suggestions'] {
    return errors.map(error => ({
      file: error.file,
      line: error.line,
      message: error.message,
      fix: this.getFixSuggestion(error.code),
    }));
  }

  /**
   * 获取修复建议
   */
  private getFixSuggestion(code: string): string {
    const suggestions: Record<string, string> = {
      'TS7045': '将 any 替换为 unknown 或具体类型',
      'TS2531': '使用可选链 (?.) 或空值检查',
      'TS2339': '检查对象是否已初始化或使用可选链',
      'TS2345': '检查参数类型是否匹配',
      'TS2769': '检查类型注解是否正确',
    };
    return suggestions[code] || '请根据错误信息手动修复';
  }
}

// 导出实例
export default new TypeCheckSkill();
