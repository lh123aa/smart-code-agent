// CacheManager 单元测试

import { CacheManager } from '../src/utils/cache-manager.js';

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager<string>({
      defaultTTL: 1000, // 1秒用于测试
      maxSize: 3,
      enableLRU: true,
    });
  });

  describe('基本操作', () => {
    it('should set and get value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should delete key', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('TTL 过期', () => {
    it('should expire after TTL', async () => {
      cache = new CacheManager<string>({
        defaultTTL: 100, // 100ms
      });

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should never expire when TTL is 0', () => {
      cache = new CacheManager<string>({
        defaultTTL: 0,
      });

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('LRU 淘汰', () => {
    it('should evict least recently used when max size reached', () => {
      cache = new CacheManager<string>({
        maxSize: 2,
        enableLRU: true,
      });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1'); // 访问 key1 使其更新
      cache.set('key3', 'value3'); // 应该淘汰 key2

      expect(cache.get('key1')).toBe('value1'); // 仍然存在
      expect(cache.get('key2')).toBeUndefined(); // 被淘汰
      expect(cache.get('key3')).toBe('value3'); // 新增
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', () => {
      cache.set('key1', 'value1');
      const result = cache.getOrSet('key1', () => 'computed');
      expect(result).toBe('value1');
    });

    it('should compute and cache if not exists', () => {
      const result = cache.getOrSet('key1', () => 'computed');
      expect(result).toBe('computed');
      expect(cache.get('key1')).toBe('computed');
    });
  });

  describe('getOrSetAsync', () => {
    it('should return cached value if exists', async () => {
      cache.set('key1', 'value1');
      const result = await cache.getOrSetAsync('key1', async () => 'computed');
      expect(result).toBe('value1');
    });

    it('should compute and cache if not exists', async () => {
      const result = await cache.getOrSetAsync('key1', async () => 'computed');
      expect(result).toBe('computed');
      expect(cache.get('key1')).toBe('computed');
    });
  });

  describe('统计', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should reset stats', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key2');

      cache.resetStats();
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('模式匹配删除', () => {
    it('should delete by pattern', () => {
      cache.set('user:1', 'user1');
      cache.set('user:2', 'user2');
      cache.set('post:1', 'post1');

      const count = cache.deleteByPattern('user:*');
      expect(count).toBe(2);
      expect(cache.has('user:1')).toBe(false);
      expect(cache.has('post:1')).toBe(true);
    });
  });

  describe('keys', () => {
    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });
});
