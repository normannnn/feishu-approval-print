/**
 * 模板数据管理工具
 * 用于在组件之间共享模板数据
 */

import { Template, TemplateField } from '../components/TemplateManager';

// 数据版本控制
export const DATA_VERSION = '1.0.0';
export const STORAGE_KEYS = {
  TEMPLATES: 'approval_print_templates',
  PRINT_RECORDS: 'approval_print_records',
  DATA_VERSION: 'approval_print_data_version',
  LAST_SAVE_TIME: 'approval_print_last_save_time',
};

export interface TemplateData {
  id: string;
  name: string;
  description: string;
  page_size: string;
  orientation: string;
  fields: TemplateField[];
}

export interface PrintRecord {
  id: string;
  recordId: string;
  recordName: string;
  templateId: string;
  templateName: string;
  data: Record<string, any>;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  createTime: string;
  completeTime?: string;
  errorMessage?: string;
  pageCount?: number;
}

class TemplateDataManager {
  private templates: Template[] = [];
  private printRecords: PrintRecord[] = [];
  private listeners: Set<() => void> = new Set();
  private autoSaveEnabled: boolean = true;
  private lastSaveTime: string = '';

  constructor() {
    this.loadDataFromStorage();
    if (this.templates.length === 0) {
      this.initializeData();
    }
  }

  private initializeData() {
    // 初始化默认模板数据
    this.templates = [
      {
        id: '1',
        name: '标准审批单',
        description: '适用于各类审批的标准模板',
        is_default: true,
        created_time: '2024-01-01 10:00:00',
        updated_time: '2024-01-01 10:00:00',
        page_size: 'A4',
        orientation: 'portrait',
        fields: [
          {
            id: 'field_1',
            type: 'text',
            label: '申请人',
            fieldKey: 'applicant',
            required: true,
            width: 4,
            height: 1,
            x: 0,
            y: 0,
            fontSize: 14,
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left',
          },
          {
            id: 'field_2',
            type: 'date',
            label: '申请日期',
            fieldKey: 'apply_date',
            required: true,
            width: 3,
            height: 1,
            x: 4,
            y: 0,
            fontSize: 14,
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left',
          },
          {
            id: 'field_3',
            type: 'textarea',
            label: '申请事由',
            fieldKey: 'reason',
            required: true,
            width: 8,
            height: 3,
            x: 0,
            y: 2,
            fontSize: 14,
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left',
          },
        ],
      },
      {
        id: '2',
        name: '请假审批单',
        description: '专门用于请假审批的模板',
        is_default: false,
        created_time: '2024-01-02 10:00:00',
        updated_time: '2024-01-02 10:00:00',
        page_size: 'A4',
        orientation: 'portrait',
        fields: [
          {
            id: 'field_1',
            type: 'text',
            label: '请假人',
            fieldKey: 'name',
            required: true,
            width: 4,
            height: 1,
            x: 0,
            y: 0,
            fontSize: 14,
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left',
          },
          {
            id: 'field_2',
            type: 'select',
            label: '请假类型',
            fieldKey: 'leave_type',
            required: true,
            width: 4,
            height: 1,
            x: 4,
            y: 0,
            fontSize: 14,
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left',
            options: ['事假', '病假', '年假', '婚假', '其他'],
          },
        ],
      },
      {
        id: '3',
        name: '费用报销单',
        description: '用于费用报销审批的模板',
        is_default: false,
        created_time: '2024-01-03 10:00:00',
        updated_time: '2024-01-03 10:00:00',
        page_size: 'A4',
        orientation: 'portrait',
        fields: [
          {
            id: 'field_1',
            type: 'text',
            label: '报销人',
            fieldKey: 'applicant',
            required: true,
            width: 4,
            height: 1,
            x: 0,
            y: 0,
            fontSize: 14,
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left',
          },
          {
            id: 'field_2',
            type: 'number',
            label: '报销金额',
            fieldKey: 'amount',
            required: true,
            width: 4,
            height: 1,
            x: 4,
            y: 0,
            fontSize: 14,
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left',
          },
        ],
      },
    ];

    // 初始化打印记录数据
    this.printRecords = [
      {
        id: '1',
        recordId: 'rec001',
        recordName: '张三的请假审批',
        templateId: '2',
        templateName: '请假审批单',
        data: {
          name: '张三',
          leave_type: '事假',
          department: '技术部',
          leave_days: '3天',
          leave_time: '2024-01-01 至 2024-01-03',
          reason: '家中有急事需要处理',
        },
        status: 'completed',
        createTime: '2024-01-01 10:30:00',
        completeTime: '2024-01-01 10:31:00',
        pageCount: 2,
      },
      {
        id: '2',
        recordId: 'rec002',
        recordName: '李四的报销审批',
        templateId: '3',
        templateName: '费用报销单',
        data: {
          applicant: '李四',
          amount: '￥2,500.00',
          department: '市场部',
          expense_type: '交通费',
          reason: '客户拜访产生的交通费用',
        },
        status: 'printing',
        createTime: '2024-01-01 11:00:00',
        pageCount: 3,
      },
      {
        id: '3',
        recordId: 'rec003',
        recordName: '王五的采购审批',
        templateId: '1',
        templateName: '标准审批单',
        data: {
          applicant: '王五',
          apply_date: '2024-01-01',
          reason: '采购办公设备和用品',
          amount: '￥15,000.00',
        },
        status: 'failed',
        createTime: '2024-01-01 12:00:00',
        errorMessage: '打印机连接失败',
      },
    ];
  }

