// 模板管理器 - 管理内置代码模板

import fs from 'fs/promises';
import path from 'path';
import { cwd } from 'process';
import Handlebars from 'handlebars';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TemplateManager');

/**
 * 模板类型
 */
export type TemplateType = 'component' | 'page' | 'api' | 'hook' | 'type' | 'service' | 'model' | 'test';

/**
 * 模板元数据
 */
export interface TemplateMeta {
  name: string;
  type: TemplateType;
  description: string;
  language: string;
  framework?: string;
  tags: string[];
  variables: TemplateVariable[];
}

/**
 * 模板变量
 */
export interface TemplateVariable {
  name: string;
  type: 'string' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: unknown;
  description: string;
}

/**
 * 模板项
 */
export interface TemplateItem {
  meta: TemplateMeta;
  source: string;
}

/**
 * 代码模板管理器
 */
export class TemplateManager {
  private templates: Map<string, TemplateItem> = new Map();
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(cwd(), 'data', 'templates', 'code');
  }

  /**
   * 初始化 - 加载所有模板
   */
  async initialize(): Promise<void> {
    await this.loadTemplates();
    logger.info('Template manager initialized', { 
      templateCount: this.templates.size 
    });
  }

  /**
   * 加载模板目录
   */
  private async loadTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.templatesDir);
      
      for (const file of files) {
        if (!file.endsWith('.hbs')) continue;
        
        const templatePath = path.join(this.templatesDir, file);
        const source = await fs.readFile(templatePath, 'utf-8');
        
        // 从文件名解析模板信息
        const baseName = path.basename(file, '.hbs');
        const [type, name] = baseName.split('-');
        
        // 注册 Handlebars 模板
        Handlebars.registerPartial(baseName, source);
        
        // 提取变量（从注释中）
        const variables = this.extractVariables(source);
        
        const template: TemplateItem = {
          meta: {
            name,
            type: type as TemplateType,
            description: this.extractDescription(source),
            language: this.detectLanguage(source),
            framework: this.detectFramework(source),
            tags: this.extractTags(source),
            variables,
          },
          source,
        };
        
        this.templates.set(baseName, template);
      }
      
      // 注册内置模板
      this.registerBuiltinTemplates();
      
    } catch (error) {
      logger.warn('Failed to load templates from disk, using built-in only', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      this.registerBuiltinTemplates();
    }
  }

  /**
   * 注册内置模板
   */
  private registerBuiltinTemplates(): void {
    // React 组件模板
    this.templates.set('component-react', {
      meta: {
        name: 'react-component',
        type: 'component',
        description: 'React 函数组件',
        language: 'TypeScript',
        framework: 'React',
        tags: ['react', 'component', 'frontend'],
        variables: [
          { name: 'componentName', type: 'string', required: true, description: '组件名称' },
          { name: 'description', type: 'string', required: false, defaultValue: '', description: '组件描述' },
          { name: 'hasState', type: 'boolean', required: false, defaultValue: false, description: '是否使用 useState' },
          { name: 'hasEffect', type: 'boolean', required: false, defaultValue: false, description: '是否使用 useEffect' },
          { name: 'hasRef', type: 'boolean', required: false, defaultValue: false, description: '是否使用 useRef' },
          { name: 'hasStyles', type: 'boolean', required: false, defaultValue: false, description: '是否使用 CSS Modules' },
          { name: 'hasChildren', type: 'boolean', required: false, defaultValue: false, description: '是否支持 children' },
        ],
      },
      source: this.getReactComponentTemplate(),
    });

    // Vue 组件模板
    this.templates.set('component-vue', {
      meta: {
        name: 'vue-component',
        type: 'component',
        description: 'Vue 3 组合式组件',
        language: 'TypeScript',
        framework: 'Vue',
        tags: ['vue', 'component', 'frontend'],
        variables: [
          { name: 'componentName', type: 'string', required: true, description: '组件名称' },
          { name: 'description', type: 'string', required: false, defaultValue: '', description: '组件描述' },
          { name: 'hasProps', type: 'boolean', required: false, defaultValue: true, description: '是否定义 props' },
          { name: 'hasEmits', type: 'boolean', required: false, defaultValue: false, description: '是否定义 emits' },
          { name: 'hasRefs', type: 'boolean', required: false, defaultValue: false, description: '是否使用 ref' },
          { name: 'hasReactive', type: 'boolean', required: false, defaultValue: false, description: '是否使用 reactive' },
        ],
      },
      source: this.getVueComponentTemplate(),
    });

    // Express API 模板
    this.templates.set('api-express', {
      meta: {
        name: 'express-api',
        type: 'api',
        description: 'Express.js REST API 处理器',
        language: 'TypeScript',
        framework: 'Express',
        tags: ['api', 'express', 'backend', 'rest'],
        variables: [
          { name: 'apiName', type: 'string', required: true, description: 'API 名称' },
          { name: 'method', type: 'string', required: true, defaultValue: 'get', description: 'HTTP 方法' },
          { name: 'path', type: 'string', required: true, defaultValue: '/', description: 'API 路径' },
          { name: 'hasValidation', type: 'boolean', required: false, defaultValue: false, description: '是否需要验证' },
          { name: 'hasAuth', type: 'boolean', required: false, defaultValue: false, description: '是否需要认证' },
        ],
      },
      source: this.getExpressApiTemplate(),
    });

    // TypeScript 类型模板
    this.templates.set('type-typescript', {
      meta: {
        name: 'typescript-type',
        type: 'type',
        description: 'TypeScript 类型定义',
        language: 'TypeScript',
        tags: ['typescript', 'type', 'interface'],
        variables: [
          { name: 'typeName', type: 'string', required: true, description: '类型名称' },
          { name: 'description', type: 'string', required: false, defaultValue: '', description: '类型描述' },
          { name: 'isInterface', type: 'boolean', required: false, defaultValue: true, description: '使用 interface 还是 type' },
          { name: 'isGeneric', type: 'boolean', required: false, defaultValue: false, description: '是否泛型' },
        ],
      },
      source: this.getTypeScriptTypeTemplate(),
    });

    // React Hook 模板
    this.templates.set('hook-react', {
      meta: {
        name: 'react-hook',
        type: 'hook',
        description: 'React 自定义 Hook',
        language: 'TypeScript',
        framework: 'React',
        tags: ['react', 'hook', 'custom-hook'],
        variables: [
          { name: 'hookName', type: 'string', required: true, description: 'Hook 名称' },
          { name: 'description', type: 'string', required: false, defaultValue: '', description: 'Hook 描述' },
          { name: 'hasState', type: 'boolean', required: false, defaultValue: true, description: '是否使用 useState' },
          { name: 'hasEffect', type: 'boolean', required: false, defaultValue: false, description: '是否使用 useEffect' },
          { name: 'hasCallback', type: 'boolean', required: false, defaultValue: false, description: '是否使用 useCallback' },
        ],
      },
      source: this.getReactHookTemplate(),
    });

    // Service 模板
    this.templates.set('service-generic', {
      meta: {
        name: 'generic-service',
        type: 'service',
        description: '通用 Service 类',
        language: 'TypeScript',
        tags: ['service', 'class', 'business'],
        variables: [
          { name: 'serviceName', type: 'string', required: true, description: 'Service 名称' },
          { name: 'description', type: 'string', required: false, defaultValue: '', description: 'Service 描述' },
          { name: 'hasCRUD', type: 'boolean', required: false, defaultValue: true, description: '是否包含 CRUD 方法' },
        ],
      },
      source: this.getServiceTemplate(),
    });

    // Model 模板
    this.templates.set('model-generic', {
      meta: {
        name: 'generic-model',
        type: 'model',
        description: '数据模型类',
        language: 'TypeScript',
        tags: ['model', 'class', 'data'],
        variables: [
          { name: 'modelName', type: 'string', required: true, description: 'Model 名称' },
          { name: 'description', type: 'string', required: false, defaultValue: '', description: 'Model 描述' },
          { name: 'fields', type: 'array', required: false, defaultValue: [], description: '字段列表' },
        ],
      },
      source: this.getModelTemplate(),
    });

    // 测试模板
    this.templates.set('test-unit', {
      meta: {
        name: 'unit-test',
        type: 'test',
        description: 'Jest 单元测试',
        language: 'TypeScript',
        tags: ['test', 'jest', 'unit'],
        variables: [
          { name: 'testName', type: 'string', required: true, description: '测试名称' },
          { name: 'subjectName', type: 'string', required: true, description: '被测对象名称' },
          { name: 'hasBeforeEach', type: 'boolean', required: false, defaultValue: false, description: '是否有 beforeEach' },
        ],
      },
      source: this.getUnitTestTemplate(),
    });

    // 注册所有内置模板到 Handlebars
    this.templates.forEach((item, key) => {
      Handlebars.registerPartial(key, item.source);
    });
  }

  /**
   * 根据类型获取模板列表
   */
  getByType(type: TemplateType): TemplateItem[] {
    const result: TemplateItem[] = [];
    this.templates.forEach(item => {
      if (item.meta.type === type) {
        result.push(item);
      }
    });
    return result;
  }

  /**
   * 根据框架获取模板
   */
  getByFramework(framework: string): TemplateItem[] {
    const result: TemplateItem[] = [];
    this.templates.forEach(item => {
      if (item.meta.framework?.toLowerCase() === framework.toLowerCase()) {
        result.push(item);
      }
    });
    return result;
  }

  /**
   * 渲染模板
   */
  render(templateKey: string, data: Record<string, unknown>): string {
    const template = this.templates.get(templateKey);
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    const compiled = Handlebars.compile(template.source);
    return compiled(data);
  }

  /**
   * 获取所有模板
   */
  getAll(): TemplateItem[] {
    return Array.from(this.templates.values());
  }

  /**
   * 获取模板元数据列表
   */
  getMetaList(): TemplateMeta[] {
    return Array.from(this.templates.values()).map(item => item.meta);
  }

  /**
   * 搜索模板
   */
  search(query: string): TemplateItem[] {
    const lowerQuery = query.toLowerCase();
    const result: TemplateItem[] = [];
    
    this.templates.forEach(item => {
      const matchName = item.meta.name.toLowerCase().includes(lowerQuery);
      const matchType = item.meta.type.toLowerCase().includes(lowerQuery);
      const matchTag = item.meta.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      const matchDesc = item.meta.description.toLowerCase().includes(lowerQuery);
      
      if (matchName || matchType || matchTag || matchDesc) {
        result.push(item);
      }
    });
    
    return result;
  }

  // ========== 辅助方法 ==========

  private extractVariables(source: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    const varMatches = source.match(/\{\{(\w+)\}\}/g) || [];
    const uniqueVars = [...new Set(varMatches.map(m => m.replace(/[{}]/g, '')))];
    
    for (const name of uniqueVars) {
      if (!['else', 'each', 'if', 'unless', 'end'].includes(name)) {
        variables.push({
          name,
          type: 'string',
          required: false,
          description: `${name} variable`,
        });
      }
    }
    
    return variables;
  }

  private extractDescription(source: string): string {
    const match = source.match(/\/\/ (.+?)(?:\n|$)/);
    return match ? match[1] : '';
  }

  private detectLanguage(source: string): string {
    if (source.includes('import React') || source.includes('from "react"')) return 'TypeScript';
    if (source.includes('interface ') || source.includes('type ')) return 'TypeScript';
    if (source.includes('def ') && source.includes(':')) return 'Python';
    if (source.includes('func ') && source.includes('package ')) return 'Go';
    return 'TypeScript';
  }

  private detectFramework(source: string): string | undefined {
    if (source.includes('React.FC') || source.includes('useState')) return 'React';
    if (source.includes('defineComponent') || source.includes('setup')) return 'Vue';
    if (source.includes('express') || source.includes('RequestHandler')) return 'Express';
    if (source.includes('@Component') || source.includes('@Injectable')) return 'Angular';
    return undefined;
  }

  private extractTags(source: string): string[] {
    const tags: string[] = [];
    const fw = this.detectFramework(source);
    if (fw) tags.push(fw.toLowerCase());
    const lang = this.detectLanguage(source);
    if (lang) tags.push(lang.toLowerCase());
    return tags;
  }

  // ========== 内联模板源码 ==========

  private getReactComponentTemplate(): string {
    return `import React{{#if hasState}}, useState{{/if}}{{#if hasEffect}}, useEffect{{/if}}{{#if hasRef}}, useRef{{/if}} from 'react';
{{#if hasStyles}}
import styles from './{{componentName}}.module.css';
{{/if}}
{{#if hasChildren}}
import type { ReactNode } from 'react';
{{/if}}

export interface {{componentName}}Props {
  {{#if hasChildren}}
  children?: ReactNode;
  {{/if}}
  className?: string;
  onClick?: () => void;
}

export const {{componentName}}: React.FC<{{componentName}}Props> = (
  {{#if hasChildren}}children, {{/if}}className, onClick
}) => {
  {{#if hasState}}
  const [state, setState] = useState<{{stateType}}>({{initialValue}});
  {{/if}}

  {{#if hasEffect}}
  useEffect(() => {
    // Effect logic here
  }, []);
  {{/if}}

  return (
    <div className={className} onClick={onClick}>
      {{#if hasChildren}}
      {children}
      {{/if}}
    </div>
  );
};

export default {{componentName}};`;
  }

  private getVueComponentTemplate(): string {
    return `<template>
  <div class="{{kebabCase componentName}}">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
{{#if hasProps}}
const props = defineProps<{
  title?: string;
}>();
{{/if}}

{{#if hasEmits}}
const emit = defineEmits<{
  (e: 'update', value: any): void;
}>();
{{/if}}

{{#if hasRefs}}
const count = ref(0);
{{/if}}

{{#if hasReactive}}
const state = reactive({
  name: '',
});
{{/if}}
</script>

<style scoped>
.{{kebabCase componentName}} {
  /* Component styles */
}
</style>`;
  }

  private getExpressApiTemplate(): string {
    return `import { Request, Response, NextFunction } from 'express';
{{#if hasValidation}}
import { body, validationResult } from 'express-validator';
{{/if}}
{{#if hasAuth}}
import { authenticate } from '../middleware/auth';
{{/if}}

export interface {{capitalizedName}}Request extends Request {
  {{#if hasAuth}}user?: { id: string; role: string };{{/if}}
  body: {
    // Request body fields
  };
}

export const {{handlerName}} = async (
  req: {{capitalizedName}}Request,
  res: Response,
  next: NextFunction
) => {
  try {
    {{#if hasValidation}}
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    {{/if}}

    {{#if hasAuth}}
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    {{/if}}

    // Business logic here
    const result = {};

    return res.json({
      code: 200,
      message: 'Success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

{{#if hasValidation}}
export const {{handlerName}}Validation = [
  body('field').notEmpty().withMessage('Field is required'),
];
{{/if}}

export default {{handlerName}};`;
  }

  private getTypeScriptTypeTemplate(): string {
    return `{{#if isInterface}}
/**
 * {{description}}
 */
export interface {{typeName}} {
  {{#if isGeneric}}<T>{{/if}}
  // Fields
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
{{else}}
/**
 * {{description}}
 */
export type {{typeName}}{{#if isGeneric}}<T>{{/if}} = {
  // Fields
  id: string;
  createdAt: Date;
  updatedAt: Date;
};
{{/if}}

/**
 * {{typeName}} 创建参数
 */
export type Create{{typeName}}Input = Omit<{{typeName}}, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * {{typeName}} 更新参数
 */
export type Update{{typeName}}Input = Partial<Create{{typeName}}Input>;`;
  }

  private getReactHookTemplate(): string {
    return `import { useState, useEffect{{#if hasCallback}}, useCallback{{/if}} } from 'react';

/**
 * {{description}}
 */
export const use{{capitalized hookName}} = ({{#if hasState}}initial{{capitalized hookName}}?: {{stateType}}{{/if}}) => {
  {{#if hasState}}
  const [{{camelCase hookName}}, set{{capitalized hookName}}] = useState<{{stateType}}>(initial{{capitalized hookName}});
  {{/if}}

  {{#if hasEffect}}
  useEffect(() => {
    // Side effect logic
    return () => {
      // Cleanup
    };
  }, []);
  {{/if}}

  {{#if hasCallback}}
  const handleAction = useCallback((param: any) => {
    // Callback logic
  }, []);
  {{/if}}

  return {
    {{#if hasState}}{{camelCase hookName}},{{/if}}
    {{#if hasCallback}}handleAction,{{/if}}
  };
};`;
  }

  private getServiceTemplate(): string {
    return `/**
 * {{serviceName}} Service
 * {{description}}
 */
export class {{serviceName}}Service {
  {{#if hasCRUD}}
  async findAll(): Promise<{{serviceName}}[]> {
    // TODO: Implement
    return [];
  }

  async findById(id: string): Promise<{{serviceName}} | null> {
    // TODO: Implement
    return null;
  }

  async create(data: Create{{serviceName}}Input): Promise<{{serviceName}}> {
    // TODO: Implement
    return {} as {{serviceName}};
  }

  async update(id: string, data: Update{{serviceName}}Input): Promise<{{serviceName}} | null> {
    // TODO: Implement
    return null;
  }

  async delete(id: string): Promise<boolean> {
    // TODO: Implement
    return true;
  }
  {{/if}}
}

export const {{camelCase serviceName}}Service = new {{serviceName}}Service();`;
  }

  private getModelTemplate(): string {
    return `/**
 * {{modelName}} Model
 * {{description}}
 */
export interface {{modelName}} {
  id: string;
  {{#each fields}}
  {{name}}: {{type}};
  {{/each}}
  createdAt: Date;
  updatedAt: Date;
}

/**
 * {{modelName}} 创建参数
 */
export type Create{{modelName}}Input = Omit<{{modelName}}, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * {{modelName}} 更新参数
 */
export type Update{{modelName}}Input = Partial<Create{{modelName}}Input>;

/**
 * {{modelName}} 验证规则
 */
export const {{camelCase modelName}}Validation = {
  // Validation rules
};`;
  }

  private getUnitTestTemplate(): string {
    return `{{#if hasBeforeEach}}
describe('{{testName}}', () => {
  let {{subjectName}}: typeof import('./subject');

  beforeEach(() => {
    // Setup
  });
{{else}}
describe('{{testName}}', () => {
{{/if}}
  it('should work', () => {
    expect(true).toBe(true);
  });

  it('should handle edge case', () => {
    // Test logic
  });
});`;
  }
}

export default TemplateManager;