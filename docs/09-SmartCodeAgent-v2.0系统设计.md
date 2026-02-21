# Smart Code Agent v2.0 系统设计文档

## 一、系统定位与设计理念

### 1.1 核心定位

Smart Code Agent 是一款基于 MCP（Model Context Protocol）协议的智能代码生成插件，专为 OpenCode/Claude Code 等 AI 编程助手设计。系统以「需求闭环、Skill 插件化、自我学习、观察者迭代」为核心架构，实现从模糊需求到可上线规范代码的全链路自动化。

### 1.2 设计理念

| 理念 | 描述 |
|------|------|
| **Skill 即能力单元** | 每个 Skill 是最小不可拆分的原子能力，通过组合形成复杂功能 |
| **LLM 能力依托宿主** | 不集成独立 LLM，充分利用 OpenCode/Claude Code 的 LLM 能力 |
| **观察者纯记录** | 观察者仅做数据记录，不干预主流程，数据用于后期人工分析 |
| **需求分析可学习** | 遇到陌生领域时，通过 WebSearch 获取知识并沉淀到本地知识库 |

### 1.3 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenCode / Claude Code                    │
│                       (宿主环境)                             │
├─────────────────────────────────────────────────────────────┤
│                     MCP Protocol                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Smart Code Agent MCP Plugin             │   │
│   │                                                      │   │
│   │   ┌─────────────────────────────────────────────┐   │   │
│   │   │            Skill Engine (技能引擎)          │   │   │
│   │   │  - Skill 注册/发现                          │   │   │
│   │   │  - Skill 编排/执行                          │   │   │
│   │   │  - 上下文管理                              │   │   │
│   │   └─────────────────────────────────────────────┘   │   │
│   │                                                      │   │
│   │   ┌─────────────────────────────────────────────┐   │   │
│   │   │            Observer (观察者)                 │   │   │
│   │   │  - 数据采集                                │   │   │
│   │   │  - 记录存储                                │   │   │
│   │   │  - 报告生成                                │   │   │
│   │   └─────────────────────────────────────────────┘   │   │
│   │                                                      │   │
│   │   ┌─────────────────────────────────────────────┐   │   │
│   │   │            LLM Bridge (LLM 桥接)             │   │   │
│   │   │  - 调用宿主的 LLM 能力                       │   │   │
│   │   │  - 工具调用封装                             │   │   │
│   │   └─────────────────────────────────────────────┘   │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、Skill 灵活架构设计

### 2.1 核心理念：Skill 即能力单元

```
Skill = 单一职责 + 标准化接口 + 可组合 + 可编排
```

**核心原则：**

1. **单一职责**：每个 Skill 只做一件事，不可再拆分
2. **标准化接口**：所有 Skill 继承 BaseSkill，统一输入输出
3. **可组合**：多个原子 Skill 可组合成组合 Skill
4. **可编排**：通过工作流定义，按需编排执行顺序

### 2.2 Skill 分类体系

| Skill 类型 | 描述 | 示例 |
|-----------|------|------|
| **原子 Skill** | 单一不可拆分的最小能力 | `ask-question.skill`, `web-search.skill` |
| **组合 Skill** | 多个原子 Skill 组合 | `demand-collect.skill` = `ask-question` + `save-context` |
| **工作流 Skill** | 复杂场景的完整流程 | `full-demand-analysis.skill` = 多个组合 Skill 编排 |

### 2.3 原子 Skill 清单

```
src/skills/atoms/
├── ask/                          # 问答类
│   ├── ask-question.skill.ts    # 根据问题库提问
│   ├── ask-clarify.skill.ts     # 追问澄清
│   └── ask-confirm.skill.ts     # 确认（是/否）
├── search/                       # 搜索类
│   ├── web-search.skill.ts      # Web 搜索学习
│   ├── local-search.skill.ts    # 本地知识库搜索
│   └── doc-search.skill.ts      # 文档搜索
├── analyze/                      # 分析类
│   ├── analyze-demand.skill.ts # 分析需求
│   ├── analyze-code.skill.ts   # 分析代码
│   └── analyze-error.skill.ts  # 分析错误
├── generate/                    # 生成类
│   ├── generate-code.skill.ts  # 生成代码
│   ├── generate-test.skill.ts  # 生成测试
│   └── generate-report.skill.ts # 生成报告
├── format/                      # 格式化类
│   ├── format-code.skill.ts    # 格式化代码
│   ├── format-text.skill.ts    # 格式化文本
│   └── format-json.skill.ts    # 格式化 JSON
├── io/                          # 文件操作类
│   ├── read-file.skill.ts      # 读取文件
│   ├── write-file.skill.ts     # 写入文件
│   └── list-dir.skill.ts       # 列出目录
├── observe/                      # 观察者类
│   ├── observe-record.skill.ts # 记录观察数据
│   └── observe-report.skill.ts # 生成观察报告
└── utility/                     # 工具类
    ├── wait.skill.ts           # 等待/暂停
    ├── retry.skill.ts          # 重试
    ├── branch.skill.ts         # 条件分支
    └── parallel.skill.ts       # 并行执行
```

