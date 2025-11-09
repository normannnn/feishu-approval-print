import React, { useState } from 'react';
import {
  Modal,
  Descriptions,
  Tag,
  Timeline,
  Button,
  Space,
  Collapse,
  List,
  Avatar,
  Spin,
  Alert,
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { ApprovalRecord, ApprovalDetail } from '../types';
import { formatDateTime, formatApprovalAction } from '../utils/formatters';
import { feishuSDK } from '../services/feishu-sdk';

const { Panel } = Collapse;

interface ApprovalDetailModalProps {
  visible: boolean;
  record: ApprovalRecord | null;
  onClose: () => void;
  onPrint?: (record: ApprovalRecord) => void;
}

const ApprovalDetailModal: React.FC<ApprovalDetailModalProps> = ({
  visible,
  record,
  onClose,
  onPrint,
}) => {
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<string[]>(['1', '2', '3']);

  // 模拟获取审批详情
  const fetchDetail = async () => {
    if (!record) return;

    setLoading(true);
    try {
      // 这里应该调用后端API获取详情
      // 暂时使用模拟数据
      const mockDetail: ApprovalDetail = {
        instance_id: record.instance_id || 'mock_instance_id',
        approval_name: record.approval_name,
        approval_code: record.approval_code || 'LEAVE_REQUEST',
        status: record.status,
        applicant: {
          id: 'user_001',
          name: record.applicant_name,
          department: record.applicant_department || '技术部',
          email: 'zhangsan@example.com',
        },
        create_time: record.create_time,
        approve_time: record.approve_time,
        nodes: [
          {
            node_id: 'node_001',
            node_name: '直属上级审批',
            node_type: 'ROUTE',
            approvers: [
              {
                id: 'approver_001',
                user_id: 'user_002',
                name: '王经理',
                action: 'APPROVE',
                comment: '同意申请，做好工作交接',
                handle_time: '2024-01-15 11:20:00',
              },
            ],
          },
          {
            node_id: 'node_002',
            node_name: '部门主管审批',
            node_type: 'ROUTE',
            approvers: [
              {
                id: 'approver_002',
                user_id: 'user_003',
                name: '李总监',
                action: 'APPROVE',
                comment: '准予休假',
                handle_time: '2024-01-15 15:45:00',
              },
            ],
          },
        ],
        form_data: {
          leave_type: '年假',
          start_time: '2024-01-16',
          end_time: '2024-01-18',
          reason: '家庭事务',
          duration: '3天',
        },
        attachments: [
          {
            name: '请假申请表.pdf',
            size: '245KB',
            url: 'https://example.com/file.pdf',
          },
        ],
      };

      setDetail(mockDetail);
    } catch (error) {
      console.error('获取详情失败:', error);
      feishuSDK.showToast('获取详情失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 模态框打开时获取详情
  React.useEffect(() => {
    if (visible && record) {
      fetchDetail();
    }
  }, [visible, record]);

  // 渲染审批节点
  const renderApprovalNodes = () => {
    if (!detail?.nodes) return null;

    return detail.nodes.map((node, index) => (
      <Timeline.Item
        key={node.node_id}
        dot={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
      >
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#1890ff', marginBottom: 8 }}>{node.node_name}</h4>
          {node.approvers.map((approver, approverIndex) => (
            <div
              key={approverIndex}
              style={{
                marginBottom: 12,
                padding: 12,
                background: '#f9f9f9',
                border: '1px solid #e8e8e8',
                borderRadius: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 8 }} />
                <span style={{ fontWeight: 500 }}>{approver.name}</span>
                <Tag
                  color={
                    approver.action === 'APPROVE' ? 'success' :
                    approver.action === 'REJECT' ? 'error' : 'default'
                  }
                  style={{ marginLeft: 8 }}
                >
                  {formatApprovalAction(approver.action)}
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {formatDateTime(approver.handle_time)}
              </div>
              {approver.comment && (
                <div
                  style={{
                    fontStyle: 'italic',
                    color: '#595959',
                    fontSize: 13,
                    padding: 8,
                    background: '#f0f0f0',
                    borderRadius: 4,
                    marginTop: 8,
                  }}
                >
                  <strong>意见：</strong>{approver.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      </Timeline.Item>
    ));
  };

  // 渲染表单数据
  const renderFormData = () => {
    if (!detail?.form_data) return null;

    const entries = Object.entries(detail.form_data);

    return (
      <List
        size="small"
        dataSource={entries}
        renderItem={([key, value]) => (
          <List.Item>
            <List.Item.Meta
              title={key}
              description={
                <div style={{ wordBreak: 'break-word' }}>
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  const statusConfig = {
    'APPROVED': { color: 'success', text: '已通过', icon: <CheckCircleOutlined /> },
    'REJECTED': { color: 'error', text: '已拒绝', icon: <CloseCircleOutlined /> },
    'PENDING': { color: 'warning', text: '待审批', icon: <ClockCircleOutlined /> },
    'REVOKED': { color: 'default', text: '已撤销', icon: <FileTextOutlined /> },
  };

  const currentStatus = statusConfig[record?.status as keyof typeof statusConfig] || statusConfig['PENDING'];

  return (
    <Modal
      title="📄 审批详情"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => record && onPrint?.(record)}
        >
          打印审批单
        </Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>加载中...</div>
        </div>
      ) : detail ? (
        <div>
          {/* 基础信息 */}
          <Descriptions
            title="基础信息"
            column={2}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="审批实例ID">
              <code>{detail.instance_id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="审批类型">
              {detail.approval_name}
            </Descriptions.Item>
            <Descriptions.Item label="审批代码">
              <code>{detail.approval_code}</code>
            </Descriptions.Item>
            <Descriptions.Item label="审批状态">
              <Tag color={currentStatus.color} icon={currentStatus.icon}>
                {currentStatus.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="申请人">
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{detail.applicant.name}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="申请部门">
              {detail.applicant.department}
            </Descriptions.Item>
            <Descriptions.Item label="申请时间">
              {formatDateTime(detail.create_time)}
            </Descriptions.Item>
            <Descriptions.Item label="审批时间">
              {detail.approve_time ? formatDateTime(detail.approve_time) : '-'}
            </Descriptions.Item>
          </Descriptions>

          {/* 详细信息折叠面板 */}
          <Collapse
            activeKey={activePanel}
            onChange={setActivePanel}
            ghost
          >
            {/* 审批流程 */}
            <Panel
              header={
                <Space>
                  <CheckCircleOutlined />
                  <span>审批流程</span>
                  <Tag color="blue">{detail.nodes?.length || 0} 个节点</Tag>
                </Space>
              }
              key="1"
            >
              <Timeline>
                {renderApprovalNodes()}
              </Timeline>
            </Panel>

            {/* 申请详情 */}
            <Panel
              header={
                <Space>
                  <FileTextOutlined />
                  <span>申请详情</span>
                  <Tag color="green">
                    {Object.keys(detail.form_data || {}).length} 个字段
                  </Tag>
                </Space>
              }
              key="2"
            >
              {renderFormData()}
            </Panel>

            {/* 附件信息 */}
            {detail.attachments && detail.attachments.length > 0 && (
              <Panel
                header={
                  <Space>
                    <FileTextOutlined />
                    <span>附件信息</span>
                    <Tag color="orange">
                      {detail.attachments.length} 个附件
                    </Tag>
                  </Space>
                }
                key="3"
              >
                <List
                  dataSource={detail.attachments}
                  renderItem={(attachment, index) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<FileTextOutlined />}
                        title={attachment.name || `附件${index + 1}`}
                        description={`大小: ${attachment.size || '未知'}`}
                      />
                    </List.Item>
                  )}
                />
              </Panel>
            )}
          </Collapse>
        </div>
      ) : (
        <Alert
          message="加载失败"
          description="无法获取审批详情，请稍后重试"
          type="error"
          showIcon
        />
      )}
    </Modal>
  );
};

export default ApprovalDetailModal;