import React, { useEffect, useState } from 'react';
import { ConfigProvider, theme, Card, Tabs, Space, Button, message, Badge, Tooltip } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  FileTextOutlined,
  PrinterOutlined,
  SettingOutlined,
  BarChartOutlined,
  SyncOutlined,
  ToolOutlined,
  CloudOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  DatabaseOutlined,
  WifiOutlined,
  DisconnectOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import 'antd/dist/reset.css';

import ApprovalRecordsList from './components/ApprovalRecordsList';
import TemplateManager from './components/TemplateManager';
import PrintCenter from './components/PrintCenter';
import Statistics from './components/Statistics';
import AppSettings from './components/AppSettings';
import EnvironmentStatus from './components/EnvironmentStatus';
import FeishuCallback from './components/FeishuCallback';
import { feishuSDK } from './services/feishu-sdk';
import { AuthProvider, useAuth } from './components/AuthProvider';
import LoginModal from './components/LoginModal';
import MigrationModal from './components/MigrationModal';
import { feishuAuthService } from './services/feishuAuthService';
import './App.css';

// 内部应用组件，使用认证上下文
const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('records');
  const [loading, setLoading] = useState(true);
  const [appInfo, setAppInfo] = useState<any>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [migrationModalVisible, setMigrationModalVisible] = useState(false);
  const [isCallbackPage, setIsCallbackPage] = useState(false);

  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    syncState,
    needsMigration,
    isMigrating,
    signInWithEmail,
    signInWithFeishu,
    signUp,
    signOut,
    manualSync,
    startMigration,
  } = useAuth();

  // 初始化应用
  useEffect(() => {
    const initApp = async () => {
      try {
        // 检查是否是飞书OAuth回调
        if (feishuAuthService.isOAuthCallback()) {
          setIsCallbackPage(true);
          setLoading(false);
          return;
        }

        // 尝试初始化SDK（用于飞书环境）
        await feishuSDK.init();
        const context = feishuSDK.getContext();
        setAppInfo(context);
      } catch (error) {
        console.log('独立浏览器模式：使用模拟数据运行', error);
      } finally {
        // 移除加载动画
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }
        if (!isCallbackPage) {
          setLoading(false);
        }
      }
    };

    if (!authLoading) {
      initApp();
    }
  }, [authLoading, isCallbackPage]);

  // 检查是否需要显示迁移提示
  useEffect(() => {
    if (isAuthenticated && needsMigration && !isMigrating) {
      setMigrationModalVisible(true);
    }
  }, [isAuthenticated, needsMigration, isMigrating]);

  // 同步数据
  const handleSyncAll = async () => {
    try {
      if (isAuthenticated) {
        await manualSync();
      } else {
        message.info('请先登录以启用云端同步功能');
        setLoginModalVisible(true);
      }
    } catch (error) {
      message.error('同步失败');
    }
  };

  // 获取同步状态显示
  const getSyncStatusDisplay = () => {
    if (!isAuthenticated) {
      return (
        <Tooltip title="未登录，数据仅保存在本地">
          <Badge status="default" text="离线模式" />
        </Tooltip>
      );
    }

    const statusConfig = {
      offline: { status: 'default' as const, text: '离线模式', icon: <DisconnectOutlined /> },
      syncing: { status: 'processing' as const, text: '同步中...', icon: <SyncOutlined spin /> },
      synced: { status: 'success' as const, text: '已同步', icon: <WifiOutlined /> },
      conflict: { status: 'warning' as const, text: '有冲突', icon: <ExclamationCircleOutlined /> },
      error: { status: 'error' as const, text: '同步错误', icon: <DisconnectOutlined /> },
    };

    const config = statusConfig[syncState?.status || 'offline'];
    return (
      <Tooltip title={config.text}>
        <Badge status={config.status} text={config.text} />
      </Tooltip>
    );
  };

  // 独立浏览器模式：始终显示完整应用界面
  const shouldShowFullApp = true;

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'records':
        return <ApprovalRecordsList />;
      case 'templates':
        return <TemplateManager />;
      case 'print':
        return <PrintCenter />;
      case 'statistics':
        return <Statistics />;
      case 'settings':
        return <AppSettings />;
      default:
        return <ApprovalRecordsList />;
    }
  };

  // 独立浏览器模式：始终显示完整应用，不再显示环境状态页面
  if (!shouldShowFullApp) {
    return (
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 8,
          },
        }}
      >
        <div className="app-container">
          {/* 简化的头部 */}
          <div className="app-header">
            <div className="header-content">
              <div className="header-left">
                <h1 className="app-title">
                  🖨️ 审批打印插件
                </h1>
              </div>
              <div className="header-right">
                <Button
                  icon={<ToolOutlined />}
                  onClick={() => setActiveTab('settings')}
                >
                  应用配置
                </Button>
              </div>
            </div>
          </div>

          {/* 环境状态页面 */}
          <div className="app-content">
            {activeTab === 'settings' ? (
              <AppSettings />
            ) : (
              <EnvironmentStatus
                appInfo={appInfo}
                onOpenSettings={() => setActiveTab('settings')}
              />
            )}
          </div>
        </div>
      </ConfigProvider>
    );
  }

  // 如果是OAuth回调页面，显示回调处理组件
  if (isCallbackPage) {
    return <FeishuCallback />;
  }

  // 正常的飞书环境应用界面
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <div className="app-container">
        {/* 头部区域 */}
        <div className="app-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="app-title">
                🖨️ 审批打印插件
              </h1>
              <div className="app-info">
                {appInfo && (
                  <>
                    <span className="info-item">
                      表格ID: <code>{appInfo.tableId}</code>
                    </span>
                    <span className="info-item">
                      用户ID: <code>{appInfo.userId}</code>
                    </span>
                  </>
                )}
                <span className="info-item sync-status">
                  {getSyncStatusDisplay()}
                </span>
              </div>
            </div>

            <div className="header-right">
              <Space>
                <Button
                  icon={<SyncOutlined />}
                  onClick={handleSyncAll}
                  loading={loading}
                >
                  {isAuthenticated ? '同步数据' : '刷新数据'}
                </Button>
                {isAuthenticated ? (
                  <Space>
                    <Tooltip title={`${user?.name} (${user?.email})`}>
                      <Button icon={<UserOutlined />}>
                        {user?.name}
                      </Button>
                    </Tooltip>
                    <Button
                      icon={<LogoutOutlined />}
                      onClick={signOut}
                >
                  退出登录
                </Button>
              </Space>
                ) : (
                  <Button
                    type="primary"
                    icon={<LoginOutlined />}
                    onClick={() => setLoginModalVisible(true)}
                  >
                    登录
                  </Button>
                )}
                <Button
                  icon={<ToolOutlined />}
                  onClick={() => setActiveTab('settings')}
                >
                  系统设置
                </Button>
              </Space>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="app-content">
          <Card
            bordered={false}
            style={{ minHeight: 'calc(100vh - 120px)' }}
            bodyStyle={{ padding: 0 }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              size="large"
              className="responsive-tabs"
              items={[
                {
                  key: 'records',
                  label: (
                    <span className="mobile-hidden">
                      <FileTextOutlined />
                      审批记录
                    </span>
                  ),
                  children: renderTabContent(),
                },
                {
                  key: 'templates',
                  label: (
                    <span className="mobile-hidden">
                      <SettingOutlined />
                      模板管理
                    </span>
                  ),
                  children: renderTabContent(),
                },
                {
                  key: 'print',
                  label: (
                    <span className="mobile-hidden">
                      <PrinterOutlined />
                      打印中心
                    </span>
                  ),
                  children: renderTabContent(),
                },
                {
                  key: 'statistics',
                  label: (
                    <span className="mobile-hidden">
                      <BarChartOutlined />
                      数据统计
                    </span>
                  ),
                  children: renderTabContent(),
                },
                {
                  key: 'settings',
                  label: (
                    <span className="mobile-hidden">
                      <ToolOutlined />
                      应用配置
                    </span>
                  ),
                  children: renderTabContent(),
                },
              ]}
            />
          </Card>
        </div>

        {/* 底部信息 */}
        <div className="app-footer">
          <div className="footer-content">
            <span>© 2024 审批打印插件 v1.0.0</span>
            <span>
              {!appInfo ? '演示数据模式' : '集成模式'}
            </span>
          </div>
        </div>

        {/* 认证相关模态框 */}
        <LoginModal
          visible={loginModalVisible}
          onClose={() => setLoginModalVisible(false)}
        />
        <MigrationModal
          visible={migrationModalVisible}
          onClose={() => setMigrationModalVisible(false)}
        />
      </div>
    </ConfigProvider>
  );
};

// 主App组件，包装AuthProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;