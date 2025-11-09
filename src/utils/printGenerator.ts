import dayjs from 'dayjs';
import { PrintTemplate } from '../types';

/**
 * 生成打印HTML
 */
export const generatePrintHTML = async (
  template: PrintTemplate,
  data: any
): Promise<string> => {
  const { config, sections, styles } = template;

  // 生成CSS样式
  const css = generateCSS(config, styles);

  // 生成HTML内容
  const body = generateBody(sections, data);

  // 组装完整HTML
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>审批单 - ${data.approvalName || '未命名'}</title>
        <style>
          ${css}
        </style>
      </head>
      <body>
        <div class="print-container">
          ${body}
          ${data.showWatermark ? '<div class="watermark">飞书审批打印</div>' : ''}
        </div>
        <script>
          // 打印完成后关闭窗口
          window.onafterprint = function() {
            window.close();
          };
        </script>
      </body>
    </html>
  `;

  return html;
};

/**
 * 生成CSS样式
 */
const generateCSS = (config: any, styles: any) => {
  const { page_size, orientation, margin } = config;

  return `
    @page {
      size: ${page_size} ${orientation};
      margin: ${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: ${styles.global?.font_family || 'SimSun, "Microsoft YaHei", Arial, sans-serif'};
      font-size: ${styles.global?.font_size || 12}px;
      line-height: ${styles.global?.line_height || 1.6};
      color: #333;
      margin: 0;
      padding: 0;
      background: #fff;
    }

    .print-container {
      width: 100%;
      min-height: 100vh;
      position: relative;
    }

    /* 水印样式 */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 48px;
      color: rgba(0, 0, 0, 0.1);
      pointer-events: none;
      z-index: -1;
      white-space: nowrap;
    }

    /* 标题样式 */
    .print-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #1890ff;
    }

    .print-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
      color: #1890ff;
      font-family: "Microsoft YaHei", sans-serif;
    }

    .print-header .subtitle {
      margin-top: 8px;
      font-size: 14px;
      color: #666;
    }

    /* 信息表格样式 */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }

    .info-table th,
    .info-table td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
      vertical-align: middle;
    }

    .info-table th {
      background-color: #f8f9fa;
      font-weight: 600;
      width: 120px;
      color: #333;
    }

    .info-table td {
      background-color: #fff;
      color: #262626;
    }

    /* 审批节点样式 */
    .approval-nodes {
      margin-bottom: 20px;
    }

    .node-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #333;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }

    .approval-node {
      margin-bottom: 15px;
      padding: 15px;
      border-left: 4px solid #1890ff;
      background-color: #fafafa;
      border-radius: 0 4px 4px 0;
    }

    .node-name {
      font-weight: 600;
      margin-bottom: 10px;
      color: #1890ff;
      font-size: 14px;
    }

    .approver-item {
      margin-bottom: 8px;
      padding: 8px;
      background: white;
      border-radius: 4px;
      border: 1px solid #e8e8e8;
    }

    .approver-name {
      font-weight: 500;
      color: #262626;
    }

    .approver-action {
      margin-left: 10px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      display: inline-block;
    }

    .action-approved {
      background-color: #f6ffed;
      color: #52c41a;
      border: 1px solid #b7eb8f;
    }

    .action-rejected {
      background-color: #fff2f0;
      color: #ff4d4f;
      border: 1px solid #ffccc7;
    }

    .action-comment {
      background-color: #e6f7ff;
      color: #1890ff;
      border: 1px solid #91d5ff;
    }

    .approver-time {
      margin-left: 10px;
      color: #8c8c8c;
      font-size: 11px;
    }

    .approver-comment {
      margin-top: 8px;
      padding: 8px;
      background-color: #f9f9f9;
      border-radius: 4px;
      font-size: 11px;
      color: #595959;
      border-left: 2px solid #d9d9d9;
    }

    /* 表单数据样式 */
    .form-data {
      margin-bottom: 20px;
    }

    .form-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #333;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }

    .form-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .form-table th,
    .form-table td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }

    .form-table th {
      background-color: #f8f9fa;
      font-weight: 600;
      width: 120px;
      color: #333;
    }

    .form-table td {
      background-color: #fff;
      color: #262626;
      word-break: break-word;
    }

    /* 页脚样式 */
    .print-footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      text-align: right;
      color: #8c8c8c;
      font-size: 10px;
    }

    /* 状态标签 */
    .status-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .status-approved {
      background-color: #f6ffed;
      color: #52c41a;
      border: 1px solid #b7eb8f;
    }

    .status-rejected {
      background-color: #fff2f0;
      color: #ff4d4f;
      border: 1px solid #ffccc7;
    }

    .status-pending {
      background-color: #fffbe6;
      color: #faad14;
      border: 1px solid #ffe58f;
    }

    /* 分页控制 */
    .page-break {
      page-break-before: always;
    }

    .no-break {
      page-break-inside: avoid;
    }

    /* 打印时隐藏不必要的元素 */
    @media print {
      .no-print {
        display: none !important;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    /* 特殊内容样式 */
    .highlight {
      background-color: #fffbe6;
      padding: 2px 4px;
      border-radius: 2px;
    }

    .important {
      color: #ff4d4f;
      font-weight: 600;
    }

    .code {
      font-family: 'Courier New', monospace;
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 2px;
    }
  `;
};

/**
 * 生成HTML内容
 */
const generateBody = (sections: any[], data: any) => {
  let body = '';

  for (const section of sections) {
    switch (section.type) {
      case 'header':
        body += renderHeader(section, data);
        break;
      case 'info':
        body += renderInfo(section, data);
        break;
      case 'nodes':
        body += renderNodes(section, data);
        break;
      case 'form':
        body += renderForm(section, data);
        break;
      case 'footer':
        body += renderFooter(section, data);
        break;
    }
  }

  return body;
};

/**
 * 渲染标题
 */
const renderHeader = (section: any, data: any) => {
  const text = section.content.text.replace(/{{(\w+)}}/g, (match, key) => {
    return data[key] || match;
  });

  return `
    <div class="print-header">
      <h1>${text}</h1>
      ${section.content.subtitle ? `<div class="subtitle">${section.content.subtitle}</div>` : ''}
    </div>
  `;
};

/**
 * 渲染基础信息
 */
const renderInfo = (section: any, data: any) => {
  let rows = '';

  // 默认信息字段
  const defaultFields = [
    { key: 'approvalName', label: '审批类型' },
    { key: 'applicantName', label: '申请人' },
    { key: 'applicantDepartment', label: '申请部门' },
    { key: 'createTime', label: '申请时间' },
    { key: 'status', label: '审批状态' },
    { key: 'approveTime', label: '审批时间' },
  ];

  const fields = section.fields || defaultFields;

  for (const field of fields) {
    const value = getNestedValue(data, field.key);
    const displayValue = formatDisplayValue(value, field.key);

    rows += `
      <tr>
        <th>${field.label}</th>
        <td>${displayValue}</td>
      </tr>
    `;
  }

  return `
    <div class="info-section">
      <table class="info-table">
        ${rows}
      </table>
    </div>
  `;
};

/**
 * 渲染审批节点
 */
const renderNodes = (section: any, data: any) => {
  if (!data.nodes || data.nodes.length === 0) {
    return '';
  }

  let nodesHtml = '';

  for (const node of data.nodes) {
    let approversHtml = '';

    for (const approver of node.approvers) {
      const actionClass = `action-${approver.action.toLowerCase()}`;
      const actionText = getActionText(approver.action);

      approversHtml += `
        <div class="approver-item">
          <span class="approver-name">${approver.name}</span>
          <span class="approver-action ${actionClass}">${actionText}</span>
          <span class="approver-time">${formatDateTime(approver.handle_time)}</span>
          ${approver.comment && section.show_comments ? `
            <div class="approver-comment">
              <strong>意见：</strong>${approver.comment}
            </div>
          ` : ''}
        </div>
      `;
    }

    nodesHtml += `
      <div class="approval-node">
        <div class="node-name">${node.node_name}</div>
        ${approversHtml}
      </div>
    `;
  }

  return `
    <div class="approval-nodes">
      <h3 class="node-title">${section.title || '审批流程'}</h3>
      ${nodesHtml}
    </div>
  `;
};

/**
 * 渲染表单数据
 */
const renderForm = (section: any, data: any) => {
  if (!data.formData || Object.keys(data.formData).length === 0) {
    return '';
  }

  let rows = '';

  for (const [key, value] of Object.entries(data.formData)) {
    const label = getFormFieldLabel(key);
    const displayValue = formatDisplayValue(value, key);

    rows += `
      <tr>
        <th>${label}</th>
        <td>${displayValue}</td>
      </tr>
    `;
  }

  return `
    <div class="form-data">
      <h3 class="form-title">${section.title || '申请详情'}</h3>
      <table class="form-table">
        ${rows}
      </table>
    </div>
  `;
};

/**
 * 渲染页脚
 */
const renderFooter = (section: any, data: any) => {
  const text = section.content.text.replace(/{{(\w+)}}/g, (match, key) => {
    switch (key) {
      case 'printTime':
        return formatDateTime(new Date());
      default:
        return data[key] || match;
    }
  });

  return `
    <div class="print-footer">
      <p>${text}</p>
    </div>
  `;
};

/**
 * 工具函数
 */
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : '';
  }, obj);
};

const formatDisplayValue = (value: any, key: string) => {
  if (!value) return '';

  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  if (Array.isArray(value)) {
    return value.map(item =>
      typeof item === 'object' ? item.name || JSON.stringify(item) : item
    ).join(', ');
  }

  if (key.includes('Time') || key.includes('time')) {
    return formatDateTime(value);
  }

  if (key === 'status') {
    const statusMap: Record<string, string> = {
      'APPROVED': '已通过',
      'REJECTED': '已拒绝',
      'PENDING': '待审批',
      'REVOKED': '已撤销',
    };
    return `<span class="status-tag status-${value.toLowerCase()}">${statusMap[value] || value}</span>`;
  }

  return String(value);
};

const formatDateTime = (date: string | Date) => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

const getActionText = (action: string) => {
  const actionMap: Record<string, string> = {
    'APPROVE': '同意',
    'REJECT': '拒绝',
    'COMMENT': '评论',
    'REVOKE': '撤销',
  };
  return actionMap[action] || action;
};

const getFormFieldLabel = (key: string) => {
  const labelMap: Record<string, string> = {
    'start_time': '开始时间',
    'end_time': '结束时间',
    'reason': '申请原因',
    'duration': '时长',
    'amount': '金额',
    'description': '描述',
    'leave_type': '请假类型',
    'destination': '目的地',
    'purpose': '事由',
  };
  return labelMap[key] || key;
};