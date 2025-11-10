/**
 * 环境配置管理工具
 * 统一管理开发环境和生产环境的配置差异
 */

export interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  apiBaseUrl: string;
  feishuRedirectUri: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  appName: string;
  version: string;
  debugMode: boolean;
}

class EnvironmentConfigManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): EnvironmentConfig {
    const isDevelopment = process.env.REACT_APP_DEV_MODE === 'true' ||
                        process.env.NODE_ENV === 'development';
    const isProduction = !isDevelopment;

    return {
      isDevelopment,
      isProduction,
      apiBaseUrl: isDevelopment ?
        'http://localhost:3002' :
        'https://ivanli163.github.io/feishu-approval-print',
      feishuRedirectUri: process.env.REACT_APP_FEISHU_REDIRECT_URI ||
        (isDevelopment ?
          'http://localhost:3002/auth/feishu/callback' :
          'https://ivanli163.github.io/feishu-approval-print/auth/feishu/callback'),
      supabaseUrl: process.env.REACT_APP_SUPABASE_URL || '',
      supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || '',
      appName: process.env.REACT_APP_APP_NAME || '审批打印系统',
      version: process.env.REACT_APP_VERSION || '1.0.0',
      debugMode: isDevelopment,
    };
  }

  /**
   * 获取当前环境配置
   */
  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  /**
   * 检查是否在开发环境
   */
  isDev(): boolean {
    return this.config.isDevelopment;
  }

  /**
   * 检查是否在生产环境
   */
  isProd(): boolean {
    return this.config.isProduction;
  }

  /**
   * 获取飞书回调URL
   */
  getFeishuRedirectUri(): string {
    return this.config.feishuRedirectUri;
  }

  /**
   * 获取API基础URL
   */
  getApiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  /**
   * 获取Supabase配置
   */
  getSupabaseConfig() {
    return {
      url: this.config.supabaseUrl,
      anonKey: this.config.supabaseAnonKey,
    };
  }

  /**
   * 获取应用信息
   */
  getAppInfo() {
    return {
      name: this.config.appName,
      version: this.config.version,
      environment: this.config.isDevelopment ? 'development' : 'production',
    };
  }

  /**
   * 打印当前环境配置 (仅开发环境)
   */
  logConfig(): void {
    if (this.config.debugMode) {
      console.group('🌍 环境配置信息');
      console.log('环境:', this.config.isDevelopment ? '开发环境' : '生产环境');
      console.log('API基础URL:', this.config.apiBaseUrl);
      console.log('飞书回调URL:', this.config.feishuRedirectUri);
      console.log('应用名称:', this.config.appName);
      console.log('版本:', this.config.version);
      console.log('调试模式:', this.config.debugMode);
      console.log('Supabase URL:', this.config.supabaseUrl ? '已配置' : '未配置');
      console.groupEnd();
    }
  }
}

// 创建全局配置实例
export const envConfig = new EnvironmentConfigManager();

// 导出常用方法
export const isDev = () => envConfig.isDev();
export const isProd = () => envConfig.isProd();
export const getFeishuRedirectUri = () => envConfig.getFeishuRedirectUri();

export default envConfig;