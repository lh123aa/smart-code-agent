// 错误类型定义 - 统一的错误类型体系

/**
 * 错误代码枚举
 * 按模块分类：1000-1999 通用, 2000-2999 Skill, 3000-3999 工作流, 4000-4999 存储, 5000-5999 MCP, 6000-6999 知识库
 */
export enum ErrorCode {
  // 通用错误 (1000-1099)
  UNKNOWN = 'UNKNOWN',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Skill 错误 (2000-2099)
  SKILL_NOT_FOUND = 'SKILL_NOT_FOUND',
  SKILL_EXECUTION_FAILED = 'SKILL_EXECUTION_FAILED',
  SKILL_TIMEOUT = 'SKILL_TIMEOUT',
  SKILL_INVALID_INPUT = 'SKILL_INVALID_INPUT',
  SKILL_NOT_INITIALIZED = 'SKILL_NOT_INITIALIZED',
  
  // 工作流错误 (3000-3099)
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  WORKFLOW_INVALID = 'WORKFLOW_INVALID',
  WORKFLOW_STEP_FAILED = 'WORKFLOW_STEP_FAILED',
  WORKFLOW_CANCELLED = 'WORKFLOW_CANCELLED',
  WORKFLOW_RESUME_FAILED = 'WORKFLOW_RESUME_FAILED',
  
  // 存储错误 (4000-4099)
  STORAGE_ERROR = 'STORAGE_ERROR',
  STORAGE_NOT_FOUND = 'STORAGE_NOT_FOUND',
  STORAGE_PERMISSION = 'STORAGE_PERMISSION',
  STORAGE_FULL = 'STORAGE_FULL',
  
  // MCP 错误 (5000-5099)
  MCP_NOT_INITIALIZED = 'MCP_NOT_INITIALIZED',
  MCP_TOOL_NOT_FOUND = 'MCP_TOOL_NOT_FOUND',
  MCP_RESOURCE_NOT_FOUND = 'MCP_RESOURCE_NOT_FOUND',
  MCP_SAMPLING_FAILED = 'MCP_SAMPLING_FAILED',
  
  // 知识库错误 (6000-6099)
  KNOWLEDGE_NOT_FOUND = 'KNOWLEDGE_NOT_FOUND',
  KNOWLEDGE_ADD_FAILED = 'KNOWLEDGE_ADD_FAILED',
  KNOWLEDGE_SEARCH_FAILED = 'KNOWLEDGE_SEARCH_FAILED',
  
  // 模板错误 (7000-7099)
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_RENDER_FAILED = 'TEMPLATE_RENDER_FAILED',
  
  // 观察者错误 (8000-8099)
  OBSERVER_ERROR = 'OBSERVER_ERROR',
  REPORT_GENERATION_FAILED = 'REPORT_GENERATION_FAILED',
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  DEBUG = 'debug',     // 调试信息
  INFO = 'info',      // 一般信息
  WARNING = 'warning', // 警告
  ERROR = 'error',    // 错误
  CRITICAL = 'critical', // 严重错误
}

/**
 * 可恢复性
 */
export enum ErrorRecoverable {
  YES = 'yes',       // 可自动恢复
  MANUAL = 'manual', // 需手动恢复
  NO = 'no',         // 不可恢复
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 模块名称 */
  module?: string;
  /** 操作名称 */
  operation?: string;
  /** 相关 ID */
  relatedId?: string;
  /** 附加数据 */
  metadata?: Record<string, unknown>;
  /** 原始错误 */
  cause?: Error | unknown;
}

/**
 * 恢复建议
 */
export interface RecoverySuggestion {
  /** 建议操作 */
  action: string;
  /** 详细说明 */
  details?: string;
  /** 相关文档链接 */
  docsUrl?: string;
}

/**
 * SmartCodeAgent 错误基类
 */
export class SCAError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly recoverable: ErrorRecoverable;
  public readonly context: ErrorContext;
  public readonly suggestions: RecoverySuggestion[];
  public readonly timestamp: Date;
  public readonly cause?: Error;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      severity?: ErrorSeverity;
      recoverable?: ErrorRecoverable;
      context?: ErrorContext;
      suggestions?: RecoverySuggestion[];
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'SCAError';
    this.code = options.code ?? ErrorCode.UNKNOWN;
    this.severity = options.severity ?? ErrorSeverity.ERROR;
    this.recoverable = options.recoverable ?? ErrorRecoverable.MANUAL;
    this.context = options.context ?? {};
    this.suggestions = options.suggestions ?? [];
    this.cause = options.cause;
    this.timestamp = new Date();

    // 保留原始堆栈
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SCAError);
    }
  }

  /**
   * 转换为可序列化对象
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      recoverable: this.recoverable,
      context: this.context,
      suggestions: this.suggestions,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message,
    };
  }

  /**
   * 创建用户友好的错误消息
   */
  toUserMessage(): string {
    let message = `❌ ${this.message}`;
    
    if (this.suggestions.length > 0) {
      message += '\n\n💡 建议操作：';
      this.suggestions.forEach(s => {
        message += `\n   • ${s.action}`;
        if (s.details) message += `: ${s.details}`;
      });
    }
    
    return message;
  }
}

// ========== 具体错误类型 ==========

/**
 * Skill 相关错误
 */
