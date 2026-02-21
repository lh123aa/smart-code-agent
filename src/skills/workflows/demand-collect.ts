// demand-collect.skill - 需求采集组合 Skill
// 负责收集用户需求：项目类型、基本信息、详细需求
// 接入问题库，实现场景化的关键问题采集

import { BaseSkill } from '../base.skill.js';
import { FileStorage } from '../../storage/index.js';
import { createLogger } from '../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

const logger = createLogger('DemandCollectSkill');

/**
 * 问题库结构
 */
interface QuestionLib {
  type: string;
  description: string;
  questions: Array<{
    id: string;
    category: string;
    question: string;
    required: boolean;
    options?: string[];
    placeholder?: string;
    followUp?: string[];
  }>;
}

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
  collectedAt?: string;
}

/**
 * 需求采集组合 Skill
 * 
 * 采集流程：
 * 1. 确定项目类型
 * 2. 加载对应问题库
 * 3. 按问题逐个采集
 * 4. 保存需求到上下文
 */
export class DemandCollectSkill extends BaseSkill {
  readonly meta = {
    name: 'demand-collect',
    description: '采集用户需求 - 基于问题库的场景化采集',
    category: 'utility' as const,
    version: '2.0.0',
    tags: ['demand', 'collect', 'workflow', 'requirements', 'question-lib'],
  };

  private storage: FileStorage;
  private questionLib: QuestionLib | null = null;
  private currentQuestionIndex: number = 0;
  private collectedData: CollectedData = {
    projectType: 'page',
    answers: {},
  };

  constructor() {
    super();
    this.storage = new FileStorage();
  }

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { params } = input.task;
    const { 
      projectType, 
      initialDemand,
      skipQuestions = false 
    } = params as { 
      projectType?: 'page' | 'api' | 'component' | 'project';
      initialDemand?: string;
      skipQuestions?: boolean;
    };

    // 从上下文恢复之前采集的数据
    const savedData = input.context.readOnly.collectedDemand as CollectedData | undefined;
    if (savedData) {
      this.collectedData = { ...savedData };
      this.currentQuestionIndex = (input.context.readOnly.currentQuestionIndex as number) || 0;
    }

    // 确定项目类型
    if (projectType && !this.collectedData.projectType) {
      this.collectedData.projectType = projectType;
    }

    // 加载问题库
    if (!this.questionLib) {
      this.questionLib = await this.loadQuestionLib(this.collectedData.projectType);
    }

    // 如果有初始需求，尝试提取信息
    if (initialDemand && !this.collectedData.description) {
      this.extractFromInitialDemand(initialDemand);
    }

    // 跳过问题采集模式
    if (skipQuestions || initialDemand) {
      return this.quickCollect(initialDemand);
    }

    // 检查用户回答
    const answer = params.answer as string | Record<string, unknown> | undefined;
    if (answer !== undefined) {
      return this.processAnswer(answer, input);
    }

