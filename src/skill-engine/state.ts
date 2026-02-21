// 工作流状态管理器 - 断点恢复、状态持久化

import { Storage } from '../storage/index.js';
import { createLogger } from '../utils/logger.js';
import type { WorkflowExecution } from '../types/index.js';

const logger = createLogger('WorkflowStateManager');

/**
 * 工作流状态管理器
 */
export class WorkflowStateManager {
  private storage: Storage;
  private readonly stateDir = 'workflow-state';

  constructor(storage?: Storage) {
    this.storage = storage || new Storage();
  }

  /**
   * 保存执行状态
   */
  async save(execution: WorkflowExecution): Promise<void> {
    const filePath = `${this.stateDir}/${execution.traceId}.json`;
    await this.storage.save(filePath, execution);
    
    logger.debug(`Workflow state saved`, { traceId: execution.traceId });
  }

  /**
   * 加载执行状态
   */
  async load(traceId: string): Promise<WorkflowExecution | null> {
    const filePath = `${this.stateDir}/${traceId}.json`;
    const execution = await this.storage.load<WorkflowExecution>(filePath);
    
    if (execution) {
      logger.debug(`Workflow state loaded`, { traceId });
    }
    
    return execution;
  }

  /**
   * 检查是否存在保存的状态
   */
  async exists(traceId: string): Promise<boolean> {
    const filePath = `${this.stateDir}/${traceId}.json`;
    return this.storage.exists(filePath);
  }

  /**
   * 删除执行状态
   */
  async delete(traceId: string): Promise<boolean> {
    const filePath = `${this.stateDir}/${traceId}.json`;
    return this.storage.delete(filePath);
  }

  /**
   * 列出所有保存的执行
   */
  async list(): Promise<Array<{ traceId: string; workflowName: string; status: string; startTime: number }>> {
    const files = await this.storage.list(this.stateDir);
    
    const executions: Array<{ traceId: string; workflowName: string; status: string; startTime: number }> = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const traceId = file.replace('.json', '');
      const execution = await this.load(traceId);
      
      if (execution) {
        executions.push({
          traceId: execution.traceId,
          workflowName: execution.workflowName,
          status: execution.status,
          startTime: execution.startTime,
        });
      }
    }
    
    return executions.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * 清理过期的执行状态
   */
  async cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const executions = await this.list();
    const now = Date.now();
    let cleaned = 0;
    
    for (const execution of executions) {
      if (now - execution.startTime > maxAgeMs) {
        await this.delete(execution.traceId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired workflow states`);
    }
    
    return cleaned;
  }

  /**
   * 获取最近一次可恢复的执行
   */
  async getLastResumable(): Promise<WorkflowExecution | null> {
    const executions = await this.list();
    
    for (const execution of executions) {
      if (execution.status === 'paused' || execution.status === 'running') {
        return this.load(execution.traceId);
      }
    }
    
    return null;
  }
}

export default WorkflowStateManager;
