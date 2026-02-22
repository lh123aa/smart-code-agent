/**
 * 更新相关类型定义
 */

/** 更新检查结果 */
export interface UpdateCheckResult {
  /** 是否有更新 */
  hasUpdate: boolean;
  /** 当前版本 */
  currentVersion: string;
  /** 远程最新版本 */
  remoteVersion: string;
  /** 更新说明 */
  releaseNotes?: string;
  /** 检查时间 */
  checkedAt: string;
}

/** 更新执行结果 */
export interface UpdateResult {
  /** 是否成功 */
  success: boolean;
  /** 更新前版本 */
  fromVersion: string;
  /** 更新后版本 */
  toVersion: string;
  /** 错误信息 */
  error?: string;
  /** 更新日志 */
  logs: string[];
}

/** 更新配置 */
export interface UpdateConfig {
  /** 是否自动检查更新 */
  autoCheck?: boolean;
  /** 检查间隔 (毫秒) */
  checkInterval?: number;
}
