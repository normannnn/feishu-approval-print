import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Select,
  Input,
  Modal,
  message,
  Form,
  InputNumber,
  Switch,
  ColorPicker,
  Collapse,
  Checkbox
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  TableOutlined,
  FieldStringOutlined,
  FieldNumberOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  LinkOutlined,
  MailOutlined,
  PhoneOutlined,
  PaperClipOutlined,
  CalculatorOutlined,
  SearchOutlined,
  StarOutlined
} from '@ant-design/icons';

const { Panel } = Collapse;
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './TemplateEditor.css';

const { Option } = Select;

interface TemplateField {
  id: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'textarea' | 'rating' | 'url' | 'email' | 'phone' | 'attachment' | 'signature' | 'formula' | 'lookup';
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
  options?: string[]; // for select, multiselect, radio types
  category?: string; // 字段分类
  description?: string; // 字段描述
}

interface TemplateEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (template: TemplateField[]) => void;
  initialData?: TemplateField[];
  title?: string;
  pageSize?: string;
  orientation?: string;
  onPageSizeChange?: (size: string) => void;
  onOrientationChange?: (orientation: string) => void;
}

// 飞书多维表格字段类型配置
const FEISHU_FIELD_TYPES = [
  {
    type: 'text',
    icon: <FieldStringOutlined />,
    label: '单行文本',
    description: '姓名、编号、地址等短文本',
    category: '基础字段'
  },
  {
    type: 'textarea',
    icon: <FileTextOutlined />,
    label: '多行文本',
    description: '备注、说明、详细描述等长文本',
    category: '基础字段'
  },
  {
    type: 'number',
    icon: <FieldNumberOutlined />,
    label: '数字',
    description: '金额、数量、评分等数值',
    category: '基础字段'
  },
  {
    type: 'date',
    icon: <CalendarOutlined />,
    label: '日期',
    description: '创建时间、截止日期等',
    category: '时间字段'
  },
  {
    type: 'datetime',
    icon: <CalendarOutlined />,
    label: '日期时间',
    description: '精确到时分秒的时间',
    category: '时间字段'
  },
  {
    type: 'select',
    icon: <TableOutlined />,
    label: '单选',
    description: '状态、类型、分类等单选值',
    category: '选择字段'
  },
  {
    type: 'multiselect',
    icon: <TableOutlined />,
    label: '多选',
    description: '标签、技能、参与人员等',
    category: '选择字段'
  },
  {
    type: 'radio',
    icon: <TableOutlined />,
    label: '单选按钮',
    description: '性别、是否等互斥选项',
    category: '选择字段'
  },
  {
    type: 'checkbox',
    icon: <TableOutlined />,
    label: '复选框',
    description: '同意条款、完成状态等',
    category: '选择字段'
  },
  {
    type: 'rating',
    icon: <StarOutlined />,
    label: '评分',
    description: '满意度、质量评级等',
    category: '高级字段'
  },
  {
    type: 'url',
    icon: <LinkOutlined />,
    label: '网址',
    description: '链接、文档地址等',
    category: '高级字段'
  },
  {
    type: 'email',
    icon: <MailOutlined />,
    label: '邮箱',
    description: '联系邮箱等',
    category: '高级字段'
  },
  {
    type: 'phone',
    icon: <PhoneOutlined />,
    label: '电话',
    description: '手机号、座机等',
    category: '高级字段'
  },
  {
    type: 'attachment',
    icon: <PaperClipOutlined />,
    label: '附件',
    description: '文档、图片等文件',
    category: '高级字段'
  },
  {
    type: 'signature',
    icon: <UserOutlined />,
    label: '签名',
    description: '手写签名区域',
    category: '高级字段'
  },
  {
    type: 'formula',
    icon: <CalculatorOutlined />,
    label: '公式',
    description: '计算字段、自动求和等',
    category: '高级字段'
  },
  {
    type: 'lookup',
    icon: <SearchOutlined />,
    label: '查找引用',
    description: '关联其他表格数据',
    category: '高级字段'
  },
];

