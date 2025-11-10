# 📋 Supabase 配置快速指南

## 🎯 目标
为您的审批打印系统配置 Supabase 后端，实现多用户协作功能。

## 🚀 配置步骤（预计5分钟）

### 第一步：创建 Supabase 项目

1. **访问 Supabase**
   - 打开浏览器，访问：https://supabase.com
   - 点击 "Start your project"
   - 使用 GitHub 账号登录（推荐）

2. **创建新项目**
   ```
   项目名称: approval-print-system
   数据库密码: 设置强密码（请记录）
   地区: 选择 East Asia (Singapore)
   ```

### 第二步：配置数据库

1. **打开 SQL 编辑器**
   - 在左侧菜单点击 "SQL Editor"
   - 点击 "New query"

2. **执行数据库脚本**
   - 复制下面的脚本到 SQL 编辑器
   - 点击 "Run" 执行

### 第三步：获取 API 配置

1. **进入设置页面**
   - 左侧菜单点击 "Settings"
   - 点击 "API"

2. **复制配置信息**
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 第四步：配置应用环境变量

#### 本地开发
编辑项目根目录的 `.env` 文件：
```env
REACT_APP_SUPABASE_URL=https://您的项目ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=您的实际密钥
```

#### GitHub 部署
1. 进入 GitHub 仓库
2. Settings > Secrets and variables > Actions
3. 添加两个 Secrets：
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

## 📝 数据库脚本（复制执行）

```sql
-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  feishu_user_id VARCHAR(100) UNIQUE,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- 创建模板表
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  page_size VARCHAR(20) DEFAULT 'A4',
  orientation VARCHAR(20) DEFAULT 'portrait',
  fields JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- 创建打印记录表
CREATE TABLE IF NOT EXISTS print_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  record_id VARCHAR(100) NOT NULL,
  record_name VARCHAR(200) NOT NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  print_settings JSONB DEFAULT '{}',
  page_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_print_records_user ON print_records(user_id);
CREATE INDEX IF NOT EXISTS idx_print_records_template ON print_records(template_id);

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_records ENABLE ROW LEVEL SECURITY;

-- 用户表 RLS 策略
CREATE POLICY "用户可以查看自己的信息" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "用户可以更新自己的信息" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "用户可以创建自己的模板" ON templates
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "用户可以查看自己的模板" ON templates
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "用户可以更新自己的模板" ON templates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "用户可以删除自己的模板" ON templates
    FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "用户可以创建自己的打印记录" ON print_records
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以查看自己的打印记录" ON print_records
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "用户可以更新自己的打印记录" ON print_records
    FOR UPDATE USING (user_id = auth.uid());

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_print_records_updated_at BEFORE UPDATE ON print_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## ✅ 配置验证

完成配置后，您应该能够：

1. **访问应用**
   - 本地：http://localhost:3002
   - 线上：https://ivanli163.github.io/feishu-approval-print/

2. **注册新用户**
   - 点击"登录"按钮
   - 选择"注册"标签
   - 填写邮箱、密码、姓名

3. **测试功能**
   - 创建新模板
   - 修改现有模板
   - 测试数据同步

## 🆘 常见问题

### Q: 数据库连接失败
**A:** 检查 `.env` 文件中的 URL 和密钥是否正确

### Q: 无法注册用户
**A:** 确认已正确执行数据库脚本

### Q: 网站显示"演示数据模式"
**A:** 说明 Supabase 配置未生效，请检查环境变量

## 🎉 配置完成！

配置成功后，您的应用将支持：
- ✅ 用户注册登录
- ✅ 云端数据同步
- ✅ 多设备访问
- ✅ 数据安全保障

需要帮助？随时联系！