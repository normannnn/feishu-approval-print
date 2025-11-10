/**
 * 数据迁移服务
 * 处理从本地存储到云端数据库的数据迁移
 */

import { templateDataManager } from '../utils/templateDataManager';
import { cloudTemplateDataManager } from '../utils/cloudTemplateDataManager';
import { supabase, supabaseHelpers, TABLES, SupabaseError } from '../utils/supabaseClient';
import { authService } from './authService';

export interface MigrationProgress {
  stage: 'preparing' | 'uploading' | 'validating' | 'completed' | 'error';
  progress: number; // 0-100
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  errorMessage?: string;
  migratedItems: {
    templates: number;
    printRecords: number;
  };
  totalItems: {
    templates: number;
    printRecords: number;
  };
}

export interface MigrationResult {
  success: boolean;
  errorMessage?: string;
  migratedData: {
    templates: number;
    printRecords: number;
  };
  conflicts: Array<{
    type: 'template' | 'printRecord';
    id: string;
    name: string;
    reason: string;
  }>;
}

class MigrationService {
  private isMigrating: boolean = false;
  private migrationProgress: MigrationProgress | null = null;
  private progressListeners: Set<(progress: MigrationProgress) => void> = new Set();

  /**
   * 检查是否需要迁移
   */
  async needsMigration(): Promise<boolean> {
    try {
      // 检查用户是否已登录
      if (!authService.isAuthenticated()) {
        return false;
      }

      // 检查本地是否有数据
      const localTemplates = templateDataManager.getTemplates();
      const localRecords = templateDataManager.getPrintRecords();

      // 检查云端是否有数据
      const user = authService.getCurrentUser();
      if (!user) return false;

      const { data: cloudTemplates, error: templateError } = await supabase
        .from(TABLES.TEMPLATES)
        .select('id')
        .eq('created_by', user.id);

      if (templateError) throw templateError;

      const { data: cloudRecords, error: recordError } = await supabase
        .from(TABLES.PRINT_RECORDS)
        .select('id')
        .eq('user_id', user.id);

      if (recordError) throw recordError;

      // 如果本地有数据但云端没有数据，则需要迁移
      const hasLocalData = localTemplates.length > 0 || localRecords.length > 0;
      const hasCloudData = (cloudTemplates?.length || 0) > 0 || (cloudRecords?.length || 0) > 0;

      return hasLocalData && !hasCloudData;
    } catch (error) {
      console.error('检查迁移需求失败:', error);
      return false;
    }
  }

  /**
   * 开始数据迁移
   */
  async startMigration(): Promise<MigrationResult> {
    if (this.isMigrating) {
      throw new Error('迁移正在进行中');
    }

    if (!authService.isAuthenticated()) {
      throw new Error('用户未登录');
    }

    this.isMigrating = true;

    try {
      const result = await this.performMigration();
      return result;
    } catch (error) {
      console.error('数据迁移失败:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : '迁移失败',
        migratedData: { templates: 0, printRecords: 0 },
        conflicts: [],
      };
    } finally {
      this.isMigrating = false;
      this.migrationProgress = null;
    }
  }