// 按分类组织字段类型
const FIELD_TYPES_BY_CATEGORY = FEISHU_FIELD_TYPES.reduce((acc, field) => {
  if (!acc[field.category]) {
    acc[field.category] = [];
  }
  acc[field.category].push(field);
  return acc;
}, {} as Record<string, typeof FEISHU_FIELD_TYPES>);

// 常用字段预设
const COMMON_FIELD_PRESETS = [
  {
    name: '基础信息',
    fields: [
      { type: 'text' as const, label: '申请人', fieldKey: 'applicant', required: true },
      { type: 'text' as const, label: '部门', fieldKey: 'department', required: true },
      { type: 'date' as const, label: '申请日期', fieldKey: 'apply_date', required: true },
      { type: 'textarea' as const, label: '申请事由', fieldKey: 'reason', required: true },
    ]
  },
  {
    name: '审批流程',
    fields: [
      { type: 'text' as const, label: '审批人', fieldKey: 'approver', required: true },
      { type: 'date' as const, label: '审批时间', fieldKey: 'approve_time', required: false },
      { type: 'select' as const, label: '审批结果', fieldKey: 'approve_result', required: true, options: ['同意', '拒绝', '需补充'] },
      { type: 'textarea' as const, label: '审批意见', fieldKey: 'approve_comment', required: false },
    ]
  },
  {
    name: '财务相关',
    fields: [
      { type: 'number' as const, label: '金额', fieldKey: 'amount', required: true },
      { type: 'select' as const, label: '币种', fieldKey: 'currency', required: true, options: ['CNY', 'USD', 'EUR', 'JPY'] },
      { type: 'text' as const, label: '费用类型', fieldKey: 'expense_type', required: true },
      { type: 'textarea' as const, label: '费用说明', fieldKey: 'expense_description', required: true },
    ]
  },
  {
    name: '项目管理',
    fields: [
      { type: 'text' as const, label: '项目名称', fieldKey: 'project_name', required: true },
      { type: 'select' as const, label: '优先级', fieldKey: 'priority', required: true, options: ['高', '中', '低'] },
      { type: 'date' as const, label: '开始时间', fieldKey: 'start_date', required: true },
      { type: 'date' as const, label: '截止时间', fieldKey: 'end_date', required: true },
      { type: 'select' as const, label: '状态', fieldKey: 'status', required: true, options: ['未开始', '进行中', '已完成', '已取消'] },
    ]
  },
];

const FIELD_TYPES = [
  { type: 'text', icon: <FieldStringOutlined />, label: '文本' },
  { type: 'number', icon: <FieldNumberOutlined />, label: '数字' },
  { type: 'date', icon: <CalendarOutlined />, label: '日期' },
  { type: 'select', icon: <TableOutlined />, label: '选择' },
  { type: 'textarea', icon: <FileTextOutlined />, label: '多行文本' },
  { type: 'signature', icon: <UserOutlined />, label: '签名' },
];