### 2.4 基础接口定义

```typescript
// 标准化输入接口
export interface SkillInput {
  // 全局标准化配置
  config: Record<string, any>;
  // 授权访问的上下文
  context: {
    readOnly: Record<string, any>;   // 只读上下文
    writable: Record<string, any>;   // 可写上下文
  };
  // 当前任务描述
  task: {
    taskId: string;
    taskName: string;
    target: string;
    params: Record<string, any>;
    timeout: number;
    maxRetry: number;
  };
  // 快照路径
  snapshotPath: string;
  // 全链路追踪 ID
  traceId: string;
}

// 标准化输出接口
export interface SkillOutput {
  // 执行结果状态码
  // 200: 成功
  // 300: 需要用户交互
  // 400: 可重试失败
  // 500: 不可重试失败
  code: 200 | 300 | 400 | 500;
  // 执行结果数据
  data: Record<string, any>;
  // 执行描述信息
  message: string;
  // 建议的下一步动作
  nextAction?: string;
  // 是否需要回滚
  needRollback?: boolean;
}

// BaseSkill 基类
export abstract class BaseSkill {
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly category: 'ask' | 'search' | 'analyze' | 'generate' | 'format' | 'io' | 'observe' | 'utility';

  // 核心执行方法
  protected abstract execute(input: SkillInput): Promise<SkillOutput>;

  // 统一执行入口
  public async run(input: SkillInput): Promise<SkillOutput> {
    try {
      // 输入校验
      if (!this.validateInput(input)) {
        return {
          code: 500,
          data: {},
          message: `[${this.name}] 输入格式校验失败`
        };
      }

      // 执行
      const output = await this.execute(input);

      // 输出校验
      if (!this.validateOutput(output)) {
        return {
          code: 500,
          data: {},
          message: `[${this.name}] 输出格式校验失败`
        };
      }

      return output;
    } catch (error) {
      return {
        code: 500,
        data: {},
        message: `[${this.name}] 执行异常: ${error.message}`
      };
    }
  }

  // 输入校验
  protected validateInput(input: SkillInput): boolean {
    return !!(input && input.task && input.task.params);
  }

  // 输出校验
  protected validateOutput(output: SkillOutput): boolean {
    return !!(output && output.code && output.message);
  }
}
```

### 2.5 Skill 组合机制

```typescript
// Skill 组合器
class SkillComposer {
  // 组合多个 Skill 形成组合 Skill
  static compose(name: string, skills: BaseSkill[]): CompositeSkill {
    return new CompositeSkill(name, skills);
  }

  // 并行执行多个 Skill
  static async parallel(skills: BaseSkill[], input: SkillInput): Promise<SkillOutput[]> {
    return Promise.all(skills.map(skill => skill.run(input)));
  }

  // 串行执行多个 Skill
  static async sequence(skills: BaseSkill[], input: SkillInput): Promise<SkillOutput[]> {
    const results: SkillOutput[] = [];
    let currentInput = input;

    for (const skill of skills) {
      const result = await skill.run(currentInput);
      results.push(result);

      if (result.code !== 200) {
        break; // 失败则停止
      }

      // 将上一个 Skill 的输出作为下一个的输入
      currentInput = {
        ...currentInput,
        context: {
          ...currentInput.context,
          writable: {
            ...currentInput.context.writable,
            ...result.data
          }
        }
      };
    }

    return results;
  }
}

// 组合 Skill 示例
const demandCollectSkill = SkillComposer.compose('demand-collect', [
  askQuestionSkill,     // 根据场景提问
  askClarifySkill,      // 智能追问
  saveContextSkill      // 保存到上下文
]);

const smartDemandAnalysisSkill = SkillComposer.compose('smart-demand-analysis', [
  localSearchSkill,     // 先查本地知识
  webSearchSkill,      // 本地没有则搜索 Web
  analyzeDemandSkill,  // 分析需求
  generateReportSkill  // 生成报告
]);
```

