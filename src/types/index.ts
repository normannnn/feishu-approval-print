// 应用配置类型
export interface AppConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

// 飞书多维表格相关类型定义
export interface BitableContext {
  appId: string;
  tableId: string;
  viewId?: string;
  userId: string;
  tenantKey: string;
  appConfig?: AppConfig;
}

export interface BitableRecord {
  record_id: string;
  fields: Record<string, any>;
  created_time: number;
  last_modified_time: number;
}

export interface BitableField {
  field_id: string;
  field_name: string;
  type: string;
  property: any;
}

export interface BitableView {
  view_id: string;
  view_name: string;
  type: string;
}

// 审批相关类型
export interface ApprovalRecord {
  record_id: string;
  instance_id?: string;
  approval_name: string;
  applicant_name: string;
  status: string;
  create_time: string;
  approve_time?: string;
  sync_time?: string;
  applicant_department?: string;
  approval_code?: string;
}

export interface ApprovalDetail {
  instance_id: string;
  approval_name: string;
  approval_code: string;
  status: string;
  applicant: {
    id: string;
    name: string;
    department: string;
    email?: string;
  };
  create_time: string;
  approve_time?: string;
  nodes: ApprovalNode[];
  form_data: Record<string, any>;
  attachments?: any[];
}

export interface ApprovalNode {
  node_id: string;
  node_name: string;
  node_type: string;
  approvers: Approver[];
}

export interface Approver {
  id: string;
  user_id: string;
  name: string;
  action: 'APPROVE' | 'REJECT' | 'COMMENT' | 'REVOKE';
  comment?: string;
  handle_time: string;
}

// 打印模板类型
export interface PrintTemplate {
  id: string;
  name: string;
  description: string;
  config: TemplateConfig;
  sections: TemplateSection[];
  styles: TemplateStyles;
  is_default?: boolean;
  created_time: string;
  updated_time: string;
}

export interface TemplateConfig {
  page_size: 'A4' | 'A3' | 'A5';
  orientation: 'portrait' | 'landscape';
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface TemplateSection {
  id: string;
  type: 'header' | 'info' | 'table' | 'nodes' | 'form' | 'footer';
  title?: string;
  content?: any;
  fields?: TemplateField[];
  show_comments?: boolean;
  style?: any;
}

export interface TemplateField {
  key: string;
  label: string;
  width?: string;
  format?: string;
}

export interface TemplateStyles {
  global: {
    font_family: string;
    font_size: number;
    line_height: number;
  };
  elements?: Record<string, any>;
}

// UI Builder 组件类型
export interface UIBuilderComponent {
  type: string;
  props?: Record<string, any>;
  children?: UIBuilderComponent[];
}

export interface UIBuilderPageConfig {
  title: string;
  components: UIBuilderComponent[];
  style?: Record<string, any>;
}