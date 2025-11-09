#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// 使用npx来运行webpack
console.log('🚀 正在构建UI Builder版本...');

try {
  execSync('npx webpack --mode development', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ 构建完成！');
} catch (error) {
  console.error('❌ 构建失败:', error.message);
  process.exit(1);
}