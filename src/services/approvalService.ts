/**
 * 审批业务服务
 * 处理审批记录的核心业务逻辑
 */

import { feishuSDK } from './feishu-sdk';
import { cloudTemplateDataManager } from '../utils/cloudTemplateDataManager';

export interface ApprovalRecord {
  id: string;
  instanceId: string;
  type: string;
  applicant: string;
  department: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  applyTime: string;
  approveTime?: string;
  approver?: string;
  data: Record<string, any>;
  templateId?: string;
  printed: boolean;
  printTime?: string;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processing: number;
  printed: number;
}

export interface ApprovalFilter {
  status?: ApprovalRecord['status'][];
  type?: string[];
  dateRange?: [string, string];
  applicant?: string;
  printed?: boolean;
}

class ApprovalService {
  private cache: Map<string, ApprovalRecord[]> = new Map();
  private lastSyncTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取审批记录列表
   */
  async getApprovalRecords(filter?: ApprovalFilter): Promise<ApprovalRecord[]> {
    try {
      console.log('🔍 获取审批记录，筛选条件:', filter);

      // 从飞书获取数据
      const response = await feishuSDK.getRecords({
        recordType: 'approval',
        pageSize: 100
      });

      // 转换数据格式
      let records = response.records.map(this.transformFeishuRecord);

      // 应用筛选条件
      if (filter) {
        records = this.applyFilter(records, filter);
      }

      // 按时间倒序排列
      records.sort((a, b) => new Date(b.applyTime).getTime() - new Date(a.applyTime).getTime());

      // 更新缓存
      this.updateCache(records);

      console.log(`✅ 获取到 ${records.length} 条审批记录`);
      return records;
    } catch (error) {
      console.error('获取审批记录失败:', error);
      throw new Error(`获取审批记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取审批统计信息
   */
  async getApprovalStats(filter?: ApprovalFilter): Promise<ApprovalStats> {
    const records = await this.getApprovalRecords(filter);

    const stats: ApprovalStats = {
      total: records.length,
      pending: records.filter(r => r.status === 'pending').length,
      approved: records.filter(r => r.status === 'approved').length,
      rejected: records.filter(r => r.status === 'rejected').length,
      processing: records.filter(r => r.status === 'processing').length,
      printed: records.filter(r => r.printed).length,
    };

    console.log('📊 审批统计:', stats);
    return stats;
  }

  /**
   * 获取单个审批记录详情
   */
  async getApprovalRecord(id: string): Promise<ApprovalRecord | null> {
    try {
      const feishuRecord = await feishuSDK.getRecord(id);
      if (!feishuRecord) return null;

      return this.transformFeishuRecord(feishuRecord);
    } catch (error) {
      console.error('获取审批记录详情失败:', error);
      return null;
    }
  }

  /**
   * 标记记录为已打印
   */
  async markAsPrinted(id: string, templateId: string): Promise<void> {
    try {
      console.log(`🖨️ 标记审批记录 ${id} 为已打印，使用模板 ${templateId}`);

      // 更新飞书记录
      await feishuSDK.updateRecord(id, {
        '打印状态': '已打印',
        '打印时间': new Date().toLocaleString(),
        '使用模板': templateId
      });

      // 更新本地状态
      const cachedRecords = this.cache.get('all') || [];
      const record = cachedRecords.find(r => r.id === id);
      if (record) {
        record.printed = true;
        record.printTime = new Date().toISOString();
        record.templateId = templateId;
      }

      // 添加到打印记录管理器
      await cloudTemplateDataManager.addPrintRecord({
        recordId: id,
        recordName: `${record?.type} - ${record?.applicant}`,
        templateId,
        data: record?.data || {},
        status: 'completed',
        pageCount: 1,
        errorMessage: undefined
      });

      console.log('✅ 标记打印状态成功');
    } catch (error) {
      console.error('标记打印状态失败:', error);
      throw new Error(`标记打印状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量标记为已打印
   */
  async batchMarkAsPrinted(ids: string[], templateId: string): Promise<void> {
    console.log(`🖨️ 批量标记 ${ids.length} 条记录为已打印`);

    const results = await Promise.allSettled(
      ids.map(id => this.markAsPrinted(id, templateId))
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`⚠️ ${failed} 条记录标记失败`);
    }

    console.log(`✅ 批量标记完成，成功 ${ids.length - failed} 条`);
  }

  /**
   * 转换飞书记录为审批记录格式
   */
  private transformFeishuRecord(feishuRecord: any): ApprovalRecord {
    return {
      id: feishuRecord.record_id,
      instanceId: feishuRecord.fields['审批实例ID'] || feishuRecord.record_id,
      type: feishuRecord.fields['审批类型'] || '其他审批',
      applicant: feishuRecord.fields['申请人'] || '未知用户',
      department: feishuRecord.fields['申请部门'] || '未知部门',
      status: this.mapStatus(feishuRecord.fields['审批状态']),
      applyTime: this.parseTime(feishuRecord.fields['申请时间']),
      approveTime: this.parseTime(feishuRecord.fields['审批时间']),
      approver: feishuRecord.fields['审批人'],
      data: {
        ...feishuRecord.fields,
        // 保留原始字段映射
        originalFields: feishuRecord.fields
      },
      templateId: feishuRecord.fields['使用模板'],
      printed: feishuRecord.fields['打印状态'] === '已打印',
      printTime: this.parseTime(feishuRecord.fields['打印时间'])
    };
  }

  /**
   * 映射审批状态
   */
  private mapStatus(status: string): ApprovalRecord['status'] {
    const statusMap: Record<string, ApprovalRecord['status']> = {
      '待审批': 'pending',
      '已通过': 'approved',
      '已拒绝': 'rejected',
      '审批中': 'processing',
      '已提交': 'pending',
      '已完成': 'approved'
    };

    return statusMap[status] || 'pending';
  }

  /**
   * 解析时间
   */
  private parseTime(timeStr: any): string {
    if (!timeStr) return '';
    if (typeof timeStr === 'number') return new Date(timeStr).toISOString();
    return String(timeStr);
  }

  /**
   * 应用筛选条件
   */
  private applyFilter(records: ApprovalRecord[], filter: ApprovalFilter): ApprovalRecord[] {
    return records.filter(record => {
      // 状态筛选
      if (filter.status && filter.status.length > 0) {
        if (!filter.status.includes(record.status)) return false;
      }

      // 类型筛选
      if (filter.type && filter.type.length > 0) {
        if (!filter.type.includes(record.type)) return false;
      }

      // 时间范围筛选
      if (filter.dateRange) {
        const [startDate, endDate] = filter.dateRange;
        const recordTime = new Date(record.applyTime).getTime();
        if (recordTime < new Date(startDate).getTime() ||
            recordTime > new Date(endDate).getTime()) {
          return false;
        }
      }

      // 申请人筛选
      if (filter.applicant) {
        if (!record.applicant.includes(filter.applicant)) return false;
      }

      // 打印状态筛选
      if (filter.printed !== undefined) {
        if (record.printed !== filter.printed) return false;
      }

      return true;
    });
  }

  /**
   * 更新缓存
   */
  private updateCache(records: ApprovalRecord[]): void {
    this.cache.set('all', records);
    this.lastSyncTime = Date.now();
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastSyncTime < this.CACHE_DURATION;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.lastSyncTime = 0;
  }

  /**
   * 导出审批记录
   */
  async exportApprovalRecords(filter?: ApprovalFilter): Promise<string> {
    const records = await this.getApprovalRecords(filter);

    const exportData = {
      exportTime: new Date().toISOString(),
      filter: filter || {},
      records: records.map(record => ({
        id: record.id,
        instanceId: record.instanceId,
        type: record.type,
        applicant: record.applicant,
        department: record.department,
        status: record.status,
        applyTime: record.applyTime,
        approveTime: record.approveTime,
        approver: record.approver,
        printed: record.printed,
        printTime: record.printTime
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// 创建全局实例
export const approvalService = new ApprovalService();
export default approvalService;