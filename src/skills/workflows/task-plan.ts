// task-plan.skill - 任务执行计划 Skill
// 将任务拆解结果转换为可执行的计划，包含执行顺序和时间安排

import { BaseSkill } from '../base.skill.js';
import { createLogger } from '../../utils/logger.js';
import type { SkillInput, SkillOutput } from '../../types/index.js';

const logger = createLogger('TaskPlanSkill');

/**
 * 执行阶段
 */
interface ExecutionPhase {
  id: string;
  name: string;
  description: string;
  tasks: string[];
  estimatedHours: number;
  canStart: boolean; // 是否可以开始（依赖已满足）
}

/**
 * 任务执行计划
 */
interface ExecutionPlan {
  projectName: string;
  totalPhases: number;
  totalTasks: number;
  estimatedTotalHours: number;
  phases: ExecutionPhase[];
  taskSchedule: {
    taskId: string;
    taskName: string;
    phase: string;
    order: number;
    dependencies: string[];
    estimatedHours: number;
    status: 'pending' | 'ready' | 'blocked';
  }[];
  recommendations: string[];
}

/**
 * 任务执行计划 Skill
 * 
 * 职责：
 * 1. 分析任务依赖关系
 * 2. 划分执行阶段
 * 3. 生成执行顺序
 * 4. 提供执行建议
 */
export class TaskPlanSkill extends BaseSkill {
  readonly meta = {
    name: 'task-plan',
    description: '生成任务执行计划，确定执行顺序',
    category: 'plan' as const,
    version: '1.0.0',
    tags: ['task', 'plan', 'schedule', 'workflow'],
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    // 从上下文获取任务拆解结果
    const decomposition = input.context.writable.decomposition as {
      projectName: string;
      totalTasks: number;
      estimatedTotalHours: number;
      tasks: Array<{
        id: string;
        name: string;
        category: string;
        priority: string;
        estimatedHours: number;
        dependencies: string[];
      }>;
      taskGroups: { name: string; tasks: string[] }[];
    } | undefined;

    if (!decomposition || !decomposition.tasks) {
      return this.fatalError('未找到任务拆解结果，请先执行任务拆解');
    }

    // 生成执行计划
    const plan = this.generatePlan(decomposition);

    logger.info('Execution plan generated', {
      projectName: plan.projectName,
      totalPhases: plan.totalPhases,
      totalTasks: plan.totalTasks,
    });

    return this.success({
      plan,
      planMarkdown: this.renderPlanMarkdown(plan),
      nextStage: 'task-confirm',
    }, `执行计划已生成：${plan.totalPhases} 个阶段`);
  }

  /**
   * 生成执行计划
   */
  private generatePlan(decomposition: {
    projectName: string;
    totalTasks: number;
    estimatedTotalHours: number;
    tasks: Array<{
      id: string;
      name: string;
      category: string;
      priority: string;
      estimatedHours: number;
      dependencies: string[];
    }>;
    taskGroups: { name: string; tasks: string[] }[];
  }): ExecutionPlan {
    const { projectName, tasks, taskGroups } = decomposition;

    // 拓扑排序，确定执行顺序
    const sortedTasks = this.topologicalSort(tasks);

    // 划分执行阶段
    const phases = this.createPhases(sortedTasks, taskGroups);

    // 生成任务调度表
    const taskSchedule = this.createTaskSchedule(sortedTasks, phases);

    // 生成建议
    const recommendations = this.generateRecommendations(tasks, phases);

    return {
      projectName,
      totalPhases: phases.length,
      totalTasks: tasks.length,
      estimatedTotalHours: phases.reduce((sum, p) => sum + p.estimatedHours, 0),
      phases,
      taskSchedule,
      recommendations,
    };
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(
    tasks: Array<{ id: string; name: string; dependencies: string[]; priority: string; category: string; estimatedHours: number }>
  ): typeof tasks {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<string>();
    const result: typeof tasks = [];

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return;

      // 先访问依赖
      for (const depId of task.dependencies) {
        visit(depId);
      }

      result.push(task);
    };

    // 按优先级排序后访问
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const sorted = [...tasks].sort((a, b) => 
      priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
    );

    for (const task of sorted) {
      visit(task.id);
    }

    return result;
  }

