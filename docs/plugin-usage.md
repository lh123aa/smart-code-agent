# Smart Code Agent MCP 插件使用文档

## 简介

Smart Code Agent 是一个智能代码开发助手 MCP 插件，支持从需求分析到代码生成的完整开发流程。

## 安装

```bash
npm install smart-code-agent
```

## 快速开始

### 1. 初始化插件

```typescript
import { SmartCodeAgent, MCPServer } from 'smart-code-agent';

const agent = new SmartCodeAgent();
await agent.initialize();

const server = new MCPServer(agent);
await server.initialize();
```

### 2. 启动开发流程

```typescript
const result = await agent.start({
  projectType: 'page', // page | api | component | project
  initialDemand: '创建一个用户管理页面，包含列表、新增、编辑功能',
  projectPath: '/path/to/your/project',
});

console.log(result.traceId); // 保存此 ID 用于恢复
```

### 3. 恢复中断的流程

```typescript
const result = await agent.resume('之前保存的traceId');
```

## MCP 工具

### sca-start
启动新的开发流程。

**参数：**
- `projectType` (必填): 项目类型 - `page` | `api` | `component` | `project`
- `initialDemand` (可选): 初始需求描述
- `projectPath` (可选): 项目路径

### sca-resume
恢复之前中断的开发流程。

**参数：**
- `traceId` (必填): 之前运行的追踪 ID

### sca-get-report
获取运行报告。

**参数：**
- `traceId` (可选): 追踪 ID，不提供则返回最近运行的报告

### sca-submit-feedback
提交用户反馈。

**参数：**
- `traceId` (可选): 关联的追踪 ID
- `type` (必填): 反馈类型 - `bug` | `suggestion` | `question`
- `content` (必填): 反馈内容
- `stage` (可选): 关联阶段 - `demand` | `code` | `test` | `delivery`

### sca-add-knowledge
添加知识到本地知识库。

**参数：**
- `topic` (必填): 知识主题
- `content` (必填): 知识内容
- `keywords` (可选): 关键词标签
- `source` (可选): 知识来源 - `web` | `manual` | `learned`

### sca-search-knowledge
搜索本地知识库。

**参数：**
- `query` (必填): 搜索关键词

### sca-list-workflows
列出所有可用的工作流。

### sca-run-workflow
执行指定的工作流。

**参数：**
- `workflowName` (必填): 工作流名称
- `params` (可选): 工作流参数

## MCP 资源

| URI | 名称 | 描述 |
|-----|------|------|
| `sca://knowledge` | knowledge-base | 本地知识库 |
| `sca://runs` | run-history | 运行历史记录 |
| `sca://runs/latest` | latest-run | 最近一次运行详情 |
| `sca://workflows` | workflows | 可用的工作流定义 |
| `sca://config` | agent-config | 当前配置 |

## 工作流

### 完整需求分析流程
```
demand-collect → demand-analysis → demand-confirm
```

### 完整开发流程
```
demand-collect → demand-analysis → demand-confirm → code-generation → error-fix → code-format → unit-test → file-write → integration-test → acceptance-test → delivery
```

### 快速开发流程
```
demand → generate → fix → format → save
```

## 架构

### 核心组件

- **SkillRegistry**: Skill 注册与管理
- **SkillExecutor**: Skill 执行器
- **WorkflowExecutor**: 工作流执行器
- **KnowledgeBase**: 知识库
- **ObserverRecorder**: 观察者记录器
- **ObserverReporter**: 报告生成器

### Skill 分类

- **ask**: 提问技能 (question, clarify, confirm)
- **analyze**: 分析技能 (demand)
- **generate**: 生成技能 (code, test)
- **format**: 格式化技能 (code)
- **io**: IO 技能 (read-file, write-file, list-dir)
- **observe**: 观察技能 (record, report)
- **search**: 搜索技能 (knowledge-search, web-search, learn-knowledge)
- **utility**: 工具技能 (wait, retry, branch, parallel)

## 配置

### 创建配置文件

```json
{
  "version": "1.0.0",
  "features": {
    "knowledgeBase": true,
    "observer": true,
    "workflow": true
  }
}
```

## 示例

### 完整使用示例

```typescript
import { SmartCodeAgent } from 'smart-code-agent';

async function main() {
  // 1. 初始化
  const agent = new SmartCodeAgent();
  await agent.initialize();

  // 2. 启动开发流程
  const result = await agent.start({
    projectType: 'page',
    initialDemand: '创建一个任务管理页面',
  });

  console.log('运行 ID:', result.traceId);

  // 3. 获取报告
  const report = await agent.getReport(result.traceId);
  console.log(report);

  // 4. 提交反馈
  await agent.submitFeedback(result.traceId, {
    type: 'suggestion',
    content: '建议增加批量操作功能',
    stage: 'code',
  });
}

main();
```

## 许可证

MIT
