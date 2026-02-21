/**
 * Smart Code Agent 卸载脚本
 * 
 * 使用方法:
 *   node uninstall.js
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
  globalSymlink: 'sca',
};

function log(info) {
  console.log(`[卸载] ${info}`);
}

function success(msg) {
  console.log(`✅ ${msg}`);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function error(err) {
  console.error(`[错误] ${err}`);
  process.exit(1);
}

async function removeGlobalSymlink() {
  log('移除全局命令...');
  
  try {
    if (process.platform === 'win32') {
      // Windows: 使用 npm unlink
      try {
        execSync('npm unlink', { cwd: ROOT_DIR, stdio: 'inherit' });
        success('全局命令已移除');
      } catch (e) {
        warn('npm unlink 失败，可能未全局安装');
      }
    } else {
      // Linux/Mac: 移除符号链接
      const globalBin = path.join('/usr', 'local', 'bin', CONFIG.globalSymlink);
      try {
        execSync(`sudo rm -f "${globalBin}"`);
        success('全局命令已移除');
      } catch (e) {
        warn('符号链接不存在或无权删除');
      }
    }
  } catch (e) {
    warn('移除全局命令时出现问题');
  }
}

async function removeLocalConfig() {
  log('移除本地配置...');
  
  const configDir = path.join(ROOT_DIR, '.sca');
  const configFile = path.join(configDir, 'config.json');
  const stateDir = path.join(ROOT_DIR, 'data', 'workflow-state');
  
  // 询问用户是否删除数据
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.toLowerCase().startsWith('y')));
  });
  
  try {
    const deleteData = await question('是否删除所有数据和工作流状态? (y/N): ');
    
    if (deleteData) {
      // 删除数据目录
      const dataDir = path.join(ROOT_DIR, 'data');
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
        success('数据目录已删除');
      }
    } else {
      log('保留数据目录');
    }
    
    // 删除配置文件
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
      success('配置文件已删除');
    }
    
    if (fs.existsSync(configDir)) {
      fs.rmdirSync(configDir);
    }
    
    rl.close();
  } catch (e) {
    warn('移除配置文件时出现问题');
  }
}

async function removeMCPConfig() {
  log('检查 MCP 配置...');
  
  // 检查是否在其他 MCP 配置中
  const mcpConfigPaths = [
    path.join(process.env.HOME || '', '.config', 'mcp', 'servers.json'),
    path.join(process.env.APPDATA || '', 'mcp', 'servers.json'),
  ];
  
  let found = false;
  
  for (const configPath of mcpConfigPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        
        if (config[CONFIG.name]) {
          log(`发现 MCP 配置: ${configPath}`);
          
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          
          const question = (prompt) => new Promise((resolve) => {
            rl.question(prompt, (answer) => resolve(answer.toLowerCase().startsWith('y')));
          });
          
          const remove = await question(`从 MCP 配置中移除 ${CONFIG.name}? (y/N): `);
          
          if (remove) {
            delete config[CONFIG.name];
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            success('MCP 配置已更新');
          } else {
            log('保留 MCP 配置');
          }
          
          rl.close();
          found = true;
          break;
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
  
  if (!found) {
    log('未发现 MCP 配置');
  }
}

async function removeNodeModules() {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.toLowerCase().startsWith('y')));
  });
  
  try {
    const remove = await question('是否删除 node_modules? (y/N): ');
    
    if (remove) {
      log('删除 node_modules...');
      const nodeModules = path.join(ROOT_DIR, 'node_modules');
      if (fs.existsSync(nodeModules)) {
        fs.rmSync(nodeModules, { recursive: true, force: true });
        success('node_modules 已删除');
      }
    } else {
      log('保留 node_modules');
    }
    
    const removeDist = await question('是否删除 dist 目录? (y/N): ');
    
    if (removeDist) {
      log('删除 dist...');
      const dist = path.join(ROOT_DIR, 'dist');
      if (fs.existsSync(dist)) {
        fs.rmSync(dist, { recursive: true, force: true });
        success('dist 已删除');
      }
    } else {
      log('保留 dist');
    }
    
    rl.close();
  } catch (e) {
    warn('清理时出现问题');
  }
}

async function printSummary() {
  console.log('\n========================================');
  success(`${CONFIG.displayName} 卸载完成`);
  console.log('========================================\n');
  
  console.log('已移除:');
  console.log('  - 全局命令 (sca)');
  console.log('  - 本地配置文件\n');
  
  console.log('如需完全删除，请手动:');
  console.log('  - 删除项目目录');
  console.log('  - 从 MCP 配置文件中移除\n');
  
  console.log('========================================\n');
}

async function main() {
  console.log('\n========================================');
  console.log(`  ${CONFIG.displayName} 卸载程序`);
  console.log('========================================\n');
  
  try {
    await removeGlobalSymlink();
    await removeLocalConfig();
    await removeMCPConfig();
    await printSummary();
  } catch (e) {
    error(e.message);
  }
}

main();