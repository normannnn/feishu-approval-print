import React, { useState, useCallback, useEffect } from 'react';
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
  Drawer,
  List,
  Avatar,
  Typography,
  Switch,
  InputNumber,
  Radio,
  Tooltip,
  Badge,
} from 'antd';
import {
  PrinterOutlined,
  FileTextOutlined,
  SettingOutlined,
  HistoryOutlined,
  EyeOutlined,
  RedoOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { PrinterAPI, type PrintSettings } from '../utils/printerAPI';
import cloudTemplateDataManager, { type PrintRecord } from '../utils/cloudTemplateDataManager';
import { Template } from './TemplateManager';
import PDFGenerator, { type PDFSettings } from '../utils/pdfGenerator';

const { Option } = Select;
const { Text, Title } = Typography;

interface PrintPreview {
  record: PrintRecord;
  visible: boolean;
  pdfURL?: string;
  loading?: boolean;
}

const PrintCenter: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('1');
  const [printerStatus, setPrinterStatus] = useState<{
    online: boolean;
    paperLevel: 'full' | 'medium' | 'low' | 'empty';
    inkLevel: 'full' | 'medium' | 'low' | 'empty';
    status: string;
  } | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [printHistory, setPrintHistory] = useState<PrintRecord[]>([]);

  const [printPreview, setPrintPreview] = useState<PrintPreview | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [printSettings, setPrintSettings] = useState({
    copies: 1,
    colorMode: 'color' as 'color' | 'grayscale',
    doubleSided: false,
    pageSize: 'A4' as string,
    orientation: 'portrait' as 'portrait' | 'landscape',
  });

  // 初始化数据并订阅数据变化
  useEffect(() => {
    // 初始化数据
    setTemplates(cloudTemplateDataManager.getTemplates());
    setPrintHistory(cloudTemplateDataManager.getPrintRecords());

    // 订阅数据变化
    const unsubscribe = cloudTemplateDataManager.subscribe(() => {
      setTemplates(cloudTemplateDataManager.getTemplates());
      setPrintHistory(cloudTemplateDataManager.getPrintRecords());
    });

    return unsubscribe;
  }, []);

  const statusConfig = {
    pending: {
      text: '待打印',
      color: 'orange',
      icon: <ClockCircleOutlined />,
      description: '等待打印队列处理'
    },
    printing: {
      text: '打印中',
      color: 'blue',
      icon: <SyncOutlined spin />,
      description: '正在处理打印任务'
    },
    completed: {
      text: '已完成',
      color: 'green',
      icon: <CheckCircleOutlined />,
      description: '打印任务成功完成'
    },
    failed: {
      text: '失败',
      color: 'red',
      icon: <ExclamationCircleOutlined />,
      description: '打印任务执行失败'
    },
  };

  // 打印机状态检测
  useEffect(() => {
    const checkPrinterStatus = async () => {
      try {
        // 检测打印机状态
        const status = await PrinterAPI.checkPrinterStatus();
        setPrinterStatus(status);

        // 获取可用打印机列表
        const printers = await PrinterAPI.getAvailablePrinters();
        setAvailablePrinters(printers);
      } catch (error) {
        console.error('检测打印机状态失败:', error);
        // 设置默认状态
        setPrinterStatus({
          online: false,
          paperLevel: 'empty',
          inkLevel: 'empty',
          status: '检测失败'
        });
        setAvailablePrinters(['默认打印机']);
      }
    };

    // 立即检测一次
    checkPrinterStatus();

    // 每30秒检测一次
    const interval = setInterval(checkPrinterStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // 生成PDF预览
  const generatePDFPreview = useCallback(async (record: PrintRecord) => {
    try {
      setPrintPreview(prev => prev ? { ...prev, loading: true } : null);

      const pdfSettings: PDFSettings = {
        pageSize: printSettings.pageSize as 'A4' | 'A3' | 'A5',
        orientation: printSettings.orientation as 'portrait' | 'landscape',
        copies: printSettings.copies,
        colorMode: printSettings.colorMode as 'color' | 'grayscale',
        doubleSided: printSettings.doubleSided,
        scale: 2, // 预览清晰度
      };

      const pdfBlob = await PDFGenerator.generatePDFPreview(
        record.templateId,
        record.data,
        pdfSettings
      );

      const pdfURL = PDFGenerator.getPDFURL(pdfBlob);

      setPrintPreview({
        record,
        visible: true,
        pdfURL,
        loading: false,
      });
    } catch (error) {
      console.error('生成PDF预览失败:', error);
      message.error('生成预览失败');
      setPrintPreview(prev => prev ? { ...prev, loading: false } : null);
    }
  }, [printSettings]);

  // 生成打印用的PDF
  const generatePrintPDF = useCallback(async (record: PrintRecord) => {
    try {
      const pdfSettings: PDFSettings = {
        pageSize: printSettings.pageSize as 'A4' | 'A3' | 'A5',
        orientation: printSettings.orientation as 'portrait' | 'landscape',
        copies: printSettings.copies,
        colorMode: printSettings.colorMode as 'color' | 'grayscale',
        doubleSided: printSettings.doubleSided,
        scale: 3, // 打印质量更高
      };

      return await PDFGenerator.generatePrintPDF(
        record.templateId,
        record.data,
        pdfSettings,
        printSettings.copies
      );
    } catch (error) {
      console.error('生成打印PDF失败:', error);
      throw error;
    }
  }, [printSettings]);

  // 处理打印
  const handlePrint = async (record: PrintRecord) => {
    try {
      const template = cloudTemplateDataManager.getTemplateById(record.templateId);
      if (!template) {
        message.error('模板不存在');
        return;
      }

      // 更新记录状态为打印中
      cloudTemplateDataManager.updatePrintRecordStatus(record.id, 'printing');

      // 生成打印PDF
      const pdfBlob = await generatePrintPDF(record);

      // 使用PDF直接打印
      await PDFGenerator.printPDF(pdfBlob);

      cloudTemplateDataManager.updatePrintRecordStatus(record.id, 'completed');
      message.success('打印成功');
    } catch (error) {
      console.error('打印失败:', error);
      cloudTemplateDataManager.updatePrintRecordStatus(record.id, 'failed', { errorMessage: error instanceof Error ? error.message : '未知错误' });
      message.error('打印失败');
    }
  };

  // 立即打印功能
  const handleImmediatePrint = async (record: PrintRecord) => {
    Modal.confirm({
      title: '确认打印',
      content: (
        <div>
          <p><strong>打印记录：</strong>{record.recordName}</p>
          <p><strong>使用模板：</strong>{cloudTemplateDataManager.getTemplateById(record.templateId)?.name}</p>
          <Divider />
          <p><strong>打印设置：</strong></p>
          <ul>
            <li>打印份数：{printSettings.copies} 份</li>
            <li>打印模式：{printSettings.colorMode === 'color' ? '彩色' : '黑白'}</li>
            <li>页面大小：{printSettings.pageSize}</li>
            <li>页面方向：{printSettings.orientation === 'portrait' ? '纵向' : '横向'}</li>
            <li>双面打印：{printSettings.doubleSided ? '是' : '否'}</li>
          </ul>
        </div>
      ),
      okText: '立即打印',
      cancelText: '取消',
      onOk: () => handlePrint(record),
    });
  };

  // 批量打印
  const handleBatchPrint = async () => {
    if (selectedRecords.length === 0) {
      message.warning('请选择要打印的记录');
      return;
    }

    Modal.confirm({
      title: '批量打印确认',
      content: `确定要打印选中的 ${selectedRecords.length} 条记录吗？`,
      okText: '开始打印',
      cancelText: '取消',
      onOk: async () => {
        let successCount = 0;
        let failCount = 0;

        for (const recordId of selectedRecords) {
          const record = cloudTemplateDataManager.getPrintRecordById(recordId);
          if (record) {
            try {
              await handlePrint(record);
              successCount++;
            } catch (error) {
              failCount++;
            }
          }
        }

        message.info(`批量打印完成：成功 ${successCount} 条，失败 ${failCount} 条`);
        setSelectedRecords([]);
      },
    });
  };

  // 刷新打印机状态
  const handleRefreshPrinter = async () => {
    try {
      const status = await PrinterAPI.checkPrinterStatus();
      setPrinterStatus(status);
      message.success('打印机状态已刷新');
    } catch (error) {
      message.error('刷新失败');
    }
  };

  // 预览打印
  const handlePreview = (record: PrintRecord) => {
    setPrintPreview({ record, visible: true, loading: true });
    generatePDFPreview(record);
  };

  const columns = [
    {
      title: '记录信息',
      dataIndex: 'recordName',
      key: 'recordName',
      render: (text: string, record: PrintRecord) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.recordId}
          </Text>
        </div>
      ),
    },
    {
      title: '使用模板',
      dataIndex: 'templateId',
      key: 'templateId',
      render: (templateId: string) => {
        const template = cloudTemplateDataManager.getTemplateById(templateId);
        return template ? (
          <Tag color="blue">{template.name}</Tag>
        ) : (
          <Tag color="default">未知模板</Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      render: (time: string) => (
        <Text style={{ fontSize: 12 }}>{time}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (text: any, record: PrintRecord) => (
        <Space>
          <Tooltip title="预览打印">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="立即打印">
            <Button
              type="text"
              icon={<PrinterOutlined />}
              onClick={() => handleImmediatePrint(record)}
              disabled={record.status === 'printing'}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const statistics = {
    total: printHistory.length,
    pending: printHistory.filter(r => r.status === 'pending').length,
    printing: printHistory.filter(r => r.status === 'printing').length,
    completed: printHistory.filter(r => r.status === 'completed').length,
    failed: printHistory.filter(r => r.status === 'failed').length,
  };

  return (
    <div className="print-center">
      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small">
            <Statistic
              title="总记录数"
              value={statistics.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small">
            <Statistic
              title="待打印"
              value={statistics.pending}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small">
            <Statistic
              title="打印中"
              value={statistics.printing}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small">
            <Statistic
              title="已完成"
              value={statistics.completed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small">
            <Statistic
              title="失败"
              value={statistics.failed}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 打印机状态 */}
      <Card
        title="打印机状态"
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            icon={<RedoOutlined />}
            onClick={handleRefreshPrinter}
            loading={!printerStatus}
          >
            刷新状态
          </Button>
        }
      >
        {printerStatus ? (
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12} md={6}>
              <div className="stat-item">
                <div className="stat-number">
                  {printerStatus.online ? (
                    <WifiOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <WifiOutlined style={{ color: '#ff4d4f' }} />
                  )}
                </div>
                <div className="stat-label">
                  {printerStatus.online ? '在线' : '离线'}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="stat-item">
                <div className="stat-number">
                  {printerStatus.paperLevel === 'full' ? '满' :
                   printerStatus.paperLevel === 'medium' ? '中' :
                   printerStatus.paperLevel === 'low' ? '低' : '空'}
                </div>
                <div className="stat-label">纸张</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="stat-item">
                <div className="stat-number">
                  {printerStatus.inkLevel === 'full' ? '满' :
                   printerStatus.inkLevel === 'medium' ? '中' :
                   printerStatus.inkLevel === 'low' ? '低' : '空'}
                </div>
                <div className="stat-label">墨水</div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="stat-item">
                <div className="stat-number" style={{ fontSize: '12px' }}>
                  {printerStatus.status}
                </div>
                <div className="stat-label">状态</div>
              </div>
            </Col>
          </Row>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <SyncOutlined spin />
            <div style={{ marginTop: 8 }}>检测打印机状态中...</div>
          </div>
        )}
      </Card>

      {/* 打印设置 */}
      <Card title="打印设置" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div className="setting-item">
              <span className="field-label">打印份数</span>
              <InputNumber
                min={1}
                max={10}
                value={printSettings.copies}
                onChange={(value) => setPrintSettings(prev => ({ ...prev, copies: value || 1 }))}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="setting-item">
              <span className="field-label">打印模式</span>
              <Radio.Group
                value={printSettings.colorMode}
                onChange={(e) => setPrintSettings(prev => ({ ...prev, colorMode: e.target.value }))}
              >
                <Radio.Button value="color">彩色</Radio.Button>
                <Radio.Button value="grayscale">黑白</Radio.Button>
              </Radio.Group>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="setting-item">
              <span className="field-label">页面大小</span>
              <Select
                value={printSettings.pageSize}
                onChange={(value) => setPrintSettings(prev => ({ ...prev, pageSize: value }))}
                style={{ width: '100%' }}
              >
                <Option value="A4">A4</Option>
                <Option value="A3">A3</Option>
                <Option value="A5">A5</Option>
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="setting-item">
              <span className="field-label">双面打印</span>
              <Switch
                checked={printSettings.doubleSided}
                onChange={(checked) => setPrintSettings(prev => ({ ...prev, doubleSided: checked }))}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 打印记录表格 */}
      <Card
        title="打印记录"
        size="small"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handleBatchPrint}
              disabled={selectedRecords.length === 0}
            >
              批量打印 ({selectedRecords.length})
            </Button>
            <Select
              placeholder="筛选模板"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setSelectedTemplate(value || '1')}
            >
              {templates.map(template => (
                <Option key={template.id} value={template.id}>
                  {template.name}
                </Option>
              ))}
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={printHistory.filter(record =>
            !selectedTemplate || record.templateId === selectedTemplate
          )}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedRecords,
            onChange: (keys) => setSelectedRecords(keys as string[]),
            getCheckboxProps: (record: PrintRecord) => ({
              disabled: record.status === 'printing',
            }),
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 打印预览抽屉 */}
      <Drawer
        title={`PDF预览 - ${printPreview?.record.recordName}`}
        placement="right"
        size="large"
        onClose={() => {
          if (printPreview?.pdfURL) {
            PDFGenerator.cleanupPDFURL(printPreview.pdfURL);
          }
          setPrintPreview(null);
        }}
        open={printPreview?.visible}
        extra={
          <Space>
            <Button
              icon={<FileTextOutlined />}
              onClick={async () => {
                if (printPreview) {
                  try {
                    const pdfBlob = await generatePrintPDF(printPreview.record);
                    PDFGenerator.downloadPDF(pdfBlob, `${printPreview.record.recordName}.pdf`);
                  } catch (error) {
                    message.error('下载PDF失败');
                  }
                }
              }}
            >
              下载PDF
            </Button>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={() => printPreview && handleImmediatePrint(printPreview.record)}
            >
              立即打印
            </Button>
          </Space>
        }
      >
        {printPreview && (
          <div>
            <div className="preview-info">
              <div><strong>记录名称：</strong>{printPreview.record.recordName}</div>
              <div><strong>使用模板：</strong>{cloudTemplateDataManager.getTemplateById(printPreview.record.templateId)?.name}</div>
              <div><strong>创建时间：</strong>{printPreview.record.createTime}</div>
              <div><strong>打印设置：</strong>{printSettings.copies}份 | {printSettings.colorMode === 'color' ? '彩色' : '黑白'} | {printSettings.pageSize} | {printSettings.orientation === 'portrait' ? '纵向' : '横向'} | {printSettings.doubleSided ? '双面' : '单面'}</div>
              <div><strong>预览格式：</strong>PDF（确保打印效果与预览一致）</div>
            </div>

            <Divider />

            <div className="preview-container" style={{ height: '600px' }}>
              {printPreview.loading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  flexDirection: 'column'
                }}>
                  <SyncOutlined spin style={{ fontSize: '24px', marginBottom: '16px' }} />
                  <Text>正在生成PDF预览...</Text>
                </div>
              ) : printPreview.pdfURL ? (
                <iframe
                  src={printPreview.pdfURL}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                  }}
                  title="PDF预览"
                  type="application/pdf"
                />
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  flexDirection: 'column'
                }}>
                  <ExclamationCircleOutlined style={{ fontSize: '24px', marginBottom: '16px', color: '#ff4d4f' }} />
                  <Text type="danger">PDF预览生成失败</Text>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PrintCenter;