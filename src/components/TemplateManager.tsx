import React, { useState } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
} from '@ant-design/icons';

const { Option } = Select;

interface Template {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_time: string;
  updated_time: string;
}

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      name: '标准审批单',
      description: '适用于各类审批的标准模板',
      is_default: true,
      created_time: '2024-01-01 10:00:00',
      updated_time: '2024-01-01 10:00:00',
    },
    {
      id: '2',
      name: '请假审批单',
      description: '专门用于请假审批的模板',
      is_default: false,
      created_time: '2024-01-02 10:00:00',
      updated_time: '2024-01-02 10:00:00',
    },
    {
      id: '3',
      name: '费用报销单',
      description: '用于费用报销审批的模板',
      is_default: false,
      created_time: '2024-01-03 10:00:00',
      updated_time: '2024-01-03 10:00:00',
    },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form] = Form.useForm();

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
          <Tooltip title="预览">
            <Button type="text" icon={<EyeOutlined />} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} />
          </Tooltip>
          <Tooltip title="复制">
            <Button type="text" icon={<CopyOutlined />} />
          </Tooltip>
          {!record.is_default && (
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
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
        setTemplates(templates.filter(t => t.id !== template.id));
        message.success('删除成功');
      },
    });
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingTemplate) {
        // 编辑模板
        setTemplates(templates.map(t =>
          t.id === editingTemplate.id
            ? { ...t, ...values, updated_time: new Date().toISOString() }
            : t
        ));
        message.success('更新成功');
      } else {
        // 创建模板
        const newTemplate: Template = {
          id: Date.now().toString(),
          ...values,
          is_default: false,
          created_time: new Date().toISOString(),
          updated_time: new Date().toISOString(),
        };
        setTemplates([...templates, newTemplate]);
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
    });
  };

  return (
    <Card
      title="📝 模板管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建模板
        </Button>
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
      />

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
    </Card>
  );
};

export default TemplateManager;