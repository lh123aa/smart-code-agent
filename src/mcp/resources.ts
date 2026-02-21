// MCP 资源定义
// 定义 Smart Code Agent 可用的 MCP 资源

/**
 * MCP 资源类型
 */
export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Smart Code Agent MCP 资源列表
 */
export const resources: MCPResource[] = [
  {
    uri: 'sca://knowledge',
    name: 'knowledge-base',
    description: '本地知识库，包含已学习的知识条目',
    mimeType: 'application/json',
  },
  {
    uri: 'sca://runs',
    name: 'run-history',
    description: '运行历史记录',
    mimeType: 'application/json',
  },
  {
    uri: 'sca://runs/latest',
    name: 'latest-run',
    description: '最近一次运行的详情',
    mimeType: 'application/json',
  },
  {
    uri: 'sca://workflows',
    name: 'workflows',
    description: '所有可用的工作流定义',
    mimeType: 'application/json',
  },
  {
    uri: 'sca://config',
    name: 'agent-config',
    description: 'Smart Code Agent 当前配置',
    mimeType: 'application/json',
  },
  {
    uri: 'sca://skills',
    name: 'skills',
    description: '所有可用的 Skill 列表及状态',
    mimeType: 'application/json',
  },
  {
    uri: 'sca://statistics',
    name: 'statistics',
    description: '运行统计数据，包含成功率、平均耗时等',
    mimeType: 'application/json',
  },
  {
    uri: 'sca://feedback',
    name: 'user-feedback',
    description: '用户反馈列表',
    mimeType: 'application/json',
  },
  {
    uri: 'sca://reports',
    name: 'reports',
    description: '生成的报告列表',
    mimeType: 'application/json',
  },
  {
    uri: 'sca://templates',
    name: 'templates',
    description: '可用的代码模板',
    mimeType: 'application/json',
  },
];

/**
 * 获取所有资源定义
 */
export function getAllResources(): MCPResource[] {
  return resources;
}

/**
 * 根据 URI 获取资源定义
 */
export function getResourceByURI(uri: string): MCPResource | undefined {
  return resources.find(r => r.uri === uri);
}

/**
 * 根据 URI 前缀获取资源列表
 */
export function getResourcesByPrefix(prefix: string): MCPResource[] {
  return resources.filter(r => r.uri.startsWith(prefix));
}

export default resources;