export class SkillError extends SCAError {
  constructor(
    message: string,
    skillName?: string,
    options: Partial<ConstructorParameters<typeof SCAError>[1]> = {}
  ) {
    super(message, {
      code: ErrorCode.SKILL_EXECUTION_FAILED,
      severity: ErrorSeverity.ERROR,
      recoverable: ErrorRecoverable.MANUAL,
      context: {
        module: 'SkillEngine',
        operation: 'execute',
        relatedId: skillName,
        ...options.context,
      },
      suggestions: [
        {
          action: '检查 Skill 配置',
          details: skillName ? `请确认 Skill "${skillName}" 已正确注册` : undefined,
        },
        {
          action: '查看日志',
          details: '查看详细错误日志获取更多信息',
        },
      ],
      ...options,
    });
    this.name = 'SkillError';
  }
}

/**
 * 工作流错误
 */
export class WorkflowError extends SCAError {
  constructor(
    message: string,
    workflowName?: string,
    stepId?: string,
    options: Partial<ConstructorParameters<typeof SCAError>[1]> = {}
  ) {
    super(message, {
      code: ErrorCode.WORKFLOW_STEP_FAILED,
      severity: ErrorSeverity.ERROR,
      recoverable: ErrorRecoverable.MANUAL,
      context: {
        module: 'WorkflowEngine',
        operation: 'execute',
        relatedId: workflowName,
        metadata: stepId ? { stepId } : undefined,
        ...options.context,
      },
      suggestions: [
        {
          action: '检查工作流配置',
          details: workflowName ? `请确认工作流 "${workflowName}" 配置正确` : undefined,
        },
        {
          action: '重试',
          details: '可以尝试重新执行该步骤',
        },
        {
          action: '跳过步骤',
          details: '如果该步骤非关键，可以考虑跳过',
        },
      ],
      ...options,
    });
    this.name = 'WorkflowError';
  }
}

/**
 * 存储错误
 */
export class StorageError extends SCAError {
  constructor(
    message: string,
    filePath?: string,
    options: Partial<ConstructorParameters<typeof SCAError>[1]> = {}
  ) {
    super(message, {
      code: ErrorCode.STORAGE_ERROR,
      severity: ErrorSeverity.ERROR,
      recoverable: ErrorRecoverable.MANUAL,
      context: {
        module: 'Storage',
        operation: 'read/write',
        relatedId: filePath,
        ...options.context,
      },
      suggestions: [
        {
          action: '检查文件权限',
          details: '确认有权限访问指定路径',
        },
        {
          action: '检查磁盘空间',
          details: '确保有足够的磁盘空间',
        },
        {
          action: '检查路径',
          details: '确认文件路径正确',
        },
      ],
      ...options,
    });
    this.name = 'StorageError';
  }
}

/**
 * 输入验证错误
 */
export class ValidationError extends SCAError {
  constructor(
    message: string,
    field?: string,
    options: Partial<ConstructorParameters<typeof SCAError>[1]> = {}
  ) {
    super(message, {
      code: ErrorCode.VALIDATION_ERROR,
      severity: ErrorSeverity.WARNING,
      recoverable: ErrorRecoverable.MANUAL,
      context: {
        module: 'Validator',
        operation: 'validate',
        metadata: field ? { field } : undefined,
        ...options.context,
      },
      suggestions: [
        {
          action: '检查输入',
          details: field ? `请检查字段 "${field}" 的值` : '请检查输入参数',
        },
      ],
      ...options,
    });
    this.name = 'ValidationError';
  }
}

/**
 * 模板错误
 */
export class TemplateError extends SCAError {
  constructor(
    message: string,
    templateName?: string,
    options: Partial<ConstructorParameters<typeof SCAError>[1]> = {}
  ) {
    super(message, {
      code: ErrorCode.TEMPLATE_RENDER_FAILED,
      severity: ErrorSeverity.ERROR,
      recoverable: ErrorRecoverable.MANUAL,
      context: {
        module: 'TemplateManager',
        operation: 'render',
        relatedId: templateName,
        ...options.context,
      },
      suggestions: [
        {
          action: '检查模板变量',
          details: templateName ? `确认模板 "${templateName}" 所需变量都已提供` : undefined,
        },
        {
          action: '使用内置模板',
          details: '可以尝试使用内置模板',
        },
      ],
      ...options,
    });
    this.name = 'TemplateError';
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends SCAError {
  constructor(
    message: string,
    operation?: string,
    options: Partial<ConstructorParameters<typeof SCAError>[1]> = {}
  ) {
    super(message, {
      code: ErrorCode.TIMEOUT,
      severity: ErrorSeverity.WARNING,
      recoverable: ErrorRecoverable.YES,
      context: {
        module: 'Timeout',
        operation,
        ...options.context,
      },
      suggestions: [
        {
          action: '增加超时时间',
          details: '可以尝试增加超时配置',
        },
        {
          action: '重试',
          details: '网络问题可能导致超时，可以重试',
        },
      ],
      ...options,
    });
    this.name = 'TimeoutError';
  }
}

export default {
  ErrorCode,
  ErrorSeverity,
  ErrorRecoverable,
  SCAError,
  SkillError,
  WorkflowError,
  StorageError,
  ValidationError,
  TemplateError,
  TimeoutError,
};