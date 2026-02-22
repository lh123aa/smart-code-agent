// task-decompose.skill - 任务拆解 Skill
// 将确认后的需求拆解为可执行的开发任务

import { BaseSkill } from '../base.skill.js';
import { createLogger } from '../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

const logger = createLogger('TaskDecomposeSkill');

/**
 * 开发任务结构
 */
interface DevelopmentTask {
  id: string;
  name: string;
  description: string;
  category: 'setup' | 'core' | 'feature' | 'ui' | 'api' | 'test' | 'docs';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  estimatedHours: number;
  dependencies: string[]; // 依赖的任务ID
  deliverables: string[];
  techNotes?: string;
  subtasks?: DevelopmentTask[];
}

/**
 * 任务拆解结果
 */
interface DecompositionResult {
  projectName: string;
  totalTasks: number;
  estimatedTotalHours: number;
  tasks: DevelopmentTask[];
  taskGroups: {
    name: string;
    tasks: string[];
  }[];
  criticalPath: string[]; // 关键路径
}

/**
 * 任务拆解 Skill
 * 
 * 职责：
 * 1. 分析功能需求
 * 2. 拆解为开发任务
 * 3. 识别依赖关系
 * 4. 估算工作量
 */
export class TaskDecomposeSkill extends BaseSkill {
  readonly meta = {
    name: 'task-decompose',
    description: '将需求拆解为可执行的开发任务',
    category: 'plan' as const,
    version: '1.0.0',
    tags: ['task', 'decompose', 'plan', 'workflow'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    // 从上下文获取确认后的需求报告
    const report = input.context.readOnly.demandReport as Record<string, unknown> | undefined;
    const confirmedData = input.context.writable.confirmedDemand as Record<string, unknown> | undefined;

    if (!report && !confirmedData) {
      return this.fatalError('未找到已确认的需求报告，请先完成需求确认');
    }

    // 合并数据
    const demandData = {
      ...(report || {}),
      ...(confirmedData || {}),
    };

    // 执行任务拆解
    const decomposition = this.decompose(demandData);

    logger.info('Task decomposition completed', {
      projectName: decomposition.projectName,
      totalTasks: decomposition.totalTasks,
      estimatedHours: decomposition.estimatedTotalHours,
    });

    return this.success({
      decomposition,
      tasksMarkdown: this.renderTasksMarkdown(decomposition),
      nextStage: 'task-plan',
    }, `任务拆解完成：共 ${decomposition.totalTasks} 个任务`);
  }

  /**
   * 执行任务拆解
   */
  private decompose(demandData: Record<string, unknown>): DecompositionResult {
    const projectName = (demandData.projectName as string) || '未命名项目';
    const projectType = (demandData.projectType as string) || 'page';
    const functionalReqs = (demandData.functionalRequirements as Array<Record<string, unknown>>) || [];
    const techRecommendations = (demandData.techRecommendations as Record<string, string[]>) || {};

    const tasks: DevelopmentTask[] = [];
    let taskId = 1;

    // 1. 项目初始化任务
    const setupTasks = this.createSetupTasks(projectType, techRecommendations);
    setupTasks.forEach(task => {
      task.id = `T-${String(taskId++).padStart(3, '0')}`;
      tasks.push(task);
    });

    // 2. 核心功能任务
    const coreTasks = this.createCoreTasks(projectType, demandData);
    coreTasks.forEach(task => {
      task.id = `T-${String(taskId++).padStart(3, '0')}`;
      tasks.push(task);
    });

    // 3. 功能需求任务
    const featureTasks = this.createFeatureTasks(functionalReqs, tasks);
    featureTasks.forEach(task => {
      task.id = `T-${String(taskId++).padStart(3, '0')}`;
      tasks.push(task);
    });

    // 4. UI/样式任务
    const uiTasks = this.createUITasks(projectType, demandData, tasks);
    uiTasks.forEach(task => {
      task.id = `T-${String(taskId++).padStart(3, '0')}`;
      tasks.push(task);
    });

    // 5. 测试任务
    const testTasks = this.createTestTasks(tasks);
    testTasks.forEach(task => {
      task.id = `T-${String(taskId++).padStart(3, '0')}`;
      tasks.push(task);
    });

    // 计算总工时
    const estimatedTotalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

    // 任务分组
    const taskGroups = this.groupTasks(tasks);

    // 关键路径
    const criticalPath = this.calculateCriticalPath(tasks);

    return {
      projectName,
      totalTasks: tasks.length,
      estimatedTotalHours,
      tasks,
      taskGroups,
      criticalPath,
    };
  }

  /**
   * 创建项目初始化任务
   */
  private createSetupTasks(
    projectType: string,
    techRecommendations: Record<string, string[]>
  ): DevelopmentTask[] {
    const tasks: DevelopmentTask[] = [];
    const frontendTech = techRecommendations.frontend?.[0] || 'React';

    tasks.push({
      id: '',
      name: '初始化项目',
      description: `创建${projectType}项目，配置开发环境`,
      category: 'setup',
      priority: 'P0',
      estimatedHours: 1,
      dependencies: [],
      deliverables: ['项目骨架', 'package.json', '基础配置文件'],
      techNotes: `使用 ${frontendTech} 创建项目`,
    });

    tasks.push({
      id: '',
      name: '配置代码规范',
      description: '配置 ESLint、Prettier、TypeScript 等代码规范工具',
      category: 'setup',
      priority: 'P0',
      estimatedHours: 0.5,
      dependencies: ['T-001'],
      deliverables: ['.eslintrc', '.prettierrc', 'tsconfig.json'],
    });

    tasks.push({
      id: '',
      name: '配置构建工具',
      description: '配置 Vite/Webpack 等构建工具',
      category: 'setup',
      priority: 'P0',
      estimatedHours: 0.5,
      dependencies: ['T-001'],
      deliverables: ['vite.config.ts / webpack.config.js'],
    });

    return tasks;
  }

  /**
   * 创建核心功能任务
   */
  private createCoreTasks(
    projectType: string,
    demandData: Record<string, unknown>
  ): DevelopmentTask[] {
    const tasks: DevelopmentTask[] = [];
    const desc = (demandData.originalDemand as string) || '';
    const lowerDesc = desc.toLowerCase();

    // 画布/画板特殊处理
    if (lowerDesc.includes('画布') || lowerDesc.includes('画板')) {
      tasks.push({
        id: '',
        name: '实现画布核心组件',
        description: '创建可缩放、可平移的无限画布组件',
        category: 'core',
        priority: 'P0',
        estimatedHours: 4,
        dependencies: ['T-001'],
        deliverables: ['Canvas.vue / Canvas.tsx', '画布渲染逻辑'],
        techNotes: '使用 HTML5 Canvas 或 Fabric.js/Konva.js',
        subtasks: [
          {
            id: 'T-004-1',
            name: '实现画布基础渲染',
            description: '实现基础画布渲染和尺寸适配',
            category: 'core',
            priority: 'P0',
            estimatedHours: 2,
            dependencies: [],
            deliverables: ['画布初始化', '尺寸响应式适配'],
          },
          {
            id: 'T-004-2',
            name: '实现缩放平移功能',
            description: '实现鼠标滚轮缩放和拖拽平移',
            category: 'core',
            priority: 'P0',
            estimatedHours: 2,
            dependencies: ['T-004-1'],
            deliverables: ['缩放控制器', '平移控制器'],
          },
        ],
      });

      tasks.push({
        id: '',
        name: '实现绘图工具',
        description: '实现画笔、橡皮、选择等基础工具',
        category: 'core',
        priority: 'P0',
        estimatedHours: 3,
        dependencies: ['T-004'],
        deliverables: ['画笔工具', '橡皮工具', '选择工具', '工具管理器'],
        subtasks: [
          {
            id: 'T-005-1',
            name: '实现画笔工具',
            description: '支持自由绘制，颜色和粗细设置',
            category: 'core',
            priority: 'P0',
            estimatedHours: 1.5,
            dependencies: [],
            deliverables: ['画笔渲染', '笔触设置'],
          },
          {
            id: 'T-005-2',
            name: '实现橡皮工具',
            description: '支持擦除已绘制内容',
            category: 'core',
            priority: 'P1',
            estimatedHours: 1,
            dependencies: [],
            deliverables: ['橡皮擦功能'],
          },
        ],
      });

      tasks.push({
        id: '',
        name: '实现撤销重做',
        description: '实现操作历史栈，支持撤销和重做',
        category: 'feature',
        priority: 'P1',
        estimatedHours: 2,
        dependencies: ['T-005'],
        deliverables: ['HistoryManager', '撤销/重做快捷键'],
      });
    }

    // API 项目核心任务
    if (projectType === 'api') {
      tasks.push({
        id: '',
        name: '设计API路由结构',
        description: '定义API路由和接口规范',
        category: 'core',
        priority: 'P0',
        estimatedHours: 2,
        dependencies: ['T-001'],
        deliverables: ['路由定义', 'API文档骨架'],
      });

      tasks.push({
        id: '',
        name: '实现中间件',
        description: '实现日志、错误处理、认证等中间件',
        category: 'core',
        priority: 'P0',
        estimatedHours: 2,
        dependencies: ['T-001'],
        deliverables: ['Logger中间件', 'ErrorHandler中间件'],
      });
    }

    // 组件项目核心任务
    if (projectType === 'component') {
      tasks.push({
        id: '',
        name: '设计组件API',
        description: '定义组件Props、Events、Slots接口',
        category: 'core',
        priority: 'P0',
        estimatedHours: 1,
        dependencies: ['T-001'],
        deliverables: ['组件接口定义', 'TypeScript类型'],
      });

      tasks.push({
        id: '',
        name: '实现组件核心逻辑',
        description: '实现组件主要功能和状态管理',
        category: 'core',
        priority: 'P0',
        estimatedHours: 3,
        dependencies: [],
        deliverables: ['组件实现'],
      });
    }

    return tasks;
  }

  /**
   * 创建功能需求任务
   */
  private createFeatureTasks(
    functionalReqs: Array<Record<string, unknown>>,
    existingTasks: DevelopmentTask[]
  ): DevelopmentTask[] {
    const tasks: DevelopmentTask[] = [];
    const existingNames = new Set(existingTasks.map(t => t.name));

    for (const req of functionalReqs) {
      const name = (req.name as string) || '';
      const description = (req.description as string) || '';
      const priority = (req.priority as string) || 'P2';
      
      // 跳过已存在的任务
      if (existingNames.has(name)) continue;

      tasks.push({
        id: '',
        name: `实现：${name}`,
        description,
        category: 'feature',
        priority: priority as DevelopmentTask['priority'],
        estimatedHours: this.estimateHours(description, priority),
        dependencies: existingTasks.length > 0 ? [existingTasks[0].id] : [],
        deliverables: [`${name}功能实现`],
      });
    }

    return tasks;
  }

  /**
   * 创建UI任务
   */
  private createUITasks(
    projectType: string,
    demandData: Record<string, unknown>,
    existingTasks: DevelopmentTask[]
  ): DevelopmentTask[] {
    const tasks: DevelopmentTask[] = [];
    const coreTaskId = existingTasks.find(t => t.category === 'core')?.id || existingTasks[0]?.id;

    if (projectType === 'page' || projectType === 'project') {
      tasks.push({
        id: '',
        name: '实现页面布局',
        description: '实现页面整体布局结构',
        category: 'ui',
        priority: 'P1',
        estimatedHours: 2,
        dependencies: coreTaskId ? [coreTaskId] : [],
        deliverables: ['Layout组件', '响应式布局'],
      });

      tasks.push({
        id: '',
        name: '实现样式主题',
        description: '定义颜色、字体、间距等样式变量',
        category: 'ui',
        priority: 'P2',
        estimatedHours: 1,
        dependencies: [],
        deliverables: ['theme.css / theme.ts'],
      });
    }

    // 画布工具栏
    const desc = (demandData.originalDemand as string) || '';
    if (desc.includes('画布') || desc.includes('画板')) {
      tasks.push({
        id: '',
        name: '实现工具栏UI',
        description: '实现工具栏界面和工具切换',
        category: 'ui',
        priority: 'P1',
        estimatedHours: 2,
        dependencies: coreTaskId ? [coreTaskId] : [],
        deliverables: ['Toolbar组件', '工具图标'],
      });

      tasks.push({
        id: '',
        name: '实现属性面板',
        description: '实现工具属性设置面板（颜色、粗细等）',
        category: 'ui',
        priority: 'P2',
        estimatedHours: 2,
        dependencies: [],
        deliverables: ['PropertiesPanel组件'],
      });
    }

    return tasks;
  }

  /**
   * 创建测试任务
   */
  private createTestTasks(existingTasks: DevelopmentTask[]): DevelopmentTask[] {
    const tasks: DevelopmentTask[] = [];
    const coreTasks = existingTasks.filter(t => t.category === 'core');

    tasks.push({
      id: '',
      name: '编写单元测试',
      description: '为核心功能编写单元测试',
      category: 'test',
      priority: 'P1',
      estimatedHours: 2,
      dependencies: coreTasks.map(t => t.id),
      deliverables: ['*.test.ts', '测试覆盖率报告'],
    });

    tasks.push({
      id: '',
      name: '编写集成测试',
      description: '编写组件/功能集成测试',
      category: 'test',
      priority: 'P2',
      estimatedHours: 2,
      dependencies: [],
      deliverables: ['*.integration.test.ts'],
    });

    return tasks;
  }

  /**
   * 估算工时
   */
  private estimateHours(description: string, priority: string): number {
    const length = description.length;
    const baseHours = priority === 'P0' ? 3 : priority === 'P1' ? 2 : 1;
    
    if (length > 100) return baseHours + 1;
    if (length > 50) return baseHours + 0.5;
    return baseHours;
  }

  /**
   * 分组任务
   */
  private groupTasks(tasks: DevelopmentTask[]): { name: string; tasks: string[] }[] {
    const groups: Record<string, string[]> = {};

    for (const task of tasks) {
      if (!groups[task.category]) {
        groups[task.category] = [];
      }
      groups[task.category].push(task.id);
    }

    const categoryNames: Record<string, string> = {
      setup: '🚀 项目初始化',
      core: '🎯 核心功能',
      feature: '✨ 功能实现',
      ui: '🎨 UI/样式',
      api: '📡 API开发',
      test: '🧪 测试',
      docs: '📝 文档',
    };

    return Object.entries(groups).map(([category, taskIds]) => ({
      name: categoryNames[category] || category,
      tasks: taskIds,
    }));
  }

  /**
   * 计算关键路径
   */
  private calculateCriticalPath(tasks: DevelopmentTask[]): string[] {
    // 简化实现：返回P0任务的依赖链
    const p0Tasks = tasks.filter(t => t.priority === 'P0');
    const path: string[] = [];

    for (const task of p0Tasks) {
      if (!path.includes(task.id)) {
        path.push(task.id);
      }
    }

    return path;
  }

  /**
   * 渲染 Markdown 格式任务列表
   */
  private renderTasksMarkdown(result: DecompositionResult): string {
    const lines: string[] = [];

    lines.push(`# ${result.projectName} - 开发任务清单`);
    lines.push('');
    lines.push(`> 任务总数: ${result.totalTasks} | 预估工时: ${result.estimatedTotalHours}h`);
    lines.push('');

    // 按分组输出
    for (const group of result.taskGroups) {
      lines.push(`## ${group.name}`);
      lines.push('');

      for (const taskId of group.tasks) {
        const task = result.tasks.find(t => t.id === taskId);
        if (task) {
          const priorityIcon = { P0: '🔴', P1: '🟡', P2: '🟢', P3: '⚪' }[task.priority];
          lines.push(`### ${task.id}: ${task.name}`);
          lines.push('');
          lines.push(`${priorityIcon} **优先级**: ${task.priority} | **预估**: ${task.estimatedHours}h`);
          lines.push('');
          lines.push(task.description);
          lines.push('');

          if (task.dependencies.length > 0) {
            lines.push(`**依赖**: ${task.dependencies.join(', ')}`);
            lines.push('');
          }

          if (task.deliverables.length > 0) {
            lines.push('**产出**:');
            task.deliverables.forEach(d => lines.push(`- ${d}`));
            lines.push('');
          }

          if (task.techNotes) {
            lines.push(`> 💡 ${task.techNotes}`);
            lines.push('');
          }

          // 子任务
          if (task.subtasks && task.subtasks.length > 0) {
            lines.push('**子任务**:');
            lines.push('');
            for (const sub of task.subtasks) {
              lines.push(`- ${sub.name} (${sub.estimatedHours}h)`);
            }
            lines.push('');
          }
        }
      }
    }

    // 关键路径
    lines.push('## 🔑 关键路径');
    lines.push('');
    lines.push(result.criticalPath.map(id => {
      const task = result.tasks.find(t => t.id === id);
      return task ? `${id}: ${task.name}` : id;
    }).join(' → '));
    lines.push('');

    lines.push('---');
    lines.push('*由 SmartCodeAgent 自动生成*');

    return lines.join('\n');
  }
}

// 导出实例
export default new TaskDecomposeSkill();
