/**
 * 飞书多维表格SDK封装
 * 基于官方@lark/base-open-platform-sdk
 */

import { BitableContext, BitableRecord, BitableField, BitableView, AppConfig } from '../types';

class FeishuBitableSDK {
  private context: BitableContext | null = null;
  private bitable: any = null;

  constructor() {
    this.init();
  }

  /**
   * 初始化SDK
   */
  async init() {
    try {
      // 检查是否在飞书环境
      const isFeishuEnv = window.location.href.includes('feishu.cn') ||
                         window.location.href.includes('larksuite.com') ||
                         window.location.href.includes('fs.huidu.cn'); // 飞书内部域名

      if (isFeishuEnv) {
        console.log('检测到飞书环境，尝试初始化飞书SDK...');

        // 检查是否有配置的应用凭证
        const savedConfig = localStorage.getItem('feishu_app_config');
        let appConfig = null;

        if (savedConfig) {
          try {
            appConfig = JSON.parse(savedConfig);
          } catch (error) {
            console.warn('解析配置失败:', error);
          }
        }

        // 检查环境变量中的配置
        if (!appConfig) {
          // 使用更安全的方式访问环境变量
          const envAppId = (window as any).__ENV__?.VITE_APP_ID || '';
          const envAppSecret = (window as any).__ENV__?.VITE_APP_SECRET || '';

          if (envAppId && envAppSecret) {
            appConfig = {
              appId: envAppId,
              appSecret: envAppSecret,
              redirectUri: 'http://localhost:3002'
            };
          }
        }

        if (!appConfig || !appConfig.appId || !appConfig.appSecret) {
          // 本地开发时提供模拟配置
          const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          if (isDevelopment) {
            console.log('本地开发环境：使用模拟配置');
            this.context = {
              appId: 'dev_mock_app_id',
              tableId: 'dev_mock_table_id',
              viewId: 'dev_mock_view_id',
              userId: 'dev_mock_user_id',
              tenantKey: 'dev_mock_tenant_key',
              appConfig: {
                appId: appConfig?.appId || 'dev_mock_app_id',
                appSecret: appConfig?.appSecret || 'dev_mock_app_secret',
                redirectUri: 'http://localhost:3002'
              }
            };
            return;
          } else {
            console.error('未找到有效的应用配置，请在应用配置页面设置App ID和App Secret');
            this.context = null;
            return;
          }
        }

        // 仅在飞书环境中动态导入SDK，使用eval避免webpack编译时解析
        try {
          const sdkModule = eval('require("@lark/base-open-platform-sdk")');
          this.bitable = sdkModule.bitable;

          // 获取上下文信息
          this.context = await this.bitable.base.getContext();

          // 将配置信息添加到上下文中
          this.context.appConfig = appConfig;

          console.log('飞书SDK初始化成功:', this.context);
          console.log('应用配置:', appConfig);
        } catch (sdkError) {
          console.error('飞书SDK加载失败，请确保在飞书环境中运行:', sdkError);
          this.context = null;
        }
      } else {
        // 非飞书环境 - 提示用户需要在飞书环境中使用
        console.warn('当前不在飞书环境中，请在飞书多维表格中使用此应用');
        this.context = null;
      }
    } catch (error) {
      console.error('SDK初始化失败:', error);
      this.context = null;
    }
  }

  /**
   * 获取上下文
   */
  getContext(): BitableContext | null {
    return this.context;
  }

  /**
   * 获取表格ID
   */
  getTableId(): string | null {
    return this.context?.tableId || null;
  }

  /**
   * 获取视图ID
   */
  getViewId(): string | null {
    return this.context?.viewId || null;
  }

  /**
   * 获取记录列表
   */
  async getRecords(options: {
    viewId?: string;
    pageSize?: number;
    pageToken?: string;
    sort?: string;
    filter?: string;
  } = {}): Promise<{ records: BitableRecord[]; hasMore: boolean; pageToken?: string }> {
    // 本地开发时返回模拟数据
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
      return this.getDevMockRecords();
    }

    const tableId = this.getTableId();
    if (!tableId) {
      throw new Error('表格ID未获取到，请确保在飞书多维表格中使用此应用');
    }

    if (!this.bitable) {
      throw new Error('飞书SDK未初始化，请检查应用配置');
    }

