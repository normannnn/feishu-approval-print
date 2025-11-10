/**
 * Supabase客户端配置
 * 用于连接Supabase数据库和认证服务
 */

import { createClient } from '@supabase/supabase-js';

// 环境变量配置
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ljoalggzmclyxjftjyhg.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqb2FsZ2d6bWNseXhqZnRqeWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODAyMjAsImV4cCI6MjA3ODM1NjIyMH0.LXNhDu5UkcFIT5dhdlZny9dWucBodbqpjDQzAoK23Zk';

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 数据库表名常量
export const TABLES = {
  USERS: 'users',
  TEMPLATES: 'templates',
  PRINT_RECORDS: 'print_records',
  USER_PERMISSIONS: 'user_permissions',
  ORGANIZATIONS: 'organizations',
};

// 用户角色常量
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

// 权限常量
export const PERMISSIONS = {
  // 模板权限
  TEMPLATE_CREATE: 'template:create',
  TEMPLATE_READ: 'template:read',
  TEMPLATE_UPDATE: 'template:update',
  TEMPLATE_DELETE: 'template:delete',
  TEMPLATE_SHARE: 'template:share',

  // 打印权限
  PRINT_CREATE: 'print:create',
  PRINT_READ: 'print:read',
  PRINT_UPDATE: 'print:update',
  PRINT_DELETE: 'print:delete',
  PRINT_BATCH: 'print:batch',

  // 系统权限
  USER_MANAGE: 'user:manage',
  SYSTEM_CONFIG: 'system:config',
  DATA_EXPORT: 'data:export',
  DATA_IMPORT: 'data:import',
} as const;

// 组织类型常量
export const ORG_TYPES = {
  PERSONAL: 'personal',
  TEAM: 'team',
  ENTERPRISE: 'enterprise',
} as const;

// 错误处理工具
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

// 数据库操作辅助函数
export const supabaseHelpers = {
  // 通用错误处理
  handleError: (error: any): SupabaseError => {
    console.error('Supabase操作失败:', error);
    return new SupabaseError(
      error.message || '操作失败',
      error.code,
      error.details
    );
  },

  // 检查用户是否已认证
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('检查认证状态失败:', error);
      return false;
    }
  },

  // 获取当前用户
  getCurrentUser: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('获取当前用户失败:', error);
      return null;
    }
  },

  // 监听认证状态变化
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default supabase;