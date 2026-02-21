// 观察者记录器 - 阶段数据采集

import { FileStorage } from '../storage/index.js';
import { createLogger } from '../utils/logger.js';
import type { StageRecord } from '../types/index.js';

const logger = createLogger('ObserverRecorder');

/**
 * 观察者记录器
 */
export class ObserverRecorder {
  private storage: FileStorage;
  private readonly baseDir = 'observer/runs';

  constructor(storage?: FileStorage) {
    this.storage = storage || new FileStorage();
  }

  /**
   * 开始记录阶段
   */
  async startStage(traceId: string, stage: string, skills: string[]): Promise<void> {
    const record: StageRecord = {
      traceId,
      stage,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      status: 'retry' as const,
      skills,
      metrics: {},
    };

    await this.saveRecord(traceId, stage, record);
    logger.debug(`Stage started: ${stage}`, { traceId });
  }

  /**
   * 结束记录阶段
   */
  async endStage(
    traceId: string,
    stage: string,
    status: 'success' | 'failed' | 'retry',
    metrics: Record<string, unknown> = {},
    error?: { type: string; message: string; stack?: string }
  ): Promise<StageRecord> {
    const record = await this.getRecord(traceId, stage);
    
    if (!record) {
      logger.warn(`No record found for stage: ${stage}`, { traceId });
      return this.createRecord(traceId, stage, status, metrics, error);
    }

    const updatedRecord: StageRecord = {
      ...record,
      endTime: Date.now(),
      duration: Date.now() - record.startTime,
      status,
      metrics,
      error,
    };

    await this.saveRecord(traceId, stage, updatedRecord);
    logger.debug(`Stage ended: ${stage}`, { traceId, status, duration: updatedRecord.duration });

    return updatedRecord;
  }

  /**
   * 更新阶段指标
   */
  async updateMetrics(traceId: string, stage: string, metrics: Record<string, unknown>): Promise<void> {
    const record = await this.getRecord(traceId, stage);
    
    if (!record) {
      logger.warn(`No record found for stage: ${stage}`, { traceId });
      return;
    }

    record.metrics = { ...record.metrics, ...metrics };
    await this.saveRecord(traceId, stage, record);
  }

  /**
   * 获取阶段记录
   */
  async getRecord(traceId: string, stage: string): Promise<StageRecord | null> {
    const records = await this.getAllRecords(traceId);
    return records.find(r => r.stage === stage) || null;
  }

  /**
   * 获取所有阶段记录
   */
  async getAllRecords(traceId: string): Promise<StageRecord[]> {
    const filePath = `${this.baseDir}/${traceId}/stage-records.json`;
    const records = await this.storage.load<StageRecord[]>(filePath);
    return records || [];
  }

  /**
   * 创建记录（用于没有开始记录的情况）
   */
  private createRecord(
    traceId: string,
    stage: string,
    status: 'success' | 'failed' | 'retry',
    metrics: Record<string, unknown>,
    error?: { type: string; message: string; stack?: string }
  ): StageRecord {
    const record: StageRecord = {
      traceId,
      stage,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      status,
      skills: [],
      metrics,
      error,
    };

    return record;
  }

  /**
   * 保存记录
   */
  private async saveRecord(traceId: string, stage: string, record: StageRecord): Promise<void> {
    const records = await this.getAllRecords(traceId);
    const existingIndex = records.findIndex(r => r.stage === stage);
    
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    await this.storage.save(`${this.baseDir}/${traceId}/stage-records.json`, records);
  }
}

export default ObserverRecorder;
