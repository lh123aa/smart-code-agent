// write-file.skill - 写入文件

import fs from 'fs/promises';
import path from 'path';
import { BaseSkill } from '../../../skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../../../types/index.js';

/**
 * 写入文件 Skill
 */
export class WriteFileSkill extends BaseSkill {
  readonly meta = {
    name: 'write-file',
    description: '将内容写入指定路径的文件',
    category: 'io' as const,
    version: '1.0.0',
    tags: ['file', 'write', 'io', 'save'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { filePath, content, encoding = 'utf-8', createDir = true } = input.task.params as {
      filePath?: string;
      content?: string;
      encoding?: BufferEncoding;
      createDir?: boolean;
    };

    if (!filePath) {
      return this.fatalError('缺少文件路径参数 filePath');
    }

    if (content === undefined) {
      return this.fatalError('缺少文件内容参数 content');
    }

    try {
      // 确保目录存在
      if (createDir) {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
      }

      // 写入文件
      await fs.writeFile(filePath, content, { encoding });

      // 获取文件信息
      const stats = await fs.stat(filePath);

      return this.success({
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        written: content.length,
      }, `成功写入文件: ${filePath}`);

    } catch (error) {
      return this.fatalError(`写入文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出实例
export default new WriteFileSkill();
