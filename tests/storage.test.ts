// 存储模块测试

import { Storage } from '../src/storage/index.js';
import path from 'path';
import fs from 'fs/promises';

// 使用临时目录进行测试
const testDir = path.join(process.cwd(), 'test-temp-storage');

describe('Storage', () => {
  let storage: Storage;

  beforeAll(async () => {
    // 确保测试目录存在
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch {
      // 忽略错误
    }
  });

  beforeEach(() => {
    storage = new Storage({ basePath: testDir });
  });

  afterAll(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // 忽略错误
    }
  });

  describe('save and load', () => {
    it('should save and load JSON data', async () => {
      const data = { name: 'test', value: 123 };
      await storage.save('test.json', data);
      
      const loaded = await storage.load<typeof data>('test.json');
      expect(loaded).toEqual(data);
    });

    it('should save and load string data', async () => {
      const content = 'Hello, World!';
      await storage.save('test.txt', content);
      
      const loaded = await storage.load('test.txt');
      expect(loaded).toBe(content);
    });

    it('should return null for non-existent file', async () => {
      const loaded = await storage.load('non-existent.json');
      expect(loaded).toBeNull();
    });
  });

  describe('exists', () => {
    it('should check if file exists', async () => {
      await storage.save('exists-test.json', { test: true });
      
      expect(await storage.exists('exists-test.json')).toBe(true);
      expect(await storage.exists('non-existent.json')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing file', async () => {
      await storage.save('delete-test.json', { test: true });
      expect(await storage.exists('delete-test.json')).toBe(true);
      
      const result = await storage.delete('delete-test.json');
      expect(result).toBe(true);
      expect(await storage.exists('delete-test.json')).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const result = await storage.delete('non-existent.json');
      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should list files in directory', async () => {
      await storage.save('list/file1.json', { test: 1 });
      await storage.save('list/file2.json', { test: 2 });
      
      const files = await storage.list('list');
      expect(files.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for non-existent directory', async () => {
      const files = await storage.list('non-existent');
      expect(files).toEqual([]);
    });
  });

  describe('ensureDir', () => {
    it('should create directory recursively', async () => {
      await storage.ensureDir('deep/nested/dir');
      
      expect(await storage.exists('deep/nested/dir')).toBe(true); // 目录已创建
    });
  });

  describe('append', () => {
    it('should append data to array', async () => {
      await storage.save('append-test.json', []);
      await storage.append('append-test.json', { id: 1 });
      await storage.append('append-test.json', { id: 2 });
      
      const loaded = await storage.load<Array<{ id: number }>>('append-test.json');
      expect(loaded?.length).toBe(2);
      expect(loaded?.[0].id).toBe(1);
      expect(loaded?.[1].id).toBe(2);
    });
  });

  describe('getFullPath', () => {
    it('should return full path', () => {
      const fullPath = storage.getFullPath('test.json');
      expect(fullPath).toContain('test-temp-storage');
      expect(fullPath).toContain('test.json');
    });
  });
});
