// 工作流解析器 - 解析工作流定义

import YAML from 'yaml';
import { createLogger } from '../utils/logger.js';
import type { Workflow, WorkflowStep, WorkflowDefinition } from '../types/index.js';

const logger = createLogger('WorkflowParser');

/**
 * 工作流解析器
 */
export class WorkflowParser {
  /**
   * 解析 YAML 格式的工作流
   */
  parseYaml(yamlContent: string): Workflow {
    try {
      const parsed = YAML.parse(yamlContent);
      return this.normalize(parsed);
    } catch (error) {
      throw new Error(`Failed to parse workflow YAML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 解析 JSON 格式的工作流
   */
  parseJson(jsonContent: string): Workflow {
    try {
      const parsed = JSON.parse(jsonContent);
      return this.normalize(parsed);
    } catch (error) {
      throw new Error(`Failed to parse workflow JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 解析 JavaScript 对象
   */
  parseObject(obj: WorkflowDefinition): Workflow {
    return this.normalize(obj);
  }

  /**
   * 规范化工作流定义
   */
  private normalize(input: WorkflowDefinition): Workflow {
    // 验证必需字段
    if (!input.name) {
      throw new Error('Workflow name is required');
    }
    if (!input.steps || !Array.isArray(input.steps)) {
      throw new Error('Workflow steps must be an array');
    }
    if (!input.initialStep) {
      throw new Error('Workflow initialStep is required');
    }

    // 验证步骤
    const stepNames = new Set<string>();
    for (const step of input.steps) {
      if (!step.skill) {
        throw new Error('Step skill is required');
      }
      if (stepNames.has(step.skill)) {
        logger.warn(`Duplicate step skill: ${step.skill}`);
      }
      stepNames.add(step.skill);
    }

    // 验证初始步骤
    const hasInitialStep = input.steps.some(s => s.skill === input.initialStep);
    if (!hasInitialStep) {
      throw new Error(`Initial step "${input.initialStep}" not found in steps`);
    }

    // 规范化步骤
    const steps: WorkflowStep[] = input.steps.map(step => ({
      skill: step.skill,
      params: step.params || {},
      onSuccess: step.onSuccess || null,
      onFail: step.onFail || null,
      retry: step.retry ?? 2,
    }));

    return {
      name: input.name,
      description: input.description || '',
      initialStep: input.initialStep,
      steps,
    };
  }

  /**
   * 验证工作流
   */
  validate(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查步骤引用
    for (const step of workflow.steps) {
      if (step.onSuccess) {
        const exists = workflow.steps.some(s => s.skill === step.onSuccess);
        if (!exists) {
          errors.push(`Step "${step.skill}" references non-existent step "${step.onSuccess}"`);
        }
      }
      if (step.onFail) {
        const exists = workflow.steps.some(s => s.skill === step.onFail);
        if (!exists) {
          errors.push(`Step "${step.skill}" references non-existent step "${step.onFail}"`);
        }
      }
    }

    // 检查循环引用（简单检查）
    const visited = new Set<string>();
    const detectCycle = (stepName: string, path: string[]): boolean => {
      if (visited.has(stepName)) return false;
      
      const step = workflow.steps.find(s => s.skill === stepName);
      if (!step) return false;

      visited.add(stepName);

      if (step.onSuccess && path.includes(step.onSuccess)) {
        errors.push(`Cycle detected: ${[...path, step.onSuccess].join(' -> ')}`);
        return true;
      }

      if (step.onSuccess) {
        return detectCycle(step.onSuccess, [...path, step.onSuccess]);
      }

      return false;
    };

    detectCycle(workflow.initialStep, [workflow.initialStep]);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取步骤依赖图
   */
  getDependencyGraph(workflow: Workflow): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const step of workflow.steps) {
      const deps: string[] = [];
      
      // 找到指向当前步骤的步骤
      for (const otherStep of workflow.steps) {
        if (otherStep.onSuccess === step.skill) {
          deps.push(otherStep.skill);
        }
        if (otherStep.onFail === step.skill) {
          deps.push(otherStep.skill);
        }
      }

      graph.set(step.skill, deps);
    }

    return graph;
  }

  /**
   * 序列化工作流为 YAML
   */
  toYaml(workflow: Workflow): string {
    return YAML.stringify(workflow);
  }

  /**
   * 序列化工作流为 JSON
   */
  toJson(workflow: Workflow): string {
    return JSON.stringify(workflow, null, 2);
  }
}

export default WorkflowParser;
