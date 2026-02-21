// Skill 验证器 - 输入输出校验

import type { SkillInput, SkillOutput, SkillStatusCode } from '../types/index.js';

/**
 * Skill 验证器
 */
export class SkillValidator {
  /**
   * 验证 Skill 输入
   */
  validateInput(input: SkillInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查基本结构
    if (!input) {
      errors.push('Input is required');
      return { valid: false, errors };
    }

    // 检查 config
    if (!input.config || typeof input.config !== 'object') {
      errors.push('Input.config must be an object');
    }

    // 检查 context
    if (!input.context || typeof input.context !== 'object') {
      errors.push('Input.context must be an object');
    } else {
      if (!input.context.readOnly || typeof input.context.readOnly !== 'object') {
        errors.push('Input.context.readOnly must be an object');
      }
      if (!input.context.writable || typeof input.context.writable !== 'object') {
        errors.push('Input.context.writable must be an object');
      }
    }

    // 检查 task
    if (!input.task || typeof input.task !== 'object') {
      errors.push('Input.task must be an object');
    } else {
      if (!input.task.taskId || typeof input.task.taskId !== 'string') {
        errors.push('Input.task.taskId must be a non-empty string');
      }
      if (!input.task.taskName || typeof input.task.taskName !== 'string') {
        errors.push('Input.task.taskName must be a non-empty string');
      }
      if (!input.task.params || typeof input.task.params !== 'object') {
        errors.push('Input.task.params must be an object');
      }
    }

    // 检查必需字段
    if (!input.traceId || typeof input.traceId !== 'string') {
      errors.push('Input.traceId must be a non-empty string');
    }
    if (!input.snapshotPath || typeof input.snapshotPath !== 'string') {
      errors.push('Input.snapshotPath must be a non-empty string');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证 Skill 输出
   */
  validateOutput(output: SkillOutput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查基本结构
    if (!output) {
      errors.push('Output is required');
      return { valid: false, errors };
    }

    // 检查 code
    const validCodes: SkillStatusCode[] = [200, 300, 400, 500];
    if (!output.code || !validCodes.includes(output.code)) {
      errors.push(`Output.code must be one of: ${validCodes.join(', ')}`);
    }

    // 检查 data
    if (output.data === undefined || output.data === null) {
      errors.push('Output.data must be defined');
    } else if (typeof output.data !== 'object') {
      errors.push('Output.data must be an object');
    }

    // 检查 message
    if (!output.message || typeof output.message !== 'string') {
      errors.push('Output.message must be a non-empty string');
    }

    // 可选字段校验
    if (output.nextAction !== undefined && typeof output.nextAction !== 'string') {
      errors.push('Output.nextAction must be a string if provided');
    }
    if (output.needRollback !== undefined && typeof output.needRollback !== 'boolean') {
      errors.push('Output.needRollback must be a boolean if provided');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 快速验证（仅检查必要字段）
   */
  quickValidate(input: unknown): input is SkillInput {
    return !!(
      input &&
      typeof input === 'object' &&
      'task' in input &&
      'traceId' in input &&
      'context' in input
    );
  }
}

export default SkillValidator;
