/**
 * 飞书OAuth认证服务
 * 处理飞书用户登录和身份验证
 */

import { envConfig } from '../utils/envConfig';

export interface FeishuAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface FeishuUser {
  user_id: string;
  name: string;
  en_name?: string;
  email?: string;
  mobile?: string;
  avatar_url?: string;
  tenant_key: string;
  open_id: string;
  union_id: string;
  employee_type: number;
  status: {
    is_activated: boolean;
    is_frozen: boolean;
    is_resigned: boolean;
  };
}

export interface FeishuAuthResponse {
  code: string;
  state: string;
  error?: string;
}

class FeishuAuthService {
  private config: FeishuAuthConfig | null = null;
  private authWindow: Window | null = null;
  private readonly STORAGE_KEY = 'feishu_auth_config';

  constructor() {
    this.loadConfig();
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      // 从环境变量或本地存储获取配置
      const envConfigFromVars = this.getEnvConfig();
      const localConfig = localStorage.getItem(this.STORAGE_KEY);

      if (envConfigFromVars) {
        this.config = envConfigFromVars;
      } else if (localConfig) {
        this.config = JSON.parse(localConfig);
      } else {
        // 开发环境默认配置
        this.config = {
          appId: 'cli_a1234567890abcdef',
          appSecret: 'your_app_secret_here',
          redirectUri: envConfig.getFeishuRedirectUri()
        };
      }

      console.log('飞书认证配置已加载:', {
        appId: this.config?.appId,
        hasSecret: !!this.config?.appSecret,
        redirectUri: this.config?.redirectUri
      });
    } catch (error) {
      console.error('加载飞书认证配置失败:', error);
    }
  }

  /**
   * 获取环境变量配置
   */
  private getEnvConfig(): FeishuAuthConfig | null {
    // 检查环境变量
    const appId = process.env.REACT_APP_FEISHU_APP_ID;
    const appSecret = process.env.REACT_APP_FEISHU_APP_SECRET;
    const redirectUri = process.env.REACT_APP_FEISHU_REDIRECT_URI;

    if (appId && appSecret) {
      return {
        appId,
        appSecret,
        redirectUri: redirectUri || window.location.origin + '/auth/feishu/callback'
      };
    }

    return null;
  }

  /**
   * 保存配置
   */
  saveConfig(config: FeishuAuthConfig): void {
    this.config = config;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    console.log('飞书认证配置已保存');
  }

  /**
   * 检查配置是否有效
   */
  isConfigured(): boolean {
    return !!(this.config?.appId && this.config?.appSecret);
  }

  /**
   * 获取授权URL
   */
  getAuthorizationUrl(): string {
    if (!this.config) {
      throw new Error('飞书认证配置未设置');
    }

    const params = new URLSearchParams({
      app_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'identity:base profile:email',
      state: this.generateState()
    });

    return `https://open.feishu.cn/open-apis/authen/v1/authorize?${params.toString()}`;
  }

  /**
   * 生成随机状态码
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * 启动OAuth认证流程
   */
  async startOAuth(): Promise<FeishuUser> {
    return new Promise((resolve, reject) => {
      if (!this.config) {
        reject(new Error('飞书认证配置未设置'));
        return;
      }

      const authUrl = this.getAuthorizationUrl();
      console.log('启动飞书OAuth认证:', authUrl);

      // 方法1: 弹窗方式
      try {
        this.authWindow = window.open(
          authUrl,
          'feishu_auth',
          'width=600,height=600,scrollbars=yes,resizable=yes'
        );

        if (!this.authWindow) {
          throw new Error('无法打开认证窗口，请检查浏览器弹窗设置');
        }

        // 监听认证窗口关闭
        const checkClosed = setInterval(() => {
          if (this.authWindow?.closed) {
            clearInterval(checkClosed);
            reject(new Error('认证窗口被关闭'));
          }
        }, 1000);

        // 监听认证消息
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          const response = event.data as FeishuAuthResponse;
          if (response.code) {
            clearInterval(checkClosed);
            this.authWindow?.close();
            this.handleAuthCallback(response.code, response.state)
              .then(resolve)
              .catch(reject);
          } else if (response.error) {
            clearInterval(checkClosed);
            this.authWindow?.close();
            reject(new Error(`认证失败: ${response.error}`));
          }
        };

        window.addEventListener('message', handleMessage);

        // 设置超时
        setTimeout(() => {
          clearInterval(checkClosed);
          this.authWindow?.close();
          window.removeEventListener('message', handleMessage);
          reject(new Error('认证超时'));
        }, 5 * 60 * 1000); // 5分钟超时

      } catch (error) {
        console.warn('弹窗方式失败，尝试跳转方式:', error);
        // 方法2: 跳转方式
        this.saveCallbackData(resolve, reject);
        window.location.href = authUrl;
      }
    });
  }

  /**
   * 保存回调数据（用于跳转方式）
   */
  private saveCallbackData(resolve: Function, reject: Function): void {
    sessionStorage.setItem('feishu_auth_resolve', resolve.toString());
    sessionStorage.setItem('feishu_auth_reject', reject.toString());
  }

  /**
   * 处理OAuth回调
   */
  async handleAuthCallback(code: string, state: string): Promise<FeishuUser> {
    try {
      console.log('处理飞书OAuth回调:', { code, state });

      if (!this.config) {
        throw new Error('飞书认证配置未设置');
      }

      // 1. 获取access_token
      const tokenResponse = await this.getAccessToken(code);
      console.log('获取access_token成功');

      // 2. 获取用户信息
      const userResponse = await this.getUserInfo(tokenResponse.access_token);
      console.log('获取用户信息成功:', userResponse);

      // 3. 验证用户状态
      if (!userResponse.status.is_activated) {
        throw new Error('用户账号未激活');
      }

      if (userResponse.status.is_resigned) {
        throw new Error('用户账号已离职');
      }

      return userResponse;
    } catch (error) {
      console.error('飞书OAuth回调处理失败:', error);
      throw error;
    }
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
  }> {
    if (!this.config) {
      throw new Error('飞书认证配置未设置');
    }

    const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
        grant_type: 'authorization_code',
        code: code
      })
    });

    const data = await response.json();

    if (!response.ok || data.code !== 0) {
      throw new Error(`获取access_token失败: ${data.msg || '未知错误'}`);
    }

    return data.data;
  }

  /**
   * 获取用户信息
   */
  private async getUserInfo(accessToken: string): Promise<FeishuUser> {
    const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok || data.code !== 0) {
      throw new Error(`获取用户信息失败: ${data.msg || '未知错误'}`);
    }

    return data.data;
  }

  /**
   * 检查页面是否是OAuth回调
   */
  isOAuthCallback(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('code') || urlParams.has('error');
  }

  /**
   * 处理页面OAuth回调
   */
  async handlePageCallback(): Promise<FeishuUser | null> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      console.error('飞书OAuth错误:', error);
      throw new Error(`认证失败: ${error}`);
    }

    if (code && state) {
      const resolveStr = sessionStorage.getItem('feishu_auth_resolve');
      const rejectStr = sessionStorage.getItem('feishu_auth_reject');

      if (resolveStr && rejectStr) {
        const resolve = new Function('return ' + resolveStr)();
        const reject = new Function('return ' + rejectStr)();

        sessionStorage.removeItem('feishu_auth_resolve');
        sessionStorage.removeItem('feishu_auth_reject');

        try {
          const user = await this.handleAuthCallback(code, state);
          resolve(user);
          return user;
        } catch (error) {
          reject(error);
          throw error;
        }
      }
    }

    return null;
  }

  /**
   * 本地开发模拟登录
   */
  async mockLogin(): Promise<FeishuUser> {
    console.log('🚀 本地开发模式：使用模拟飞书用户');

    return {
      user_id: 'dev_mock_user_123',
      name: '开发测试用户',
      en_name: 'Dev Test User',
      email: 'dev.test@feishu.cn',
      mobile: '13800138000',
      avatar_url: 'https://example.com/avatar.jpg',
      tenant_key: 'dev_mock_tenant',
      open_id: 'dev_mock_open_id',
      union_id: 'dev_mock_union_id',
      employee_type: 1,
      status: {
        is_activated: true,
        is_frozen: false,
        is_resigned: false
      }
    };
  }

  /**
   * 检查是否在本地开发环境
   */
  isDevelopment(): boolean {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '0.0.0.0';
  }

  /**
   * 统一登录入口
   */
  async login(): Promise<FeishuUser> {
    // 本地开发环境使用模拟登录
    if (this.isDevelopment()) {
      return this.mockLogin();
    }

    // 生产环境使用真实OAuth
    if (!this.isConfigured()) {
      throw new Error('飞书认证配置未设置，请先配置应用ID和应用密钥');
    }

    return this.startOAuth();
  }

  /**
   * 获取当前配置
   */
  getConfig(): FeishuAuthConfig | null {
    return this.config ? { ...this.config } : null;
  }
}

// 创建全局实例
export const feishuAuthService = new FeishuAuthService();
export default feishuAuthService;