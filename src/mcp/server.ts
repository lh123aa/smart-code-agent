// MCP 服务器实现
// 实现 MCP 协议接口

import { SmartCodeAgent } from '../plugin.js';
import { getAllTools } from './tools.js';
import { getAllResources, getResourceByURI } from './resources.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MCPServer');

/**
 * MCP 服务器
 * 处理 MCP 协议请求
 */
export class MCPServer {
  private agent: SmartCodeAgent;

  constructor(agent?: SmartCodeAgent) {
    this.agent = agent || new SmartCodeAgent();
  }

  /**
   * 处理工具列表请求
   */
  async handleListTools(): Promise<{ tools: Array<{ name: string; description: string; inputSchema: object }> }> {
    const tools = getAllTools();
    return { tools };
  }

  /**
   * 处理工具调用请求
   */
  async handleCallTool(
    name: string, 
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    logger.info(`Handling tool call: ${name}`, args);

    try {
      switch (name) {
        case 'sca-start': {
          const result = await this.agent.start({
            projectType: args.projectType as 'page' | 'api' | 'component' | 'project',
            initialDemand: args.initialDemand as string | undefined,
            projectPath: args.projectPath as string | undefined,
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2),
            }],
          };
        }

        case 'sca-resume': {
          const result = await this.agent.resume(args.traceId as string);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2),
            }],
          };
        }

        case 'sca-get-report': {
          const report = await this.agent.getReport(args.traceId as string | undefined);
          return {
            content: [{
              type: 'text',
              text: report,
            }],
          };
        }

        case 'sca-submit-feedback': {
          await this.agent.submitFeedback(args.traceId as string || '', {
            type: args.type as 'bug' | 'suggestion' | 'question',
            content: args.content as string,
            stage: args.stage as string | undefined,
          });
          return {
            content: [{
              type: 'text',
              text: '反馈已提交，感谢您的参与！',
            }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error(`Tool call failed: ${name}`, error);
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }

  /**
   * 处理资源列表请求
   */
  async handleListResources(): Promise<{ resources: Array<{ uri: string; name: string; description: string; mimeType: string }> }> {
    const resources = getAllResources();
    return { resources };
  }

  /**
   * 处理资源读取请求
   */
  async handleReadResource(uri: string): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
    const resource = getResourceByURI(uri);
    
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    // 根据资源类型获取内容
    let content = '';
    
    switch (uri) {
      case 'sca://workflows':
        content = JSON.stringify([
          { name: 'full-demand-analysis', description: '完整需求分析流程' },
          { name: 'full-development', description: '完整开发流程' },
          { name: 'quick-development', description: '快速开发流程' },
        ], null, 2);
        break;
        
      case 'sca://config':
        content = JSON.stringify({
          version: '1.0.0',
          features: {
            knowledgeBase: true,
            observer: true,
            workflow: true,
          },
        }, null, 2);
        break;
        
      default:
        content = `Content for ${uri}`;
    }

    return {
      contents: [{
        uri,
        mimeType: resource.mimeType,
        text: content,
      }],
    };
  }

  /**
   * 初始化服务器
   */
  async initialize(): Promise<void> {
    await this.agent.initialize();
    logger.info('MCP Server initialized');
  }
}

export default MCPServer;
