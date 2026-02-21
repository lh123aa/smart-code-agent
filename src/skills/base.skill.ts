// BaseSkill 基类 - 所有 Skill 的基类

import type { Skill, SkillInput, SkillOutput, SkillMeta } from '../types/index.js';

/**
 * BaseSkill 抽象基类
 */
export abstract class BaseSkill implements Skill {
  abstract readonly meta: SkillMeta;

  /**
   * 核心执行方法 - 子类必须实现
   */
  protected abstract execute(input: SkillInput): Promise<SkillOutput>;

  /**
   * 统一执行入口
   */
  async run(input: SkillInput): Promise<SkillOutput> {
    // 输入校验
    if (!this.validateInput(input)) {
      return {
        code: 500,
        data: {},
        message: `[${this.meta.name}] 输入格式校验失败`,
      };
    }

    // 执行
    try {
      const output = await this.execute(input);

      // 输出校验
      if (!this.validateOutput(output)) {
        return {
          code: 500,
          data: {},
          message: `[${this.meta.name}] 输出格式校验失败`,
        };
      }

      return output;
    } catch (error) {
      return {
        code: 500,
        data: {},
        message: `[${this.meta.name}] 执行异常: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 输入校验 - 可被子类重写
   */
  protected validateInput(input: SkillInput): boolean {
    return !!(
      input &&
      input.task &&
      input.task.params
    );
  }

  /**
   * 输出校验 - 可被子类重写
   */
  protected validateOutput(output: SkillOutput): boolean {
    return !!(
      output &&
      typeof output.code === 'number' &&
      [200, 300, 400, 500].includes(output.code) &&
      output.message
    );
  }

  /**
   * 创建成功输出
   */
  protected success(data: Record<string, unknown> = {}, message?: string): SkillOutput {
    return {
      code: 200,
      data,
      message: message || `${this.meta.name} 执行成功`,
    };
  }

  /**
   * 创建需要用户交互的输出
   */
  protected needInput(data: Record<string, unknown> = {}, message?: string): SkillOutput {
    return {
      code: 300,
      data,
      message: message || `${this.meta.name} 需要用户输入`,
    };
  }

  /**
   * 创建可重试失败的输出
   */
  protected retryableError(message: string, data: Record<string, unknown> = {}): SkillOutput {
    return {
      code: 400,
      data,
      message: `[${this.meta.name}] ${message}`,
    };
  }

  /**
   * 创建不可重试失败的输出
   */
  protected fatalError(message: string, data: Record<string, unknown> = {}): SkillOutput {
    return {
      code: 500,
      data,
      message: `[${this.meta.name}] ${message}`,
    };
  }
}

export default BaseSkill;
