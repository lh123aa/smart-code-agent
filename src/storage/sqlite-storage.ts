// SQLite 存储模块 - 基于 sql.js 的 SQLite 存储实现

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs/promises';
import path from 'path';
import { cwd } from 'process';

const getDefaultDbPath = (): string => {
  return path.join(cwd(), 'data', 'sqlite', 'storage.db');
};

/**
 * SQLite 存储配置
 */
export interface SQLiteStorageConfig {
  dbPath?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

/**
 * SQLite 存储类
 * 提供基于 SQLite 的持久化存储，支持事务、查询等功能
 */
export class SQLiteStorage {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private autoSave: boolean;
  private autoSaveInterval: number;
  private saveTimer: NodeJS.Timeout | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(config?: SQLiteStorageConfig) {
    this.dbPath = config?.dbPath || getDefaultDbPath();
    this.autoSave = config?.autoSave ?? true;
    this.autoSaveInterval = config?.autoSaveInterval ?? 5000;
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      const SQL = await initSqlJs();

      // 确保目录存在
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // 尝试加载现有数据库
      try {
        const fileBuffer = await fs.readFile(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } catch {
        // 创建新数据库
        this.db = new SQL.Database();
      }

      // 创建默认表
      await this.createDefaultTables();

      // 启动自动保存
      if (this.autoSave) {
        this.startAutoSave();
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize SQLite database: ${error}`);
    }
  }

  /**
   * 创建默认表
   */
  private async createDefaultTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Key-Value 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 通用数据表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS data_store (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 索引
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_data_type ON data_store(type)`);
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setInterval(() => {
      this.saveToFile().catch(console.error);
    }, this.autoSaveInterval);
  }

  /**
   * 停止自动保存
   */
  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * 保存数据库到文件
   */
  async saveToFile(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const data = this.db.export();
    const buffer = Buffer.from(data);
    await fs.writeFile(this.dbPath, buffer);
  }

  /**
   * 确保数据库已初始化
   */
  private ensureDb(): SqlJsDatabase {
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    return this.db;
  }

  // ========== Key-Value 操作 ==========

  /**
   * 设置值
   */
  async set(key: string, value: unknown): Promise<void> {
    const db = this.ensureDb();
    const now = Date.now();
    const valueStr = JSON.stringify(value);

    const existing = db.exec(`SELECT key FROM kv_store WHERE key = ?`, [key]);
    
    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run(`UPDATE kv_store SET value = ?, updated_at = ? WHERE key = ?`, 
        [valueStr, now, key]);
    } else {
      db.run(`INSERT INTO kv_store (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [key, valueStr, now, now]);
    }
  }

  /**
   * 获取值
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const db = this.ensureDb();
    const result = db.exec(`SELECT value FROM kv_store WHERE key = ?`, [key]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    try {
      return JSON.parse(result[0].values[0][0] as string) as T;
    } catch {
      return result[0].values[0][0] as unknown as T;
    }
  }

  /**
   * 删除值
   */
  async delete(key: string): Promise<boolean> {
    const db = this.ensureDb();
    db.run(`DELETE FROM kv_store WHERE key = ?`, [key]);
    return true;
  }

  /**
   * 检查键是否存在
   */
  async has(key: string): Promise<boolean> {
    const db = this.ensureDb();
    const result = db.exec(`SELECT 1 FROM kv_store WHERE key = ? LIMIT 1`, [key]);
    return result.length > 0 && result[0].values.length > 0;
  }

  // ========== 数据存储操作 ==========

  /**
   * 保存数据
   */
  async saveData(id: string, type: string, data: unknown): Promise<void> {
    const db = this.ensureDb();
    const now = Date.now();
    const dataStr = JSON.stringify(data);

    const existing = db.exec(`SELECT id FROM data_store WHERE id = ?`, [id]);
    
    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run(`UPDATE data_store SET data = ?, updated_at = ? WHERE id = ?`,
        [dataStr, now, id]);
    } else {
      db.run(`INSERT INTO data_store (id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [id, type, dataStr, now, now]);
    }
  }

  /**
   * 加载数据
   */
  async loadData<T = unknown>(id: string): Promise<T | null> {
    const db = this.ensureDb();
    const result = db.exec(`SELECT data FROM data_store WHERE id = ?`, [id]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    try {
      return JSON.parse(result[0].values[0][0] as string) as T;
    } catch {
      return result[0].values[0][0] as unknown as T;
    }
  }

  /**
   * 按类型查询数据
   */
  async queryByType<T = unknown>(type: string): Promise<T[]> {
    const db = this.ensureDb();
    const result = db.exec(`SELECT data FROM data_store WHERE type = ?`, [type]);
    
    if (result.length === 0) {
      return [];
    }

    const items: T[] = [];
    for (const row of result[0].values) {
      try {
        items.push(JSON.parse(row[0] as string) as T);
      } catch {
        items.push(row[0] as unknown as T);
      }
    }
    return items;
  }

  /**
   * 删除数据
   */
  async deleteData(id: string): Promise<boolean> {
    const db = this.ensureDb();
    db.run(`DELETE FROM data_store WHERE id = ?`, [id]);
    return true;
  }

  // ========== 事务操作 ==========

  /**
   * 执行事务
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const db = this.ensureDb();
    db.run('BEGIN TRANSACTION');
    try {
      const result = await fn();
      db.run('COMMIT');
      return result;
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
  }

  // ========== 原始 SQL 操作 ==========

  /**
   * 执行原始 SQL 查询
   */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
    const db = this.ensureDb();
    const result = db.exec(sql, params as (string | number | null | Uint8Array)[]);
    
    if (result.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj as T;
    });
  }

  /**
   * 执行原始 SQL 命令
   */
  execute(sql: string, params?: unknown[]): void {
    const db = this.ensureDb();
    db.run(sql, params as (string | number | null | Uint8Array)[]);
  }

  // ========== 生命周期 ==========

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    this.stopAutoSave();
    if (this.db) {
      await this.saveToFile();
      this.db.close();
      this.db = null;
    }
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * 获取数据库信息
   */
  getInfo(): { path: string; initialized: boolean; autoSave: boolean } {
    return {
      path: this.dbPath,
      initialized: this.initialized,
      autoSave: this.autoSave,
    };
  }
}

export default SQLiteStorage;