  // 订阅数据变化
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 通知所有监听器
  private notify() {
    this.listeners.forEach(listener => listener());
    // 数据变更后自动保存
    this.autoSave();
  }

  // 获取所有模板
  getTemplates(): Template[] {
    return [...this.templates];
  }

  // 根据ID获取模板
  getTemplateById(id: string): Template | undefined {
    return this.templates.find(template => template.id === id);
  }

  // 根据名称获取模板
  getTemplateByName(name: string): Template | undefined {
    return this.templates.find(template => template.name === name);
  }

  // 添加或更新模板
  saveTemplate(template: Template): void {
    const index = this.templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      this.templates[index] = { ...template, updated_time: new Date().toISOString() };
    } else {
      this.templates.push({
        ...template,
        id: template.id || Date.now().toString(),
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString(),
      });
    }
    this.notify();
  }

  // 删除模板
  deleteTemplate(id: string): boolean {
    const template = this.getTemplateById(id);
    if (template && !template.is_default) {
      this.templates = this.templates.filter(t => t.id !== id);
      this.notify();
      return true;
    }
    return false;
  }

  // 复制模板
  copyTemplate(id: string): Template | null {
    const template = this.getTemplateById(id);
    if (template) {
      const newTemplate: Template = {
        ...template,
        id: Date.now().toString(),
        name: `${template.name} - 副本`,
        is_default: false,
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString(),
      };
      this.templates.push(newTemplate);
      this.notify();
      return newTemplate;
    }
    return null;
  }

  // 获取所有打印记录
  getPrintRecords(): PrintRecord[] {
    return [...this.printRecords];
  }

  // 根据ID获取打印记录
  getPrintRecordById(id: string): PrintRecord | undefined {
    return this.printRecords.find(record => record.id === id);
  }

  // 添加打印记录
  addPrintRecord(record: Omit<PrintRecord, 'id' | 'createTime'>): PrintRecord {
    const newRecord: PrintRecord = {
      ...record,
      id: Date.now().toString(),
      createTime: new Date().toISOString(),
    };
    this.printRecords.unshift(newRecord); // 新记录添加到开头
    this.notify();
    return newRecord;
  }

  // 更新打印记录状态
  updatePrintRecordStatus(id: string, status: PrintRecord['status'], additionalData?: Partial<PrintRecord>): void {
    const record = this.printRecords.find(r => r.id === id);
    if (record) {
      record.status = status;
      if (status === 'completed') {
        record.completeTime = new Date().toISOString();
      }
      if (additionalData) {
        Object.assign(record, additionalData);
      }
      this.notify();
    }
  }

  // 删除打印记录
  deletePrintRecord(id: string): boolean {
    const index = this.printRecords.findIndex(r => r.id === id);
    if (index >= 0) {
      this.printRecords.splice(index, 1);
      this.notify();
      return true;
    }
    return false;
  }

  // 根据模板生成打印HTML
  generatePrintHTML(templateId: string, recordData: Record<string, any>): string {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return '<div>模板不存在</div>';
    }

    const { fields, page_size, orientation } = template;

    // 生成字段内容
    const fieldContents = fields.map(field => {
      const value = recordData[field.fieldKey] || '';
      const left = (field.x * 60) + 'px'; // 假设每列60px
      const top = (field.y * 30) + 'px'; // 假设每行30px
      const width = (field.width * 60) + 'px';
      const height = (field.height * 30) + 'px';

      let fieldHTML = '';

      switch (field.type) {
        case 'textarea':
          fieldHTML = `<div class="field-textarea" style="left: ${left}; top: ${top}; width: ${width}; height: ${height}; font-size: ${field.fontSize}px; color: ${field.color}; text-align: ${field.textAlign}; font-weight: ${field.fontWeight};">${value}</div>`;
          break;
        case 'signature':
          fieldHTML = `<div class="field-signature" style="left: ${left}; top: ${top}; width: ${width}; height: ${height}; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999;">${value ? `<img src="${value}" style="max-width: 100%; max-height: 100%;" />` : '签名区域'}</div>`;
          break;
        case 'select':
          fieldHTML = `<div class="field-select" style="left: ${left}; top: ${top}; width: ${width}; height: ${height}; font-size: ${field.fontSize}px; color: ${field.color}; text-align: ${field.textAlign}; font-weight: ${field.fontWeight};">${value}</div>`;
          break;
        default:
          fieldHTML = `<div class="field-text" style="left: ${left}; top: ${top}; width: ${width}; height: ${height}; font-size: ${field.fontSize}px; color: ${field.color}; text-align: ${field.textAlign}; font-weight: ${field.fontWeight};">${value}</div>`;
      }

      return `
        <div class="field-wrapper" style="position: absolute;">
          <div class="field-label" style="position: absolute; left: ${left}; top: ${top}; font-size: 12px; color: #666; margin-bottom: 4px;">${field.label}${field.required ? '*' : ''}</div>
          ${fieldHTML}
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${template.name}</title>
          <style>
            @page {
              size: ${page_size} ${orientation};
              margin: 20mm;
            }
            body {
              font-family: SimSun, "Microsoft YaHei", Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              position: relative;
            }
            .template-container {
              position: relative;
              width: 100%;
              min-height: ${orientation === 'landscape' ? '210mm' : '297mm'};
            }
            .template-title {
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 30px;
              color: #000;
            }
            .field-wrapper {
              position: absolute;
            }
            .field-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 4px;
            }
            .field-text, .field-select, .field-textarea {
              position: absolute;
              border-bottom: 1px solid #000;
              padding: 2px 4px;
              background: transparent;
            }
            .field-signature {
              position: absolute;
              border: 1px dashed #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #999;
            }
            @media print {
              .field-text, .field-select, .field-textarea {
                border-bottom: 1px solid #000;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .field-signature {
                border: 1px solid #000;
              }
            }
          </style>
        </head>
        <body>
          <div class="template-container">
            <h1 class="template-title">${template.name}</h1>
            ${fieldContents}
          </div>
        </body>
      </html>
    `;
  }

  // 导出模板数据
  exportTemplate(id: string): string | null {
    const template = this.getTemplateById(id);
    if (template) {
      return JSON.stringify({
        name: template.name,
        description: template.description,
        page_size: template.page_size,
        orientation: template.orientation,
        fields: template.fields,
        export_time: new Date().toISOString(),
      }, null, 2);
    }
    return null;
  }

  // 导入模板数据
  importTemplate(templateData: any): Template | null {
    try {
      const newTemplate: Template = {
        id: Date.now().toString(),
        name: templateData.name || '导入的模板',
        description: templateData.description || '从文件导入的模板',
        is_default: false,
        created_time: new Date().toISOString(),
        updated_time: new Date().toISOString(),
        page_size: templateData.page_size || 'A4',
        orientation: templateData.orientation || 'portrait',
        fields: templateData.fields || [],
      };
      this.templates.push(newTemplate);
      this.notify();
      this.saveDataToStorage(); // 自动保存
      return newTemplate;
    } catch (error) {
      console.error('模板导入失败:', error);
      return null;
    }
  }

  // ==================== 数据持久化方法 ====================

  /**
   * 从localStorage加载数据
   */
  private loadDataFromStorage(): void {
    try {
      // 检查数据版本
      const storedVersion = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
      if (storedVersion && storedVersion !== DATA_VERSION) {
        this.handleDataVersionUpgrade(storedVersion, DATA_VERSION);
      }

      // 加载模板数据
      const templatesData = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (templatesData) {
        this.templates = JSON.parse(templatesData);
      }

      // 加载打印记录数据
      const printRecordsData = localStorage.getItem(STORAGE_KEYS.PRINT_RECORDS);
      if (printRecordsData) {
        this.printRecords = JSON.parse(printRecordsData);
      }

      // 加载最后保存时间
      this.lastSaveTime = localStorage.getItem(STORAGE_KEYS.LAST_SAVE_TIME) || '';

      console.log(`成功从localStorage加载 ${this.templates.length} 个模板和 ${this.printRecords.length} 条打印记录`);
    } catch (error) {
      console.error('从localStorage加载数据失败:', error);
      // 加载失败时使用默认数据
    }
  }

  /**
   * 保存数据到localStorage
   */
  private saveDataToStorage(): void {
    try {
      // 保存模板数据
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(this.templates));

      // 保存打印记录数据
      localStorage.setItem(STORAGE_KEYS.PRINT_RECORDS, JSON.stringify(this.printRecords));

      // 保存数据版本
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, DATA_VERSION);

      // 更新最后保存时间
      this.lastSaveTime = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LAST_SAVE_TIME, this.lastSaveTime);

      console.log('数据已保存到localStorage');
    } catch (error) {
      console.error('保存数据到localStorage失败:', error);
      // 可能是存储空间不足
      this.handleStorageError(error);
    }
  }

  /**
   * 处理数据版本升级
   */
  private handleDataVersionUpgrade(oldVersion: string, newVersion: string): void {
    console.log(`数据版本从 ${oldVersion} 升级到 ${newVersion}`);
    // 这里可以添加数据迁移逻辑
    // 目前版本相同，无需处理
  }

  /**
   * 处理存储错误
   */
  private handleStorageError(error: any): void {
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage存储空间不足，请清理数据或使用其他存储方式');
      // 可以在这里实现数据清理逻辑或提示用户
    } else {
      console.error('存储过程中发生未知错误:', error);
    }
  }

  /**
   * 自动保存数据
   */
  private autoSave(): void {
    if (this.autoSaveEnabled) {
      // 使用防抖机制，避免频繁保存
      setTimeout(() => {
        this.saveDataToStorage();
      }, 500);
    }
  }

  /**
   * 手动保存数据
   */
  saveNow(): boolean {
    try {
      this.saveDataToStorage();
      return true;
    } catch (error) {
      console.error('手动保存失败:', error);
      return false;
    }
  }

  /**
   * 获取最后保存时间
   */
  getLastSaveTime(): string {
    return this.lastSaveTime;
  }

  /**
   * 设置自动保存开关
   */
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    if (enabled) {
      this.autoSave();
    }
  }

  /**
   * 获取自动保存状态
   */
  isAutoSaveEnabled(): boolean {
    return this.autoSaveEnabled;
  }

  /**
   * 清除所有存储数据
   */
  clearStorage(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      this.lastSaveTime = '';
      console.log('已清除所有localStorage数据');
    } catch (error) {
      console.error('清除存储数据失败:', error);
    }
  }

  /**
   * 导出所有数据
   */
  exportAllData(): { version: string; templates: Template[]; printRecords: PrintRecord[]; exportTime: string } {
    return {
      version: DATA_VERSION,
      templates: this.templates,
      printRecords: this.printRecords,
      exportTime: new Date().toISOString(),
    };
  }

  /**
   * 导入所有数据
   */
  importAllData(data: { version: string; templates: Template[]; printRecords: PrintRecord[] }, mode: 'overwrite' | 'merge' = 'merge'): void {
    try {
      if (mode === 'overwrite') {
        this.templates = data.templates || [];
        this.printRecords = data.printRecords || [];
      } else {
        // 合并模式：保留现有数据，添加新数据
        if (data.templates) {
          data.templates.forEach(template => {
            const existingIndex = this.templates.findIndex(t => t.id === template.id);
            if (existingIndex >= 0) {
              this.templates[existingIndex] = template;
            } else {
              this.templates.push(template);
            }
          });
        }
        if (data.printRecords) {
          this.printRecords = [...this.printRecords, ...data.printRecords];
        }
      }

      this.notify();
      this.saveDataToStorage();
      console.log(`数据导入成功，导入模式: ${mode}`);
    } catch (error) {
      console.error('数据导入失败:', error);
      throw error;
    }
  }
}

// 创建全局单例实例
export const templateDataManager = new TemplateDataManager();

export default templateDataManager;