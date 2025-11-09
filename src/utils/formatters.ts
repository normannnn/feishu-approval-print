import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 扩展relativeTime插件
dayjs.extend(relativeTime);

// 设置中文语言
dayjs.locale('zh-cn');

/**
 * 格式化日期时间
 */
export const formatDateTime = (date: string | Date | null | undefined, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

/**
 * 格式化日期
 */
export const formatDate = (date: string | Date | null | undefined) => {
  return formatDateTime(date, 'YYYY-MM-DD');
};

/**
 * 格式化时间
 */
export const formatTime = (date: string | Date | null | undefined) => {
  return formatDateTime(date, 'HH:mm:ss');
};

/**
 * 相对时间格式化
 */
export const formatRelativeTime = (date: string | Date | null | undefined) => {
  if (!date) return '-';
  return dayjs(date).fromNow();
};

/**
 * 审批状态格式化
 */
export const formatApprovalStatus = (status: string) => {
  const statusMap: Record<string, { text: string; color: string }> = {
    'APPROVED': { text: '已通过', color: '#52c41a' },
    'REJECTED': { text: '已拒绝', color: '#ff4d4f' },
    'PENDING': { text: '待审批', color: '#faad14' },
    'REVOKED': { text: '已撤销', color: '#8c8c8c' },
    'DRAFT': { text: '草稿', color: '#d9d9d9' },
  };

  const config = statusMap[status] || { text: status, color: '#8c8c8c' };
  return config;
};

/**
 * 审批动作格式化
 */
export const formatApprovalAction = (action: string) => {
  const actionMap: Record<string, string> = {
    'APPROVE': '同意',
    'REJECT': '拒绝',
    'COMMENT': '评论',
    'REVOKE': '撤销',
  };

  return actionMap[action] || action;
};

/**
 * 节点类型格式化
 */
export const formatNodeType = (type: string) => {
  const typeMap: Record<string, string> = {
    'ROOT': '发起节点',
    'ROUTE': '审批节点',
    'AND': '会签节点',
    'OR': '或签节点',
    'CC': '抄送节点',
    'CONDITION': '条件节点',
  };

  return typeMap[type] || type;
};

/**
 * 文件大小格式化
 */
export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 数字格式化
 */
export const formatNumber = (num: number | string, decimals = 0) => {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '-';

  return number.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * 金额格式化
 */
export const formatCurrency = (amount: number | string) => {
  const number = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(number)) return '-';

  return '¥' + number.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * 百分比格式化
 */
export const formatPercentage = (value: number | string, decimals = 1) => {
  const number = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(number)) return '-';

  return number.toFixed(decimals) + '%';
};

/**
 * 手机号脱敏
 */
export const maskPhoneNumber = (phone: string) => {
  if (!phone || phone.length < 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

/**
 * 邮箱脱敏
 */
export const maskEmail = (email: string) => {
  if (!email || !email.includes('@')) return email;
  const [username, domain] = email.split('@');
  if (username.length <= 3) return email;

  const maskedUsername = username.slice(0, 2) + '***' + username.slice(-1);
  return maskedUsername + '@' + domain;
};

/**
 * 截断文本
 */
export const truncateText = (text: string, maxLength = 50) => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * 首字母大写
 */
export const capitalize = (text: string) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * 生成随机颜色
 */
export const generateRandomColor = () => {
  const colors = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
    '#13c2c2', '#eb2f96', '#fa541c', '#a0d911', '#2f54eb'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
};

/**
 * 深拷贝
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;

  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
};