### 2.6 工作流编排

```typescript
// 工作流定义
interface WorkflowStep {
  skill: string;                    // Skill 名称
  params?: Record<string, any>;     // 参数
  onSuccess?: string;              // 成功时下一步
  onFail?: string;                 // 失败时下一步（可回到某步骤）
  retry?: number;                   // 重试次数
}

interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  initialStep: string;
}

// 工作流执行器
class WorkflowExecutor {
  private skillRegistry: SkillRegistry;

  async execute(workflow: Workflow, input: SkillInput): Promise<SkillOutput> {
    let currentStep = workflow.initialStep;
    let currentInput = input;
    let retryCount = 0;

    while (currentStep) {
      const step = workflow.steps.find(s => s.skill === currentStep);
      if (!step) {
        return { code: 500, data: {}, message: `未找到步骤: ${currentStep}` };
      }

      const skill = this.skillRegistry.get(step.skill);
      const result = await skill.run(currentInput);

      if (result.code === 200) {
        // 成功流转
        currentStep = step.onSuccess || null;

        // 更新输入
        currentInput = {
          ...currentInput,
          context: {
            ...currentInput.context,
            writable: {
              ...currentInput.context.writable,
              ...result.data
            }
          }
        };
      } else if (result.code === 400 && step.retry && retryCount < step.retry) {
        // 可重试失败，重试
        retryCount++;
      } else {
        // 不可重试失败或重试耗尽
        currentStep = step.onFail || null;
        retryCount = 0;
      }
    }

    return { code: 200, data: currentInput.context.writable, message: '工作流执行完成' };
  }
}

// 完整需求分析工作流定义
const fullDemandAnalysisWorkflow: Workflow = {
  name: '完整需求分析',
  description: '从需求采集到用户确认的完整流程',
  initialStep: 'demand-collect',
  steps: [
    {
      skill: 'demand-collect',
      params: { scenario: 'auto-detect' },
      onSuccess: 'smart-analysis',
      onFail: null
    },
    {
      skill: 'smart-analysis',
      onSuccess: 'ask-confirm',
      onFail: 'demand-collect',
      retry: 2
    },
    {
      skill: 'ask-confirm',
      params: { prompt: '需求分析报告已生成，是否确认？' },
      onSuccess: 'observe-record',
      onFail: 'demand-collect'
    },
    {
      skill: 'observe-record',
      params: { stage: 'demand-complete' },
      onSuccess: null,
      onFail: null
    }
  ]
};
```

---

## 三、LLM 桥接设计

### 3.1 设计理念

系统不集成独立 LLM，而是通过 MCP 协议调用宿主（OpenCode/Claude Code）的 LLM 能力。所有需要 LLM 能力的 Skill 都通过 LLM Bridge 调用宿主的 LLM。

### 3.2 LLM Bridge 实现

```typescript
// LLM 桥接器
class LLM Bridge {
  private mcp: MCPClient;

  constructor(mcpClient: MCPClient) {
    this.mcp = mcpClient;
  }

  // 文本补全
  async complete(prompt: string): Promise<string> {
    const result = await this.mcp.call('languageModel.complete', { prompt });
    return result.text;
  }

  // 对话
  async chat(messages: Message[]): Promise<Message> {
    const result = await this.mcp.call('languageModel.chat', { messages });
    return result.message;
  }

  // 带工具调用的对话
  async chatWithTools(messages: Message[], tools: Tool[]): Promise<ChatResult> {
    const result = await this.mcp.call('languageModel.chat', {
      messages,
      tools
    });
    return result;
  }

  // 调用宿主的 MCP 工具
  async useTool(toolName: string, params: any): Promise<any> {
    return this.mcp.call(`tools.${toolName}`, params);
  }

  // 检查工具可用性
  async hasTool(toolName: string): Promise<boolean> {
    const tools = await this.mcp.listTools();
    return tools.some(t => t.name === toolName);
  }
}

// 消息格式
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

// 工具定义
interface Tool {
  name: string;
  description: string;
  inputSchema: object;
}
```

