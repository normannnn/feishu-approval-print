/**
 * 认证提供者组件
 * 提供全局认证状态和数据管理
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { message } from 'antd';
import { authService, type UserProfile } from '../services/authService';
import { cloudTemplateDataManager, SYNC_STATUS } from '../utils/cloudTemplateDataManager';
import { migrationService, type MigrationProgress } from '../services/migrationService';

interface AuthContextType {
  // 用户状态
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // 认证方法
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithFeishu: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;

  // 数据同步状态
  syncState: any;
  needsMigration: boolean;
  isMigrating: boolean;

  // 数据操作
  manualSync: () => Promise<void>;
  startMigration: () => Promise<void>;

  // 迁移进度
  migrationProgress: MigrationProgress | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);

  // 认证方法
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userProfile = await authService.signInWithEmail({ email, password });
      setUser(userProfile);
      message.success('登录成功！');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithFeishu = async () => {
    try {
      setIsLoading(true);
      const userProfile = await authService.signInWithFeishu();
      setUser(userProfile);
      message.success('飞书登录成功！');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '飞书登录失败');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      const userProfile = await authService.signUp({ email, password, name });
      setUser(userProfile);
      message.success('注册成功！');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '注册失败');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setNeedsMigration(false);
      message.success('已安全退出');
    } catch (error) {
      message.error('退出登录失败');
    }
  };

  // 数据同步方法
  const manualSync = async () => {
    try {
      await cloudTemplateDataManager.manualSync();
      message.success('数据同步完成！');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '同步失败');
      throw error;
    }
  };

  const startMigration = async () => {
    try {
      setIsMigrating(true);
      const result = await migrationService.startMigration();

      if (result.success) {
        setNeedsMigration(false);
        message.success(`迁移完成！已迁移 ${result.migratedData.templates} 个模板和 ${result.migratedData.printRecords} 条打印记录`);

        // 刷新数据管理器
        await cloudTemplateDataManager.syncFromCloud();
      } else {
        message.error(result.errorMessage || '迁移失败');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '迁移失败');
    } finally {
      setIsMigrating(false);
      setMigrationProgress(null);
    }
  };

  // 初始化
  useEffect(() => {
    let authUnsubscribe: (() => void) | null = null;
    let dataUnsubscribe: (() => void) | null = null;
    let migrationUnsubscribe: (() => void) | null = null;

    const initialize = async () => {
      // 监听认证状态变化
      authUnsubscribe = authService.onAuthStateChanged((user) => {
        setUser(user);
        setIsLoading(false);

        // 检查是否需要迁移
        if (user) {
          migrationService.needsMigration().then(setNeedsMigration);
        }
      });

      // 监听数据管理器状态变化
      dataUnsubscribe = cloudTemplateDataManager.subscribe(() => {
        // 强制更新组件以反映数据变化
        setUser(prev => prev ? { ...prev } : null);
      });

      // 监听迁移进度
      migrationUnsubscribe = migrationService.onProgress((progress) => {
        setMigrationProgress(progress);
      });

      // 检查初始状态
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const needsMigrate = await migrationService.needsMigration();
        setNeedsMigration(needsMigrate);
      }
    };

    initialize();

    return () => {
      authUnsubscribe?.();
      dataUnsubscribe?.();
      migrationUnsubscribe?.();
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signInWithEmail,
    signInWithFeishu,
    signUp,
    signOut,
    syncState: cloudTemplateDataManager.getSyncState(),
    needsMigration,
    isMigrating,
    manualSync,
    startMigration,
    migrationProgress,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;