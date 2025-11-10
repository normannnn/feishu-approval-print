import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Input, Select, DatePicker, Tooltip, message, Checkbox } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  PrinterOutlined,
  SyncOutlined,
  FilterOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { feishuSDK } from '../services/feishu-sdk';
import { approvalService, type ApprovalRecord as ApprovalServiceRecord, type ApprovalFilter } from '../services/approvalService';
import { ApprovalRecord } from '../types';
import { formatDateTime, formatApprovalStatus, formatRelativeTime } from '../utils/formatters';
import ApprovalDetailModal from './ApprovalDetailModal';
import PrintPreviewModal from './PrintPreviewModal';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ApprovalRecordsList: React.FC = () => {
  const [records, setRecords] = useState<ApprovalServiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ApprovalServiceRecord | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [printVisible, setPrintVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [printedFilter, setPrintedFilter] = useState<boolean | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [showFilter, setShowFilter] = useState(false);

  // 构建筛选条件
  const buildFilter = (): ApprovalFilter => {
    const filter: ApprovalFilter = {};

    if (statusFilter.length > 0) {
      filter.status = statusFilter as any;
    }

    if (typeFilter.length > 0) {
      filter.type = typeFilter;
    }

    if (dateRange) {
      filter.dateRange = dateRange;
    }

    if (searchKeyword) {
      filter.applicant = searchKeyword;
    }

    if (printedFilter !== undefined) {
      filter.printed = printedFilter;
    }

    return filter;
  };

  // 加载记录数据
  const loadRecords = async () => {
    setLoading(true);
    try {
      const filter = buildFilter();
      const approvalRecords = await approvalService.getApprovalRecords(filter);
      setRecords(approvalRecords);
      setTotal(approvalRecords.length);
    } catch (error) {
      console.error('加载记录失败:', error);
      message.error('加载记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化和监听事件
  useEffect(() => {
    // 初始化SDK
    feishuSDK.init().then(() => {
      loadRecords();
    });

    // 监听记录更新
    feishuSDK.onRecordUpdate(() => {
      loadRecords();
    });

    // 监听记录选择
    feishuSDK.onRecordSelect((recordIds) => {
      if (recordIds.length > 0) {
        const record = records.find(r => r.record_id === recordIds[0]);
        if (record) {
          setSelectedRecord(record);
        }
      }
    });
  }, []);

  // 表格列定义
  const columns = [
    {
      title: '审批类型',
      dataIndex: 'approval_name',
      key: 'approval_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '申请人',
      dataIndex: 'applicant_name',
      key: 'applicant_name',
      width: 120,
    },
    {
      title: '部门',
      dataIndex: 'applicant_department',
      key: 'applicant_department',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const { text, color } = formatApprovalStatus(status);
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 150,
      render: (time: string) => (
        <Tooltip title={formatDateTime(time)}>
          {formatRelativeTime(time)}
        </Tooltip>
      ),
    },
    {
      title: '审批时间',
      dataIndex: 'approve_time',
      key: 'approve_time',
      width: 150,
      render: (time: string) => time ? (
        <Tooltip title={formatDateTime(time)}>
          {formatRelativeTime(time)}
        </Tooltip>
      ) : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (text: any, record: ApprovalRecord) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="打印审批单">
            <Button
              type="text"
              icon={<PrinterOutlined />}
              onClick={() => handlePrint(record)}
            />
          </Tooltip>
          <Tooltip title="同步数据">
            <Button
              type="text"
              icon={<SyncOutlined />}
              onClick={() => handleSync(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 查看详情
  const handleViewDetail = (record: ApprovalRecord) => {
    setSelectedRecord(record);
    setDetailVisible(true);
  };

  // 打印审批单
  const handlePrint = (record: ApprovalRecord) => {
    setSelectedRecord(record);
    setPrintVisible(true);
  };

  // 同步数据
  const handleSync = async (record: ApprovalRecord) => {
    try {
      // 这里调用后端API同步数据
      feishuSDK.showToast('同步请求已发送', 'success');
      setTimeout(() => loadRecords(), 2000);
    } catch (error) {
      feishuSDK.showToast('同步失败', 'error');
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    loadRecords();
  };

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    // 这里可以实现搜索逻辑
  };

  // 状态筛选
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    // 这里可以实现筛选逻辑
  };

  return (
    <>
      <Card
        title={
          <Space>
            <span>📋 审批记录</span>
            <Tag color="blue">{total} 条记录</Tag>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="刷新数据">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              />
            </Tooltip>
          </Space>
        }
      >
        {/* 搜索和筛选区域 */}
        <div style={{ marginBottom: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
          <Space wrap>
            <Input.Search
              placeholder="搜索审批类型、申请人..."
              allowClear
              style={{ width: 250 }}
              onSearch={handleSearch}
            />
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
              value={statusFilter}
              onChange={handleStatusFilter}
            >
              <Option value="已通过">已通过</Option>
              <Option value="已拒绝">已拒绝</Option>
              <Option value="待审批">待审批</Option>
              <Option value="已撤销">已撤销</Option>
            </Select>
            <RangePicker placeholder={['开始日期', '结束日期']} />
          </Space>
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={records}
          loading={loading}
          rowKey="record_id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 详情模态框 */}
      <ApprovalDetailModal
        visible={detailVisible}
        record={selectedRecord}
        onClose={() => setDetailVisible(false)}
        onPrint={(record) => {
          setSelectedRecord(record);
          setDetailVisible(false);
          setPrintVisible(true);
        }}
      />

      {/* 打印预览模态框 */}
      <PrintPreviewModal
        visible={printVisible}
        record={selectedRecord}
        onClose={() => setPrintVisible(false)}
      />
    </>
  );
};

export default ApprovalRecordsList;