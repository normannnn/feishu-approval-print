# 🚀 部署指南

本文档说明如何将审批打印系统部署到开发和生产环境。

## 📋 环境配置

### 开发环境
- **地址**: `http://localhost:3002`
- **配置文件**: `.env`
- **模式**: 开发调试模式，支持模拟登录

### 生产环境
- **地址**: `https://ivanli163.github.io/feishu-approval-print/`
- **配置文件**: `.env.production`
- **模式**: 生产模式，需要真实飞书配置

## 🛠️ 开发环境部署

### 1. 启动开发服务器
```bash
# 进入项目目录
cd /Users/ivanli/Desktop/feishu_print/UI-Builder完整方案

# 启动开发服务器
npm run dev
```

### 2. 开发环境配置
确保 `.env` 文件包含以下配置：
```env
REACT_APP_DEV_MODE=true
REACT_APP_FEISHU_REDIRECT_URI=http://localhost:3002/auth/feishu/callback
```

### 3. 开发环境特性
- ✅ 支持飞书模拟登录
- ✅ 热重载开发
- ✅ 详细的调试信息
- ✅ 本地数据模拟

## 🌐 生产环境部署

### 1. 构建生产版本
```bash
# 构建生产版本
npm run build:prod

# 或者使用完整构建命令
NODE_ENV=production npm run build:prod
```

### 2. 生产环境配置
确保 `.env.production` 文件包含正确的配置：
```env
REACT_APP_DEV_MODE=false
REACT_APP_FEISHU_REDIRECT_URI=https://ivanli163.github.io/feishu-approval-print/auth/feishu/callback
REACT_APP_FEISHU_APP_ID=你的真实飞书应用ID
REACT_APP_FEISHU_APP_SECRET=你的真实飞书应用密钥
```

### 3. 部署到GitHub Pages
```bash
# 自动部署到GitHub Pages
npm run deploy
```

### 4. 预览生产构建
```bash
# 本地预览生产构建
npm run deploy:preview
```

## 📱 飞书应用配置

### 开发环境飞书配置
1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 创建应用
3. 配置重定向URL: `http://localhost:3002/auth/feishu/callback`

### 生产环境飞书配置
1. 在飞书开放平台配置重定向URL: `https://ivanli163.github.io/feishu-approval-print/auth/feishu/callback`
2. 更新 `.env.production` 文件中的飞书配置

## 🔧 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build:prod` | 构建生产版本 |
| `npm run build:dev` | 构建开发版本 |
| `npm run deploy` | 部署到GitHub Pages |
| `npm run deploy:preview` | 预览生产构建 |
| `npm run clean` | 清理构建目录 |
| `npm run env:check` | 检查环境配置 |

## 🌍 环境差异

| 配置项 | 开发环境 | 生产环境 |
|--------|----------|----------|
| URL | localhost:3002 | ivanli163.github.io |
| 调试模式 | 开启 | 关闭 |
| 飞书登录 | 支持模拟登录 | 需要真实配置 |
| 数据同步 | 本地+云端 | 云端同步 |
| 错误报告 | 详细显示 | 用户友好显示 |

## 🚨 部署前检查清单

- [ ] 更新版本号 (`package.json`)
- [ ] 配置生产环境飞书应用
- [ ] 检查 `.env.production` 配置
- [ ] 测试生产构建功能
- [ ] 验证飞书OAuth回调
- [ ] 检查所有链接正常工作

## 🔄 自动化部署

项目支持GitHub Actions自动化部署，只需推送代码到主分支即可自动部署。

## 📞 技术支持

如遇到部署问题，请检查：
1. 环境配置是否正确
2. 飞书应用配置是否匹配
3. 网络连接是否正常
4. 浏览器控制台错误信息