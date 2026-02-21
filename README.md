# Smart Code Agent

智能代码生成 MCP 插件 - 需求闭环、Skill 插件化、自我学习、观察者迭代

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=flat-square" alt="Node.js">
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-orange?style=flat-square" alt="License">
</p>

## 简介

Smart Code Agent 是一个智能代码生成 MCP (Model Context Protocol) 插件，旨在提供从需求分析到代码生成的完整闭环解决方案。

### 核心特性

- 🎯 **需求驱动开发** - 从需求采集到代码生成的完整闭环
- 🔌 **Skill 插件化** - 可扩展的技能系统，支持自定义 Skill
- 🧠 **自我学习** - 本地知识库，持续积累开发经验
- 📊 **观察者模式** - 全程记录运行数据，持续优化
- 💾 **多种存储** - 支持文件系统存储和 SQLite 数据库
- 🧪 **完整测试** - 内置测试生成和代码质量检查

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      SmartCodeAgent                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Skill     │  │   Workflow    │  │  Observer    │    │
│  │   Registry   │  │  Executor     │  │   Recorder   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Knowledge   │  │   Storage    │  │   LLM        │    │
│  │    Base      │  │   (FS/SQL)   │  │   Bridge     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                        MCP Server                            │
└─────────────────────────────────────────────────────────────┘
```

## 安装

### 方式一：快速安装

```bash
# 克隆项目
git clone https://github.com/lh123aa/smart-code-agent.git
cd smart-code-agent

# 安装并构建
node install.js
```

### 方式二：手动安装

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# (可选) 全局安装
npm link
```

### 方式三：开发模式

```bash
# 安装依赖
npm install

# 监听模式（自动编译）
npm run dev

# 运行测试
npm test
```

## 快速开始

### 1. 作为库使用

```typescript
import SmartCodeAgent from './src/plugin.js';

const agent = new SmartCodeAgent();
await agent.initialize();

// 启动开发流程
const result = await agent.start({
  projectType: 'page',        // page | api | component | project
  initialDemand: '创建一个用户登录页面',
  projectPath: './my-project',
});

console.log(result);
// { traceId: 'xxx', status: 'running', ... }
```

### 2. 使用 CLI

```bash
# 初始化
sca init

# 启动开发流程
sca start -t page -d "创建一个用户登录页面"

# 列出所有 Skills
sca list
```

### 3. MCP 集成

参考 `mcp-config.example.json` 配置：

```json
{
  "smart-code-agent": {
    "command": "node",
    "args": ["/path/to/smart-code-agent/dist/index.js"],
    "description": "智能代码生成插件"
  }
}
```

## MCP 工具

| 工具 | 描述 | 参数 |
|------|------|------|
| `sca-start` | 启动开发流程 | `projectType`, `initialDemand`, `projectPath` |
| `sca-resume` | 恢复中断的流程 | `traceId` |
| `sca-get-report` | 获取运行报告 | `traceId` (可选) |
| `sca-add-knowledge` | 添加知识 | `topic`, `content`, `keywords`, `source` |
| `sca-search-knowledge` | 搜索知识 | `query` |
| `sca-list-workflows` | 列出工作流 | - |
| `sca-run-workflow` | 执行工作流 | `workflowName`, `params` |
| `sca-submit-feedback` | 提交反馈 | `type`, `content`, `stage`, `traceId` |

### MCP 资源

| 资源 URI | 描述 |
|----------|------|
| `sca://knowledge` | 知识库 |
| `sca://runs` | 运行历史 |
| `sca://workflows` | 工作流定义 |
| `sca://skills` | 可用 Skills |
| `sca://statistics` | 运行统计 |
| `sca://config` | 当前配置 |

## 内置 Skills

### IO 操作
| Skill | 描述 |
|-------|------|
| `read-file` | 读取文件内容 |
| `write-file` | 写入文件 |
| `list-dir` | 列出目录内容 |
| `file-io` | 文件操作组合 |

### 代码生成
| Skill | 描述 |
|-------|------|
| `generate-code` | 根据需求生成代码 |
| `generate-test` | 生成测试代码 |
| `error-fix` | 自动修复错误 |
| `unit-test` | 单元测试生成 |
| `integration-test` | 集成测试生成 |
| `acceptance-test` | 验收测试生成 |
| `lint` | 代码检查 |
| `type-check` | 类型检查 |

### 需求分析
| Skill | 描述 |
|-------|------|
| `analyze-demand` | 需求分析 |
| `demand-collect` | 需求采集 |
| `demand-confirm` | 需求确认 |

### 格式转换
| Skill | 描述 |
|-------|------|
| `format-code` | 代码格式化 |
| `prettier-format` | Prettier 格式化 |

### 观察者
| Skill | 描述 |
|-------|------|
| `observe-record` | 记录运行数据 |
| `observe-report` | 生成运行报告 |

