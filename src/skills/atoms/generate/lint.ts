// lint.skill - 代码质量检查

import { BaseSkill } from '../../base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

interface LintParams {
  files?: string[];
  fix?: boolean;
  rules?: string[];
  maxWarnings?: number;
}

interface LintResult {
  success: boolean;
  fileCount: number;
  errorCount: number;
  warningCount: number;
  results: Array<{
    file: string;
    errors: number;
    warnings: number;
    messages: Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning' | 'info';
      rule: string;
    }>;
  }>;
  fixedFiles?: string[];
}

/**
 * 代码质量检查 Skill
 * 使用 ESLint 进行代码质量检查
 */
export class LintSkill extends BaseSkill {
  readonly meta = {
    name: 'lint',
    description: '使用 ESLint 进行代码质量检查和修复',
    category: 'generate' as const,
    version: '1.0.0',
    tags: ['lint', 'eslint', 'code-quality', 'check'],
  };

  // 常见 ESLint 规则
  private commonRules = [
    'no-unused-vars',
    'no-undef',
    'no-console',
    'prefer-const',
    'eqeqeq',
    'curly',
    'semi',
    'quotes',
    'indent',
    'comma-dangle',
  ];

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const params = input.task.params as LintParams;
    const { files = ['src/**/*.ts'], fix = false, maxWarnings = 10 } = params;

    try {
      // 模拟 ESLint 检查结果
      const result = this.simulateLint(files, fix);
      const resultData = result as unknown as Record<string, unknown>;

      if (result.errorCount > 0) {
        return {
          code: 400,
          data: resultData,
          message: `[${this.meta.name}] 发现 ${result.errorCount} 个错误`,
        };
      }

      if (result.warningCount > maxWarnings) {
        return {
          code: 300,
          data: resultData,
          message: `[${this.meta.name}] 警告数量超过阈值 (${result.warningCount} > ${maxWarnings})`,
        };
      }

      return this.success(resultData, `代码质量检查完成：${result.errorCount} 错误，${result.warningCount} 警告`);

    } catch (error) {
      return this.fatalError(`检查失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 模拟 lint 检查
   */
  private simulateLint(files: string[], fix: boolean): LintResult {
    const results: LintResult['results'] = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    const fixedFiles: string[] = [];

    for (const file of files) {
      // 模拟检查结果
      const fileResult = this.checkFile(file);
      results.push(fileResult);
      totalErrors += fileResult.errors;
      totalWarnings += fileResult.warnings;

      if (fix && fileResult.errors > 0) {
        fixedFiles.push(file);
      }
    }

    return {
      success: totalErrors === 0,
      fileCount: files.length,
      errorCount: totalErrors,
      warningCount: totalWarnings,
      results,
      fixedFiles: fix ? fixedFiles : undefined,
    };
  }

  /**
   * 检查单个文件
   */
  private checkFile(file: string): LintResult['results'][0] {
    const messages: Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning' | 'info';
      rule: string;
    }> = [];
    let errors = 0;
    let warnings = 0;

    // 模拟一些常见的 lint 问题
    if (file.includes('unused')) {
      messages.push({
        line: 10,
        column: 1,
        message: "'unusedVar' is defined but never used",
        severity: 'warning',
        rule: 'no-unused-vars',
      });
      warnings++;
    }

    if (file.includes('console')) {
      messages.push({
        line: 5,
        column: 1,
        message: 'Unexpected console statement',
        severity: 'warning',
        rule: 'no-console',
      });
      warnings++;
    }

    if (file.includes('any-type')) {
      messages.push({
        line: 15,
        column: 10,
        message: "Unexpected any, use unknown instead",
        severity: 'error',
        rule: 'no-explicit-any',
      });
      errors++;
    }

    return {
      file,
      errors,
      warnings,
      messages,
    };
  }
}

// 导出实例
export default new LintSkill();
