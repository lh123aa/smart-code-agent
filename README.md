# Smart Code Agent

<div align="center">

**Intelligent Code Generation MCP Plugin**

_Requirement Loop • Skill Plugin System • Self-Learning • Observer Iteration_

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.0-purple?style=flat-square)](https://modelcontextprotocol.io/)

[English](README.md) | [中文文档](README_CN.md)

</div>

---

## ✨ Features

### 🎯 Requirement-Driven Development

Complete closed-loop from requirement collection to code generation. Support multiple project types: pages, APIs, components, and full projects.

### 🔌 Skill Plugin System

Extensible skill architecture with 30+ built-in skills. Create custom skills easily with the BaseSkill class.

### 🧠 Self-Learning

Local knowledge base that continuously accumulates development experience. Add, search, and manage knowledge entries.

### 📊 Observer Pattern

Full runtime data recording for continuous optimization. Generate detailed reports and track execution metrics.

### 💾 Dual Storage

Support both file system storage and SQLite database. Flexible configuration for different use cases.

### 🔄 Auto-Update

Detect GitHub updates automatically. One-click upgrade with rollback support on failure.

### 🧪 Complete Testing

Built-in test generation (unit, integration, acceptance). Code quality checks with lint and type validation.

### 🚀 MCP Integration

Full MCP (Model Context Protocol) support. Works with OpenCode, Claude Desktop, and other MCP clients.

---

## 📦 Installation

### Quick Install

```bash
git clone https://github.com/lh123aa/smart-code-agent.git
cd smart-code-agent
node install.js
```

### Manual Install

```bash
npm install
npm run build
npm link  # Optional: global CLI
```

### Development Mode

```bash
npm install
npm run dev    # Watch mode
npm test       # Run tests
```

---

## 🚀 Quick Start

### CLI Usage

```bash
# Initialize
sca init

# Start development
sca start -t page -d "Create a user login page"

# Check for updates
sca update --check

# Perform update
sca update

# Show version
sca version
```

### Library Usage

```typescript
import SmartCodeAgent from 'smart-code-agent';

const agent = new SmartCodeAgent();
await agent.initialize();

const result = await agent.start({
  projectType: 'page',
  initialDemand: 'Create a user login page',
  projectPath: './my-project',
});
```

### MCP Integration

```json
{
  "mcpServers": {
    "smart-code-agent": {
      "command": "node",
      "args": ["/path/to/smart-code-agent/dist/mcp/stdio-server.js"]
    }
  }
}
```

---

## 🛠️ MCP Tools

| Tool                   | Description                 |
| ---------------------- | --------------------------- |
| `sca-start`            | Start development workflow  |
| `sca-resume`           | Resume interrupted workflow |
| `sca-get-report`       | Get runtime report          |
| `sca-add-knowledge`    | Add knowledge entry         |
| `sca-search-knowledge` | Search knowledge base       |
| `sca-list-workflows`   | List available workflows    |
| `sca-run-workflow`     | Execute a workflow          |
| `sca-submit-feedback`  | Submit user feedback        |
| `sca-check-update`     | Check for updates           |
| `sca-do-update`        | Perform auto-update         |

---

## 📚 Built-in Skills

### Code Generation

| Skill              | Description                     |
| ------------------ | ------------------------------- |
| `generate-code`    | Generate code from requirements |
| `generate-test`    | Generate test code              |
| `unit-test`        | Unit test generation            |
| `integration-test` | Integration test generation     |
| `acceptance-test`  | Acceptance test generation      |
| `lint`             | Code linting                    |
| `type-check`       | TypeScript type checking        |

### Requirement Analysis

| Skill            | Description              |
| ---------------- | ------------------------ |
| `analyze-demand` | Requirement analysis     |
| `demand-collect` | Requirement collection   |
| `demand-confirm` | Requirement confirmation |

### Utilities

| Skill         | Description        |
| ------------- | ------------------ |
| `read-file`   | Read file content  |
| `write-file`  | Write file         |
| `format-code` | Code formatting    |
| `retry`       | Retry on failure   |
| `parallel`    | Parallel execution |

---

## 📝 Code Templates

8 built-in templates for rapid development:

| Template          | Description                |
| ----------------- | -------------------------- |
| `react-component` | React functional component |
| `vue-component`   | Vue component              |
| `express-api`     | Express REST API           |
| `typescript-type` | TypeScript type definition |
| `react-hook`      | Custom React Hook          |
| `service`         | Business service layer     |
| `model`           | Data model                 |
| `test`            | Jest test file             |

```typescript
import { TemplateManager } from 'smart-code-agent';

const tm = new TemplateManager();
const code = tm.render('react-component', {
  name: 'UserProfile',
  props: ['user', 'onEdit'],
  state: ['loading', 'error'],
});
```

---

## 🏗️ Architecture

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

---

## 🔧 Configuration

### Environment Variables

| Variable        | Description       | Default  |
| --------------- | ----------------- | -------- |
| `SCA_DATA_PATH` | Data storage path | `./data` |
| `SCA_LOG_LEVEL` | Log level         | `info`   |

### Config File (`.sca/config.json`)

```json
{
  "version": "1.0.0",
  "dataPath": "./data",
  "logLevel": "info",
  "skills": {
    "enabled": ["*"],
    "disabled": []
  },
  "workflows": {
    "default": "full-demand-analysis"
  }
}
```

---

## 📂 Project Structure

```
smart-code-agent/
├── src/
│   ├── index.ts              # Entry point
│   ├── plugin.ts             # Main plugin class
│   ├── bin/cli.ts            # CLI interface
│   ├── skill-engine/         # Skill execution engine
│   ├── skills/               # Built-in skills
│   ├── storage/              # Storage layer
│   ├── knowledge/            # Knowledge base
│   ├── observer/             # Observer pattern
│   ├── mcp/                  # MCP server
│   └── utils/                # Utilities
├── tests/                    # Test files
├── install.js                # Install script
└── package.json
```

---

## 🔌 Custom Skill Development

```typescript
// src/skills/atoms/custom/my-skill.ts
import { BaseSkill, type SkillResult } from '../../base.skill.js';

export class MySkill extends BaseSkill {
  name = 'my-skill';
  description = 'My custom skill';
  category = 'custom';

  async execute(input: Record<string, unknown>): Promise<SkillResult> {
    return {
      success: true,
      output: { result: 'Done' },
      metadata: { skill: this.name, duration: 0 },
    };
  }
}

export default new MySkill();
```

---

## ❓ FAQ

**Q: Which IDEs are supported?**  
A: Any MCP-compatible IDE: VS Code (with MCP extension), Cursor, Zed, Claude Desktop, OpenCode.

**Q: How to add custom templates?**  
A: Edit `src/utils/template-manager.ts` and add templates in `getTemplates()`.

**Q: How to disable a skill?**  
A: Add skill name to `skills.disabled` array in config file.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

[MIT License](LICENSE) - Feel free to use and modify.

---

## 📋 Changelog

### v1.0.0 (2026-02-22)

- ✅ Initial release
- ✅ Requirement-driven development workflow
- ✅ 30+ built-in skills
- ✅ Skill plugin system
- ✅ Knowledge base with local storage
- ✅ Observer pattern for runtime tracking
- ✅ File & SQLite dual storage
- ✅ Error handling with recovery suggestions
- ✅ Retry strategy with presets
- ✅ 8 code templates
- ✅ CLI tools (`sca` command)
- ✅ Auto-update from GitHub
- ✅ Full MCP server support

---

<div align="center">

**Made with ❤️ by Smart Code Agent**

[GitHub](https://github.com/lh123aa/smart-code-agent) • [Report Bug](https://github.com/lh123aa/smart-code-agent/issues) • [Request Feature](https://github.com/lh123aa/smart-code-agent/issues)

</div>
