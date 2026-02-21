// Skill 注册器测试

import { SkillRegistry } from '../src/skill-engine/registry.js';
import { BaseSkill } from '../src/skills/base.skill.js';
import type { SkillInput, SkillOutput } from '../src/types/index.js';

// 测试 Skill
class TestSkill extends BaseSkill {
  meta = {
    name: 'test-skill',
    description: 'A test skill',
    category: 'utility',
    version: '1.0.0',
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    return this.success({ result: 'test completed' }, 'Test skill executed');
  }
}

// 测试 Skill 2 - 用于测试多个技能
class TestSkill2 extends BaseSkill {
  meta = {
    name: 'test-skill-2',
    description: 'Another test skill',
    category: 'utility',
    version: '1.0.0',
  };

  protected async execute(input: SkillInput): Promise<SkillOutput> {
    return this.success({ result: 'test 2 completed' }, 'Test skill 2 executed');
  }
}

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  it('should register a skill', () => {
    const skill = new TestSkill();
    registry.register(skill);
    
    expect(registry.has('test-skill')).toBe(true);
  });

  it('should get a skill', () => {
    const skill = new TestSkill();
    registry.register(skill);
    
    const retrieved = registry.get('test-skill');
    expect(retrieved).toBeDefined();
    expect(retrieved?.meta.name).toBe('test-skill');
  });

  it('should return null for non-existent skill', () => {
    const retrieved = registry.get('non-existent');
    expect(retrieved).toBeNull();
  });

  it('should get skill meta', () => {
    const skill = new TestSkill();
    registry.register(skill);
    
    const meta = registry.getMeta('test-skill');
    expect(meta).toBeDefined();
    expect(meta?.name).toBe('test-skill');
    expect(meta?.category).toBe('utility');
  });

  it('should get all skill names', () => {
    const skill1 = new TestSkill();
    const skill2 = new TestSkill2();
    
    registry.register(skill1);
    registry.register(skill2);
    
    const names = registry.getAllNames();
    expect(names.length).toBeGreaterThanOrEqual(2);
  });

  it('should get skills by category', () => {
    const skill = new TestSkill();
    registry.register(skill);
    
    const skills = registry.getByCategory('utility');
    expect(skills.length).toBeGreaterThan(0);
  });

  it('should unregister a skill', () => {
    const skill = new TestSkill();
    registry.register(skill);
    
    expect(registry.has('test-skill')).toBe(true);
    
    const removed = registry.unregister('test-skill');
    expect(removed).toBe(true);
    expect(registry.has('test-skill')).toBe(false);
  });

  it('should search skills', () => {
    const skill = new TestSkill();
    registry.register(skill);
    
    const results = registry.search('test');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should get stats', () => {
    const skill = new TestSkill();
    registry.register(skill);
    
    const stats = registry.getStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.byCategory.utility).toBeGreaterThan(0);
  });

  it('should register multiple skills', () => {
    const skill1 = new TestSkill();
    const skill2 = new TestSkill2();
    
    registry.registerMany([skill1, skill2]);
    
    expect(registry.getAllNames().length).toBeGreaterThanOrEqual(2);
  });
});