  /**
   * 创建执行阶段
   */
  private createPhases(
    tasks: Array<{ id: string; name: string; category: string; estimatedHours: number; dependencies: string[] }>,
    taskGroups: { name: string; tasks: string[] }[]
  ): ExecutionPhase[] {
    const phases: ExecutionPhase[] = [];
    const categoryToPhase: Record<string, string> = {
      setup: 'phase-1',
      core: 'phase-2',
      feature: 'phase-3',
      ui: 'phase-4',
      api: 'phase-3',
      test: 'phase-5',
      docs: 'phase-5',
    };

    const phaseNames: Record<string, { name: string; description: string }> = {
      'phase-1': { name: '🚀 阶段1: 项目初始化', description: '搭建开发环境和项目骨架' },
      'phase-2': { name: '🎯 阶段2: 核心开发', description: '实现核心功能和基础架构' },
      'phase-3': { name: '✨ 阶段3: 功能实现', description: '开发业务功能和特性' },
      'phase-4': { name: '🎨 阶段4: UI完善', description: '优化界面和样式' },
      'phase-5': { name: '🧪 阶段5: 测试与文档', description: '编写测试和文档' },
    };

    // 按阶段分组任务
    const phaseTasks: Record<string, string[]> = {};
    const phaseHours: Record<string, number> = {};

    for (const task of tasks) {
      const phaseId = categoryToPhase[task.category] || 'phase-3';
      if (!phaseTasks[phaseId]) {
        phaseTasks[phaseId] = [];
        phaseHours[phaseId] = 0;
      }
      phaseTasks[phaseId].push(task.id);
      phaseHours[phaseId] += task.estimatedHours;
    }

    // 创建阶段对象
    for (const [phaseId, taskIds] of Object.entries(phaseTasks)) {
      const phaseInfo = phaseNames[phaseId] || { name: phaseId, description: '' };
      phases.push({
        id: phaseId,
        name: phaseInfo.name,
        description: phaseInfo.description,
        tasks: taskIds,
        estimatedHours: phaseHours[phaseId],
        canStart: phaseId === 'phase-1', // 只有第一阶段可以开始
      });
    }

    // 按阶段ID排序
    return phases.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * 创建任务调度表
   */
  private createTaskSchedule(
    tasks: Array<{ id: string; name: string; estimatedHours: number; dependencies: string[] }>,
    phases: ExecutionPhase[]
  ): ExecutionPlan['taskSchedule'] {
    const taskPhaseMap = new Map<string, string>();
    for (const phase of phases) {
      for (const taskId of phase.tasks) {
        taskPhaseMap.set(taskId, phase.id);
      }
    }

    return tasks.map((task, index) => ({
      taskId: task.id,
      taskName: task.name,
      phase: taskPhaseMap.get(task.id) || 'unknown',
      order: index + 1,
      dependencies: task.dependencies,
      estimatedHours: task.estimatedHours,
      status: task.dependencies.length === 0 ? 'ready' as const : 'blocked' as const,
    }));
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    tasks: Array<{ id: string; name: string; priority: string; dependencies: string[] }>,
    phases: ExecutionPhase[]
  ): string[] {
    const recommendations: string[] = [];

    // 关键任务提醒
    const criticalTasks = tasks.filter(t => t.priority === 'P0');
    if (criticalTasks.length > 0) {
      recommendations.push(`🔴 有 ${criticalTasks.length} 个关键任务需要优先完成`);
    }

    // 依赖复杂度
    const tasksWithDeps = tasks.filter(t => t.dependencies.length > 2);
    if (tasksWithDeps.length > 0) {
      recommendations.push(`⚠️ 有 ${tasksWithDeps.length} 个任务依赖较多，建议仔细规划`);
    }

    // 阶段建议
    if (phases.length >= 4) {
      recommendations.push('💡 项目分为多个阶段，建议每阶段完成后进行评审');
    }

    // 并行建议
    const readyTasks = tasks.filter(t => t.dependencies.length === 0);
    if (readyTasks.length > 3) {
      recommendations.push('🚀 初期有多个独立任务，可以考虑并行开发');
    }

    return recommendations;
  }

  /**
   * 渲染 Markdown 格式计划
   */
  private renderPlanMarkdown(plan: ExecutionPlan): string {
    const lines: string[] = [];

    lines.push(`# ${plan.projectName} - 执行计划`);
    lines.push('');
    lines.push(`> 阶段数: ${plan.totalPhases} | 任务数: ${plan.totalTasks} | 预估工时: ${plan.estimatedTotalHours}h`);
    lines.push('');

    // 执行阶段
    lines.push('## 📋 执行阶段');
    lines.push('');

    for (const phase of plan.phases) {
      lines.push(`### ${phase.name}`);
      lines.push('');
      lines.push(phase.description);
      lines.push('');
      lines.push(`**包含任务**: ${phase.tasks.length} 个 | **预估工时**: ${phase.estimatedHours}h`);
      lines.push('');
      lines.push('任务列表:');
      phase.tasks.forEach((taskId, i) => {
        const schedule = plan.taskSchedule.find(s => s.taskId === taskId);
        if (schedule) {
          lines.push(`${i + 1}. ${taskId}: ${schedule.taskName} (${schedule.estimatedHours}h)`);
        }
      });
      lines.push('');
    }

    // 任务调度表
    lines.push('## 📊 任务调度表');
    lines.push('');
    lines.push('| 序号 | 任务ID | 任务名称 | 阶段 | 工时 | 依赖 | 状态 |');
    lines.push('|------|--------|----------|------|------|------|------|');
    for (const schedule of plan.taskSchedule) {
      const statusIcon = { ready: '✅', blocked: '🔒', pending: '⏳' }[schedule.status];
      lines.push(`| ${schedule.order} | ${schedule.taskId} | ${schedule.taskName} | ${schedule.phase} | ${schedule.estimatedHours}h | ${schedule.dependencies.length} | ${statusIcon} |`);
    }
    lines.push('');

    // 建议
    if (plan.recommendations.length > 0) {
      lines.push('## 💡 执行建议');
      lines.push('');
      plan.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('*由 SmartCodeAgent 自动生成*');

    return lines.join('\n');
  }
}

// 导出实例
export default new TaskPlanSkill();
