-- 审批打印系统数据库架构
-- 在 Supabase 控制台的 SQL 编辑器中执行以下脚本

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 组织表
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) DEFAULT 'personal' CHECK (type IN ('personal', 'team', 'enterprise')),
  feishu_tenant_id VARCHAR(100) UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  feishu_user_id VARCHAR(100) UNIQUE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- 模板表
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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- 打印记录表
CREATE TABLE IF NOT EXISTS print_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  record_id VARCHAR(100) NOT NULL, -- 飞书记录ID
  record_name VARCHAR(200) NOT NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'completed', 'failed')),
  print_settings JSONB DEFAULT '{}',
  page_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 用户权限表
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '[]', -- 权限列表
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- 模板分享表
CREATE TABLE IF NOT EXISTS template_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES users(id) ON DELETE CASCADE, -- 分享给的用户
  shared_by UUID REFERENCES users(id) ON DELETE CASCADE, -- 分享者
  permission_level VARCHAR(20) DEFAULT 'read' CHECK (permission_level IN ('read', 'write', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, shared_with)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_feishu_id ON users(feishu_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_organization ON templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_print_records_user ON print_records(user_id);
CREATE INDEX IF NOT EXISTS idx_print_records_template ON print_records(template_id);
CREATE INDEX IF NOT EXISTS idx_print_records_organization ON print_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_print_records_status ON print_records(status);
CREATE INDEX IF NOT EXISTS idx_print_records_created_at ON print_records(created_at);

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

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON user_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略 (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_shares ENABLE ROW LEVEL SECURITY;

-- 组织表的 RLS 策略
CREATE POLICY "组织成员可以查看自己的组织" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "组织管理员可以更新组织信息" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- 用户表的 RLS 策略
CREATE POLICY "用户可以查看自己的信息" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "同组织用户可以查看彼此信息" ON users
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "用户可以更新自己的信息" ON users
    FOR UPDATE USING (id = auth.uid());

-- 模板表的 RLS 策略
CREATE POLICY "用户可以查看自己的模板" ON templates
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "用户可以查看同组织的公开模板" ON templates
    FOR SELECT USING (
        is_public = true AND
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "用户可以查看分享给自己的模板" ON templates
    FOR SELECT USING (
        id IN (
            SELECT template_id FROM template_shares WHERE shared_with = auth.uid()
        )
    );

CREATE POLICY "用户可以创建自己的模板" ON templates
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "用户可以更新自己的模板" ON templates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "用户可以删除自己的模板" ON templates
    FOR DELETE USING (created_by = auth.uid());

-- 打印记录表的 RLS 策略
CREATE POLICY "用户可以查看自己的打印记录" ON print_records
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "组织管理员可以查看组织内所有打印记录" ON print_records
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "用户可以创建自己的打印记录" ON print_records
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "用户可以更新自己的打印记录" ON print_records
    FOR UPDATE USING (user_id = auth.uid());

-- 用户权限表的 RLS 策略
CREATE POLICY "用户可以查看自己的权限" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "组织管理员可以查看组织内用户权限" ON user_permissions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- 模板分享表的 RLS 策略
CREATE POLICY "用户可以查看分享给自己的模板" ON template_shares
    FOR SELECT USING (shared_with = auth.uid());

CREATE POLICY "用户可以查看自己分享的模板" ON template_shares
    FOR SELECT USING (shared_by = auth.uid());

CREATE POLICY "用户可以分享自己创建的模板" ON template_shares
    FOR INSERT WITH CHECK (
        shared_by = auth.uid() AND
        template_id IN (SELECT id FROM templates WHERE created_by = auth.uid())
    );

-- 创建存储过程：用户注册
CREATE OR REPLACE FUNCTION public.register_user(
    p_email VARCHAR(255),
    p_name VARCHAR(100),
    p_feishu_user_id VARCHAR(100) DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    -- 如果没有提供组织ID，创建个人组织
    IF p_organization_id IS NULL THEN
        INSERT INTO organizations (name, type)
        VALUES (p_name || '的个人空间', 'personal')
        RETURNING id INTO v_org_id;
    ELSE
        v_org_id := p_organization_id;
    END IF;

    -- 创建用户
    INSERT INTO users (email, name, feishu_user_id, organization_id, role)
    VALUES (p_email, p_name, p_feishu_user_id, v_org_id, 'user')
    RETURNING id INTO v_user_id;

    -- 为用户创建默认权限
    INSERT INTO user_permissions (user_id, organization_id, permissions)
    VALUES (
        v_user_id,
        v_org_id,
        ARRAY['template:create', 'template:read', 'template:update', 'template:delete', 'print:create', 'print:read']::JSONB
    );

    RETURN v_user_id;
END;
$$;

-- 创建视图：用户模板统计
CREATE OR REPLACE VIEW user_template_stats AS
SELECT
    u.id as user_id,
    u.name as user_name,
    COUNT(t.id) as total_templates,
    COUNT(CASE WHEN t.is_public = true THEN 1 END) as public_templates,
    COUNT(CASE WHEN t.is_default = true THEN 1 END) as default_templates,
    MAX(t.updated_at) as last_template_update
FROM users u
LEFT JOIN templates t ON u.id = t.created_by
GROUP BY u.id, u.name;

-- 创建视图：打印记录统计
CREATE OR REPLACE VIEW print_record_stats AS
SELECT
    u.id as user_id,
    u.name as user_name,
    COUNT(pr.id) as total_prints,
    COUNT(CASE WHEN pr.status = 'completed' THEN 1 END) as completed_prints,
    COUNT(CASE WHEN pr.status = 'failed' THEN 1 END) as failed_prints,
    SUM(pr.page_count) as total_pages,
    MAX(pr.created_at) as last_print_time
FROM users u
LEFT JOIN print_records pr ON u.id = pr.user_id
GROUP BY u.id, u.name;