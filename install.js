/**
 * Smart Code Agent 安装脚本
 * 
 * 使用方法:
 *   Windows: node install.js
 *   Linux/Mac: sudo node install.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CONFIG = {
  name: 'smart-code-agent',
  displayName: 'Smart Code Agent',
  description: '智能代码生成 MCP 插件',
  globalSymlink: 'sca',
};

function log(info) {
  console.log(`[安装] ${info}`);
}

function error(err) {
  console.error(`[错误] ${err}`);
  process.exit(1);
}

function success(msg) {
  console.log(`✅ ${msg}`);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

async function checkNodeVersion() {
  const version = process.version.match(/^v(\d+)/)[1];
  if (parseInt(version) < 18) {
    error('需要 Node.js 18.0.0 或更高版本');
  }
  log(`Node.js 版本: ${process.version}`);
}

async function installDependencies() {
  log('安装依赖...');
  try {
    execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });
    success('依赖安装完成');
  } catch (e) {
    error('依赖安装失败');
  }
}

async function buildProject() {
  log('构建项目...');
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    success('项目构建完成');
  } catch (e) {
    error('项目构建失败');
  }
}

async function createGlobalSymlink() {
  log('创建全局命令...');
  
  const distIndex = path.join(ROOT_DIR, 'dist', 'bin', 'cli.js');
  if (!fs.existsSync(distIndex)) {
    warn('CLI 入口文件不存在，跳过全局安装');
    return;
  }

  const globalBin = process.platform === 'win32' 
    ? path.join(process.env.APPDATA || '', 'npm', 'node_modules', '.bin', CONFIG.globalSymlink)
    : path.join('/usr', 'local', 'bin', CONFIG.globalSymlink);

  try {
    // Windows: 使用 npm link
    if (process.platform === 'win32') {
      execSync('npm link', { cwd: ROOT_DIR, stdio: 'inherit' });
    } else {
      // Linux/Mac: 创建符号链接
      execSync(`sudo ln -sf "${path.join(ROOT_DIR, 'dist', 'bin', 'cli.js')}" "${globalBin}"`);
      execSync(`sudo chmod +x "${path.join(ROOT_DIR, 'dist', 'bin', 'cli.js')}"`);
    }
    success(`全局命令 ${CONFIG.globalSymlink} 创建成功`);
    log(`使用 ${CONFIG.globalSymlink} <command> 运行`);
  } catch (e) {
    warn('全局命令创建失败，请手动添加路径');
  }
}

async function createLocalConfig() {
  log('创建本地配置...');
  
  const configDir = path.join(ROOT_DIR, '.sca');
  const configFile = path.join(configDir, 'config.json');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const defaultConfig = {
    version: '1.0.0',
    dataPath: './data',
    logLevel: 'info',
    autoSave: true,
    templates: [
      'react-component',
      'vue-component', 
      'express-api',
      'typescript-type',
      'react-hook',
      'service',
      'model',
      'test',
    ],
  };
  
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
    success('配置文件已创建: .sca/config.json');
  } else {
    log('配置文件已存在，跳过');
  }
}

async function setupMCP() {
  log('检查 MCP 配置...');
  
  // 检查是否在其他 MCP 配置中
  const mcpConfigPaths = [
    path.join(process.env.HOME || '', '.config', 'mcp', 'servers.json'),
    path.join(process.env.APPDATA || '', 'mcp', 'servers.json'),
  ];
  
  let mcpConfigured = false;
  
  for (const configPath of mcpConfigPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        if (config[CONFIG.name]) {
          mcpConfigured = true;
          log(`MCP 已配置: ${configPath}`);
          break;
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
  
  if (!mcpConfigured) {
    log('MCP 未配置，生成配置说明...');
    
    const mcpConfigExample = {
      [CONFIG.name]: {
        command: 'node',
        args: [path.join(ROOT_DIR, 'dist', 'index.js')],
        description: CONFIG.description,
      },
    };
    
    const examplePath = path.join(ROOT_DIR, 'mcp-config.example.json');
    fs.writeFileSync(examplePath, JSON.stringify(mcpConfigExample, null, 2));
    log(`MCP 配置示例已生成: mcp-config.example.json`);
    log('请将此配置添加到你的 MCP 配置文件中');
  }
}

async function printUsage() {
  console.log('\n========================================');
  success(`${CONFIG.displayName} 安装完成!`);
  console.log('========================================\n');
  
  console.log('使用方式:\n');
  console.log('  本地运行:');
  console.log('    npm run dev          # 开发模式');
  console.log('    npm run build       # 构建');
  console.log('    npm test            # 运行测试\n');
  
  console.log('  CLI 命令 (全局安装后):');
  console.log('    sca init            # 初始化');
  console.log('    sca start -t page -d "需求"  # 启动开发');
  console.log('    sca list            # 列出 Skills\n');
  
  console.log('  MCP 配置:');
  console.log('    参考 mcp-config.example.json\n');
  
  console.log('========================================\n');
}

async function main() {
  console.log('\n========================================');
  console.log(`  ${CONFIG.displayName} 安装程序`);
  console.log('========================================\n');
  
  try {
    await checkNodeVersion();
    await installDependencies();
    await buildProject();
    await createLocalConfig();
    await createGlobalSymlink();
    await setupMCP();
    await printUsage();
  } catch (e) {
    error(e.message);
  }
}

main();