const FIELD_TYPE_CONFIGS = {
  text: {
    defaultWidth: 4,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '文本字段'
  },
  number: {
    defaultWidth: 3,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '数字字段'
  },
  date: {
    defaultWidth: 3,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '日期字段'
  },
  datetime: {
    defaultWidth: 4,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '日期时间字段'
  },
  select: {
    defaultWidth: 4,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '单选字段'
  },
  multiselect: {
    defaultWidth: 5,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '多选字段'
  },
  radio: {
    defaultWidth: 4,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '单选按钮'
  },
  checkbox: {
    defaultWidth: 2,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 1,
    label: '复选框'
  },
  textarea: {
    defaultWidth: 6,
    defaultHeight: 3,
    minHeight: 2,
    minWidth: 3,
    label: '多行文本'
  },
  rating: {
    defaultWidth: 4,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '评分字段'
  },
  url: {
    defaultWidth: 6,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 3,
    label: '网址字段'
  },
  email: {
    defaultWidth: 5,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 3,
    label: '邮箱字段'
  },
  phone: {
    defaultWidth: 4,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '电话字段'
  },
  attachment: {
    defaultWidth: 5,
    defaultHeight: 2,
    minHeight: 2,
    minWidth: 3,
    label: '附件字段'
  },
  signature: {
    defaultWidth: 4,
    defaultHeight: 2,
    minHeight: 2,
    minWidth: 3,
    label: '签名区域'
  },
  formula: {
    defaultWidth: 3,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '公式字段'
  },
  lookup: {
    defaultWidth: 4,
    defaultHeight: 1,
    minHeight: 1,
    minWidth: 2,
    label: '查找引用'
  },
};

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  visible,
  onClose,
  onSave,
  initialData = [],
  title = '模板编辑器',
  pageSize = 'A4',
  orientation = 'portrait',
  onPageSizeChange,
  onOrientationChange
}) => {
  const [fields, setFields] = useState<TemplateField[]>(initialData);
  const [selectedField, setSelectedField] = useState<TemplateField | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [currentOrientation, setCurrentOrientation] = useState(orientation);
  const [form] = Form.useForm();

  // 页面尺寸配置
  const PAGE_SIZES = [
    { value: 'A3', label: 'A3 (297×420mm)', cols: 16 },
    { value: 'A4', label: 'A4 (210×297mm)', cols: 12 },
    { value: 'A5', label: 'A5 (148×210mm)', cols: 8 },
    { value: 'Letter', label: 'Letter (216×279mm)', cols: 10 },
    { value: 'Legal', label: 'Legal (216×356mm)', cols: 14 },
  ];

  // 常用模板库
  const COMMON_TEMPLATES = [
    {
      name: '请假申请单',
      description: '标准请假申请模板',
      icon: <CalendarOutlined />,
      fields: [
        {
          id: 'field_name',
          type: 'text' as const,
          label: '申请人',
          fieldKey: 'applicant_name',
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
          id: 'field_dept',
          type: 'text' as const,
          label: '部门',
          fieldKey: 'department',
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
        {
          id: 'field_leave_type',
          type: 'select' as const,
          label: '请假类型',
          fieldKey: 'leave_type',
          required: true,
          width: 4,
          height: 1,
          x: 8,
          y: 0,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
          options: ['事假', '病假', '年假', '婚假', '产假', '丧假', '其他'],
        },
        {
          id: 'field_start_date',
          type: 'date' as const,
          label: '开始日期',
          fieldKey: 'start_date',
          required: true,
          width: 4,
          height: 1,
          x: 0,
          y: 2,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
        {
          id: 'field_end_date',
          type: 'date' as const,
          label: '结束日期',
          fieldKey: 'end_date',
          required: true,
          width: 4,
          height: 1,
          x: 4,
          y: 2,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
        {
          id: 'field_days',
          type: 'number' as const,
          label: '请假天数',
          fieldKey: 'leave_days',
          required: true,
          width: 4,
          height: 1,
          x: 8,
          y: 2,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
        {
          id: 'field_reason',
          type: 'textarea' as const,
          label: '请假事由',
          fieldKey: 'leave_reason',
          required: true,
          width: 12,
          height: 3,
          x: 0,
          y: 4,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
      ],
    },
    {
      name: '报销申请单',
      description: '费用报销申请模板',
      icon: <FileTextOutlined />,
      fields: [
        {
          id: 'field_applicant',
          type: 'text' as const,
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
          id: 'field_department',
          type: 'text' as const,
          label: '部门',
          fieldKey: 'department',
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
        {
          id: 'field_date',
          type: 'date' as const,
          label: '申请日期',
          fieldKey: 'apply_date',
          required: true,
          width: 4,
          height: 1,
          x: 8,
          y: 0,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
        {
          id: 'field_amount',
          type: 'number' as const,
          label: '报销金额',
          fieldKey: 'amount',
          required: true,
          width: 6,
          height: 1,
          x: 0,
          y: 2,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
        {
          id: 'field_type',
          type: 'select' as const,
          label: '费用类型',
          fieldKey: 'expense_type',
          required: true,
          width: 6,
          height: 1,
          x: 6,
          y: 2,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
          options: ['交通费', '餐费', '住宿费', '办公用品', '招待费', '其他'],
        },
        {
          id: 'field_description',
          type: 'textarea' as const,
          label: '费用说明',
          fieldKey: 'description',
          required: true,
          width: 12,
          height: 3,
          x: 0,
          y: 4,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
      ],
    },
    {
      name: '采购申请单',
      description: '物品采购申请模板',
      icon: <TableOutlined />,
      fields: [
        {
          id: 'field_requester',
          type: 'text' as const,
          label: '申请人',
          fieldKey: 'requester',
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
          id: 'field_department',
          type: 'text' as const,
          label: '申请部门',
          fieldKey: 'dept',
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
        {
          id: 'field_date',
          type: 'date' as const,
          label: '申请日期',
          fieldKey: 'date',
          required: true,
          width: 4,
          height: 1,
          x: 8,
          y: 0,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
        {
          id: 'field_item',
          type: 'text' as const,
          label: '物品名称',
          fieldKey: 'item_name',
          required: true,
          width: 6,
          height: 1,
          x: 0,
          y: 2,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
        {
          id: 'field_quantity',
          type: 'number' as const,
          label: '数量',
          fieldKey: 'quantity',
          required: true,
          width: 3,
          height: 1,
          x: 6,
          y: 2,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
        {
          id: 'field_price',
          type: 'number' as const,
          label: '单价',
          fieldKey: 'unit_price',
          required: true,
          width: 3,
          height: 1,
          x: 9,
          y: 2,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
        {
          id: 'field_purpose',
          type: 'textarea' as const,
          label: '用途说明',
          fieldKey: 'purpose',
          required: true,
          width: 12,
          height: 3,
          x: 0,
          y: 4,
          fontSize: 14,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
        },
      ],
    },
  ];

  // 获取当前页面配置
  const getCurrentPageConfig = () => {
    return PAGE_SIZES.find(size => size.value === currentPageSize) || PAGE_SIZES[1];
  };

  // 应用常用模板
  const applyTemplate = (template: typeof COMMON_TEMPLATES[0]) => {
    setFields(template.fields.map(field => ({
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      fontWeight: field.fontWeight as 'normal' | 'bold',
      textAlign: field.textAlign as 'left' | 'center' | 'right',
    })) as TemplateField[]);
    message.success(`已应用模板: ${template.name}`);
  };

  // 处理页面尺寸变化
  const handlePageSizeChange = (size: string) => {
    setCurrentPageSize(size);
    onPageSizeChange?.(size);
  };

  // 处理页面方向变化
  const handleOrientationChange = (orientation: string) => {
    setCurrentOrientation(orientation);
    onOrientationChange?.(orientation);
  };

  // 布局数据
  const layout = useMemo(() => {
    return fields.map(field => ({
      i: field.id,
      x: field.x,
      y: field.y,
      w: field.width,
      h: field.height,
    }));
  }, [fields]);

  // 处理布局变化
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setFields(prevFields =>
      prevFields.map(field => {
        const layoutItem = newLayout.find(item => item.i === field.id);
        if (layoutItem) {
          return {
            ...field,
            x: layoutItem.x,
            y: layoutItem.y,
            width: layoutItem.w,
            height: layoutItem.h,
          };
        }
        return field;
      })
    );
  }, []);

  // 添加新字段
  const addField = useCallback((type: TemplateField['type'], fieldConfig?: Partial<TemplateField>) => {
    const config = FIELD_TYPE_CONFIGS[type];
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      type,
      label: fieldConfig?.label || config.label,
      fieldKey: fieldConfig?.fieldKey || `field_${fields.length + 1}`,
      required: fieldConfig?.required ?? false,
      width: fieldConfig?.width || config.defaultWidth,
      height: fieldConfig?.height || config.defaultHeight,
      x: fieldConfig?.x ?? 0,
      y: fieldConfig?.y ?? fields.length * 2, // 简单的垂直排列
      fontSize: fieldConfig?.fontSize ?? 14,
      fontWeight: fieldConfig?.fontWeight ?? 'normal',
      color: fieldConfig?.color ?? '#000000',
      textAlign: fieldConfig?.textAlign ?? 'left',
      options: fieldConfig?.options || (type === 'select' || type === 'multiselect' || type === 'radio' ? ['选项1', '选项2', '选项3'] : undefined),
      category: fieldConfig?.category,
      description: fieldConfig?.description,
    };

    setFields(prev => [...prev, newField]);
    message.success('字段添加成功');
  }, [fields.length]);

  // 删除字段
  const deleteField = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
    message.success('字段删除成功');
  }, [selectedField]);

  // 编辑字段
  const editField = useCallback((field: TemplateField) => {
    setSelectedField(field);
    form.setFieldsValue(field);
    setEditModalVisible(true);
  }, [form]);

  // 保存字段编辑
  const saveFieldEdit = useCallback(() => {
    form.validateFields().then(values => {
      if (!selectedField) return;

      setFields(prev =>
        prev.map(field =>
          field.id === selectedField.id
            ? { ...field, ...values }
            : field
        )
      );
      setEditModalVisible(false);
      setSelectedField(null);
      form.resetFields();
      message.success('字段更新成功');
    });
  }, [selectedField, form]);

  // 渲染字段组件
  const renderField = useCallback((field: TemplateField) => {
    const isSelected = selectedField?.id === field.id;

    let content = null;
    switch (field.type) {
      case 'text':
      case 'phone':
        content = <Input placeholder={field.label} disabled={previewMode} />;
        break;
      case 'number':
        content = <InputNumber placeholder={field.label} disabled={previewMode} style={{ width: '100%' }} />;
        break;
      case 'date':
      case 'datetime':
        content = <Input placeholder={field.label} disabled={previewMode} />;
        break;
      case 'select':
      case 'multiselect':
      case 'radio':
        content = (
          <Select
            placeholder={field.label}
            disabled={previewMode}
            style={{ width: '100%' }}
            mode={field.type === 'multiselect' ? 'multiple' : undefined}
          >
            {field.options?.map(option => (
              <Option key={option} value={option}>{option}</Option>
            ))}
          </Select>
        );
        break;
      case 'checkbox':
        content = (
          <Checkbox disabled={previewMode}>
            {field.label}
          </Checkbox>
        );
        break;
      case 'textarea':
        content = <Input.TextArea placeholder={field.label} disabled={previewMode} rows={3} />;
        break;
      case 'rating':
        content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <StarOutlined style={{ color: '#fadb14' }} />
            <StarOutlined style={{ color: '#fadb14' }} />
            <StarOutlined style={{ color: '#fadb14' }} />
            <StarOutlined style={{ color: '#d9d9d9' }} />
            <StarOutlined style={{ color: '#d9d9d9' }} />
            <span style={{ marginLeft: '8px', fontSize: '12px' }}>{field.label}</span>
          </div>
        );
        break;
      case 'url':
        content = (
          <Input
            placeholder={field.label}
            disabled={previewMode}
            prefix={<LinkOutlined />}
          />
        );
        break;
      case 'email':
        content = (
          <Input
            placeholder={field.label}
            disabled={previewMode}
            prefix={<MailOutlined />}
          />
        );
        break;
      case 'attachment':
        content = (
          <div className="signature-placeholder">
            <PaperClipOutlined />
            <span>{field.label}</span>
          </div>
        );
        break;
      case 'signature':
        content = (
          <div className="signature-placeholder">
            <UserOutlined />
            <span>{field.label}</span>
          </div>
        );
        break;
      case 'formula':
        content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CalculatorOutlined style={{ color: '#1890ff' }} />
            <Input placeholder="自动计算" disabled={true} style={{ width: '100%' }} />
          </div>
        );
        break;
      case 'lookup':
        content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <SearchOutlined style={{ color: '#1890ff' }} />
            <Select placeholder={field.label} disabled={previewMode} style={{ width: '100%', flex: 1 }}>
              <Option value="lookup1">查找结果 1</Option>
              <Option value="lookup2">查找结果 2</Option>
            </Select>
          </div>
        );
        break;
      default:
        content = <Input placeholder={field.label} disabled={previewMode} />;
    }

    return (
      <div
        className={`template-field ${isSelected ? 'selected' : ''} ${previewMode ? 'preview' : 'edit'}`}
        style={{
          fontSize: `${field.fontSize}px`,
          fontWeight: field.fontWeight,
          color: field.color,
          textAlign: field.textAlign,
        }}
      >
        <div className="field-header">
          <span className="field-label">
            {field.label}
            {field.required && <span style={{ color: 'red' }}> *</span>}
          </span>
          {!previewMode && (
            <div className="field-actions">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => editField(field)}
              />
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => deleteField(field.id)}
                danger
              />
            </div>
          )}
        </div>
        <div className="field-content">
          {content}
        </div>
      </div>
    );
  }, [selectedField, previewMode, editField, deleteField]);

  // 生成打印预览HTML
  const generatePrintPreview = useCallback(() => {
    if (fields.length === 0) {
      message.warning('模板为空，无法生成预览');
      return;
    }

    // 按位置排序字段
    const sortedFields = [...fields].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    // 生成表格HTML
    let tableHTML = `
      <div class="print-preview-container" style="font-family: SimSun, Microsoft YaHei, Arial, sans-serif;">
        <div class="print-header" style="text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #1890ff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #1890ff;">审批单</h1>
          <div class="subtitle" style="margin-top: 8px; font-size: 14px; color: #666;">生成时间：${new Date().toLocaleString()}</div>
        </div>
        <table class="info-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; border: 2px solid #333 !important;">
    `;

    sortedFields.forEach((field, index) => {
      const fieldValue = getFieldPreviewValue(field);
      tableHTML += `
        <tr>
          <th style="border: 1px solid #333 !important; padding: 8px 12px; text-align: left; vertical-align: middle; background-color: #f8f9fa; font-weight: 700; width: 120px; color: #333; border-bottom: 2px solid #333 !important;">
            ${field.label}${field.required ? '<span style="color: red;"> *</span>' : ''}
          </th>
          <td style="border: 1px solid #333 !important; padding: 8px 12px; text-align: left; vertical-align: middle; background-color: #fff; color: #262626; ${index % 2 === 1 ? 'background-color: #fafafa;' : ''}">
            ${fieldValue}
          </td>
        </tr>
      `;
    });

    tableHTML += `
        </table>
        <div class="print-footer" style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 5px 0;">审批人：______________  日期：______________</p>
        </div>
      </div>
    `;

    // 完整的HTML文档
    const fullHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>打印预览</title>
          <style>
            @page {
              size: ${currentPageSize} ${currentOrientation};
              margin: 20mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: SimSun, "Microsoft YaHei", Arial, sans-serif;
              font-size: 12px;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            .info-table {
              border: 2px solid #333 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .info-table th,
            .info-table td {
              border: 1px solid #333 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .info-table th {
              border-bottom: 2px solid #333 !important;
              background-color: #f0f0f0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .info-table tr:nth-child(even) td {
              background-color: #f9f9f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media screen {
              .info-table tr:hover td {
                background-color: #e6f7ff !important;
              }
            }
          </style>
        </head>
        <body>
          ${tableHTML}
          <script>
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    // 在新窗口中打开预览
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(fullHTML);
      previewWindow.document.close();
      previewWindow.focus();
    } else {
      message.error('无法打开预览窗口，请检查浏览器弹窗设置');
    }
  }, [fields, currentPageSize, currentOrientation]);

  // 获取字段预览值
  const getFieldPreviewValue = (field: TemplateField) => {
    switch (field.type) {
      case 'text':
      case 'number':
      case 'date':
      case 'datetime':
      case 'url':
      case 'email':
      case 'phone':
        return `<span style="color: #666; font-style: italic;">请填写${field.label}</span>`;
      case 'textarea':
        return `<div style="min-height: 60px; color: #666; font-style: italic;">请填写${field.label}</div>`;
      case 'select':
      case 'radio':
        return field.options?.[0] || `<span style="color: #666;">请选择</span>`;
      case 'multiselect':
        return field.options?.slice(0, 2).join(', ') + '...' || `<span style="color: #666;">请选择</span>`;
      case 'checkbox':
        return `<input type="checkbox" disabled style="margin-right: 8px;"> ${field.label}`;
      case 'rating':
        return '★★★☆☆';
      case 'attachment':
        return `<span style="color: #1890ff;">📎 点击上传附件</span>`;
      case 'signature':
        return `<div style="border: 1px dashed #ccc; padding: 20px; text-align: center; color: #999;">签名区域</div>`;
      case 'formula':
        return `<span style="color: #1890ff; font-weight: bold;">自动计算</span>`;
      case 'lookup':
        return `<span style="color: #666; font-style: italic;">查找结果...</span>`;
      default:
        return `<span style="color: #666; font-style: italic;">请填写${field.label}</span>`;
    }
  };

  // 保存模板
  const saveTemplate = useCallback(() => {
    if (fields.length === 0) {
      message.warning('请至少添加一个字段');
      return;
    }
    onSave(fields);
    message.success('模板保存成功');
    onClose();
  }, [fields, onSave, onClose]);

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="preview"
          icon={<EyeOutlined />}
          onClick={() => setPreviewMode(!previewMode)}
        >
          {previewMode ? '编辑' : '预览'}
        </Button>,
        <Button
          key="print-preview"
          icon={<EyeOutlined />}
          onClick={generatePrintPreview}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: 'white' }}
        >
          打印预览
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          onClick={saveTemplate}
        >
          保存模板
        </Button>,
      ]}
    >
      <div className="template-editor">
        {/* 工具栏 */}
        <div className="editor-toolbar">
          <div className="toolbar-section">
            <Space wrap>
              <span>页面设置：</span>
              <Select
                value={currentPageSize}
                onChange={handlePageSizeChange}
                style={{ width: 150 }}
                size="small"
              >
                {PAGE_SIZES.map(size => (
                  <Option key={size.value} value={size.value}>
                    {size.label}
                  </Option>
                ))}
              </Select>
              <Select
                value={currentOrientation}
                onChange={handleOrientationChange}
                style={{ width: 100 }}
                size="small"
              >
                <Option value="portrait">纵向</Option>
                <Option value="landscape">横向</Option>
              </Select>
            </Space>
          </div>

          <div className="toolbar-section">
            <Space wrap>
              <span>常用模板：</span>
              {COMMON_TEMPLATES.map((template, index) => (
                <Button
                  key={index}
                  icon={template.icon}
                  onClick={() => applyTemplate(template)}
                  disabled={previewMode}
                  size="small"
                  type="dashed"
                >
                  {template.name}
                </Button>
              ))}
            </Space>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', height: '600px' }}>
          {/* 左侧字段面板 */}
          <div style={{ width: '280px', background: '#f8f9fa', borderRadius: '8px', padding: '16px', overflow: 'auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>飞书字段类型</h4>

              {/* 基础字段 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>基础字段</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {FIELD_TYPES_BY_CATEGORY['基础字段']?.map(field => (
                    <Button
                      key={field.type}
                      size="small"
                      icon={field.icon}
                      onClick={() => addField(field.type as TemplateField['type'])}
                      disabled={previewMode}
                      style={{
                        justifyContent: 'flex-start',
                        height: 'auto',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '12px'
                      }}
                      block
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{field.label}</div>
                        <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{field.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 时间字段 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>时间字段</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {FIELD_TYPES_BY_CATEGORY['时间字段']?.map(field => (
                    <Button
                      key={field.type}
                      size="small"
                      icon={field.icon}
                      onClick={() => addField(field.type as TemplateField['type'])}
                      disabled={previewMode}
                      style={{
                        justifyContent: 'flex-start',
                        height: 'auto',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '12px'
                      }}
                      block
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{field.label}</div>
                        <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{field.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 选择字段 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>选择字段</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {FIELD_TYPES_BY_CATEGORY['选择字段']?.map(field => (
                    <Button
                      key={field.type}
                      size="small"
                      icon={field.icon}
                      onClick={() => addField(field.type as TemplateField['type'])}
                      disabled={previewMode}
                      style={{
                        justifyContent: 'flex-start',
                        height: 'auto',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '12px'
                      }}
                      block
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{field.label}</div>
                        <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{field.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 高级字段 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>高级字段</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {FIELD_TYPES_BY_CATEGORY['高级字段']?.map(field => (
                    <Button
                      key={field.type}
                      size="small"
                      icon={field.icon}
                      onClick={() => addField(field.type as TemplateField['type'])}
                      disabled={previewMode}
                      style={{
                        justifyContent: 'flex-start',
                        height: 'auto',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '12px'
                      }}
                      block
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{field.label}</div>
                        <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{field.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 常用字段预设 */}
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>常用字段组合</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {COMMON_FIELD_PRESETS.map((preset, index) => (
                    <Button
                      key={index}
                      size="small"
                      onClick={() => {
                        preset.fields.forEach(fieldConfig => {
                          addField(fieldConfig.type as TemplateField['type'], fieldConfig);
                        });
                      }}
                      disabled={previewMode}
                      style={{
                        justifyContent: 'flex-start',
                        height: 'auto',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        borderStyle: 'dashed'
                      }}
                      block
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{preset.name}</div>
                        <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                          {preset.fields.length} 个字段
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧编辑区域 */}
          <div className="editor-content" style={{ flex: 1 }}>
            <div className="editor-canvas" style={{ height: '100%', overflow: 'auto' }}>
              <GridLayout
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={40}
                width={800}
                onLayoutChange={handleLayoutChange}
                isDraggable={!previewMode}
                isResizable={!previewMode}
                compactType="vertical"
                preventCollision={false}
              >
                {fields.map(field => (
                  <div key={field.id} className="grid-item">
                    {renderField(field)}
                  </div>
                ))}
              </GridLayout>

              {fields.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <EditOutlined />
                  </div>
                  <div className="empty-text">
                    <h3>开始创建模板</h3>
                    <p>从左侧拖拽或点击添加字段，然后调整位置和大小</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 字段编辑模态框 */}
        <Modal
          title="编辑字段"
          open={editModalVisible}
          onOk={saveFieldEdit}
          onCancel={() => {
            setEditModalVisible(false);
            setSelectedField(null);
            form.resetFields();
          }}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="label"
              label="字段标签"
              rules={[{ required: true, message: '请输入字段标签' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="fieldKey"
              label="字段键名"
              rules={[{ required: true, message: '请输入字段键名' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="required" valuePropName="checked">
              <Switch /> 必填字段
            </Form.Item>

            <Form.Item name="fontSize" label="字体大小">
              <InputNumber min={10} max={72} />
            </Form.Item>

            <Form.Item name="fontWeight" label="字体粗细">
              <Select>
                <Option value="normal">正常</Option>
                <Option value="bold">粗体</Option>
              </Select>
            </Form.Item>

            <Form.Item name="color" label="字体颜色">
              <ColorPicker />
            </Form.Item>

            <Form.Item name="textAlign" label="对齐方式">
              <Select>
                <Option value="left">左对齐</Option>
                <Option value="center">居中</Option>
                <Option value="right">右对齐</Option>
              </Select>
            </Form.Item>

            {selectedField?.type === 'select' && (
              <Form.Item name="options" label="选项">
                <Select mode="tags" placeholder="添加选项" />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </div>
    </Modal>
  );
};

export default TemplateEditor;