    // 开始或继续提问
    return this.askNextQuestion(input);
  }

  /**
   * 加载问题库
   */
  private async loadQuestionLib(type: string): Promise<QuestionLib | null> {
    try {
      const libPath = `data/question-lib/${type}.json`;
      const content = await this.storage.load(libPath);
      
      if (content) {
        logger.info(`Question lib loaded: ${type}`);
        return content as QuestionLib;
      }
    } catch (error) {
      logger.warn(`Failed to load question lib: ${type}`, { error });
    }
    
    // 返回默认问题库
    return this.getDefaultQuestionLib(type);
  }

  /**
   * 默认问题库
   */
  private getDefaultQuestionLib(type: string): QuestionLib {
    const baseQuestions = [
      {
        id: 'name',
        category: 'basic',
        question: '项目/功能名称是什么？',
        required: true,
        placeholder: '例如：用户管理页面',
      },
      {
        id: 'description',
        category: 'basic',
        question: '请简要描述需求背景和目标',
        required: true,
        placeholder: '例如：需要一个用户管理页面，支持增删改查',
      },
      {
        id: 'techStack',
        category: 'tech',
        question: '使用什么技术栈？',
        required: false,
        options: ['React', 'Vue', 'Angular', 'Node.js', 'Python', '其他'],
      },
    ];

    return {
      type,
      description: `${type} 类型默认问题库`,
      questions: baseQuestions,
    };
  }

  /**
   * 从初始需求提取信息
   */
  private extractFromInitialDemand(demand: string): void {
    // 提取项目名称（第一行或前20个字符）
    const lines = demand.split('\n');
    if (lines.length > 0 && lines[0].trim()) {
      const firstLine = lines[0].trim();
      if (!this.collectedData.name && firstLine.length < 50) {
        this.collectedData.name = firstLine;
      }
    }

    // 设置描述
    if (!this.collectedData.description) {
      this.collectedData.description = demand;
    }

    // 提取技术栈关键词
    const techKeywords = ['react', 'vue', 'angular', 'node', 'typescript', 'javascript', 'python', 'go', 'java'];
    const lowerDemand = demand.toLowerCase();
    const foundTech = techKeywords.filter(t => lowerDemand.includes(t));
    if (foundTech.length > 0) {
      this.collectedData.techStack = foundTech.map(t => t.charAt(0).toUpperCase() + t.slice(1));
    }

    // 提取功能点
    this.collectedData.features = this.extractFeatures(demand);

    logger.debug('Extracted from initial demand', { 
      name: this.collectedData.name,
      techStack: this.collectedData.techStack,
      featuresCount: this.collectedData.features?.length 
    });
  }

  /**
   * 快速采集模式
   */
  private async quickCollect(initialDemand?: string): Promise<SkillOutput> {
    if (initialDemand) {
      this.collectedData.requirements = initialDemand;
    }

    this.collectedData.collectedAt = new Date().toISOString();

    return this.success({
      collectedData: this.collectedData,
      questionLibUsed: this.questionLib?.type,
      nextStage: 'demand-analysis',
    }, '需求快速采集完成');
  }

  /**
   * 处理用户回答
   */
  private async processAnswer(
    answer: string | Record<string, unknown>,
    _input: SkillInput
  ): Promise<SkillOutput> {
    const question = this.questionLib?.questions[this.currentQuestionIndex];
    
    if (!question) {
      return this.complete();
    }

    // 保存回答
    const answerValue = typeof answer === 'string' ? answer : answer[question.id];
    this.collectedData.answers[question.id] = answerValue;

    // 处理特定字段
    switch (question.id) {
      case 'name':
        this.collectedData.name = answerValue as string;
        break;
      case 'description':
        this.collectedData.description = answerValue as string;
        break;
      case 'techStack':
        this.collectedData.techStack = Array.isArray(answerValue) 
          ? answerValue as string[] 
          : [answerValue as string];
        break;
      case 'features':
        this.collectedData.features = Array.isArray(answerValue)
          ? answerValue as string[]
          : [answerValue as string];
        break;
      case 'requirements':
        this.collectedData.requirements = answerValue as string;
        this.collectedData.features = this.extractFeatures(answerValue as string);
        break;
    }

    // 移动到下一个问题
    this.currentQuestionIndex++;

    // 检查是否还有问题
    const hasMoreQuestions = this.questionLib && 
      this.currentQuestionIndex < this.questionLib.questions.length;

    if (!hasMoreQuestions) {
      return this.complete();
    }

    // 继续下一个问题
    return this.askNextQuestion(_input);
  }

  /**
   * 询问下一个问题
   */
  private askNextQuestion(_input: SkillInput): Promise<SkillOutput> {
    if (!this.questionLib) {
      return Promise.resolve(this.complete());
    }

    const question = this.questionLib.questions[this.currentQuestionIndex];

    if (!question) {
      return Promise.resolve(this.complete());
    }

    // 构建问题输出
    const questionData: Record<string, unknown> = {
      questionId: question.id,
      question: question.question,
      category: question.category,
      required: question.required,
      placeholder: question.placeholder,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questionLib.questions.length,
      collectedData: this.collectedData,
    };

    // 如果有选项
    if (question.options && question.options.length > 0) {
      questionData.options = question.options;
      questionData.type = 'select';
    } else {
      questionData.type = 'text';
    }

    return Promise.resolve(this.needInput(questionData, question.question));
  }

  /**
   * 完成采集
   */
  private complete(): SkillOutput {
    this.collectedData.collectedAt = new Date().toISOString();

    // 合并 answers 中的数据到主数据
    if (this.collectedData.answers.name && !this.collectedData.name) {
      this.collectedData.name = this.collectedData.answers.name as string;
    }
    if (this.collectedData.answers.description && !this.collectedData.description) {
      this.collectedData.description = this.collectedData.answers.description as string;
    }

    logger.info('Demand collection completed', {
      projectType: this.collectedData.projectType,
      name: this.collectedData.name,
      answersCount: Object.keys(this.collectedData.answers).length,
    });

    return this.success({
      collectedData: this.collectedData,
      questionLibUsed: this.questionLib?.type,
      questionsAnswered: this.currentQuestionIndex,
      nextStage: 'demand-analysis',
    }, '需求采集完成');
  }

  /**
   * 从需求文本中提取功能点
   */
  private extractFeatures(requirementsText: string): string[] {
    const features: string[] = [];
    
    // 按行分割，提取功能描述
    const lines = requirementsText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // 跳过空行、标题、太短的行
      if (trimmed && trimmed.length > 5 && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
        // 移除列表标记
        const cleaned = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
        if (cleaned.length > 5) {
          features.push(cleaned);
        }
      }
    }
    
    return features.slice(0, 10); // 最多 10 个功能点
  }
}

// 导出实例
export default new DemandCollectSkill();