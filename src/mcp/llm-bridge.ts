// LLM 桥接器 - 调用宿主的 LLM 能力

import { createLogger } from '../utils/logger.js';
import type { Message, LLMResult, Tool } from '../types/index.js';

const logger = createLogger('LLMBridge');

/**
 * LLM 桥接器配置
 */
export interface LLMBridgeConfig {
  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * LLM 桥接器 - 通过 MCP 调用宿主 LLM
 * 注意：这是一个基础实现，实际调用宿主能力需要通过 MCP 协议
 */
export class LLMBridge {
  private config: LLMBridgeConfig;
  private mcpClient: MCPClient | null = null;

  constructor(config?: LLMBridgeConfig) {
    this.config = {
      debug: false,
      ...config,
    };
  }

  /**
   * 设置 MCP 客户端
   */
  setMCPClient(client: MCPClient): void {
    this.mcpClient = client;
  }

  /**
   * 文本补全
   */
  async complete(prompt: string): Promise<string> {
    if (this.config.debug) {
      logger.debug('LLM complete request', { promptLength: prompt.length });
    }

    try {
      const result = await this.callLLM([
        {
          role: 'user',
          content: prompt,
        }
      ]);

      return result.content;
    } catch (error) {
      logger.error('LLM complete failed', { error });
      throw error;
    }
  }

  /**
   * 对话
   */
  async chat(messages: Message[]): Promise<Message> {
    if (this.config.debug) {
      logger.debug('LLM chat request', { messageCount: messages.length });
    }

    try {
      const result = await this.callLLM(messages);
      return {
        role: 'assistant',
        content: result.content,
      };
    } catch (error) {
      logger.error('LLM chat failed', { error });
      throw error;
    }
  }

  /**
   * 带工具调用的对话
   */
  async chatWithTools(messages: Message[], tools: Tool[]): Promise<LLMResult> {
    if (this.config.debug) {
      logger.debug('LLM chat with tools request', { 
        messageCount: messages.length,
        toolCount: tools.length 
      });
    }

    try {
      return await this.callLLM(messages, tools);
    } catch (error) {
      logger.error('LLM chat with tools failed', { error });
      throw error;
    }
  }

  /**
   * 调用 MCP 工具
   */
  async useTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.mcpClient) {
      logger.warn('MCP client not set, using fallback');
      return this.fallbackToolCall(toolName, params);
    }

    try {
      return await this.mcpClient.call(`tools.${toolName}`, params);
    } catch (error) {
      logger.error(`Tool call failed: ${toolName}`, { error });
      throw error;
    }
  }

  /**
   * 检查工具是否可用
   */
  async hasTool(toolName: string): Promise<boolean> {
    if (!this.mcpClient) return false;

    try {
      const tools = await this.mcpClient.listTools();
      return tools.some(t => t.name === toolName);
    } catch {
      return false;
    }
  }

  /**
   * 调用 LLM
   */
  private async callLLM(messages: Message[], tools?: Tool[]): Promise<LLMResult> {
    // 如果没有设置 MCP 客户端，返回模拟响应
    if (!this.mcpClient) {
      logger.warn('MCP client not set, using mock response');
      return {
        content: 'MCP client not configured. Please configure the LLM bridge.',
      };
    }

    try {
      const result = await this.mcpClient.call('languageModel.chat', {
        messages,
        tools,
      }) as { message?: { content?: string }; toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }> };

      return {
        content: result.message?.content || '',
        toolCalls: result.toolCalls,
      };
    } catch (error) {
      throw new Error(`LLM call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 回退工具调用
   */
  private fallbackToolCall(toolName: string, params: Record<string, unknown>): unknown {
    logger.warn(`Fallback tool call: ${toolName}`, params);
    
    // 根据工具名称返回适当的回退响应
    switch (toolName) {
      case 'web_search':
        return { results: [], message: 'Web search not available' };
      case 'read_file':
        return { content: '', error: 'File read not available' };
      case 'write_file':
        return { success: false, error: 'File write not available' };
      default:
        return { error: `Tool ${toolName} not available` };
    }
  }
}

/**
 * MCP 客户端接口
 */
export interface MCPClient {
  call(tool: string, params?: Record<string, unknown>): Promise<unknown>;
  listTools(): Promise<Array<{ name: string; description: string }>>;
}

export default LLMBridge;