### 3.3 在 Skill 中使用 LLM

```typescript
// WebSearch Skill 示例
class WebSearchSkill extends BaseSkill {
  private llmBridge: LLMBridge;

  constructor(llmBridge: LLMBridge) {
    super();
    this.name = 'web-search';
    this.category = 'search';
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const query = input.task.params.query;

    try {
      // 调用宿主的 WebSearch 工具
      const searchResults = await this.llmBridge.useTool('web_search', {
        query,
        numResults: 5
      });

      // 用 LLM 分析搜索结果
      const analysis = await this.llmBridge.chat([
        {
          role: 'user',
          content: `请分析以下搜索结果，总结与 "${query}" 相关的关键信息：\n\n${JSON.stringify(searchResults, null, 2)}`
        }
      ]);

      // 提取关键知识点
      const summary = await this.llmBridge.complete(
        `从以下内容中提取关键知识点，以结构化方式呈现：\n\n${analysis.content}`
      );

      return {
        code: 200,
        data: {
          query,
          results: searchResults,
          analysis: analysis.content,
          summary
        },
        message: `Web 搜索完成，找到 ${searchResults.length} 条结果`
      };
    } catch (error) {
      return {
        code: 500,
        data: {},
        message: `Web 搜索失败: ${error.message}`
      };
    }
  }
}

// 智能需求分析 Skill 示例
class SmartDemandAnalysisSkill extends BaseSkill {
  private llmBridge: LLMBridge;
  private knowledgeBase: KnowledgeBase;

  constructor(llmBridge: LLMBridge, knowledgeBase: KnowledgeBase) {
    super();
    this.name = 'smart-analysis';
    this.category = 'analyze';
    this.llmBridge = llmBridge;
    this.knowledgeBase = knowledgeBase;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const demand = input.context.writable.demand;

    try {
      // 1. 先查本地知识库
      const localKnowledge = await this.knowledgeBase.search(demand);

      let relevantKnowledge = null;
      let webSearchNeeded = false;

      // 2. 如果本地知识库没有，触发 Web 学习
      if (!localKnowledge) {
        relevantKnowledge = await this.llmBridge.useTool('web_search', {
          query: `${demand.techStack} ${demand.function} best practices`
        });

        // 3. 沉淀到本地知识库
        await this.knowledgeBase.add({
          topic: `${demand.techStack}-${demand.function}`,
          knowledge: relevantKnowledge,
          source: 'web_search'
        });

        webSearchNeeded = true;
      } else {
        relevantKnowledge = localKnowledge;
      }

      // 4. 用 LLM 分析需求，结合知识
      const analysisPrompt = `
需求信息：${JSON.stringify(demand)}

相关知识：
${relevantKnowledge ? JSON.stringify(relevantKnowledge, null, 2) : '无本地知识'}

请分析这个需求，生成需求分析报告。
`;

      const report = await this.llmBridge.complete(analysisPrompt);

      return {
        code: 200,
        data: {
          report,
          knowledgeSource: webSearchNeeded ? 'web' : 'local',
          knowledgeHit: !!localKnowledge
        },
        message: '需求分析完成'
      };
    } catch (error) {
      return {
        code: 500,
        data: {},
        message: `需求分析失败: ${error.message}`
      };
    }
  }
}
```

---

## 四、观察者系统设计

### 4.1 核心职责

```
观察者 = 纯记录 + 不干预 + 人工分析
```

**设计原则：**

1. **只读不写**：观察者只读取数据，不修改任何主流程数据
2. **异步记录**：数据记录异步执行，不阻塞主流程
3. **人工分析**：数据分析由人工完成，观察者仅生成原始数据报告

### 4.2 数据采集维度

| 采集阶段 | 采集内容 | 数据格式 |
|----------|----------|----------|
| **需求采集后** | 采集时长、问题数量、用户补充次数 | `{stage, duration, questionsCount, userSupplements, ...}` |
| **需求分析后** | 分析耗时、知识库命中率、WebSearch 次数 | `{stage, duration, knowledgeHitRate, webSearchCount, ...}` |
| **代码生成后** | 生成时长、代码行数、Skill 调用链 | `{stage, duration, codeLines, skillChain, ...}` |
| **测试阶段后** | 测试结果、错误类型、修复次数 | `{stage, duration, testResult, errorTypes, ...}` |
| **用户修改记录** | 用户手动修改了哪些内容、原因 | `{file, changes, userReason, ...}` |

