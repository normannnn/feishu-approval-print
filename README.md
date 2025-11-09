# 🖨️ 飞书审批打印插件

一个基于飞书多维表格的审批记录打印解决方案，支持自定义模板和批量打印功能。

## ✨ 功能特性

- 📊 **真实数据集成** - 直接从飞书多维表格获取审批记录
- 🎨 **自定义模板** - 支持多种打印模板设计
- 🔧 **配置管理** - 简单的应用凭证配置界面
- 📱 **响应式设计** - 适配不同设备屏幕
- 🚀 **GitHub Pages部署** - 一键部署到GitHub Pages

## 🚀 快速开始

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/[your-username]/feishu-approval-print.git
cd feishu-approval-print
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问应用**：http://localhost:3002

### 部署到GitHub Pages

#### 方法一：自动部署（推荐）

1. **Fork此项目**到您的GitHub账户

2. **修改package.json中的homepage**：
```json
"homepage": "https://[your-username].github.io/[your-repo-name]"
```

3. **启用GitHub Pages**：
   - 进入仓库的Settings
   - 找到Pages选项
   - Source选择"GitHub Actions"

4. **推送代码**，自动部署开始

#### 方法二：手动部署

1. **构建项目**
```bash
npm run build:prod
```

2. **部署到GitHub Pages**
```bash
npm run deploy
```

## 📋 飞书应用配置

### 1. 创建飞书应用

1. 访问[飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 配置应用基本信息

### 2. 获取应用凭证

在飞书开放平台获取：
- **App ID**：格式如 `cli_xxxxxxxxx`
- **App Secret**：32位字符串

### 3. 配置权限

添加以下权限：
- `bitable:app` - 多维表格应用权限
- `bitable:readonly` - 多维表格只读权限
- `bitable:write` - 多维表格写入权限

### 4. 配置重定向URL

在安全设置中添加：
- **开发环境**：`http://localhost:3002`
- **生产环境**：`https://[your-username].github.io/[your-repo-name]`

### 5. 添加到多维表格

1. 打开飞书多维表格
2. 点击"插件"或"应用"
3. 找到并添加您的应用
4. 授予表格访问权限

## 🛠️ 项目结构

```
├── public/                 # 静态文件
│   └── index.html         # HTML模板
├── src/
│   ├── components/        # React组件
│   │   ├── AppSettings.tsx        # 应用配置
│   │   ├── EnvironmentStatus.tsx   # 环境状态
│   │   ├── ApprovalRecordsList.tsx # 审批记录列表
│   │   └── ...
│   ├── services/          # 服务层
│   │   └── feishu-sdk.ts  # 飞书SDK封装
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript类型定义
│   └── App.tsx            # 主应用组件
├── .github/workflows/     # GitHub Actions工作流
├── webpack.config.js      # 开发环境配置
├── webpack.prod.js        # 生产环境配置
└── package.json           # 项目配置
```

## 📊 数据字段要求

### 必需字段
- `审批实例ID` - 文本类型，唯一标识
- `审批类型` - 单选类型
- `申请人` - 文本类型
- `审批状态` - 单选类型

### 可选字段
- `申请部门` - 文本类型
- `申请时间` - 日期时间类型
- `审批时间` - 日期时间类型
- `审批人` - 文本类型

## 🔧 环境配置

### 开发环境变量

创建 `.env.local` 文件：
```env
VITE_APP_ID=your_app_id_here
VITE_APP_SECRET=your_app_secret_here
```

### 生产环境

应用会从以下位置读取配置（按优先级）：
1. localStorage（用户配置界面）
2. 环境变量
3. 默认配置

## 🐛 故障排除

### 常见问题

**Q: 应用无法在飞书中打开？**
- 检查应用权限是否正确配置
- 确认重定向URL设置正确
- 验证应用已发布并可用

**Q: 看不到任何数据？**
- 确保在飞书多维表格中使用
- 检查表格访问权限
- 验证表格中有数据记录

**Q: GitHub Pages部署失败？**
- 检查package.json中的homepage配置
- 确认GitHub Actions权限已启用
- 查看Actions页面的错误日志

### 调试模式

1. 打开浏览器开发者工具
2. 查看Console输出
3. 检查Network请求
4. 查看Application面板的localStorage

## 📝 更新日志

### v1.0.0
- ✅ 基础审批记录打印功能
- ✅ 飞书SDK集成
- ✅ 应用配置管理
- ✅ GitHub Pages部署支持
- ✅ 移除模拟数据，只使用真实API

## 🤝 贡献指南

1. Fork本项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有建议：

1. 查看[故障排除](#故障排除)部分
2. 搜索现有的[Issues](https://github.com/[your-username]/feishu-approval-print/issues)
3. 创建新的Issue描述您的问题

---

**⭐ 如果这个项目对您有帮助，请给它一个星标！**