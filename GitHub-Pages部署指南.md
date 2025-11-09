# GitHub Pages 部署指南

## 🚀 一键部署到GitHub Pages

本指南将帮助您将飞书审批打印插件部署到GitHub Pages，让您的应用可以通过飞书直接访问。

## 📋 部署前准备

### 1. GitHub账户准备

确保您有：
- ✅ GitHub账户
- ✅ 飞书开放平台账户
- ✅ 飞书企业自建应用

### 2. 飞书应用配置

在飞书开放平台配置您的应用：

#### 重定向URL设置
```
开发环境：http://localhost:3002
生产环境：https://[your-username].github.io/[your-repo-name]
```

#### 必需权限
- `bitable:app`
- `bitable:readonly`
- `bitable:write`

## 🔧 部署步骤

### 方法一：自动部署（推荐）

#### 步骤1：Fork项目

1. 访问项目GitHub页面
2. 点击右上角的"Fork"按钮
3. 选择您的GitHub账户

#### 步骤2：配置项目

1. **克隆到本地**：
```bash
git clone https://github.com/[your-username]/[your-repo-name].git
cd [your-repo-name]
```

2. **修改package.json**：
```json
{
  "homepage": "https://[your-username].github.io/[your-repo-name]"
}
```

3. **安装依赖**：
```bash
npm install
```

#### 步骤3：启用GitHub Pages

1. 进入您的GitHub仓库
2. 点击"Settings"标签
3. 在左侧菜单找到"Pages"
4. 在"Source"部分选择"GitHub Actions"
5. 保存设置

#### 步骤4：推送代码触发部署

```bash
git add .
git commit -m "配置GitHub Pages部署"
git push origin main
```

推送后会自动触发GitHub Actions进行构建和部署。

#### 步骤5：验证部署

1. 等待GitHub Actions完成（约2-3分钟）
2. 访问：https://[your-username].github.io/[your-repo-name]
3. 确认应用正常加载

### 方法二：手动部署

#### 步骤1：本地构建

```bash
npm run build:prod
```

#### 步骤2：部署到GitHub Pages

```bash
npm run deploy
```

#### 步骤3：启用GitHub Pages

1. 进入仓库Settings
2. 找到Pages选项
3. Source选择"Deploy from a branch"
4. Branch选择"gh-pages"和"/ (root)"
5. 保存设置

## 🔗 飞书集成配置

### 1. 更新重定向URL

在飞书开放平台更新重定向URL：
```
https://[your-username].github.io/[your-repo-name]
```

### 2. 配置应用信息

在部署的应用中配置您的飞书应用凭证：
1. 访问您的GitHub Pages应用
2. 点击"应用配置"
3. 填入您的App ID和App Secret

### 3. 添加到飞书多维表格

1. 打开飞书多维表格
2. 点击"插件"或"应用"
3. 搜索并添加您的应用
4. 授予必要的表格权限

## 📊 部署验证

### 1. 本地验证

```bash
npm run dev
```
访问 http://localhost:3002 确认应用正常运行

### 2. 生产环境验证

访问您的GitHub Pages URL，确认：
- ✅ 应用正常加载
- ✅ 配置界面工作正常
- ✅ 飞书环境检测正确

### 3. 飞书集成验证

在飞书多维表格中：
- ✅ 应用可以正常打开
- ✅ 能够获取表格数据
- ✅ 打印功能正常工作

## 🐛 常见问题

### Q: GitHub Actions构建失败

**解决方案**：
1. 检查GitHub Actions权限设置
2. 确认package.json配置正确
3. 查看Actions页面的错误日志

### Q: 应用无法访问静态资源

**解决方案**：
1. 确认webpack.prod.js中的publicPath配置
2. 检查资源路径是否使用相对路径

### Q: 飞书环境检测失败

**解决方案**：
1. 确认重定向URL配置正确
2. 检查应用是否在飞书域名下运行
3. 验证应用权限配置

### Q: 配置丢失

**解决方案**：
1. 配置存储在localStorage中
2. 不同域名需要重新配置
3. 确认配置格式正确

## 🔄 自动更新流程

GitHub Pages部署支持自动更新：

1. **代码更新**：推送到main分支
2. **自动构建**：GitHub Actions自动触发
3. **自动部署**：构建完成后自动部署
4. **立即可用**：无需手动操作

## 📈 性能优化

### 构建优化

- ✅ 代码分割和懒加载
- ✅ 资源压缩和缓存
- ✅ 生产环境优化

### 部署优化

- ✅ CDN加速（GitHub Pages）
- ✅ 静态资源缓存
- ✅ 压缩传输

## 🛡️ 安全考虑

### 配置安全

- ✅ App Secret只在本地存储
- ✅ 不在代码中暴露敏感信息
- ✅ 使用HTTPS传输

### 访问控制

- ✅ 飞书权限验证
- ✅ 表格访问权限控制
- ✅ 应用配置验证

## 📝 维护指南

### 定期维护

1. **更新依赖**：
```bash
npm update
npm audit fix
```

2. **监控部署**：
- 检查GitHub Actions状态
- 监控应用访问日志
- 验证功能正常

3. **备份配置**：
- 保存飞书应用配置
- 备份重要的自定义模板
- 记录部署配置

### 版本管理

- 使用语义化版本号
- 维护CHANGELOG
- 创建发布标签

---

🎉 **恭喜！** 您的飞书审批打印插件现在已经部署到GitHub Pages，可以通过飞书直接使用了！