### 4.3 数据结构定义

```typescript
// 阶段执行记录
interface StageRecord {
  traceId: string;
  stage: string;
  startTime: number;
  endTime: number;
  duration: number;           // 毫秒
  status: 'success' | 'failed' | 'retry';
  skills: string[];          // 调用的 Skill 列表
  metrics: Record<string, any>;  // 阶段特定指标
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

// 用户修改记录
interface UserModification {
  projectId: string;
  traceId: string;
  stage: 'demand' | 'code' | 'test' | 'delivery';
  timestamp: string;
  modifiedFiles: string[];
  modificationType: 'add' | 'delete' | 'modify' | 'refactor';
  userReason?: string;      // 用户填写：为什么需要手动修改
  autoSuggested?: boolean;  // 系统是否已给出建议但用户没采纳
  diffSummary?: string;    // 修改摘要
}

// 运行摘要
interface RunSummary {
  traceId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  totalDuration: number;
  stages: StageRecord[];
  overallStatus: 'success' | 'failed' | 'partial';
  userModifications: UserModification[];
}
```

### 4.4 用户修改记录机制

```typescript
// 用户修改记录器
class UserModificationRecorder {
  private storage: Storage;

  // 主动询问用户
  async promptUserModification(traceId: string): Promise<void> {
    const prompt = `
开发任务已完成。请回顾本次开发过程：

1. 是否有手动调整了系统生成的代码或需求？
2. 为什么要手动调整？（可选）

输入 "无" 表示没有手动调整，或描述您的修改。
`;

    // 通过宿主交互获取用户输入
    const userInput = await this.getUserInput(prompt);

    if (userInput && userInput.toLowerCase() !== '无') {
      await this.record(traceId, userInput);
    }
  }

  // 自动检测文件变化
  async detectModifications(traceId: string, projectPath: string): Promise<void> {
    // 获取 git diff 或文件变化
    const changes = await this.getFileChanges(projectPath);

    if (changes.length > 0) {
      await this.record(traceId, {
        type: 'auto-detected',
        changes,
        userReason: '用户在系统生成后修改了文件'
      });
    }
  }

  // 记录修改
  async record(traceId: string, modification: UserModification): Promise<void> {
    const filePath = `data/observer/runs/${traceId}/user-modifications.json`;
    await this.storage.append(filePath, modification);
  }

  // 获取用户输入（调用宿主接口）
  private async getUserInput(prompt: string): Promise<string> {
    // 这里调用宿主的交互接口
    return '';
  }

  // 获取文件变化
  private async getFileChanges(projectPath: string): Promise<any[]> {
    // 使用 git diff 或文件监控
    return [];
  }
}
```

### 4.5 数据存储结构

```
data/
└── observer/
    ├── runs/
    │   └── {traceId}/
    │       ├── stage-records.json      # 各阶段执行数据
    │       ├── user-modifications.json # 用户修改记录
    │       └── summary.json            # 本次运行摘要
    ├── knowledge/
    │   ├── topics.json                 # 已学习的主题索引
    │   └── content/
    │       └── {topic-id}.json         # 各主题知识内容
    └── reports/
        └── {date}-report.md            # 定期生成的观察报告
```

### 4.6 观察者工作流程

