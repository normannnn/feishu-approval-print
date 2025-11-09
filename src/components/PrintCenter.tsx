import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Modal,
  message,
  Divider,
  Statistic,
} from 'antd';
import {
  PrinterOutlined,
  FileTextOutlined,
  SettingOutlined,
  HistoryOutlined,
} from '@ant-design/icons';

const { Option } = Select;

interface PrintJob {
  id: string;
  recordId: string;
  recordName: string;
  templateName: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  createTime: string;
  completeTime?: string;
}

const PrintCenter: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('1');
  const [printHistory, setPrintHistory] = useState<PrintJob[]>([
    {
      id: '1',
      recordId: 'rec001',
      recordName: '张三的请假审批',
      templateName: '标准审批单',
      status: 'completed',
      createTime: '2024-01-01 10:30:00',
      completeTime: '2024-01-01 10:31:00',
    },
    {
      id: '2',
      recordId: 'rec002',
      recordName: '李四的报销审批',
      templateName: '费用报销单',
      status: 'printing',
      createTime: '2024-01-01 11:00:00',
    },
    {
      id: '3',
      recordId: 'rec003',
      recordName: '王五的采购审批',
      templateName: '采购审批单',
      status: 'failed',
      createTime: '2024-01-01 12:00:00',
    },
  ]);

  const templates = [
    { id: '1', name: '标准审批单' },
    { id: '2', name: '请假审批单' },
    { id: '3', name: '费用报销单' },
    { id: '4', name: '采购审批单' },
  ];

  const statusMap = {
    pending: { text: '待打印', color: 'orange' },
    printing: { text: '打印中', color: 'blue' },
    completed: { text: '已完成', color: 'green' },
    failed: { text: '失败', color: 'red' },
  };

  const handleBatchPrint = () => {
    message.info('批量打印功能开发中...');
  };

  const handlePrintSettings = () => {
    message.info('打印设置功能开发中...');
  };

  const columns = [
    {
      title: '记录名称',
      dataIndex: 'recordName',
      key: 'recordName',
    },
    {
      title: '使用模板',
      dataIndex: 'templateName',
      key: 'templateName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = statusMap[status as keyof typeof statusMap];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '打印时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '完成时间',
      dataIndex: 'completeTime',
      key: 'completeTime',
      render: (time: string) => time || '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (text: any, record: PrintJob) => (
        <Space size="small">
          {record.status === 'completed' && (
            <Button type="text" size="small">
              重新打印
            </Button>
          )}
          {record.status === 'failed' && (
            <Button type="text" size="small">
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 快速操作区 */}
      <Card title="🖨️ 打印中心" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <div>
              <div style={{ marginBottom: 8, color: '#666' }}>选择模板</div>
              <Select
                value={selectedTemplate}
                onChange={setSelectedTemplate}
                style={{ width: '100%' }}
                placeholder="选择打印模板"
              >
                {templates.map(template => (
                  <Option key={template.id} value={template.id}>
                    {template.name}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col span={12}>
            <div>
              <div style={{ marginBottom: 8, color: '#666' }}>快速操作</div>
              <Space>
                <Button type="primary" icon={<PrinterOutlined />}>
                  打印选中记录
                </Button>
                <Button icon={<FileTextOutlined />} onClick={handleBatchPrint}>
                  批量打印
                </Button>
                <Button icon={<SettingOutlined />} onClick={handlePrintSettings}>
                  打印设置
                </Button>
              </Space>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: 8, color: '#666' }}>统计信息</div>
              <Space>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                    {printHistory.length}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>总打印数</div>
                </div>
                <Divider type="vertical" />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>
                    {printHistory.filter(job => job.status === 'completed').length}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>成功数</div>
                </div>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 打印历史 */}
      <Card title={<><HistoryOutlined /> 打印历史</>}>
        <Table
          columns={columns}
          dataSource={printHistory}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default PrintCenter;