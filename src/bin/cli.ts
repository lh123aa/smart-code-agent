#!/usr/bin/env node

/**
 * Smart Code Agent CLI 入口
 */

import { Command } from 'commander';
import SmartCodeAgent from '../plugin.js';
import { createLogger } from '../utils/logger.js';
import { checkUpdate, doUpdate, getCurrentVersion } from '../utils/updater.js';

const logger = createLogger('CLI');
const program = new Command();

program
  .name('sca')
  .description('Smart Code Agent - 智能代码生成 MCP 插件')
  .version(getCurrentVersion());

program
  .command('init')
  .description('初始化 Smart Code Agent')
  .option('-p, --path <path>', '项目路径', '.')
  .action(async (options) => {
    logger.info('Initializing Smart Code Agent...');
    const agent = new SmartCodeAgent();
    await agent.initialize();
    logger.info('Smart Code Agent initialized successfully!');
  });

program
  .command('start')
  .description('启动开发流程')
  .requiredOption('-t, --type <type>', '项目类型 (page|api|component|project)')
  .requiredOption('-d, --demand <demand>', '需求描述')
  .option('-p, --path <path>', '项目路径')
  .action(async (options) => {
    const agent = new SmartCodeAgent();
    await agent.initialize();
    const result = await agent.start({
      projectType: options.type,
      initialDemand: options.demand,
      projectPath: options.path,
    });
    logger.info('Development started:', result);
  });

program
  .command('list')
  .description('列出所有可用 Skills')
  .action(async () => {
    const agent = new SmartCodeAgent();
    await agent.initialize();
    // 通过 skill registry 获取 skills
    const registry = (agent as any).skillRegistry;
    const skills = registry ? registry.getAll() : [];
    console.log('\nAvailable Skills:');
    if (Array.isArray(skills)) {
      skills.forEach((skill: any) => {
        console.log(`  - ${skill.name || 'unknown'}: ${skill.description || 'No description'}`);
      });
    } else {
      console.log('  No skills available');
    }
  });

program
  .command('knowledge')
  .description('知识库操作')
  .action(() => {
    console.log('知识库命令:');
    console.log('  sca knowledge add --topic <主题> --content <内容>');
    console.log('  sca knowledge search --query <关键词>');
    console.log('  sca knowledge list');
  });

program
  .command('update')
  .description('检测并安装更新')
  .option('-c, --check', '仅检测更新，不安装')
  .option('-f, --force', '强制更新')
  .action(async (options) => {
    if (options.check) {
      // 仅检测更新
      console.log('正在检查更新...\n');
      const result = await checkUpdate();
      
      if (result.hasUpdate) {
        console.log('✨ 发现新版本!');
        console.log(`   当前版本: ${result.currentVersion}`);
        console.log(`   最新版本: ${result.remoteVersion}`);
        if (result.releaseNotes) {
          console.log('\n📝 更新日志:');
          console.log(result.releaseNotes);
        }
        console.log('\n运行 `sca update` 来安装更新');
      } else {
        console.log('✅ 已是最新版本');
        console.log(`   当前版本: ${result.currentVersion}`);
      }
    } else {
      // 执行更新
      console.log('正在检查更新...\n');
      const checkResult = await checkUpdate();
      
      if (!checkResult.hasUpdate && !options.force) {
        console.log('✅ 已是最新版本');
        console.log(`   当前版本: ${checkResult.currentVersion}`);
        return;
      }
      
      if (checkResult.hasUpdate) {
        console.log('✨ 发现新版本!');
        console.log(`   当前版本: ${checkResult.currentVersion}`);
        console.log(`   最新版本: ${checkResult.remoteVersion}`);
        if (checkResult.releaseNotes) {
          console.log('\n📝 更新日志:');
          console.log(checkResult.releaseNotes);
        }
      }
      
      console.log('\n正在更新...\n');
      const result = await doUpdate();
      
      if (result.success) {
        console.log('\n✅ 更新成功!');
        console.log(`   ${result.fromVersion} → ${result.toVersion}`);
        console.log('\n请重启 OpenCode 使更新生效');
      } else {
        console.log('\n❌ 更新失败');
        console.log(`   错误: ${result.error}`);
        result.logs.forEach(log => console.log(`   ${log}`));
      }
    }
  });

program
  .command('version')
  .description('显示当前版本信息')
  .action(() => {
    const version = getCurrentVersion();
    console.log(`Smart Code Agent v${version}`);
  });


program.parse(process.argv);