// 日志模块 - 统一日志系统

import chalk from 'chalk';
import { format } from 'util';

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志配置
 */
export interface LoggerConfig {
  level: LogLevel;
  enableTimestamp: boolean;
  enableColor: boolean;
  enableTraceId: boolean;
}

/**
 * 日志条目
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  traceId?: string;
  module?: string;
  data?: unknown;
}

/**
 * 日志类
 */
export class Logger {
  private config: LoggerConfig;
  private moduleName: string;
  private static defaultConfig: LoggerConfig = {
    level: 'info',
    enableTimestamp: true,
    enableColor: true,
    enableTraceId: true,
  };

  constructor(moduleName: string, config?: Partial<LoggerConfig>) {
    this.moduleName = moduleName;
    this.config = { ...Logger.defaultConfig, ...config };
  }

  /**
   * 设置日志级别
   */
  static setLevel(level: LogLevel): void {
    Logger.defaultConfig.level = level;
  }

  /**
   * 解析日志级别
   */
  private parseLevel(level: LogLevel): number {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] || 0;
  }

  /**
   * 格式化日志
   */
  private format(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.enableTimestamp) {
      parts.push(chalk.gray(entry.timestamp));
    }

    const levelColors: Record<LogLevel, (s: string) => string> = {
      debug: chalk.gray,
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
    };

    const levelStr = entry.level.toUpperCase().padEnd(5);
    parts.push(this.config.enableColor 
      ? levelColors[entry.level](`[${levelStr}]`)
      : `[${levelStr}]`
    );

    if (this.config.enableTraceId && entry.traceId) {
      parts.push(chalk.cyan(`[${entry.traceId.slice(0, 8)}]`));
    }

    if (entry.module) {
      parts.push(chalk.green(`[${entry.module}]`));
    }

    parts.push(entry.message);

    if (entry.data !== undefined) {
      parts.push(format(entry.data));
    }

    return parts.join(' ');
  }

  /**
   * 写日志
   */
  public log(level: LogLevel, message: string, data?: unknown): void {
    if (this.parseLevel(level) < this.parseLevel(this.config.level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      module: this.moduleName,
      data,
    };

    const formatted = this.format(entry);
    
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Debug 日志
   */
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  /**
   * Info 日志
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Warn 日志
   */
  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  /**
   * Error 日志
   */
  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  /**
   * 创建子日志器
   */
  child(subModule: string): Logger {
    return new Logger(`${this.moduleName}:${subModule}`, this.config);
  }

  /**
   * 创建带 traceId 的日志器
   */
  withTrace(traceId: string): LoggerWithTrace {
    return new LoggerWithTrace(this, traceId);
  }
}

/**
 * 带 traceId 的日志器
 */
export class LoggerWithTrace {
  constructor(
    private logger: Logger,
    private traceId: string
  ) {}

  debug(message: string, data?: unknown): void {
    this.logger.log('debug', message, data ? { ...data, traceId: this.traceId } : { traceId: this.traceId });
  }

  info(message: string, data?: unknown): void {
    this.logger.log('info', message, data ? { ...data, traceId: this.traceId } : { traceId: this.traceId });
  }

  warn(message: string, data?: unknown): void {
    this.logger.log('warn', message, data ? { ...data, traceId: this.traceId } : { traceId: this.traceId });
  }

  error(message: string, data?: unknown): void {
    this.logger.log('error', message, data ? { ...data, traceId: this.traceId } : { traceId: this.traceId });
  }
}

/**
 * 创建日志器
 */
export function createLogger(moduleName: string): Logger {
  return new Logger(moduleName);
}

export default Logger;
