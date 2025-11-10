/**
 * 云端模板数据管理工具
 * 支持本地存储 + Supabase云端同步的混合数据管理
 */

import { Template, TemplateField } from '../components/TemplateManager';
import { supabase, supabaseHelpers, TABLES, SupabaseError } from './supabaseClient';
import { authService } from '../services/authService';

// 导入原有的本地存储管理器
import { templateDataManager as localDataManager } from './templateDataManager';

// 数据版本控制
export const CLOUD_DATA_VERSION = '2.0.0';
export const SYNC_STATUS = {
  OFFLINE: 'offline',      // 离线模式
  SYNCING: 'syncing',      // 同步中
  SYNCED: 'synced',        // 已同步
  CONFLICT: 'conflict',    // 有冲突
  ERROR: 'error',          // 同步错误
} as const;

export type SyncStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS];

// 云端数据接口
export interface CloudTemplate extends Omit<Template, 'id'> {
  id: string;
  created_by: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  version: number;
  is_public: boolean;
}

export interface CloudPrintRecord extends Omit<PrintRecord, 'id'> {
  id: string;
  user_id: string;
  organization_id?: string;
  created_at: string;
  completed_at?: string;
  print_settings: Record<string, any>;
}

export interface SyncState {
  status: SyncStatus;
  lastSyncTime?: string;
  errorMessage?: string;
  pendingUploads: number;
  pendingDownloads: number;
  conflicts: Array<{
    type: 'template' | 'printRecord';
    id: string;
    localData: any;
    cloudData: any;
  }>;
}

class CloudTemplateDataManager {
  private templates: Template[] = [];
  private printRecords: PrintRecord[] = [];
  private listeners: Set<() => void> = new Set();
  private syncState: SyncState = {
    status: SYNC_STATUS.OFFLINE,
    pendingUploads: 0,
    pendingDownloads: 0,
    conflicts: [],
  };

  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;
  private currentUser: any = null;

  constructor() {
    this.initializeManager();
  }

  /**
   * 初始化管理器
   */
  private async initializeManager() {
    // 监听网络状态
    window.addEventListener('online', this.handleOnlineStatusChange);
    window.addEventListener('offline', this.handleOnlineStatusChange);

    // 监听认证状态变化
    authService.onAuthStateChanged(this.handleAuthStateChange);

    // 初始化网络状态
    this.isOnline = navigator.onLine;

    // 加载本地数据
    await this.loadLocalData();

    // 如果在线且已认证，启动自动同步
    if (this.isOnline && authService.isAuthenticated()) {
      this.startAutoSync();
    }
  }

  /**
   * 处理网络状态变化
   */
  private handleOnlineStatusChange = () => {
    this.isOnline = navigator.onLine;
    if (this.isOnline && authService.isAuthenticated()) {
      this.startAutoSync();
      this.syncToCloud();
    } else {
      this.stopAutoSync();
      this.updateSyncState(SYNC_STATUS.OFFLINE);
    }
  };

  /**
   * 处理认证状态变化
   */
  private handleAuthStateChange = (user: any) => {
    this.currentUser = user;
    if (user && this.isOnline) {
      this.startAutoSync();
      this.syncFromCloud();
    } else {
      this.stopAutoSync();
      this.templates = [];
      this.printRecords = [];
      this.loadLocalData(); // 重新加载本地数据
    }
  };

  /**
   * 加载本地数据
   */
  private async loadLocalData() {
    try {
      this.templates = localDataManager.getTemplates();
      this.printRecords = localDataManager.getPrintRecords();
      this.notifyListeners();
    } catch (error) {
      console.error('加载本地数据失败:', error);
    }
  }

