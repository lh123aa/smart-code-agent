// 用户修改记录器

import { FileStorage } from '../storage/index.js';
import { createLogger } from '../utils/logger.js';
import type { UserModification } from '../types/index.js';

const logger = createLogger('UserModificationRecorder');

/**
 * 用户反馈类型
 */
export type FeedbackType = 'approval' | 'rejection' | 'suggestion' | 'question' | 'issue';

/**
 * 满意度评分
 */
export type SatisfactionRating = 1 | 2 | 3 | 4 | 5;

/**
 * 增强的用户反馈
 */
export interface EnhancedFeedback {
  traceId: string;
  type: FeedbackType;
  rating?: SatisfactionRating;
  content: string;
  relatedStage?: string;
  relatedSkill?: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'addressed';
  tags?: string[];
}

/**
 * 用户修改记录器
 */
export class UserModificationRecorder {
  private storage: FileStorage;
  private readonly baseDir = 'observer/runs';
  private readonly feedbackDir = 'observer/feedback';

  constructor(storage?: FileStorage) {
    this.storage = storage || new FileStorage();
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
   * 记录用户反馈
   */
  async recordFeedback(
    feedback: Omit<EnhancedFeedback, 'createdAt' | 'status'>
  ): Promise<string> {
    const fullFeedback: EnhancedFeedback = {
      ...feedback,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const id = `${feedback.traceId}-${Date.now()}`;
    const filePath = `${this.feedbackDir}/${id}.json`;
    await this.storage.save(filePath, fullFeedback);

    logger.info(`User feedback recorded`, { 
      traceId: feedback.traceId, 
      type: feedback.type 
    });

    return id;
  }

  /**
   * 获取用户反馈
   */
  async getFeedback(traceId: string): Promise<EnhancedFeedback[]> {
    const files = await this.storage.list(this.feedbackDir);
    const feedbacks: EnhancedFeedback[] = [];

    for (const file of files) {
      if (file.startsWith(traceId)) {
        const feedback = await this.storage.load<EnhancedFeedback>(`${this.feedbackDir}/${file}`);
        if (feedback) {
          feedbacks.push(feedback);
        }
      }
    }

    return feedbacks;
  }

  /**
   * 获取所有反馈
   */
  async getAllFeedback(): Promise<EnhancedFeedback[]> {
    const files = await this.storage.list(this.feedbackDir);
    const feedbacks: EnhancedFeedback[] = [];

    for (const file of files) {
      const feedback = await this.storage.load<EnhancedFeedback>(`${this.feedbackDir}/${file}`);
      if (feedback) {
        feedbacks.push(feedback);
      }
    }

    return feedbacks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * 更新反馈状态
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: EnhancedFeedback['status']
  ): Promise<boolean> {
    const filePath = `${this.feedbackDir}/${feedbackId}.json`;
    const feedback = await this.storage.load<EnhancedFeedback>(filePath);
    
    if (!feedback) return false;

    feedback.status = status;
    await this.storage.save(filePath, feedback);
    
    logger.info(`Feedback status updated`, { feedbackId, status });
    return true;
  }

  /**
   * 获取反馈统计
   */
  async getFeedbackStats(): Promise<{
    total: number;
    byType: Record<FeedbackType, number>;
    avgRating: number;
    pending: number;
    reviewed: number;
    addressed: number;
  }> {
    const feedbacks = await this.getAllFeedback();
    
    const byType: Record<FeedbackType, number> = {
      approval: 0,
      rejection: 0,
      suggestion: 0,
      question: 0,
      issue: 0,
    };

    let totalRating = 0;
    let ratingCount = 0;
    let pending = 0;
    let reviewed = 0;
    let addressed = 0;

    for (const feedback of feedbacks) {
      byType[feedback.type]++;
      
      if (feedback.rating) {
        totalRating += feedback.rating;
        ratingCount++;
      }

      switch (feedback.status) {
        case 'pending': pending++; break;
        case 'reviewed': reviewed++; break;
        case 'addressed': addressed++; break;
      }
    }

    return {
      total: feedbacks.length,
      byType,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
      pending,
      reviewed,
      addressed,
    };
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
