import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  DatePicker,
  Select,
  Space,
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { feishuSDK } from '../services/feishu-sdk';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface StatisticsData {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
}

const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<StatisticsData>({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
  });

  const [dateRange, setDateRange] = useState<[any, any]>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // 模拟数据
  const mockStatistics = {
    total: 156,
    approved: 120,
    rejected: 18,
    pending: 18,
    todayCount: 8,
    weekCount: 24,
    monthCount: 89,
  };

  // 加载统计数据
  const loadStatistics = async () => {
    setLoading(true);
    try {
      // 这里应该调用后端API获取统计数据
      // 暂时使用模拟数据
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatistics(mockStatistics);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  // 计算百分比
  const approvalRate = statistics.total > 0
    ? Math.round((statistics.approved / statistics.total) * 100)
    : 0;

  const rejectionRate = statistics.total > 0
    ? Math.round((statistics.rejected / statistics.total) * 100)
    : 0;

  const pendingRate = statistics.total > 0
    ? Math.round((statistics.pending / statistics.total) * 100)
    : 0;

  // 模拟审批记录数据
  const approvalRecords = [
    {
      id: '1',
      type: '请假审批',
      applicant: '张三',
      status: '已通过',
      createTime: '2024-01-15 10:30:00',
      approveTime: '2024-01-15 15:45:00',
      duration: '5小时15分钟',
    },
    {
      id: '2',
      type: '费用报销',
      applicant: '李四',
      status: '待审批',
      createTime: '2024-01-16 09:15:00',
      duration: '已等待2天',
    },
    {
      id: '3',
      type: '采购审批',
      applicant: '王五',
      status: '已拒绝',
      createTime: '2024-01-14 14:20:00',
      approveTime: '2024-01-15 09:30:00',
      duration: '19小时10分钟',
    },
  ];

  const recordColumns = [
    {
      title: '审批类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '申请人',
      dataIndex: 'applicant',
      key: 'applicant',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          '已通过': { color: 'success', icon: <CheckCircleOutlined /> },
          '已拒绝': { color: 'error', icon: <CloseCircleOutlined /> },
          '待审批': { color: 'warning', icon: <ClockCircleOutlined /> },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['待审批'];
        return (
          <Tag color={config.color} icon={config.icon}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '审批时长',
      dataIndex: 'duration',
      key: 'duration',
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总审批数"
              value={statistics.total}
              prefix={<FileTextOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已通过"
              value={statistics.approved}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待审批"
              value={statistics.pending}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已拒绝"
              value={statistics.rejected}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* 趋势统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card title="今日统计" loading={loading}>
            <Statistic
              title="新增审批"
              value={statistics.todayCount}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="本周统计" loading={loading}>
            <Statistic
              title="新增审批"
              value={statistics.weekCount}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="本月统计" loading={loading}>
            <Statistic
              title="新增审批"
              value={statistics.monthCount}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 审批通过率 */}
        <Col xs={24} md={12}>
          <Card
            title={<><BarChartOutlined /> 审批通过率</>}
            loading={loading}
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Progress
                type="circle"
                percent={approvalRate}
                size={120}
                format={(percent) => `${percent}%`}
                strokeColor="#52c41a"
              />
              <div style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#52c41a', fontSize: 24, fontWeight: 'bold' }}>
                        {statistics.approved}
                      </div>
                      <div style={{ color: '#8c8c8c' }}>已通过</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#faad14', fontSize: 24, fontWeight: 'bold' }}>
                        {statistics.pending}
                      </div>
                      <div style={{ color: '#8c8c8c' }}>待审批</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#ff4d4f', fontSize: 24, fontWeight: 'bold' }}>
                        {statistics.rejected}
                      </div>
                      <div style={{ color: '#8c8c8c' }}>已拒绝</div>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </Card>
        </Col>

        {/* 筛选控件 */}
        <Col xs={24} md={12}>
          <Card
            title={<><PieChartOutlined /> 审批记录分析</>}
            extra={
              <Space>
                <Select
                  value={filterType}
                  onChange={setFilterType}
                  style={{ width: 120 }}
                >
                  <Option value="all">全部</Option>
                  <Option value="approved">已通过</Option>
                  <Option value="rejected">已拒绝</Option>
                  <Option value="pending">待审批</Option>
                </Select>
                <RangePicker />
              </Space>
            }
            loading={loading}
          >
            <Table
              dataSource={approvalRecords}
              columns={recordColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Statistics;