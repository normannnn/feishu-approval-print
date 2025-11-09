#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 正在启动UI Builder开发服务器...');

// 启动webpack-dev-server
const webpackDevServer = spawn('npx', ['webpack-dev-server', '--mode', 'development'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});

webpackDevServer.on('error', (error) => {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
});

webpackDevServer.on('close', (code) => {
  console.log('服务器已关闭');
  process.exit(code);
});

// 处理进程终止
process.on('SIGINT', () => {
  webpackDevServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  webpackDevServer.kill('SIGTERM');
  process.exit(0);
});