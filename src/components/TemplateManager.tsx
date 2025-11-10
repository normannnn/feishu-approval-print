import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tooltip,
  Upload,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  ImportOutlined,
  ExportOutlined,
  SettingOutlined,
  SaveOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import TemplateEditor from './TemplateEditor';
import { cloudTemplateDataManager } from '../utils/cloudTemplateDataManager';

const { Option } = Select;

export interface TemplateField {
  id: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'signature';
  label: string;
  fieldKey: string;
  required: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  options?: string[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_time: string;
  updated_time: string;
  page_size: string;
  orientation: string;
  fields?: TemplateField[];
}

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);

  // 初始化数据并订阅数据变化
  useEffect(() => {
    // 初始化数据
    setTemplates(cloudTemplateDataManager.getTemplates());

    // 订阅数据变化
    const unsubscribe = cloudTemplateDataManager.subscribe(() => {
      setTemplates(cloudTemplateDataManager.getTemplates());
    });

    return unsubscribe;
  }, []);

  // 更新保存状态
  useEffect(() => {
    const updateSaveStatus = () => {
      setLastSaveTime(cloudTemplateDataManager.getLastSaveTime());
    };

    // 初始化保存时间
    updateSaveStatus();

    // 监听数据变化来更新保存状态
    const interval = setInterval(updateSaveStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // 手动保存
  const handleSave = () => {
    setSaveStatus('saving');
    const success = cloudTemplateDataManager.saveNow();
    if (success) {
      setSaveStatus('saved');
      setLastSaveTime(cloudTemplateDataManager.getLastSaveTime());
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTemplateFields, setEditingTemplateFields] = useState<TemplateField[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editingTemplatePageSize, setEditingTemplatePageSize] = useState('A4');
  const [editingTemplateOrientation, setEditingTemplateOrientation] = useState('portrait');
  const [form] = Form.useForm();

  // 保存状态相关
  const [lastSaveTime, setLastSaveTime] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'is_default',
      key: 'is_default',
      render: (isDefault: boolean) => (
        <Tag color={isDefault ? 'blue' : 'default'}>
          {isDefault ? '默认模板' : '自定义模板'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_time',
      key: 'created_time',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_time',
      key: 'updated_time',
    },
    {
      title: '操作',
      key: 'actions',
      render: (text: any, record: Template) => (
        <Space size="small">
          <Tooltip title="预览模板">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="拖拽编辑">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => handleDragEdit(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record)}
            />
          </Tooltip>
          {!record.is_default && (
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingTemplate(null);
    setModalVisible(true);
    form.resetFields();
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setModalVisible(true);
    form.setFieldsValue(template);
  };

  const handleDelete = (template: Template) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除模板"${template.name}"吗？`,
      onOk: () => {
        const success = cloudTemplateDataManager.deleteTemplate(template.id);
        if (success) {
          message.success('删除成功');
        } else {
          message.error('无法删除默认模板');
        }
      },
    });
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    setPreviewVisible(true);
  };

  const handleDragEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditingTemplateFields(template.fields || []);
    setEditingTemplatePageSize(template.page_size || 'A4');
    setEditingTemplateOrientation(template.orientation || 'portrait');
    setEditorVisible(true);
  };

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: '新模板',
      description: '新建的模板',
      is_default: false,
      created_time: new Date().toISOString(),
      updated_time: new Date().toISOString(),
      page_size: 'A4',
      orientation: 'portrait',
      fields: [],
    };
    setEditingTemplate(newTemplate);
    setEditingTemplateFields([]);
    setEditingTemplatePageSize('A4');
    setEditingTemplateOrientation('portrait');
    setEditorVisible(true);
  };

  const handleSaveTemplateFields = (fields: TemplateField[]) => {
    if (!editingTemplate) return;

    const updatedTemplate = {
      ...editingTemplate,
      fields,
      page_size: editingTemplatePageSize,
      orientation: editingTemplateOrientation,
      updated_time: new Date().toISOString(),
    };

    // 使用cloudTemplateDataManager保存模板
    cloudTemplateDataManager.saveTemplate(updatedTemplate);

    if (templates.find(t => t.id === editingTemplate.id)) {
      message.success('模板更新成功');
    } else {
      message.success('模板创建成功');
    }

    setEditorVisible(false);
    setEditingTemplate(null);
    setEditingTemplateFields([]);
  };

  const handleCopy = (template: Template) => {
    const newTemplate = cloudTemplateDataManager.copyTemplate(template.id);
    if (newTemplate) {
      message.success('复制成功');
    } else {
      message.error('复制失败');
    }
  };

  const handleExportTemplate = (template: Template) => {
    const templateData = cloudTemplateDataManager.exportTemplate(template.id);
    if (templateData) {
      const dataBlob = new Blob([templateData], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}.json`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('模板导出成功');
    } else {
      message.error('模板导出失败');
    }
  };

  const handleImportTemplate = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const templateData = JSON.parse(e.target?.result as string);
        const newTemplate = cloudTemplateDataManager.importTemplate(templateData);
        if (newTemplate) {
          message.success('模板导入成功');
        } else {
          message.error('模板导入失败');
        }
      } catch (error) {
        message.error('模板文件格式错误');
      }
    };
    reader.readAsText(file);
    return false; // 阻止默认上传行为
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingTemplate) {
        // 编辑模板
        const updatedTemplate = {
          ...editingTemplate,
          ...values,
          updated_time: new Date().toISOString(),
        };
        cloudTemplateDataManager.saveTemplate(updatedTemplate);
        message.success('更新成功');
      } else {
        // 创建模板
        const newTemplate: Template = {
          id: Date.now().toString(),
          ...values,
          is_default: false,
          created_time: new Date().toISOString(),
          updated_time: new Date().toISOString(),
          fields: [], // 新模板默认为空字段
          page_size: 'A4',
          orientation: 'portrait',
        };
        cloudTemplateDataManager.saveTemplate(newTemplate);
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
    });
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>📝 模板管理</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' }}>
            {saveStatus === 'saving' && (
              <>
                <InfoCircleOutlined spin style={{ color: '#1890ff' }} />
                <span style={{ color: '#1890ff' }}>保存中...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <InfoCircleOutlined style={{ color: '#52c41a' }} />
                <span style={{ color: '#52c41a' }}>已保存</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <InfoCircleOutlined style={{ color: '#ff4d4f' }} />
                <span style={{ color: '#ff4d4f' }}>保存失败</span>
              </>
            )}
            {lastSaveTime && (
              <Tooltip title={`最后保存时间: ${new Date(lastSaveTime).toLocaleString()}`}>
                <span>{new Date(lastSaveTime).toLocaleTimeString()}</span>
              </Tooltip>
            )}
          </div>
        </div>
      }
      extra={
        <Space>
          <Tooltip title="手动保存">
            <Button
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saveStatus === 'saving'}
            >
              保存
            </Button>
          </Tooltip>
          <Upload
            accept=".json"
            beforeUpload={handleImportTemplate}
            showUploadList={false}
          >
            <Button icon={<ImportOutlined />}>导入模板</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTemplate}>
            拖拽建模板
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个模板`,
        }}
        expandedRowRender={(record) => (
          <div style={{ padding: '16px 0' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <strong>页面设置：</strong>
                {record.page_size} - {record.orientation === 'portrait' ? '纵向' : '横向'}
              </div>
              <div>
                <strong>字段数量：</strong>
                {record.fields?.length || 0} 个字段
              </div>
              {record.fields && record.fields.length > 0 && (
                <div>
                  <strong>字段列表：</strong>
                  <div style={{ marginTop: '8px' }}>
                    {record.fields.map((field, index) => (
                      <Tag key={field.id} style={{ margin: '2px' }}>
                        {field.label} ({field.type})
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
              <Space>
                <Button
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => handleDragEdit(record)}
                >
                  拖拽编辑
                </Button>
                <Button
                  size="small"
                  icon={<ExportOutlined />}
                  onClick={() => handleExportTemplate(record)}
                >
                  导出模板
                </Button>
              </Space>
            </Space>
          </div>
        )}
      />

      {/* 传统模态框编辑器 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新建模板'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="模板描述"
            rules={[{ required: true, message: '请输入模板描述' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入模板描述" />
          </Form.Item>

          <Form.Item name="page_size" label="页面大小" initialValue="A4">
            <Select>
              <Option value="A4">A4</Option>
              <Option value="A3">A3</Option>
              <Option value="A5">A5</Option>
            </Select>
          </Form.Item>

          <Form.Item name="orientation" label="页面方向" initialValue="portrait">
            <Select>
              <Option value="portrait">纵向</Option>
              <Option value="landscape">横向</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 拖拽式模板编辑器 */}
      <TemplateEditor
        visible={editorVisible}
        onClose={() => {
          setEditorVisible(false);
          setEditingTemplate(null);
          setEditingTemplateFields([]);
        }}
        onSave={handleSaveTemplateFields}
        initialData={editingTemplateFields}
        pageSize={editingTemplatePageSize}
        orientation={editingTemplateOrientation}
        onPageSizeChange={setEditingTemplatePageSize}
        onOrientationChange={setEditingTemplateOrientation}
        title={editingTemplate ? `编辑模板: ${editingTemplate.name}` : '新建模板'}
      />

      {/* 模板预览抽屉 */}
      <Drawer
        title={`预览模板: ${previewTemplate?.name}`}
        placement="right"
        size="large"
        onClose={() => setPreviewVisible(false)}
        open={previewVisible}
      >
        {previewTemplate && (
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <p><strong>描述：</strong>{previewTemplate.description}</p>
              <p><strong>页面：</strong>{previewTemplate.page_size} - {previewTemplate.orientation === 'portrait' ? '纵向' : '横向'}</p>
              <p><strong>字段数量：</strong>{previewTemplate.fields?.length || 0}</p>
            </div>

            {previewTemplate.fields && previewTemplate.fields.length > 0 && (
              <div>
                <h4>字段详情：</h4>
                {previewTemplate.fields.map((field) => (
                  <Card key={field.id} size="small" style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{field.label}</strong>
                        {field.required && <Tag color="red" size="small" style={{ marginLeft: '8px' }}>必填</Tag>}
                      </div>
                      <Tag color="blue" size="small">{field.type}</Tag>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      键名: {field.fieldKey} | 位置: ({field.x}, {field.y}) | 大小: {field.width}×{field.height}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </Card>
  );
};

export default TemplateManager;