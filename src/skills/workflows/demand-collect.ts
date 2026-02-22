// demand-collect.skill - 需求采集组合 Skill
// 负责收集用户需求：与澄清环节配合，逐步收集用户回答

import { BaseSkill } from '../base.skill.js';
import { FileStorage } from '../../storage/index.js';
import { createLogger } from '../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

const logger = createLogger('DemandCollectSkill');

/**
 * 采集的数据结构
 */
interface CollectedData {
  projectType: 'page' | 'api' | 'component' | 'project';
  name?: string;
  description?: string;
  techStack?: string[];
  features?: string[];
  requirements?: string;
  answers: Record<string, unknown>;
  clarificationHistory: Array<{
    questionId: string;
    question: string;
    answer: string | string[];
    answeredAt: string;
  }>;
  collectedAt?: string;
  targetUsers?: string;
  interactionMode?: string;
  storageRequirement?: string;
}

/**
 * 需求采集组合 Skill
 * 
 * 新版采集流程：
 * 1. 接收澄清问题
 * 2. 收集用户回答
 * 3. 追踪采集进度
 * 4. 完成后传递给需求分析
 */
export class DemandCollectSkill extends BaseSkill {
  readonly meta = {
    name: 'demand-collect',
    description: '采集用户需求 - 配合澄清环节收集用户回答',
    category: 'workflow' as const,
    version: '2.0.0',
    tags: ['demand', 'collect', 'workflow', 'requirements', 'interactive'],
  };

  private storage: FileStorage;

  constructor() {
    super();
    this.storage = new FileStorage();
  }

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { params } = input.task;
    const { 
      projectType, 
      initialDemand,
      clarificationQuestions,  // 澄清问题列表
      currentQuestionIndex,    // 当前问题索引
      userAnswer,              // 用户回答
      collectedAnswers,        // 已收集的回答
    } = params as { 
      projectType?: 'page' | 'api' | 'component' | 'project';
      initialDemand?: string;
      clarificationQuestions?: Array<{
        id: string;
        category: string;
        priority: string;
        question: string;
        options?: string[];
      }>;
      currentQuestionIndex?: number;
      userAnswer?: string | string[];
      collectedAnswers?: Record<string, unknown>;
    };

    // 从上下文恢复数据
    const savedData = input.context.readOnly.collectedDemand as CollectedData | undefined;
    const savedQuestions = input.context.readOnly.clarificationQuestions as typeof clarificationQuestions;
    
    // 初始化或恢复采集数据
    let collectedData: CollectedData = savedData || {
      projectType: (projectType || 'page') as CollectedData['projectType'],
      answers: collectedAnswers || {},
      clarificationHistory: [],
    };

    // 确定要处理的问题列表
    const questions = clarificationQuestions || savedQuestions || [];
    const questionIndex = currentQuestionIndex ?? 0;

    // 如果有用户回答，先记录
    if (userAnswer !== undefined && questions.length > 0) {
      const currentQuestion = questions[questionIndex];
      if (currentQuestion) {
        collectedData.answers[currentQuestion.id] = userAnswer;
        collectedData.clarificationHistory.push({
          questionId: currentQuestion.id,
          question: currentQuestion.question,
          answer: Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer,
          answeredAt: new Date().toISOString(),
        });
        
        logger.debug('Answer recorded', { 
          questionId: currentQuestion.id, 
          answer: userAnswer 
        });
      }
    }

    // 从初始需求提取基础信息
    if (initialDemand && !collectedData.description) {
      collectedData = this.extractFromInitialDemand(initialDemand, collectedData);
    }

    // 计算下一个问题索引
    const nextIndex = userAnswer !== undefined ? questionIndex + 1 : questionIndex;

    // 检查是否还有问题需要回答
    if (questions.length > 0 && nextIndex < questions.length) {
      const nextQuestion = questions[nextIndex];
      
      // 需要继续收集
      return this.needInput({
        collectedData,
        currentQuestion: nextQuestion,
        questionIndex: nextIndex,
        totalQuestions: questions.length,
        progress: {
          answered: nextIndex,
          total: questions.length,
          percentage: Math.round((nextIndex / questions.length) * 100),
        },
        clarificationQuestions: questions,
      }, nextQuestion.question);
    }

    // 所有问题已回答，或没有问题
    collectedData.collectedAt = new Date().toISOString();

    // 合并回答到主数据
    collectedData = this.mergeAnswersToData(collectedData);

    logger.info('Demand collection completed', {
      projectType: collectedData.projectType,
      answersCount: Object.keys(collectedData.answers).length,
      historyCount: collectedData.clarificationHistory.length,
    });

    return this.success({
      collectedData,
      questionsAnswered: questions.length,
      nextStage: 'demand-analysis',
    }, '需求采集完成');
  }

  /**
   * 从初始需求提取基础信息
   */
  private extractFromInitialDemand(
    demand: string, 
    data: CollectedData
  ): CollectedData {
    const result = { ...data };

    // 提取项目名称
    const lines = demand.split('\n');
    if (lines.length > 0 && lines[0].trim()) {
      const firstLine = lines[0].trim();
      if (!result.name && firstLine.length < 50) {
        result.name = firstLine;
      }
    }

    // 设置描述
    result.description = demand;
    result.requirements = demand;

    // 提取技术栈关键词
    const techKeywords = ['react', 'vue', 'angular', 'node', 'typescript', 'javascript', 'python', 'go', 'java'];
    const lowerDemand = demand.toLowerCase();
    const foundTech = techKeywords.filter(t => lowerDemand.includes(t));
    if (foundTech.length > 0) {
      result.techStack = foundTech.map(t => t.charAt(0).toUpperCase() + t.slice(1));
    }

    // 提取功能点
    result.features = this.extractFeatures(demand);

    return result;
  }

  /**
   * 合并回答到主数据
   */
  private mergeAnswersToData(data: CollectedData): CollectedData {
    const result = { ...data };

    // 从澄清历史中提取结构化信息
    for (const item of data.clarificationHistory) {
      // 解析用途相关回答
      if (item.question.includes('用途') || item.question.includes('主要')) {
        if (!result.features) result.features = [];
        result.features.push(`主要用途: ${item.answer}`);
      }

      // 解析技术栈相关回答
      if (item.question.includes('技术') || item.question.includes('技术栈')) {
        if (!result.techStack) result.techStack = [];
        const techs = typeof item.answer === 'string' ? item.answer.split(/[,，、]/) : item.answer;
        result.techStack.push(...techs.map(t => t.trim()));
      }

      // 解析用户群体
      if (item.question.includes('用户') && !item.question.includes('认证')) {
        result.targetUsers = Array.isArray(item.answer) ? item.answer.join(', ') : item.answer;
      }

      // 解析交互方式
      if (item.question.includes('交互')) {
        result.interactionMode = Array.isArray(item.answer) ? item.answer.join(', ') : item.answer;
      }

      // 解析存储需求
      if (item.question.includes('存储') || item.question.includes('保存')) {
        result.storageRequirement = Array.isArray(item.answer) ? item.answer.join(', ') : item.answer;
      }
    }

    return result;
  }

  /**
   * 从需求文本中提取功能点
   */
  private extractFeatures(requirementsText: string): string[] {
    const features: string[] = [];
    
    const lines = requirementsText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 5 && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
        const cleaned = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
        if (cleaned.length > 5) {
          features.push(cleaned);
        }
      }
    }
    
    return features.slice(0, 10);
  }
}

// 导出实例
export default new DemandCollectSkill();
