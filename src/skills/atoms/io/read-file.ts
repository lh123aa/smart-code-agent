// read-file.skill - 读取文件

import fs from 'fs/promises';
import path from 'path';
import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 读取文件 Skill
 */
export class ReadFileSkill extends BaseSkill {
  readonly meta = {
    name: 'read-file',
    description: '读取指定路径的文件内容',
    category: 'io' as const,
    version: '1.0.0',
    tags: ['file', 'read', 'io'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { filePath, encoding = 'utf-8', maxSize } = input.task.params as {
      filePath?: string;
      encoding?: BufferEncoding;
      maxSize?: number;
    };

    if (!filePath) {
      return this.fatalError('缺少文件路径参数 filePath');
    }

    try {
      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch {
        return this.fatalError(`文件不存在: ${filePath}`);
      }

      // 检查文件大小
      const stats = await fs.stat(filePath);
      if (maxSize && stats.size > maxSize) {
        return this.fatalError(`文件过大: ${stats.size} bytes, 最大允许: ${maxSize} bytes`);
      }

      // 读取文件
      const content = await fs.readFile(filePath, { encoding });

      // 获取文件信息
      const fileInfo = {
        path: filePath,
        name: path.basename(filePath),
        ext: path.extname(filePath),
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
      };

      return this.success({
        content,
        fileInfo,
      }, `成功读取文件: ${filePath}`);

    } catch (error) {
      return this.fatalError(`读取文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出实例
export default new ReadFileSkill();
