import React from 'react';
import { Alert, Card, Space, Typography, Button } from 'antd';
import {
  EnvironmentOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface EnvironmentStatusProps {
  appInfo: any;
  onOpenSettings: () => void;
}

const EnvironmentStatus: React.FC<EnvironmentStatusProps> = ({ appInfo, onOpenSettings }) => {
  const isFeishuEnvironment = window.location.href.includes('feishu.cn') ||
                              window.location.href.includes('larksuite.com') ||
                              window.location.href.includes('fs.huidu.cn');

  const isConfigured = appInfo && appInfo.appId && appInfo.tableId;

  const renderStatus = () => {
    if (!isFeishuEnvironment) {
      return (
        <Alert
          message="不在飞书环境中"
          description="请在飞书多维表格中使用此应用，以获得完整的审批记录打印功能。"
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          action={
            <Button size="small" type="primary" onClick={onOpenSettings}>
              配置应用
            </Button>
          }
        />
      );
    }

    if (!appInfo) {
      return (
        <Alert
          message="SDK初始化失败"
          description="飞书SDK加载失败，请检查应用配置是否正确。"
          type="error"
          showIcon
          icon={<WarningOutlined />}
          action={
            <Button size="small" type="primary" onClick={onOpenSettings}>
              配置应用
            </Button>
          }
        />
      );
    }

    if (!isConfigured) {
      return (
        <Alert
          message="应用配置不完整"
          description="请配置应用凭证以获得完整功能。"
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          action={
            <Button size="small" type="primary" onClick={onOpenSettings}>
              配置应用
            </Button>
          }
        />
      );
    }

    return (
      <Alert
        message="环境正常"
        description="飞书环境检测正常，应用配置完整。"
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
      />
    );
  };

  const renderEnvironmentInfo = () => {
    if (!isFeishuEnvironment) {
      return (
        <Card size="small" title="当前环境信息">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>环境类型：</Text>
              <Text type="secondary">本地开发环境</Text>
            </div>
            <div>
              <Text strong>当前URL：</Text>
              <Text code>{window.location.href}</Text>
            </div>
            <div>
              <Text strong>飞书环境：</Text>
              <Text type="danger">未检测到</Text>
            </div>
            <div>
              <Text strong>建议操作：</Text>
              <Text>请在飞书多维表格中添加此应用</Text>
            </div>
          </Space>
        </Card>
      );
    }

    return (
      <Card size="small" title="当前环境信息">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>环境类型：</Text>
            <Text>飞书环境</Text>
          </div>
          {appInfo && (
            <>
              <div>
                <Text strong>应用ID：</Text>
                <Text code>{appInfo.appId}</Text>
              </div>
              <div>
                <Text strong>表格ID：</Text>
                <Text code>{appInfo.tableId}</Text>
              </div>
              <div>
                <Text strong>视图ID：</Text>
                <Text code>{appInfo.viewId || '未设置'}</Text>
              </div>
              <div>
                <Text strong>用户ID：</Text>
                <Text code>{appInfo.userId}</Text>
              </div>
            </>
          )}
        </Space>
      </Card>
    );
  };

  const renderSetupGuide = () => {
    if (isFeishuEnvironment && isConfigured) {
      return null;
    }

    return (
      <Card size="small" title="配置指南">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Title level={5}>步骤1：创建飞书应用</Title>
            <Paragraph>
              访问<a href="https://open.feishu.cn/" target="_blank" rel="noopener noreferrer">飞书开放平台</a>，
              创建企业自建应用，获取App ID和App Secret。
            </Paragraph>
          </div>

          <div>
            <Title level={5}>步骤2：配置应用权限</Title>
            <Paragraph>
              在应用设置中添加以下权限：
              <br />• <Text code>bitable:app</Text> - 多维表格应用权限
              <br />• <Text code>bitable:readonly</Text> - 多维表格只读权限
              <br />• <Text code>bitable:write</Text> - 多维表格写入权限
            </Paragraph>
          </div>

          <div>
            <Title level={5}>步骤3：添加应用到多维表格</Title>
            <Paragraph>
              在飞书多维表格中添加机器人，选择您创建的应用，
              授予相应的表格访问权限。
            </Paragraph>
          </div>

          <div>
            <Title level={5}>步骤4：配置应用凭证</Title>
            <Paragraph>
              点击下方按钮打开配置页面，填写从飞书开放平台获取的
              App ID和App Secret。
            </Paragraph>
            <Button type="primary" icon={<SettingOutlined />} onClick={onOpenSettings}>
              打开应用配置
            </Button>
          </div>
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <EnvironmentOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          <Title level={3}>环境状态检测</Title>
        </div>

        {renderStatus()}
        {renderEnvironmentInfo()}
        {renderSetupGuide()}
      </Space>
    </div>
  );
};

export default EnvironmentStatus;