### 工具类
| Skill | 描述 |
|-------|------|
| `wait` | 延迟等待 |
| `retry` | 失败重试 |
| `branch` | 条件分支 |
| `parallel` | 并行执行 |
| `list-templates` | 列出代码模板 |

## 代码模板

内置 8 种代码模板：

| 模板 | 描述 | 参数 |
|------|------|------|
| `react-component` | React 函数组件 | `name`, `props`, `state`, `hooks` |
| `vue-component` | Vue 组件 | `name`, `props`, `data`, `methods` |
| `express-api` | Express REST API | `name`, `routes`, `middleware` |
| `typescript-type` | TypeScript 类型 | `name`, `fields`, `generics` |
| `react-hook` | 自定义 Hook | `name`, `state`, `effect`, `callback` |
| `service` | 业务服务层 | `name`, `crud`, `methods` |
| `model` | 数据模型 | `name`, `fields`, `relations` |
| `test` | Jest 测试 | `name`, `cases`, `mock` |

### 使用模板

```typescript
import { TemplateManager } from './src/utils/template-manager.js';

const tm = new TemplateManager();

// 获取所有模板
const templates = tm.listTemplates();

// 生成代码
const code = tm.render('react-component', {
  name: 'UserProfile',
  props: ['user', 'onEdit'],
  state: ['loading', 'error'],
});
```

## 存储方式

### 文件存储 (默认)

```typescript
import { FileStorage } from './src/storage/index.js';

const storage = new FileStorage({
  basePath: './data',  // 数据存储目录
});
```

### SQLite 存储

```typescript
import { SQLiteStorage } from './src/storage/index.js';

const sqlite = new SQLiteStorage({
  dbPath: './data/storage.db',  // 数据库文件路径
  autoSave: true,               // 自动保存
  autoSaveInterval: 5000,       // 保存间隔 (ms)
});

await sqlite.initialize();

// 使用 Key-Value 接口
await sqlite.set('user:1', { name: '张三' });
const user = await sqlite.get('user:1');

// 使用数据存储接口
await sqlite.saveData('user-1', 'user', { name: '张三', age: 25 });
const data = await sqlite.loadData('user-1');

await sqlite.close();
```

## 错误处理

### 统一错误类型

```typescript
import { SCAError, ErrorCode, ErrorSeverity } from './src/types/errors.js';

try {
  await agent.start({ /* ... */ });
} catch (error) {
  if (error instanceof SCAError) {
    console.log('错误码:', error.code);        // SKILL_NOT_FOUND
    console.log('严重级别:', error.severity);   // error
    console.log('恢复建议:', error.suggestions); // [...]
  }
}
```

### 错误码参考

| 范围 | 模块 |
|------|------|
| 1000-1099 | 通用错误 |
| 2000-2099 | Skill 错误 |
| 3000-3099 | 工作流错误 |
| 4000-4099 | 存储错误 |
| 5000-5099 | MCP 错误 |
| 6000-6099 | 知识库错误 |
| 7000-7099 | 模板错误 |

## 重试策略

```typescript
import { RetryStrategy, retryPresets } from './src/utils/retry-strategy.js';

// 方式一：自定义配置
const retry = new RetryStrategy({
  maxAttempts: 3,           // 最大重试次数
  baseDelay: 1000,          // 基础延迟 (ms)
  backoffMultiplier: 2,     // 退避倍数
  jitter: true,             // 添加随机抖动
  timeout: 30000,           // 超时时间
});

const result = await retry.execute(async () => {
  // 可能失败的操作
  return await riskyOperation();
});

// 方式二：使用预设
const fastRetry = new RetryStrategy(retryPresets.fast);
const slowRetry = new RetryStrategy(retryPresets.conservative);
```

### 预设配置

| 预设 | 描述 | 配置 |
|------|------|------|
| `fast` | 快速重试 | 3次, 100ms, 2x |
| `slow` | 慢速重试 | 5次, 2000ms, 2x |
| `conservative` | 保守重试 | 3次, 1000ms, 1.5x |
| `once` | 仅一次 | 2次, 0ms, 1x |

## 缓存管理

```typescript
import { CacheManager } from './src/utils/cache-manager.js';

const cache = new CacheManager({
  maxSize: 100,      // 最大缓存数
  defaultTTL: 60000, // 默认过期时间 (ms)
});

// 基础用法
cache.set('key', 'value');
const value = cache.get('key');

// 带过期时间
cache.set('temp', 'data', 5000); // 5秒后过期

// 懒加载
const data = cache.getOrSet('key', () => fetchData());

// 异步懒加载
const asyncData = await cache.getOrSetAsync('key', () => fetchDataAsync());
```

## 自定义 Skill 开发

### 1. 创建 Skill 文件

```typescript
// src/skills/atoms/custom/my-skill.ts
import { BaseSkill, type SkillResult } from '../../base.skill.js';

export class MySkill extends BaseSkill {
  name = 'my-skill';
  description = '我的自定义 Skill';
  category = 'custom';
  
  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    const param = input.param as string;
    
    // 业务逻辑
    const result = doSomething(param);
    
    return {
      success: true,
      output: { result },
      metadata: {
        skill: this.name,
        duration: 0,
      },
    };
  }
}

export default new MySkill();
```

