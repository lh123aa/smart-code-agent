// MCP 工具定义
// 定义 Smart Code Agent 可用的 MCP 工具

import type { Tool } from '../types/index.js';

/**
 * Smart Code Agent MCP 工具列表
 */
export const tools: Tool[] = [
  {
    name: 'sca-start',
    description: '启动 Smart Code Agent 开发流程，从需求采集开始',
    inputSchema: {
      type: 'object',
      properties: {
        projectType: {
          type: 'string',
          enum: ['page', 'api', 'component', 'project'],
          description: '项目类型：页面开发、接口开发、组件封装、项目初始化',
        },
        initialDemand: {
          type: 'string',
          description: '初始需求描述（可选）',
        },
        projectPath: {
          type: 'string',
          description: '项目路径（可选）',
        },
      },
      required: ['projectType'],
    },
  },
  {
    name: 'sca-resume',
    description: '恢复之前中断的开发流程',
    inputSchema: {
      type: 'object',
      properties: {
        traceId: {
          type: 'string',
          description: '之前运行的追踪 ID',
        },
      },
      required: ['traceId'],
    },
  },
  {
    name: 'sca-get-report',
    description: '获取指定运行的观察者报告',
    inputSchema: {
      type: 'object',
      properties: {
        traceId: {
          type: 'string',
          description: '追踪 ID（可选，不提供则返回最近运行的报告）',
        },
      },
    },
  },
  {
    name: 'sca-submit-feedback',
    description: '提交用户反馈，用于产品改进',
    inputSchema: {
      type: 'object',
      properties: {
        traceId: {
          type: 'string',
          description: '关联的追踪 ID',
        },
        type: {
          type: 'string',
          enum: ['bug', 'suggestion', 'question'],
          description: '反馈类型',
        },
        content: {
          type: 'string',
          description: '反馈内容',
        },
        stage: {
          type: 'string',
          enum: ['demand', 'code', 'test', 'delivery'],
          description: '关联阶段',
        },
      },
      required: ['type', 'content'],
    },
  },
  {
    name: 'sca-add-knowledge',
    description: '添加知识到本地知识库',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: '知识主题',
        },
        content: {
          type: 'string',
          description: '知识内容',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: '关键词标签',
        },
        source: {
          type: 'string',
          enum: ['web', 'manual', 'learned'],
          default: 'manual',
          description: '知识来源',
        },
      },
      required: ['topic', 'content'],
    },
  },
  {
    name: 'sca-search-knowledge',
    description: '搜索本地知识库',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'sca-list-workflows',
    description: '列出所有可用的工作流',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'sca-run-workflow',
    description: '执行指定的工作流',
    inputSchema: {
      type: 'object',
      properties: {
        workflowName: {
          type: 'string',
          description: '工作流名称',
        },
        params: {
          type: 'object',
          description: '工作流参数',
        },
      },
      required: ['workflowName'],
    },
  },
];

/**
 * 获取所有工具定义
 */
export function getAllTools(): Tool[] {
  return tools;
}

/**
 * 根据名称获取工具定义
 */
export function getToolByName(name: string): Tool | undefined {
  return tools.find(t => t.name === name);
}

export default tools;
