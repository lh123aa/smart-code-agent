# Smart Code Agent

智能代码生成 MCP 插件 - 需求闭环、Skill 插件化、自我学习、观察者迭代

## 特性

- 🎯 **需求驱动开发** - 从需求采集到代码生成的完整闭环
- 🔌 **Skill 插件化** - 可扩展的技能系统，支持自定义 Skill
- 🧠 **自我学习** - 本地知识库，持续积累开发经验
- 📊 **观察者模式** - 全程记录运行数据，持续优化
- 💾 **多种存储** - 支持文件系统存储和 SQLite 数据库
- 🧪 **完整测试** - 内置测试生成和代码质量检查

## 安装

```bash
npm install
npm run build
```

## 快速开始

```typescript
import SmartCodeAgent from './src/plugin.js';

const agent = new SmartCodeAgent();
await agent.initialize();

// 启动开发流程
const result = await agent.start({
  projectType: 'page',
  initialDemand: '创建一个用户登录页面',
  projectPath: './my-project',
});
```

## MCP 工具

| 工具 | 描述 |
|------|------|
| `sca-start` | 启动开发流程，从需求采集开始 |
| `sca-resume` | 恢复中断的开发流程 |
| `sca-get-report` | 获取运行报告 |
| `sca-add-knowledge` | 添加知识到知识库 |
| `sca-search-knowledge` | 搜索知识库 |
| `sca-list-workflows` | 列出所有工作流 |
| `sca-run-workflow` | 执行指定工作流 |
| `sca-submit-feedback` | 提交用户反馈 |

## 内置 Skills

### IO 操作
- `read-file` - 读取文件
- `write-file` - 写入文件
- `list-dir` - 列出目录
- `file-io` - 文件操作组合

### 代码生成
- `generate-code` - 生成代码
- `generate-test` - 生成测试
- `error-fix` - 错误修复
- `unit-test` - 单元测试
- `integration-test` - 集成测试
- `acceptance-test` - 验收测试
- `lint` - 代码检查
- `type-check` - 类型检查

### 需求分析
- `analyze-demand` - 需求分析
- `demand-collect` - 需求采集
- `demand-confirm` - 需求确认

### 格式转换
- `format-code` - 代码格式化
- `prettier-format` - Prettier 格式化

### 观察者
- `observe-record` - 记录运行数据
- `observe-report` - 生成报告

### 工具类
- `wait` - 等待
- `retry` - 重试
- `branch` - 条件分支
- `parallel` - 并行执行
- `list-templates` - 列出代码模板

## 代码模板

内置 8 种代码模板：

1. **React 组件** - 函数组件 + Hooks
2. **Vue 组件** - Options API / Composition API
3. **Express API** - RESTful API
4. **TypeScript 类型** - 类型定义
5. **React Hook** - 自定义 Hook
6. **Service** - 业务服务层
7. **数据模型** - 数据模型定义
8. **测试用例** - Jest 测试

## 存储方式

### 文件存储 (默认)

```typescript
import { FileStorage } from './src/storage/index.js';

const storage = new FileStorage({ basePath: './data' });
```

### SQLite 存储

```typescript
import { SQLiteStorage } from './src/storage/index.js';

const sqlite = new SQLiteStorage({
  dbPath: './data/storage.db',
  autoSave: true,
});
await sqlite.initialize();
```

## 错误处理

统一的错误类型系统：

```typescript
import { SCAError, ErrorCode, ErrorSeverity } from './src/types/errors.js';

try {
  // 代码...
} catch (error) {
  if (error instanceof SCAError) {
    console.log(error.code);      // 错误码
    console.log(error.severity);  // 严重级别
    console.log(error.suggestions); // 恢复建议
  }
}
```

## 重试策略

```typescript
import { RetryStrategy, retryPresets } from './src/utils/retry-strategy.js';

const retry = new RetryStrategy({
  maxAttempts: 3,
  baseDelay: 1000,
  backoffMultiplier: 2,
});

const result = await retry.execute(async () => {
  // 可能失败的操作
});
```

## 运行测试

```bash
npm test           # 运行所有测试
npm run test:watch  # 监听模式
npm run test:coverage # 覆盖率报告
```

## 项目结构

```
src/
├── index.ts           # 入口
├── plugin.ts          # 主插件
├── skill-engine/     # Skill 引擎
│   ├── executor.ts   # 执行器
│   ├── registry.ts   # 注册表
│   └── workflow-executor.ts
├── skills/           # 内置 Skills
│   ├── atoms/        # 原子技能
│   └── workflows/    # 工作流
├── storage/          # 存储
│   ├── index.ts      # 文件存储
│   └── sqlite-storage.ts
├── knowledge/        # 知识库
├── observer/         # 观察者
├── mcp/              # MCP 协议
└── utils/            # 工具函数
    ├── cache-manager.ts
    ├── error-handler.ts
    ├── retry-strategy.ts
    └── template-manager.ts
```

## 许可证

MIT
