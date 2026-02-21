#!/usr/bin/env node

/**
 * Smart Code Agent CLI 入口
 */

import { Command } from 'commander';
import SmartCodeAgent from '../plugin.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CLI');
const program = new Command();

program
  .name('sca')
  .description('Smart Code Agent - 智能代码生成 MCP 插件')
  .version('1.0.0');

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

program.parse(process.argv);