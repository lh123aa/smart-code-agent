#!/usr/bin/env node
// MCP Server bootstrap - CommonJS version
const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname);
const serverPath = path.join(projectRoot, 'dist', 'mcp', 'stdio-server.js');

console.log('Starting MCP from:', projectRoot);
console.log('Server path:', serverPath);

const child = spawn('node', [serverPath], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

child.on('exit', (code) => {
  process.exit(code);
});
