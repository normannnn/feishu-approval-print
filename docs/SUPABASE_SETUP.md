# Supabase 多用户协作部署指南

本指南将帮助您在5分钟内完成 Supabase 后端服务的部署，实现多用户协作功能。

## 📋 部署前准备

### 必需条件
- GitHub 账号（用于自动部署）
- Supabase 账号（免费）

### 可选条件
- 自定义域名（用于生产环境）

## 🚀 5分钟快速部署

### 第一步：创建 Supabase 项目（2分钟）

1. **访问 Supabase 官网**
   - 打开 https://supabase.com
   - 点击 "Start your project"
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择或创建组织
   - 填写项目信息：
     ```
     项目名称: approval-print-system
     数据库密码: 设置强密码并记录
     地区: 选择离用户最近的地区
     ```

3. **获取项目信息**
   - 项目创建完成后，进入 Settings > API
   - 复制以下信息：
     - Project URL (https://xxx.supabase.co)
     - anon public key (eyJ...)

### 第二步：创建数据库表（1分钟）

1. **打开 SQL 编辑器**
   - 在项目控制台左侧菜单点击 "SQL Editor"
   - 点击 "New query"

2. **执行建表脚本**
   - 复制项目根目录下的 `supabase/schema.sql` 文件内容
   - 粘贴到 SQL 编辑器中
   - 点击 "Run" 执行脚本

3. **验证表创建**
   - 在左侧菜单点击 "Table Editor"
   - 确认看到以下表：
     - `organizations`
     - `users`
     - `templates`
     - `print_records`
     - `user_permissions`
     - `template_shares`

### 第三步：配置环境变量（1分钟）

1. **在 GitHub 仓库中设置 Secrets**
   - 进入您的 GitHub 仓库
   - 点击 Settings > Secrets and variables > Actions
   - 点击 "New repository secret"

2. **添加以下 Secrets**:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **创建本地环境文件**
   - 在项目根目录创建 `.env` 文件
   - 复制 `.env.example` 内容并填入实际值：
   ```env
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   REACT_APP_APP_NAME=审批打印系统
   REACT_APP_VERSION=1.0.0
   REACT_APP_DEV_MODE=false
   ```

### 第四步：自动部署（1分钟）

1. **GitHub Actions 已配置**
   - 项目已包含 `.github/workflows/deploy.yml`
   - 推送代码到 main 分支将自动触发部署

2. **手动触发部署**
   - 进入 GitHub 仓库的 Actions 页面
   - 选择 "Deploy to GitHub Pages" workflow
   - 点击 "Run workflow"

3. **验证部署**
   - 部署完成后访问 GitHub Pages URL
   - 通常格式为：`https://username.github.io/repository-name`

## 🔧 配置验证

### 检查数据库连接
在浏览器控制台中检查：
```javascript
// 打开浏览器控制台执行
fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/`, {
  headers: {
    'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
  }
}).then(r => r.json()).then(console.log)
```

### 测试用户注册
1. 打开部署的应用
2. 点击登录按钮
3. 尝试注册新用户
4. 检查 Supabase 控制台的 Authentication 页面是否显示新用户

## 📊 数据库管理

### 查看用户数据
1. 进入 Supabase 控制台
2. 点击 "Table Editor"
3. 选择 `users` 表查看所有用户

### 管理模板数据
1. 选择 `templates` 表
2. 可以直接编辑、删除模板数据
3. 支持导入导出 CSV 格式

### 备份数据
1. 进入 Settings > Database
2. 点击 "Create new backup"
3. 定期备份重要数据

## 🔒 安全配置

### 启用行级安全 (RLS)
数据库脚本已包含 RLS 策略，确保：
- 用户只能访问自己的数据
- 组织内数据可共享
- 敏感数据有权限控制

### 设置认证配置
1. 进入 Settings > Authentication
2. 配置以下选项：
   - Site URL: 您的网站域名
   - Redirect URLs: 添加登录成功后的跳转地址
   - Email templates: 自定义邮件模板

### API 限制
1. 进入 Settings > API
2. 设置合理的请求限制：
   - Rate limiting: 100 requests/hour
   - JWT expiry: 1 hour
   - Row limit: 1000

## 📈 监控和维护

### 查看使用统计
1. 进入 Settings > Billing
2. 查看数据库使用情况
3. 监控 API 调用次数

### 性能优化
1. 定期检查慢查询
2. 优化数据库索引
3. 清理过期数据

### 日志监控
1. 进入 Logs > Database
2. 查看错误日志
3. 监控异常活动

## 🆘 常见问题

### Q: 忘记数据库密码怎么办？
A: 在 Supabase 控制台重置数据库密码，然后更新连接字符串。

### Q: 如何重置数据？
A: 在 SQL 编辑器中执行 `TRUNCATE TABLE table_name;` 清空表数据。

### Q: 数据库连接失败？
A: 检查环境变量配置，确认 URL 和 API Key 正确。

### Q: 用户无法注册？
A: 检查 Authentication 设置中的 Email 配置和 Site URL。

### Q: 如何升级到付费计划？
A: 在 Settings > Billing 中选择适合的付费计划。

## 📞 技术支持

如果遇到问题，可以：
1. 查看 [Supabase 官方文档](https://supabase.com/docs)
2. 联系项目技术支持
3. 在 GitHub Issues 中提交问题

---

**恭喜！** 您已经成功部署了多用户协作的审批打印系统。现在用户可以：
- 注册账号并登录
- 在多设备间同步数据
- 与团队成员共享模板
- 享受自动备份功能