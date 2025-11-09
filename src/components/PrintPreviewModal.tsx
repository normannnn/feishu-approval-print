import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Space,
  Select,
  Switch,
  Divider,
  Alert,
  Spin,
  message,
  Tooltip,
} from 'antd';
import {
  PrinterOutlined,
  DownloadOutlined,
  EyeOutlined,
  SettingOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { ApprovalRecord, PrintTemplate } from '../types';
import { feishuSDK } from '../services/feishu-sdk';
import { generatePrintHTML } from '../utils/printGenerator';

const { Option } = Select;

interface PrintPreviewModalProps {
  visible: boolean;
  record: ApprovalRecord | null;
  onClose: () => void;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  visible,
  record,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('1');
  const [previewHTML, setPreviewHTML] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [showSettings, setShowSettings] = useState(false);

  // 模拟模板数据
  const templates: PrintTemplate[] = [
    {
      id: '1',
      name: '标准审批单',
      description: '适用于各类审批的标准模板',
      config: {
        page_size: 'A4',
        orientation: 'portrait',
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      sections: [
        {
          id: 'header',
          type: 'header',
          content: {
            text: '审批单',
            style: { font_size: 18, font_weight: 'bold', align: 'center' },
          },
        },
        {
          id: 'info',
          type: 'info',
          fields: [
            { key: 'approvalName', label: '审批类型' },
            { key: 'applicantName', label: '申请人' },
            { key: 'status', label: '审批状态' },
            { key: 'createTime', label: '申请时间' },
          ],
        },
        {
          id: 'nodes',
          type: 'nodes',
          title: '审批流程',
          show_comments: true,
        },
      ],
      styles: {
        global: {
          font_family: 'SimSun, "Microsoft YaHei", Arial, sans-serif',
          font_size: 12,
          line_height: 1.6,
        },
      },
      is_default: true,
      created_time: '2024-01-01 10:00:00',
      updated_time: '2024-01-01 10:00:00',
    },
    {
      id: '2',
      name: '请假审批单',
      description: '专门用于请假审批的模板',
      config: {
        page_size: 'A4',
        orientation: 'portrait',
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      sections: [
        {
          id: 'header',
          type: 'header',
          content: {
            text: '请假申请单',
            style: { font_size: 18, font_weight: 'bold', align: 'center' },
          },
        },
      ],
      styles: {
        global: {
          font_family: 'SimSun, "Microsoft YaHei", Arial, sans-serif',
          font_size: 12,
          line_height: 1.6,
        },
      },
      is_default: false,
      created_time: '2024-01-01 10:00:00',
      updated_time: '2024-01-01 10:00:00',
    },
  ];

  const currentTemplate = templates.find(t => t.id === selectedTemplate) || templates[0];

  // 生成预览
  const generatePreview = async () => {
    if (!record || !currentTemplate) return;

    setLoading(true);
    try {
      // 准备数据
      const data = {
        approvalName: record.approval_name,
        applicantName: record.applicant_name,
        status: record.status,
        createTime: record.create_time,
        approveTime: record.approve_time,
        applicantDepartment: record.applicant_department,
        // 其他必要数据
        nodes: [
          {
            node_name: '直属上级审批',
            approvers: [
              {
                name: '王经理',
                action: 'APPROVE',
                comment: '同意申请',
                handle_time: '2024-01-15 11:20:00',
              },
            ],
          },
        ],
        formData: {
          leave_type: '年假',
          start_time: '2024-01-16',
          end_time: '2024-01-18',
          reason: '家庭事务',
        },
      };

      const html = await generatePrintHTML(currentTemplate, data);
      setPreviewHTML(html);
    } catch (error) {
      console.error('生成预览失败:', error);
      feishuSDK.showToast('生成预览失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 模板变化时重新生成预览
  useEffect(() => {
    if (visible && record) {
      generatePreview();
    }
  }, [visible, selectedTemplate, record]);

  // 打印
  const handlePrint = async () => {
    if (!previewHTML) return;

    try {
      await feishuSDK.showPrintPreview({
        content: previewHTML,
        title: `${record?.approval_name} - ${record?.applicant_name}`,
      });
    } catch (error) {
      console.error('打印失败:', error);
      feishuSDK.showToast('打印失败', 'error');
    }
  };

  // 导出PDF
  const handleExportPDF = async () => {
    if (!previewHTML) return;

    try {
      // 创建下载链接
      const blob = new Blob([previewHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `审批单-${record?.approval_name}-${record?.applicant_name}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      feishuSDK.showToast('导出成功', 'success');
    } catch (error) {
      console.error('导出失败:', error);
      feishuSDK.showToast('导出失败', 'error');
    }
  };

  // 缩放控制
  const handleZoomChange = (delta: number) => {
    const newZoom = Math.max(50, Math.min(200, zoom + delta));
    setZoom(newZoom);
  };

  return (
    <Modal
      title="🖨️ 打印预览"
      open={visible}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ top: 20 }}
      bodyStyle={{ padding: 0 }}
    >
      {/* 工具栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
          background: '#fafafa',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <span style={{ marginRight: 8 }}>打印模板：</span>
            <Select
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              style={{ width: 200 }}
            >
              {templates.map(template => (
                <Option key={template.id} value={template.id}>
                  {template.name}
                  {template.is_default && (
                    <span style={{ color: '#52c41a', marginLeft: 8 }}>默认</span>
                  )}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <span style={{ marginRight: 8 }}>显示水印：</span>
            <Switch
              checked={showWatermark}
              onChange={setShowWatermark}
              size="small"
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 缩放控制 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px',
              background: 'white',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
          >
            <Button
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={() => handleZoomChange(-10)}
              disabled={zoom <= 50}
            />
            <span>{zoom}%</span>
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              onClick={() => handleZoomChange(10)}
              disabled={zoom >= 200}
            />
          </div>

          <Divider type="vertical" />

          <Tooltip title="刷新预览">
            <Button
              icon={<EyeOutlined />}
              onClick={generatePreview}
              loading={loading}
            />
          </Tooltip>

          <Tooltip title="导出HTML">
            <Button
              icon={<FileTextOutlined />}
              onClick={handleExportPDF}
              disabled={!previewHTML}
            />
          </Tooltip>

          <Tooltip title="导出PDF">
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              disabled={!previewHTML}
            />
          </Tooltip>

          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            disabled={!previewHTML}
          >
            打印
          </Button>
        </div>
      </div>

      {/* 预览区域 */}
      <div
        style={{
          width: '100%',
          height: '70vh',
          overflow: 'auto',
          background: '#f5f5f5',
          padding: 20,
          position: 'relative',
        }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>生成预览中...</div>
          </div>
        )}

        {!previewHTML ? (
          <Alert
            message="暂无预览内容"
            description="请选择模板并生成预览"
            type="info"
            showIcon
            style={{ margin: 20, textAlign: 'center' }}
          />
        ) : (
          <div
            style={{
              background: 'white',
              margin: '0 auto',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s',
              width: currentTemplate?.config.page_size === 'A4' ? '210mm' : '297mm',
              minHeight: currentTemplate?.config.page_size === 'A4' ? '297mm' : '210mm',
            }}
            dangerouslySetInnerHTML={{ __html: previewHTML }}
          />
        )}
      </div>
    </Modal>
  );
};

export default PrintPreviewModal;