### 2. 注册 Skill

```typescript
// 在 plugin.ts 或单独的配置中
import mySkill from './skills/atoms/custom/my-skill.js';

agent.registerSkill(mySkill);
```

### 3. 使用 Skill

```typescript
const result = await agent.executeSkill('my-skill', {
  param: 'value',
});
```

## 配置

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `SCA_DATA_PATH` | 数据存储路径 | `./data` |
| `SCA_LOG_LEVEL` | 日志级别 | `info` |
| `SCA_TEMPLATE_PATH` | 模板路径 | 内置模板 |

### 配置文件

创建 `.sca/config.json`：

```json
{
  "version": "1.0.0",
  "dataPath": "./data",
  "logLevel": "info",
  "autoSave": true,
  "templates": [
    "react-component",
    "vue-component",
    "express-api"
  ],
  "skills": {
    "enabled": ["*"],
    "disabled": []
  },
  "workflows": {
    "default": "full-demand-analysis"
  }
}
```

## 运行测试

```bash
# 运行所有测试
npm test

# 监听模式（文件变化自动运行）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- skill-executor.test.ts
```

## 项目结构

```
smart-code-agent/
├── src/
│   ├── index.ts              # 入口文件
│   ├── plugin.ts             # 主插件类
│   ├── bin/
│   │   └── cli.ts           # CLI 入口
│   ├── skill-engine/         # Skill 引擎
│   │   ├── executor.ts      # Skill 执行器
│   │   ├── registry.ts      # Skill 注册表
│   │   ├── parser.ts        # Skill 解析器
│   │   ├── validator.ts     # Skill 验证器
│   │   ├── composer.ts      # Skill 组合器
│   │   ├── state.ts         # 状态管理
│   │   └── workflow-executor.ts
│   ├── skills/              # 内置 Skills
│   │   ├── base.skill.ts   # Skill 基类
│   │   ├── atoms/           # 原子 Skills
│   │   │   ├── io/         # IO 操作
│   │   │   ├── generate/   # 代码生成
│   │   │   ├── analyze/    # 需求分析
│   │   │   ├── format/     # 格式转换
│   │   │   ├── observe/    # 观察者
│   │   │   ├── search/     # 搜索
│   │   │   └── utility/    # 工具类
│   │   └── workflows/       # 工作流 Skills
│   ├── storage/             # 存储层
│   │   ├── index.ts        # 文件存储
│   │   └── sqlite-storage.ts
│   ├── knowledge/          # 知识库
│   │   └── base.ts
│   ├── observer/           # 观察者
│   │   ├── recorder.ts     # 记录器
│   │   ├── reporter.ts     # 报告器
│   │   └── user-modifications.ts
│   ├── mcp/                # MCP 协议
│   │   ├── server.ts       # MCP 服务器
│   │   ├── tools.ts        # 工具定义
│   │   ├── resources.ts    # 资源定义
│   │   └── llm-bridge.ts  # LLM 桥接
│   └── utils/              # 工具函数
│       ├── logger.ts       # 日志
│       ├── cache-manager.ts
│       ├── error-handler.ts
│       ├── retry-strategy.ts
│       └── template-manager.ts
├── tests/                  # 测试文件
├── data/                   # 数据目录
├── install.js             # 安装脚本
├── uninstall.js           # 卸载脚本
└── package.json
```

## 常见问题

### Q: 如何添加新的代码模板？

A: 编辑 `src/utils/template-manager.ts`，在 `getTemplates()` 方法中添加新模板。

### Q: 如何禁用某个 Skill？

A: 在配置文件中设置：

```json
{
  "skills": {
    "disabled": ["lint", "type-check"]
  }
}
```

### Q: 如何自定义工作流？

A: 参考 `src/skill-engine/workflows/` 中的示例，创建新的 workflow 文件。

### Q: 支持哪些 IDE？

A: 支持 MCP 协议的 IDE 均可使用，如：
- VS Code (需 MCP 扩展)
- Cursor
- Zed
- 其他支持 MCP 的编辑器

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'feat: 添加 xxx'`)
4. 推送分支 (`git push origin feature/xxx`)
5. 创建 Pull Request

## 更新日志

### v1.0.0 (2026-02-21)

- ✅ 初始版本发布
- ✅ 需求闭环支持
- ✅ Skill 插件系统
- ✅ 知识库模块
- ✅ 观察者模式
- ✅ 文件/SQLite 双存储
- ✅ 错误处理系统
- ✅ 重试策略
- ✅ 代码模板库
- ✅ CLI 工具
- ✅ 安装/卸载脚本

## 许可证

MIT License - 请随意使用和修改

---

<p align="center">Made with ❤️ by Smart Code Agent</p>