```
┌─────────────────────────────────────────────────────┐
│                   观察者工作流                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│   开发任务开始                                       │
│         ↓                                           │
│   阶段1完成 → 记录数据 → 继续下一阶段               │
│         ↓                                           │
│   阶段2完成 → 记录数据 → 继续下一阶段               │
│         ↓                                           │
│   ...                                               │
│         ↓                                           │
│   开发任务结束 → 生成运行摘要                         │
│         ↓                                           │
│   询问用户反馈 → 记录到 user-modifications          │
│         ↓                                           │
│   数据归档 → 等待人工分析                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.7 报告生成

```typescript
// 观察者报告生成器
class ObserverReporter {
  async generateRunReport(traceId: string): Promise<string> {
    const summary = await this.loadSummary(traceId);

    const report = `
# 开发运行报告

## 基本信息
- 项目：${summary.projectName}
- 运行 ID：${summary.traceId}
- 开始时间：${summary.startTime}
- 结束时间：${summary.endTime}
- 总耗时：${(summary.totalDuration / 1000).toFixed(2)}秒
- 整体状态：${summary.overallStatus}

## 阶段执行详情
${summary.stages.map(s => `
### ${s.stage}
- 耗时：${s.duration}ms
- 状态：${s.status}
- 调用 Skills：${s.skills.join(', ')}
`).join('\n')}

## 用户修改记录
${summary.userModifications.length === 0 ? '无' : summary.userModifications.map(m => `
- 文件：${m.modifiedFiles.join(', ')}
- 原因：${m.userReason || '未填写'}
`).join('\n')}

## 建议（仅供人工分析参考）
${this.generateSuggestions(summary)}
`;

    return report;
  }

  private generateSuggestions(summary: RunSummary): string {
    const suggestions: string[] = [];

    // 基于数据生成分析建议
    const failedStages = summary.stages.filter(s => s.status === 'failed');
    if (failedStages.length > 0) {
      suggestions.push(`- 失败阶段：${failedStages.map(s => s.stage).join(', ')}`);
    }

    const highRetryStages = summary.stages.filter(s => (s.metrics.retryCount || 0) > 2);
    if (highRetryStages.length > 0) {
      suggestions.push(`- 高重试阶段：${highRetryStages.map(s => s.stage).join(', ')}，建议优化`);
    }

    if (summary.userModifications.length > 3) {
      suggestions.push(`- 用户修改频繁：${summary.userModifications.length} 次，建议分析原因`);
    }

    return suggestions.length > 0 ? suggestions.join('\n') : '暂无建议';
  }
}
```

---

## 五、知识库与自我学习机制

### 5.1 设计理念

需求分析 Agent 初期可能只是一个基础问答助手，但具备自我学习能力。当遇到不熟悉的领域时，通过 WebSearch 获取专业知识，并沉淀到本地知识库，逐步提升专业性。

### 5.2 知识库架构

```typescript
// 知识条目
interface KnowledgeEntry {
  id: string;
  topic: string;              // 主题，如 "react-component-best-practices"
  keywords: string[];          // 关键词
  content: string;             // 知识内容
  summary: string;             // 摘要
  source: 'web' | 'manual' | 'learned';
  sourceUrl?: string;         // 来源 URL
  createdAt: string;
  updatedAt: string;
  usageCount: number;         // 使用次数
}

// 知识库
class KnowledgeBase {
  private storage: Storage;

  // 搜索知识
  async search(query: string): Promise<KnowledgeEntry | null> {
    // 1. 关键词精确匹配
    const exactMatch = await this.searchByKeywords(query);
    if (exactMatch) {
      await this.updateUsage(exactMatch.id);
      return exactMatch;
    }

    // 2. 语义相似度匹配
    const similarMatch = await this.searchSimilar(query);
    if (similarMatch) {
      await this.updateUsage(similarMatch.id);
      return similarMatch;
    }

    return null;
  }

  // 添加知识
  async add(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<string> {
    const id = this.generateId();
    const fullEntry: KnowledgeEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    };

    await this.storage.save(`data/observer/knowledge/content/${id}.json`, fullEntry);
    await this.updateIndex(fullEntry);

    return id;
  }

  // 更新使用次数
  private async updateUsage(id: string): Promise<void> {
    const entry = await this.storage.load(`data/observer/knowledge/content/${id}.json`);
    entry.usageCount++;
    entry.updatedAt = new Date().toISOString();
    await this.storage.save(`data/observer/knowledge/content/${id}.json`, entry);
  }

  // 更新索引
  private async updateIndex(entry: KnowledgeEntry): Promise<void> {
    const index = await this.loadIndex();
    index.entries.push({
      id: entry.id,
      topic: entry.topic,
      keywords: entry.keywords
    });
    await this.saveIndex(index);
  }
}
```

### 5.3 自我学习流程

```typescript
// 智能需求分析 Skill 的学习逻辑
class LearningDemandAnalysisSkill {
  private knowledgeBase: KnowledgeBase;
  private llmBridge: LLMBridge;