  /**
   * 执行数据迁移
   */
  private async performMigration(): Promise<MigrationResult> {
    const localTemplates = templateDataManager.getTemplates();
    const localRecords = templateDataManager.getPrintRecords();

    this.updateProgress({
      stage: 'preparing',
      progress: 0,
      currentStep: '准备迁移数据',
      totalSteps: localTemplates.length + localRecords.length,
      completedSteps: 0,
      migratedItems: { templates: 0, printRecords: 0 },
      totalItems: {
        templates: localTemplates.length,
        printRecords: localRecords.length,
      },
    });

    const user = authService.getCurrentUser();
    if (!user) throw new Error('用户未登录');

    const conflicts: MigrationResult['conflicts'] = [];
    let migratedTemplates = 0;
    let migratedRecords = 0;

    try {
      // 迁移模板
      this.updateProgress({
        ...this.migrationProgress!,
        stage: 'uploading',
        currentStep: '上传模板数据',
      });

      for (let i = 0; i < localTemplates.length; i++) {
        const template = localTemplates[i];
        try {
          await this.migrateTemplate(template, user);
          migratedTemplates++;
        } catch (error) {
          console.error(`迁移模板 ${template.name} 失败:`, error);
          conflicts.push({
            type: 'template',
            id: template.id,
            name: template.name,
            reason: error instanceof Error ? error.message : '未知错误',
          });
        }

        this.updateProgress({
          ...this.migrationProgress!,
          completedSteps: i + 1,
          migratedItems: { templates: migratedTemplates, printRecords: 0 },
          progress: Math.round(((i + 1) / localTemplates.length) * 50), // 模板占50%
        });
      }

      // 迁移打印记录
      this.updateProgress({
        ...this.migrationProgress!,
        currentStep: '上传打印记录',
      });

      for (let i = 0; i < localRecords.length; i++) {
        const record = localRecords[i];
        try {
          await this.migratePrintRecord(record, user);
          migratedRecords++;
        } catch (error) {
          console.error(`迁移打印记录 ${record.recordName} 失败:`, error);
          conflicts.push({
            type: 'printRecord',
            id: record.id,
            name: record.recordName,
            reason: error instanceof Error ? error.message : '未知错误',
          });
        }

        this.updateProgress({
          ...this.migrationProgress!,
          completedSteps: localTemplates.length + i + 1,
          migratedItems: { templates: migratedTemplates, printRecords: migratedRecords },
          progress: 50 + Math.round(((i + 1) / localRecords.length) * 50), // 记录占50%
        });
      }

      // 验证迁移结果
      this.updateProgress({
        ...this.migrationProgress!,
        stage: 'validating',
        currentStep: '验证迁移结果',
        progress: 95,
      });

      await this.validateMigration(user, migratedTemplates, migratedRecords);

      // 迁移完成
      this.updateProgress({
        ...this.migrationProgress!,
        stage: 'completed',
        currentStep: '迁移完成',
        progress: 100,
        migratedItems: { templates: migratedTemplates, printRecords: migratedRecords },
      });

      return {
        success: true,
        migratedData: { templates: migratedTemplates, printRecords: migratedRecords },
        conflicts,
      };
    } catch (error) {
      this.updateProgress({
        ...this.migrationProgress!,
        stage: 'error',
        currentStep: '迁移失败',
        errorMessage: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  /**
   * 迁移单个模板
   */
  private async migrateTemplate(template: any, user: any): Promise<void> {
    // 检查模板是否已存在
    const { data: existingTemplate } = await supabase
      .from(TABLES.TEMPLATES)
      .select('id')
      .eq('id', template.id)
      .single();

    if (existingTemplate) {
      throw new Error('模板已存在');
    }

    const { error } = await supabase.from(TABLES.TEMPLATES).insert({
      id: template.id,
      name: template.name,
      description: template.description,
      page_size: template.page_size,
      orientation: template.orientation,
      fields: template.fields,
      is_default: template.is_default,
      is_public: false,
      created_by: user.id,
      organization_id: user.organization_id,
      created_at: template.created_time,
      updated_at: template.updated_time,
      version: 1,
    });

    if (error) throw error;
  }

  /**
   * 迁移单个打印记录
   */
  private async migratePrintRecord(record: any, user: any): Promise<void> {
    // 检查记录是否已存在
    const { data: existingRecord } = await supabase
      .from(TABLES.PRINT_RECORDS)
      .select('id')
      .eq('id', record.id)
      .single();

    if (existingRecord) {
      throw new Error('打印记录已存在');
    }

    const { error } = await supabase.from(TABLES.PRINT_RECORDS).insert({
      id: record.id,
      record_id: record.recordId,
      record_name: record.recordName,
      template_id: record.templateId,
      template_name: record.templateName,
      user_id: user.id,
      organization_id: user.organization_id,
      data: record.data,
      status: record.status,
      print_settings: {},
      page_count: record.pageCount,
      error_message: record.errorMessage,
      created_at: record.createTime,
      completed_at: record.completeTime,
    });

    if (error) throw error;
  }

  /**
   * 验证迁移结果
   */
  private async validateMigration(
    user: any,
    expectedTemplates: number,
    expectedRecords: number
  ): Promise<void> {
    // 验证模板数量
    const { data: templates, error: templateError } = await supabase
      .from(TABLES.TEMPLATES)
      .select('id')
      .eq('created_by', user.id);

    if (templateError) throw templateError;

    if ((templates?.length || 0) < expectedTemplates) {
      throw new Error('模板数量验证失败');
    }

    // 验证记录数量
    const { data: records, error: recordError } = await supabase
      .from(TABLES.PRINT_RECORDS)
      .select('id')
      .eq('user_id', user.id);

    if (recordError) throw recordError;

    if ((records?.length || 0) < expectedRecords) {
      throw new Error('打印记录数量验证失败');
    }
  }

  /**
   * 更新迁移进度
   */
  private updateProgress(progress: MigrationProgress): void {
    this.migrationProgress = progress;
    this.notifyProgressListeners(progress);
  }

  /**
   * 通知进度监听器
   */
  private notifyProgressListeners(progress: MigrationProgress): void {
    this.progressListeners.forEach(listener => {
      try {
        listener(progress);
      } catch (error) {
        console.error('进度监听器执行失败:', error);
      }
    });
  }

  /**
   * 订阅迁移进度
   */
  onProgress(listener: (progress: MigrationProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  /**
   * 获取当前迁移状态
   */
  getMigrationProgress(): MigrationProgress | null {
    return this.migrationProgress;
  }

  /**
   * 检查是否正在迁移
   */
  isCurrentlyMigrating(): boolean {
    return this.isMigrating;
  }

  /**
   * 取消迁移
   */
  cancelMigration(): void {
    if (this.isMigrating) {
      this.isMigrating = false;
      this.updateProgress({
        ...this.migrationProgress!,
        stage: 'error',
        currentStep: '迁移已取消',
        errorMessage: '用户取消迁移',
      });
    }
  }

  /**
   * 备份本地数据
   */
  async backupLocalData(): Promise<string> {
    const allData = templateDataManager.exportAllData();
    const backupData = {
      ...allData,
      backupTime: new Date().toISOString(),
      backupVersion: '1.0.0',
    };

    const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });

    const backupUrl = URL.createObjectURL(backupBlob);

    // 创建下载链接
    const link = document.createElement('a');
    link.href = backupUrl;
    link.download = `print-system-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    // 清理URL
    setTimeout(() => URL.revokeObjectURL(backupUrl), 1000);

    return backupUrl;
  }

  /**
   * 清理本地数据（迁移成功后调用）
   */
  async cleanupLocalData(): Promise<void> {
    try {
      // 保留必要的配置，清理业务数据
      localStorage.removeItem('approval_print_templates');
      localStorage.removeItem('approval_print_records');

      console.log('本地数据清理完成');
    } catch (error) {
      console.error('清理本地数据失败:', error);
    }
  }
}

// 创建全局迁移服务实例
export const migrationService = new MigrationService();

export default migrationService;