    const params = {
      view_id: options.viewId || this.getViewId(),
      page_size: options.pageSize || 20,
      page_token: options.pageToken,
      sort: options.sort,
      filter: options.filter,
    };

    try {
      const response = await this.bitable.table.getRecords(tableId, params);
      return {
        records: response.records || [],
        hasMore: response.has_more || false,
        pageToken: response.page_token,
      };
    } catch (error) {
      console.error('获取记录失败:', error);
      throw new Error(`获取记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取记录详情
   */
  async getRecord(recordId: string): Promise<BitableRecord | null> {
    // 本地开发时返回模拟数据
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
      return this.getDevMockRecord(recordId);
    }

    const tableId = this.getTableId();
    if (!tableId) {
      throw new Error('表格ID未获取到，请确保在飞书多维表格中使用此应用');
    }

    if (!this.bitable) {
      throw new Error('飞书SDK未初始化，请检查应用配置');
    }

    try {
      const response = await this.bitable.table.getRecord(tableId, recordId);
      return response.record || null;
    } catch (error) {
      console.error('获取记录详情失败:', error);
      throw new Error(`获取记录详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新记录
   */
  async updateRecord(recordId: string, fields: Record<string, any>): Promise<boolean> {
    try {
      const tableId = this.getTableId();
      if (!tableId) {
        throw new Error('表格ID未获取到');
      }

      await this.bitable.table.setRecord(tableId, recordId, fields);
      return true;
    } catch (error) {
      console.error('更新记录失败:', error);
      return false;
    }
  }

  /**
   * 创建记录
   */
  async createRecord(fields: Record<string, any>): Promise<string | null> {
    try {
      const tableId = this.getTableId();
      if (!tableId) {
        throw new Error('表格ID未获取到');
      }

      const response = await this.bitable.table.addRecord(tableId, fields);
      return response.record?.record_id || null;
    } catch (error) {
      console.error('创建记录失败:', error);
      return null;
    }
  }

  /**
   * 获取字段信息
   */
  async getFields(): Promise<BitableField[]> {
    // 本地开发时返回模拟数据
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
      return this.getDevMockFields();
    }

    const tableId = this.getTableId();
    if (!tableId) {
      throw new Error('表格ID未获取到，请确保在飞书多维表格中使用此应用');
    }

    if (!this.bitable) {
      throw new Error('飞书SDK未初始化，请检查应用配置');
    }

    try {
      const response = await this.bitable.table.getFields(tableId);
      return response.fields || [];
    } catch (error) {
      console.error('获取字段信息失败:', error);
      throw new Error(`获取字段信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取视图信息
   */
  async getViews(): Promise<BitableView[]> {
    // 本地开发时返回模拟数据
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
      return this.getDevMockViews();
    }

    const tableId = this.getTableId();
    if (!tableId) {
      throw new Error('表格ID未获取到，请确保在飞书多维表格中使用此应用');
    }

    if (!this.bitable) {
      throw new Error('飞书SDK未初始化，请检查应用配置');
    }

    try {
      const response = await this.bitable.table.getViews(tableId);
      return response.views || [];
    } catch (error) {
      console.error('获取视图信息失败:', error);
      throw new Error(`获取视图信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 显示提示信息
   */
  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    try {
      if (this.bitable?.ui) {
        this.bitable.ui.showToast({
          message,
          type,
        });
      } else {
        // 降级方案
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    } catch (error) {
      console.error('显示提示失败:', error);
    }
  }

  /**
   * 显示确认对话框
   */
  async showConfirm(options: {
    title: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    try {
      if (this.bitable?.ui) {
        const result = await this.bitable.ui.showConfirmDialog(options);
        return result.confirm;
      } else {
        // 降级方案
        return window.confirm(`${options.title}\n${options.content}`);
      }
    } catch (error) {
      console.error('显示确认对话框失败:', error);
      return false;
    }
  }

  /**
   * 显示打印预览
   */
  async showPrintPreview(options: {
    content: string;
    title?: string;
  }): Promise<void> {
    try {
      if (this.bitable?.ui) {
        await this.bitable.ui.showPrintPreview(options);
      } else {
        // 降级方案
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(options.content);
          printWindow.document.close();
          printWindow.print();
        }
      }
    } catch (error) {
      console.error('显示打印预览失败:', error);
    }
  }

  /**
   * 监听记录选择事件
   */
  onRecordSelect(callback: (recordIds: string[]) => void) {
    try {
      if (this.bitable?.on) {
        this.bitable.on('table-record-selected', (event: any) => {
          callback(event.data?.selectedRecordIds || []);
        });
      }
    } catch (error) {
      console.error('监听记录选择事件失败:', error);
    }
  }

  /**
   * 监听记录更新事件
   */
  onRecordUpdate(callback: (event: any) => void) {
    try {
      if (this.bitable?.on) {
        this.bitable.on('table-record-updated', callback);
      }
    } catch (error) {
      console.error('监听记录更新事件失败:', error);
    }
  }

  // 开发环境下的模拟数据方法
  private getDevMockRecords() {
    const mockRecords: BitableRecord[] = [
      {
        record_id: 'dev_rec001',
        fields: {
          '审批实例ID': 'dev_instance_001',
          '审批类型': '请假审批',
          '申请人': '开发测试员',
          '申请部门': '技术开发部',
          '审批状态': '已通过',
          '申请时间': '2024-11-09 10:30:00',
          '审批时间': '2024-11-09 15:45:00',
          '审批人': '张经理',
          '申请天数': '2天',
          '请假事由': '家庭事务'
        },
        created_time: Date.now() - 86400000,
        last_modified_time: Date.now() - 3600000,
      },
      {
        record_id: 'dev_rec002',
        fields: {
          '审批实例ID': 'dev_instance_002',
          '审批类型': '报销审批',
          '申请人': '产品经理',
          '申请部门': '产品设计部',
          '审批状态': '待审批',
          '申请时间': '2024-11-09 09:15:00',
          '报销金额': '￥1,500.00',
          '报销类型': '差旅费',
          '报销事由': '客户拜访交通费用'
        },
        created_time: Date.now() - 172800000,
        last_modified_time: Date.now() - 7200000,
      },
      {
        record_id: 'dev_rec003',
        fields: {
          '审批实例ID': 'dev_instance_003',
          '审批类型': '采购审批',
          '申请人': '运维工程师',
          '申请部门': '技术运维部',
          '审批状态': '已拒绝',
          '申请时间': '2024-11-08 14:20:00',
          '审批时间': '2024-11-09 11:00:00',
          '采购物品': '服务器硬盘',
          '采购金额': '￥3,200.00',
          '拒绝原因': '预算超支，需要重新申请'
        },
        created_time: Date.now() - 259200000,
        last_modified_time: Date.now() - 10800000,
      }
    ];

    console.log('🚀 本地开发模式：返回模拟审批记录', mockRecords.length, '条');
    return { records: mockRecords, hasMore: false };
  }

  private getDevMockRecord(recordId: string): BitableRecord | null {
    const mockData = this.getDevMockRecords();
    return mockData.records.find(r => r.record_id === recordId) || null;
  }

  private getDevMockFields(): BitableField[] {
    return [
      { field_id: 'dev_field1', field_name: '审批实例ID', type: 'text', property: {} },
      { field_id: 'dev_field2', field_name: '审批类型', type: 'select', property: {} },
      { field_id: 'dev_field3', field_name: '申请人', type: 'text', property: {} },
      { field_id: 'dev_field4', field_name: '申请部门', type: 'text', property: {} },
      { field_id: 'dev_field5', field_name: '审批状态', type: 'select', property: {} },
      { field_id: 'dev_field6', field_name: '申请时间', type: 'datetime', property: {} },
      { field_id: 'dev_field7', field_name: '审批时间', type: 'datetime', property: {} },
      { field_id: 'dev_field8', field_name: '审批人', type: 'text', property: {} },
    ];
  }

  private getDevMockViews(): BitableView[] {
    return [
      { view_id: 'dev_view1', view_name: '所有记录', type: 'grid' },
      { view_id: 'dev_view2', view_name: '待审批', type: 'grid' },
      { view_id: 'dev_view3', view_name: '已通过', type: 'grid' },
      { view_id: 'dev_view4', view_name: '已拒绝', type: 'grid' },
    ];
  }

  // 注意：本地开发环境使用模拟数据，生产环境使用真实的飞书API
}

// 创建单例实例
export const feishuSDK = new FeishuBitableSDK();
export default feishuSDK;