  async executeWithLearning(input: SkillInput): Promise<SkillOutput> {
    const demand = input.task.params;

    // 1. 检测是否需要学习
    const needToLearn = await this.shouldLearn(demand);

    if (needToLearn.trigger) {
      // 2. WebSearch 获取知识
      const webKnowledge = await this.searchAndLearn(
        needToLearn.topic,
        needToLearn.query
      );

      // 3. 沉淀到知识库
      if (webKnowledge) {
        await this.knowledgeBase.add({
          topic: needToLearn.topic,
          keywords: needToLearn.keywords,
          content: webKnowledge.content,
          summary: webKnowledge.summary,
          source: 'web',
          sourceUrl: webKnowledge.url
        });
      }
    }

    // 4. 执行分析（使用积累的知识）
    const result = await this.analyze(demand);

    return result;
  }

  // 判断是否需要学习
  private async shouldLearn(demand: any): Promise<{ trigger: boolean; topic?: string; query?: string; keywords?: string[] }> {
    // 检测关键词是否在知识库中
    const keywords = this.extractKeywords(demand);
    const known = await this.knowledgeBase.search(keywords[0]);

    if (!known) {
      return {
        trigger: true,
        topic: `${demand.techStack}-${demand.function}`,
        query: `${demand.techStack} ${demand.function} best practices`,
        keywords
      };
    }

    return { trigger: false };
  }

  // 提取关键词
  private extractKeywords(demand: any): string[] {
    const text = `${demand.techStack} ${demand.function} ${demand.description || ''}`;
    // 简单分词，实际可用更复杂的 NLP
    return text.split(/\s+/).filter(w => w.length > 2);
  }

  // 搜索并学习
  private async searchAndLearn(topic: string, query: string): Promise<{ content: string; summary: string; url: string } | null> {
    try {
      const results = await this.llmBridge.useTool('web_search', { query, numResults: 3 });

      if (results.length === 0) return null;

      // 用 LLM 总结
      const summary = await this.llmBridge.complete(
        `用一句话总结以下内容的关键要点：\n\n${results[0].snippet}`
      );

      return {
        content: results.map(r => r.snippet).join('\n\n'),
        summary,
        url: results[0].url
      };
    } catch (error) {
      console.error('学习失败:', error);
      return null;
    }
  }
}
```

### 5.4 学习流程图

```
┌─────────────────────────────────────────────────────┐
│              需求分析自我学习流程                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│   用户输入需求                                        │
│         ↓                                           │
│   提取关键词 → 查询本地知识库                         │
│         ↓                                           │
│   命中？                                             │
│    ├─ 是 → 直接使用知识分析                          │
│    └─ 否 → 触发学习                                 │
│         ↓                                           │
│   WebSearch 获取专业知识                             │
│         ↓                                           │
│   LLM 分析总结                                      │
│         ↓                                           │
│   沉淀到本地知识库                                   │
│         ↓                                           │
│   生成需求分析报告                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 六、MCP 插件集成方案

### 6.1 插件结构

```
smart-code-agent/
├── plugin.json              # MCP 插件配置
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts             # 插件入口
│   ├── plugin.ts            # 插件主类
│   ├── skill-engine/        # 技能引擎
│   │   ├── registry.ts      # Skill 注册
│   │   ├── executor.ts      # Skill 执行器
│   │   ├── composer.ts      # Skill 编排器
│   │   └── workflows/       # 工作流定义
│   ├── observer/           # 观察者模块
│   │   ├── recorder.ts     # 数据记录
│   │   └── reporter.ts     # 报告生成
│   ├── llm-bridge/        # LLM 桥接
│   │   └── index.ts
│   ├── knowledge/         # 知识库
│   │   └── index.ts
│   ├── storage/           # 存储
│   │   └── index.ts
│   └── skills/            # Skill 实现
│       ├── atoms/          # 原子 Skill
│       │   ├── ask/
│       │   ├── search/
│       │   ├── analyze/
│       │   ├── generate/
│       │   ├── format/
│       │   ├── io/
│       │   ├── observe/
│       │   └── utility/
│       └── workflows/     # 工作流 Skill
└── data/                  # 数据目录（运行时生成）
    └── observer/
```

### 6.2 插件配置

