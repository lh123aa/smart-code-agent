// demand-collect.skill - 需求采集组合 Skill
// 负责收集用户需求：项目类型、基本信息、详细需求

import { BaseSkill } from '../base.skill.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

/**
 * 需求采集组合 Skill
 * 
 * 采集流程：
 * 1. 确定项目类型（页面/接口/组件/项目）
 * 2. 收集基本信息（名称、描述、技术栈）
 * 3. 收集详细需求
 * 4. 保存需求到上下文
 */
export class DemandCollectSkill extends BaseSkill {
  readonly meta = {
    name: 'demand-collect',
    description: '采集用户需求 - 项目类型、基本信息、详细需求',
    category: 'utility' as const,
    version: '1.0.0',
    tags: ['demand', 'collect', 'workflow', 'requirements'],
  };

  // 采集阶段
  private stage: 'project-type' | 'basic-info' | 'detail' | 'complete' = 'project-type';
  
  // 采集的数据
  private collectedData: {
    projectType?: string;
    name?: string;
    description?: string;
    techStack?: string[];
    features?: string[];
    requirements?: string;
  } = {};

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    const { params } = input.task;
    const { autoStart = false } = params as { autoStart?: boolean };

    // 从上下文恢复之前采集的数据
    const savedData = input.context.readOnly.collectedDemand;
    if (savedData) {
      this.collectedData = savedData as typeof this.collectedData;
      this.stage = (input.context.readOnly.demandCollectStage as typeof this.stage) || 'project-type';
    }

    // 自动开始模式：直接开始采集
    if (autoStart) {
      return this.startCollection(input);
    }

    // 根据当前阶段决定下一步
    switch (this.stage) {
      case 'project-type':
        return this.askProjectType(input);
      case 'basic-info':
        return this.askBasicInfo(input);
      case 'detail':
        return this.askDetail(input);
      case 'complete':
        return this.complete(input);
      default:
        return this.fatalError('未知采集阶段');
    }
  }

  /**
   * 开始采集
   */
  private async startCollection(input: SkillInput): Promise<SkillOutput> {
    this.stage = 'project-type';
    this.collectedData = {};
    return this.askProjectType(input);
  }

  /**
   * 询问项目类型
   */
  private async askProjectType(input: SkillInput): Promise<SkillOutput> {
    const answer = input.task.params.answer as string | undefined;
    
    if (answer) {
      // 用户已回答，保存并进入下一阶段
      this.collectedData.projectType = answer;
      this.stage = 'basic-info';
      
      return this.needInput({
        stage: 'basic-info',
        collectedData: this.collectedData,
      }, '请继续提供基本信息');
    }

    // 需要用户输入项目类型
    return this.needInput({
      question: '请选择项目类型：',
      options: ['页面开发', '接口开发', '组件封装', '项目初始化'],
      required: true,
      collectedData: this.collectedData,
    }, '请选择项目类型');
  }

  /**
   * 询问基本信息
   */
  private async askBasicInfo(input: SkillInput): Promise<SkillOutput> {
    const answer = input.task.params.answer as string | undefined;
    const basicInfo = input.task.params.basicInfo as Record<string, unknown> | undefined;

    if (basicInfo) {
      // 用户提供了基本信息
      this.collectedData.name = basicInfo.name as string;
      this.collectedData.description = basicInfo.description as string;
      this.collectedData.techStack = basicInfo.techStack as string[];
      this.stage = 'detail';
      
      return this.needInput({
        stage: 'detail',
        collectedData: this.collectedData,
      }, '请描述详细需求');
    }

    if (answer) {
      // 用户只回答了一个问题，追问更多信息
      const parts = answer.split('\n');
      if (!this.collectedData.name && parts.length > 0) {
        this.collectedData.name = parts[0].trim();
      }
      if (!this.collectedData.description && parts.length > 1) {
        this.collectedData.description = parts.slice(1).join('\n').trim();
      }
    }

    // 需要用户提供基本信息
    const projectTypeHint = this.getProjectTypeHint();
    return this.needInput({
      question: `请提供项目基本信息：\n\n1. 项目名称\n2. 项目描述\n3. 技术栈（${projectTypeHint}）`,
      required: true,
      collectedData: this.collectedData,
    }, '请提供项目基本信息');
  }

  /**
   * 询问详细需求
   */
  private async askDetail(input: SkillInput): Promise<SkillOutput> {
    const answer = input.task.params.answer as string | undefined;
    const detail = input.task.params.detail as Record<string, unknown> | undefined;

    if (detail) {
      // 用户提供了详细信息
      this.collectedData.features = detail.features as string[];
      this.collectedData.requirements = detail.requirements as string;
      this.stage = 'complete';
      
      return this.saveAndComplete(input);
    }

    if (answer) {
      // 用户直接回答了详细需求
      this.collectedData.requirements = answer;
      this.collectedData.features = this.extractFeatures(answer);
      this.stage = 'complete';
      
      return this.saveAndComplete(input);
    }

    // 根据项目类型生成不同的问题
    const detailQuestion = this.getDetailQuestion();
    
    return this.needInput({
      question: detailQuestion,
      required: true,
      collectedData: this.collectedData,
    }, '请描述详细需求');
  }

  /**
   * 保存并完成采集
   */
  private async saveAndComplete(input: SkillInput): Promise<SkillOutput> {
    // 保存到上下文
    const demandData = {
      ...this.collectedData,
      collectedAt: new Date().toISOString(),
      collectStage: this.stage,
    };

    // 返回成功结果，包含收集到的数据
    return this.success({
      collectedData: demandData,
      nextStage: 'demand-analysis',
    }, '需求采集完成');
  }

  /**
   * 完成采集
   */
  private async complete(input: SkillInput): Promise<SkillOutput> {
    return this.success({
      collectedData: this.collectedData,
      status: 'collected',
    }, '需求已采集');
  }

  /**
   * 根据项目类型获取提示
   */
  private getProjectTypeHint(): string {
    switch (this.collectedData.projectType) {
      case '页面开发':
        return '如 React, Vue, HTML/CSS';
      case '接口开发':
        return '如 Node.js, Python, Go';
      case '组件封装':
        return '如 React 组件库, Vue 组件';
      case '项目初始化':
        return '如 Next.js, NestJS, Express';
      default:
        return '如 React, Vue, Node.js';
    }
  }

  /**
   * 获取详细问题
   */
  private getDetailQuestion(): string {
    switch (this.collectedData.projectType) {
      case '页面开发':
        return `请详细描述页面需求：

1. 页面功能（必填）
2. 用户交互要求
3. 页面设计要求（布局、样式）
4. 数据展示要求
5. 其他特殊需求`;

      case '接口开发':
        return `请详细描述接口需求：

1. 接口功能（必填）
2. 请求参数
3. 响应格式
4. 业务逻辑
5. 性能要求`;

      case '组件封装':
        return `请详细描述组件需求：

1. 组件功能（必填）
2. Props 接口
3. 事件定义
4. 样式要求
5. 使用场景`;

      case '项目初始化':
        return `请详细描述项目需求：

1. 项目目标（必填）
2. 项目规模
3. 团队技术栈
4. 特殊要求`;

      default:
        return '请详细描述您的需求：';
    }
  }

  /**
   * 从需求文本中提取功能点
   */
  private extractFeatures(requirementsText: string): string[] {
    const features: string[] = [];
    
    // 简单的功能点提取：按行分割，提取包含功能描述的行
    const lines = requirementsText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 5 && !trimmed.startsWith('#')) {
        features.push(trimmed);
      }
    }
    
    return features;
  }
}

// 导出实例
export default new DemandCollectSkill();