  /**
   * 启动自动同步
   */
  private startAutoSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncToCloud();
        await this.syncFromCloud();
      } catch (error) {
        console.error('自动同步失败:', error);
        this.updateSyncState(SYNC_STATUS.ERROR, '同步失败');
      }
    }, 30000); // 每30秒同步一次
  }

  /**
   * 停止自动同步
   */
  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * 更新同步状态
   */
  private updateSyncState(
    status: SyncStatus,
    errorMessage?: string,
    conflicts?: SyncState['conflicts']
  ) {
    this.syncState = {
      ...this.syncState,
      status,
      lastSyncTime: new Date().toISOString(),
      errorMessage,
      conflicts: conflicts || [],
    };
    this.notifyListeners();
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('监听器执行失败:', error);
      }
    });
  }

  /**
   * 同步到云端
   */
  async syncToCloud(): Promise<void> {
    if (!this.isOnline || !authService.isAuthenticated()) {
      return;
    }

    this.updateSyncState(SYNC_STATUS.SYNCING);

    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('用户未登录');

      // 同步模板
      await this.syncTemplatesToCloud(user);

      // 同步打印记录
      await this.syncPrintRecordsToCloud(user);

      this.updateSyncState(SYNC_STATUS.SYNCED);
    } catch (error) {
      console.error('同步到云端失败:', error);
      this.updateSyncState(SYNC_STATUS.ERROR, '上传失败');
      throw error;
    }
  }

  /**
   * 同步模板到云端
   */
  private async syncTemplatesToCloud(user: any): Promise<void> {
    // 获取需要上传的模板
    const localTemplates = this.templates;
    const { data: cloudTemplates, error: fetchError } = await supabase
      .from(TABLES.TEMPLATES)
      .select('*')
      .eq('created_by', user.id);

    if (fetchError) throw fetchError;

    const cloudTemplateIds = new Set(cloudTemplates?.map(t => t.id) || []);
    const localTemplateIds = new Set(localTemplates.map(t => t.id));

    // 上传新模板
    const newTemplates = localTemplates.filter(t => !cloudTemplateIds.has(t.id));
    for (const template of newTemplates) {
      await this.uploadTemplate(template, user);
    }

    // 更新已有模板
    const existingTemplates = localTemplates.filter(t => cloudTemplateIds.has(t.id));
    for (const template of existingTemplates) {
      const cloudTemplate = cloudTemplates?.find(ct => ct.id === template.id);
      if (cloudTemplate && new Date(template.updated_time) > new Date(cloudTemplate.updated_at)) {
        await this.updateTemplateInCloud(template, user);
      }
    }
  }

  /**
   * 上传新模板到云端
   */
  private async uploadTemplate(template: Template, user: any): Promise<void> {
    const { error } = await supabase.from(TABLES.TEMPLATES).insert({
      id: template.id,
      name: template.name,
      description: template.description,
      page_size: template.page_size,
      orientation: template.orientation,
      fields: template.fields,
      is_default: template.is_default,
      is_public: false, // 默认私有
      created_by: user.id,
      organization_id: user.organization_id,
      version: 1,
    });

    if (error) throw error;
  }

  /**
   * 更新云端模板
   */
  private async updateTemplateInCloud(template: Template, user: any): Promise<void> {
    const { error } = await supabase
      .from(TABLES.TEMPLATES)
      .update({
        name: template.name,
        description: template.description,
        page_size: template.page_size,
        orientation: template.orientation,
        fields: template.fields,
        is_default: template.is_default,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template.id)
      .eq('created_by', user.id);

    if (error) throw error;
  }

  /**
   * 同步打印记录到云端
   */
  private async syncPrintRecordsToCloud(user: any): Promise<void> {
    const localRecords = this.printRecords;
    const { data: cloudRecords, error: fetchError } = await supabase
      .from(TABLES.PRINT_RECORDS)
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    const cloudRecordIds = new Set(cloudRecords?.map(r => r.id) || []);
    const localRecordIds = new Set(localRecords.map(r => r.id));

    // 上传新记录
    const newRecords = localRecords.filter(r => !cloudRecordIds.has(r.id));
    for (const record of newRecords) {
      await this.uploadPrintRecord(record, user);
    }

    // 更新已有记录
    const existingRecords = localRecords.filter(r => cloudRecordIds.has(r.id));
    for (const record of existingRecords) {
      const cloudRecord = cloudRecords?.find(cr => cr.id === record.id);
      if (cloudRecord &&
          new Date(record.createTime) > new Date(cloudRecord.created_at) ||
          (record.completeTime && new Date(record.completeTime) > new Date(cloudRecord.completed_at || 0))) {
        await this.updatePrintRecordInCloud(record, user);
      }
    }
  }

  /**
   * 上传打印记录到云端
   */
  private async uploadPrintRecord(record: PrintRecord, user: any): Promise<void> {
    const { error } = await supabase.from(TABLES.PRINT_RECORDS).insert({
      id: record.id,
      record_id: record.recordId,
      record_name: record.recordName,
      template_id: record.templateId,
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
   * 更新云端打印记录
   */
  private async updatePrintRecordInCloud(record: PrintRecord, user: any): Promise<void> {
    const { error } = await supabase
      .from(TABLES.PRINT_RECORDS)
      .update({
        record_name: record.recordName,
        data: record.data,
        status: record.status,
        page_count: record.pageCount,
        error_message: record.errorMessage,
        completed_at: record.completeTime,
      })
      .eq('id', record.id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * 从云端同步
   */
  async syncFromCloud(): Promise<void> {
    if (!this.isOnline || !authService.isAuthenticated()) {
      return;
    }

    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('用户未登录');

      // 同步模板
      await this.syncTemplatesFromCloud(user);

      // 同步打印记录
      await this.syncPrintRecordsFromCloud(user);

      // 更新本地存储
      this.saveToLocal();
    } catch (error) {
      console.error('从云端同步失败:', error);
      throw error;
    }
  }

  /**
   * 从云端同步模板
   */
  private async syncTemplatesFromCloud(user: any): Promise<void> {
    const { data: cloudTemplates, error } = await supabase
      .from(TABLES.TEMPLATES)
      .select('*')
      .or(`created_by.eq.${user.id},is_public.eq.true`);

    if (error) throw error;
    if (!cloudTemplates) return;

    // 合并云端和本地模板
    const mergedTemplates = this.mergeTemplates(this.templates, cloudTemplates);
    this.templates = mergedTemplates;
  }

  /**
   * 从云端同步打印记录
   */
  private async syncPrintRecordsFromCloud(user: any): Promise<void> {
    const { data: cloudRecords, error } = await supabase
      .from(TABLES.PRINT_RECORDS)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!cloudRecords) return;

    // 合并云端和本地记录
    const mergedRecords = this.mergePrintRecords(this.printRecords, cloudRecords);
    this.printRecords = mergedRecords;
  }

  /**
   * 合并模板数据
   */
  private mergeTemplates(
    localTemplates: Template[],
    cloudTemplates: CloudTemplate[]
  ): Template[] {
    const templateMap = new Map<string, Template>();

    // 添加本地模板
    localTemplates.forEach(template => {
      templateMap.set(template.id, template);
    });

    // 合并云端模板（更新较新的版本）
    cloudTemplates.forEach(cloudTemplate => {
      const existing = templateMap.get(cloudTemplate.id);
      if (!existing || new Date(cloudTemplate.updated_at) > new Date(existing.updated_time)) {
        templateMap.set(cloudTemplate.id, {
          id: cloudTemplate.id,
          name: cloudTemplate.name,
          description: cloudTemplate.description,
          page_size: cloudTemplate.page_size,
          orientation: cloudTemplate.orientation,
          fields: cloudTemplate.fields,
          is_default: cloudTemplate.is_default,
          created_time: cloudTemplate.created_at,
          updated_time: cloudTemplate.updated_at,
        });
      }
    });

    return Array.from(templateMap.values());
  }

  /**
   * 合并打印记录数据
   */
  private mergePrintRecords(
    localRecords: PrintRecord[],
    cloudRecords: CloudPrintRecord[]
  ): PrintRecord[] {
    const recordMap = new Map<string, PrintRecord>();

    // 添加本地记录
    localRecords.forEach(record => {
      recordMap.set(record.id, record);
    });

    // 合并云端记录
    cloudRecords.forEach(cloudRecord => {
      const existing = recordMap.get(cloudRecord.id);
      if (!existing || new Date(cloudRecord.created_at) > new Date(existing.createTime)) {
        recordMap.set(cloudRecord.id, {
          id: cloudRecord.id,
          recordId: cloudRecord.record_id,
          recordName: cloudRecord.record_name,
          templateId: cloudRecord.template_id,
          templateName: cloudRecord.template_name || '',
          data: cloudRecord.data,
          status: cloudRecord.status,
          createTime: cloudRecord.created_at,
          completeTime: cloudRecord.completed_at,
          errorMessage: cloudRecord.error_message,
          pageCount: cloudRecord.page_count,
        });
      }
    });

    return Array.from(recordMap.values()).sort((a, b) =>
      new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    );
  }

  /**
   * 保存到本地存储
   */
  private saveToLocal(): void {
    localDataManager.saveDataToStorage();
  }

  /**
   * 订阅数据变化
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 获取所有模板
   */
  getTemplates(): Template[] {
    return [...this.templates];
  }

  /**
   * 根据ID获取模板
   */
  getTemplateById(id: string): Template | undefined {
    return this.templates.find(template => template.id === id);
  }

  /**
   * 根据名称获取模板
   */
  getTemplateByName(name: string): Template | undefined {
    return this.templates.find(template => template.name === name);
  }

  /**
   * 保存模板
   */
  async saveTemplate(template: Template): Promise<void> {
    // 本地保存
    const index = this.templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      this.templates[index] = {
        ...template,
        updated_time: new Date().toISOString()
      };
    } else {
      this.templates.push({
        ...template,
        id: template.id || Date.now().toString(),
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString(),
      });
    }

    // 保存到本地存储
    this.saveToLocal();

    // 如果在线，同步到云端
    if (this.isOnline && authService.isAuthenticated()) {
      try {
        await this.syncToCloud();
      } catch (error) {
        console.error('同步模板到云端失败:', error);
        // 不抛出错误，允许离线使用
      }
    }

    this.notifyListeners();
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const template = this.getTemplateById(id);
    if (!template || template.is_default) {
      return false;
    }

    // 本地删除
    this.templates = this.templates.filter(t => t.id !== id);
    this.saveToLocal();

    // 如果在线，从云端删除
    if (this.isOnline && authService.isAuthenticated()) {
      try {
        const user = authService.getCurrentUser();
        if (user) {
          const { error } = await supabase
            .from(TABLES.TEMPLATES)
            .delete()
            .eq('id', id)
            .eq('created_by', user.id);

          if (error) throw error;
        }
      } catch (error) {
        console.error('从云端删除模板失败:', error);
      }
    }

    this.notifyListeners();
    return true;
  }

  /**
   * 获取所有打印记录
   */
  getPrintRecords(): PrintRecord[] {
    return [...this.printRecords];
  }

  /**
   * 添加打印记录
   */
  async addPrintRecord(record: Omit<PrintRecord, 'id' | 'createTime'>): Promise<PrintRecord> {
    const newRecord: PrintRecord = {
      ...record,
      id: Date.now().toString(),
      createTime: new Date().toISOString(),
    };

    // 本地添加
    this.printRecords.unshift(newRecord);
    this.saveToLocal();

    // 如果在线，同步到云端
    if (this.isOnline && authService.isAuthenticated()) {
      try {
        const user = authService.getCurrentUser();
        if (user) {
          await this.uploadPrintRecord(newRecord, user);
        }
      } catch (error) {
        console.error('同步打印记录到云端失败:', error);
      }
    }

    this.notifyListeners();
    return newRecord;
  }

  /**
   * 更新打印记录状态
   */
  async updatePrintRecordStatus(
    id: string,
    status: PrintRecord['status'],
    additionalData?: Partial<PrintRecord>
  ): Promise<void> {
    const record = this.printRecords.find(r => r.id === id);
    if (!record) return;

    // 本地更新
    record.status = status;
    if (status === 'completed') {
      record.completeTime = new Date().toISOString();
    }
    if (additionalData) {
      Object.assign(record, additionalData);
    }

    this.saveToLocal();

    // 如果在线，同步到云端
    if (this.isOnline && authService.isAuthenticated()) {
      try {
        const user = authService.getCurrentUser();
        if (user) {
          await this.updatePrintRecordInCloud(record, user);
        }
      } catch (error) {
        console.error('更新云端打印记录失败:', error);
      }
    }

    this.notifyListeners();
  }

  /**
   * 获取同步状态
   */
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * 手动同步
   */
  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('网络连接不可用');
    }

    if (!authService.isAuthenticated()) {
      throw new Error('用户未登录');
    }

    this.updateSyncState(SYNC_STATUS.SYNCING);

    try {
      await this.syncToCloud();
      await this.syncFromCloud();
      this.updateSyncState(SYNC_STATUS.SYNCED);
    } catch (error) {
      this.updateSyncState(SYNC_STATUS.ERROR, '手动同步失败');
      throw error;
    }
  }

  /**
   * 生成打印HTML（保持原有接口）
   */
  generatePrintHTML(templateId: string, recordData: Record<string, any>): string {
    return localDataManager.generatePrintHTML(templateId, recordData);
  }

  /**
   * 导出模板数据（保持原有接口）
   */
  exportTemplate(id: string): string | null {
    return localDataManager.exportTemplate(id);
  }

  /**
   * 导入模板数据（保持原有接口）
   */
  importTemplate(templateData: any): Template | null {
    const result = localDataManager.importTemplate(templateData);
    if (result) {
      this.templates = localDataManager.getTemplates();
      this.notifyListeners();
    }
    return result;
  }

  /**
   * 获取最后保存时间
   */
  getLastSaveTime(): string | null {
    return this.syncState.lastSyncTime || this.templates.reduce((latest, template) => {
      if (!latest || new Date(template.updated_time) > new Date(latest)) {
        return template.updated_time;
      }
      return latest;
    }, this.printRecords.reduce((latest, record) => {
      if (!latest || new Date(record.createTime) > new Date(latest)) {
        return record.createTime;
      }
      return latest;
    }, null as string | null));
  }
}

// 创建全局云端数据管理器实例
export const cloudTemplateDataManager = new CloudTemplateDataManager();

export default cloudTemplateDataManager;