// 用户修改记录器

import { Storage } from '../storage/index.js';
import { createLogger } from '../utils/logger.js';
import type { UserModification } from '../types/index.js';

const logger = createLogger('UserModificationRecorder');

/**
 * 用户修改记录器
 */
export class UserModificationRecorder {
  private storage: Storage;
  private readonly baseDir = 'observer/runs';

  constructor(storage?: Storage) {
    this.storage = storage || new Storage();
  }

  /**
   * 记录用户修改
   */
  async record(
    traceId: string,
    modification: Omit<UserModification, 'timestamp'>
  ): Promise<void> {
    const fullModification: UserModification = {
      ...modification,
      timestamp: new Date().toISOString(),
    };

    const filePath = `${this.baseDir}/${traceId}/user-modifications.json`;
    await this.storage.append(filePath, fullModification);

    logger.info(`User modification recorded`, { 
      traceId, 
      files: modification.modifiedFiles 
    });
  }

  /**
   * 获取用户修改记录
   */
  async get(traceId: string): Promise<UserModification[]> {
    const filePath = `${this.baseDir}/${traceId}/user-modifications.json`;
    const modifications = await this.storage.load<UserModification[]>(filePath);
    return modifications || [];
  }

  /**
   * 检查是否有修改记录
   */
  async hasModifications(traceId: string): Promise<boolean> {
    const modifications = await this.get(traceId);
    return modifications.length > 0;
  }

  /**
   * 删除修改记录
   */
  async delete(traceId: string): Promise<boolean> {
    const filePath = `${this.baseDir}/${traceId}/user-modifications.json`;
    return this.storage.delete(filePath);
  }
}

export default UserModificationRecorder;
