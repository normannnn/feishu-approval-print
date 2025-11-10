/**
 * 用户认证服务
 * 处理用户登录、注册、权限验证等功能
 */

import { supabase, supabaseHelpers, TABLES, USER_ROLES, SupabaseError } from '../utils/supabaseClient';
import { feishuSDK } from './feishu-sdk';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  feishu_user_id?: string;
  role: string;
  organization_id?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface FeishuLoginData {
  feishuUserId: string;
  feishuAccessToken: string;
  userInfo: {
    name: string;
    email?: string;
    avatar?: string;
  };
}

class AuthService {
  private currentUser: UserProfile | null = null;
  private authListeners: Set<(user: UserProfile | null) => void> = new Set();

  constructor() {
    this.initializeAuth();
  }

  /**
   * 初始化认证状态
   */
  private async initializeAuth() {
    try {
      // 监听认证状态变化
      const { data: { subscription } } = supabaseHelpers.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            const userProfile = await this.getUserProfile(session.user.id);
            this.currentUser = userProfile;
            this.notifyAuthListeners(userProfile);
          } else {
            this.currentUser = null;
            this.notifyAuthListeners(null);
          }
        }
      );

      // 检查当前认证状态
      const isAuth = await supabaseHelpers.isAuthenticated();
      if (isAuth) {
        const user = await supabaseHelpers.getCurrentUser();
        if (user) {
          const userProfile = await this.getUserProfile(user.id);
          this.currentUser = userProfile;
          this.notifyAuthListeners(userProfile);
        }
      }
    } catch (error) {
      console.error('初始化认证状态失败:', error);
    }
  }

  /**
   * 邮箱密码登录
   */
  async signInWithEmail(credentials: LoginCredentials): Promise<UserProfile> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw supabaseHelpers.handleError(error);
      }

      if (data.user) {
        const userProfile = await this.getUserProfile(data.user.id);
        await this.updateLastLogin(data.user.id);
        this.currentUser = userProfile;
        return userProfile;
      } else {
        throw new SupabaseError('登录失败，未获取到用户信息');
      }
    } catch (error) {
      throw supabaseHelpers.handleError(error);
    }
  }

  /**
   * 飞书OAuth登录
   */
  async signInWithFeishu(): Promise<UserProfile> {
    try {
      // 获取飞书用户信息
      const feishuUser = await feishuSDK.getUserInfo();
      if (!feishuUser) {
        throw new Error('无法获取飞书用户信息');
      }

      // 检查是否已存在用户
      const { data: existingUser } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('feishu_user_id', feishuUser.userId)
        .single();

      let userProfile: UserProfile;

      if (existingUser) {
        // 用户已存在，直接登录
        userProfile = existingUser;
        await this.updateLastLogin(existingUser.id);
      } else {
        // 创建新用户
        const { data: newUser, error } = await supabase.rpc('register_user', {
          p_email: feishuUser.email || `${feishuUser.userId}@feishu.local`,
          p_name: feishuUser.name,
          p_feishu_user_id: feishuUser.userId,
        });

        if (error) {
          throw supabaseHelpers.handleError(error);
        }

        userProfile = await this.getUserProfile(newUser);
      }

      // 创建或获取Supabase用户会话
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google', // 这里需要根据实际情况调整
        token: feishuUser.accessToken || '',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (authError) {
        console.warn('Supabase认证失败，但继续使用本地用户信息:', authError);
      }

      this.currentUser = userProfile;
      this.notifyAuthListeners(userProfile);
      return userProfile;
    } catch (error) {
      throw supabaseHelpers.handleError(error);
    }
  }

  /**
   * 注册新用户
   */
  async signUp(userData: {
    email: string;
    password: string;
    name: string;
    feishuUserId?: string;
  }): Promise<UserProfile> {
    try {
      // 1. 创建Supabase用户
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
          },
        },
      });

      if (authError) {
        throw supabaseHelpers.handleError(authError);
      }

      if (!authData.user) {
        throw new SupabaseError('注册失败，未创建用户账号');
      }

      // 2. 创建用户档案
      const { data: userProfile, error: profileError } = await supabase.rpc('register_user', {
        p_email: userData.email,
        p_name: userData.name,
        p_feishu_user_id: userData.feishuUserId,
      });

      if (profileError) {
        throw supabaseHelpers.handleError(profileError);
      }

      const profile = await this.getUserProfile(userProfile);
      this.currentUser = profile;
      this.notifyAuthListeners(profile);
      return profile;
    } catch (error) {
      throw supabaseHelpers.handleError(error);
    }
  }

  /**
   * 登出
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw supabaseHelpers.handleError(error);
      }
      this.currentUser = null;
      this.notifyAuthListeners(null);
    } catch (error) {
      throw supabaseHelpers.handleError(error);
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw supabaseHelpers.handleError(error);
      }
    } catch (error) {
      throw supabaseHelpers.handleError(error);
    }
  }

  /**
   * 更新用户密码
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw supabaseHelpers.handleError(error);
      }
    } catch (error) {
      throw supabaseHelpers.handleError(error);
    }
  }

  /**
   * 获取用户档案
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw supabaseHelpers.handleError(error);
      }

      return data;
    } catch (error) {
      throw supabaseHelpers.handleError(error);
    }
  }

  /**
   * 更新最后登录时间
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.USERS)
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.warn('更新最后登录时间失败:', error);
      }
    } catch (error) {
      console.warn('更新最后登录时间失败:', error);
    }
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  /**
   * 检查用户是否已认证
   */
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  /**
   * 检查用户权限
   */
  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;

    // 管理员拥有所有权限
    if (this.currentUser.role === USER_ROLES.ADMIN) return true;

    // 这里需要根据实际的权限系统进行判断
    // 暂时返回true，后续实现详细的权限检查
    return true;
  }

  /**
   * 获取用户权限列表
   */
  async getUserPermissions(): Promise<string[]> {
    if (!this.currentUser) return [];

    try {
      const { data, error } = await supabase
        .from(TABLES.USER_PERMISSIONS)
        .select('permissions')
        .eq('user_id', this.currentUser.id)
        .single();

      if (error || !data) return [];

      return Array.isArray(data.permissions) ? data.permissions : [];
    } catch (error) {
      console.error('获取用户权限失败:', error);
      return [];
    }
  }

  /**
   * 订阅认证状态变化
   */
  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.authListeners.add(callback);

    // 立即调用一次，提供当前状态
    callback(this.currentUser);

    // 返回取消订阅函数
    return () => {
      this.authListeners.delete(callback);
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyAuthListeners(user: UserProfile | null): void {
    this.authListeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('认证状态监听器执行失败:', error);
      }
    });
  }
}

// 创建全局认证服务实例
export const authService = new AuthService();

export default authService;