```json
{
  "name": "smart-code-agent",
  "version": "1.0.0",
  "description": "智能代码规范化自动生成 MCP 插件",
  "author": "",
  "license": "MIT",
  "mcp": {
    "version": "1.0",
    "capabilities": {
      "skills": true,
      "observer": true,
      "knowledge": true
    },
    "tools": [
      {
        "name": "sca-start",
        "description": "启动 Smart Code Agent 开发流程",
        "inputSchema": {
          "type": "object",
          "properties": {
            "projectType": {
              "type": "string",
              "enum": ["page", "api", "component", "project"],
              "description": "项目类型"
            },
            "initialDemand": {
              "type": "string",
              "description": "初始需求描述"
            }
          },
          "required": ["projectType"]
        }
      },
      {
        "name": "sca-resume",
        "description": "恢复中断的开发流程"
      },
      {
        "name": "sca-report",
        "description": "查看观察者报告"
      },
      {
        "name": "sca-feedback",
        "description": "提交用户反馈"
      }
    ],
    "resources": [
      {
        "uri": "sca://knowledge",
        "description": "本地知识库"
      },
      {
        "uri": "sca://observer/{traceId}",
        "description": "运行记录"
      }
    ]
  }
}
```

### 6.3 插件入口

```typescript
// src/index.ts
import { SmartCodeAgent } from './plugin';

export { SmartCodeAgent };

// 插件初始化
export function initialize(): SmartCodeAgent {
  return new SmartCodeAgent();
}
```

```typescript
// src/plugin.ts
export class SmartCodeAgent {
  private skillEngine: SkillEngine;
  private observer: Observer;
  private knowledgeBase: KnowledgeBase;
  private llmBridge: LLMBridge;
  private storage: Storage;

  constructor() {
    this.storage = new Storage();
    this.llmBridge = new LLMBridge();
    this.knowledgeBase = new KnowledgeBase(this.storage);
    this.skillEngine = new SkillEngine(this.llmBridge, this.knowledgeBase);
    this.observer = new Observer(this.storage);
  }

  // 启动开发流程
  async start(params: StartParams): Promise<RunResult> {
    const traceId = this.generateTraceId();

    try {
      // 初始化上下文
      const context = await this.initializeContext(params);

      // 执行工作流
      const result = await this.skillEngine.execute('full-demand-analysis', {
        traceId,
        params,
        context
      });

      // 记录运行数据
      await this.observer.recordRun(traceId, result);

      // 询问用户反馈
      await this.observer.promptFeedback(traceId);

      return result;
    } catch (error) {
      await this.observer.recordError(traceId, error);
      throw error;
    }
  }

  // 获取观察者报告
  async getReport(traceId?: string): Promise<string> {
    return this.observer.generateReport(traceId);
  }

  // 提交反馈
  async submitFeedback(traceId: string, feedback: UserFeedback): Promise<void> {
    await this.observer.recordFeedback(traceId, feedback);
  }
}
```

---

## 七、开发优先级

| 优先级 | 模块 | 说明 |
|--------|------|------|
| **P0** | Skill 引擎核心 | 注册、执行、编排 |
| **P0** | 基础原子 Skill | ask, save, read, write |
| **P0** | LLM Bridge | 调用宿主 LLM 能力 |
| **P1** | 需求分析工作流 | 采集→分析→确认 |
| **P1** | 观察者数据记录 | 各阶段数据采集 |
| **P1** | 知识库系统 | 本地存储 + Web 搜索学习 |
| **P2** | 用户反馈收集 | 手动修改记录 |
| **P2** | MCP 插件封装 | 对接 OpenCode |
| **P3** | 报告生成 | 定期生成分析报告 |

---

## 八、总结

### 8.1 系统特点

1. **Skill 插件化**：原子 Skill 可组合、可编排，灵活应对各种场景
2. **依托宿主 LLM**：不集成独立 LLM，通过 MCP 调用宿主能力
3. **观察者纯记录**：只记录数据，不干预主流程，数据用于人工分析
4. **需求分析可学习**：遇到陌生领域自动 WebSearch 学习并沉淀知识
5. **MCP 插件形式**：作为 OpenCode/Claude Code 的插件运行

### 8.2 数据闭环

```
观察者记录（内因） + 用户反馈（外因） = 精准产品迭代
```

通过长期积累运行数据，结合用户反馈，可以量化系统的薄弱环节，指导后续功能迭代方向。

---

*文档版本：v2.0*  
*更新日期：2026-02-21*
