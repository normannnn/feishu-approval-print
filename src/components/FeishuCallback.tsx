/**
 * 飞书OAuth回调处理页面
 * 处理飞书认证回调并传递结果给主窗口
 */

import React, { useEffect, useState } from 'react';
import { Result, Button, Spin, Alert, Typography, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { feishuAuthService } from '../services/feishuAuthService';

const { Title, Text } = Typography;

const FeishuCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('正在处理飞书认证回调...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // 检查是否是OAuth回调
      if (!feishuAuthService.isOAuthCallback()) {
        setStatus('error');
        setMessage('无效的认证回调');
        return;
      }

      setMessage('正在验证用户身份...');

      // 处理OAuth回调
      const user = await feishuAuthService.handlePageCallback();

      if (user) {
        setStatus('success');
        setMessage(`认证成功！欢迎回来，${user.name}`);

        // 通知父窗口认证成功
        if (window.opener) {
          window.opener.postMessage({
            code: new URLSearchParams(window.location.search).get('code'),
            state: new URLSearchParams(window.location.search).get('state'),
            user: user
          }, window.location.origin);
        }

        // 延迟关闭窗口
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        setStatus('error');
        setMessage('认证失败，未获取到用户信息');
      }
    } catch (error) {
      console.error('飞书OAuth回调处理失败:', error);
      setStatus('error');
      setMessage(`认证失败: ${error instanceof Error ? error.message : '未知错误'}`);

      // 通知父窗口认证失败
      if (window.opener) {
        const urlParams = new URLSearchParams(window.location.search);
        window.opener.postMessage({
          error: urlParams.get('error') || 'authentication_failed',
          error_description: error instanceof Error ? error.message : '认证失败'
        }, window.location.origin);
      }

      // 延迟关闭窗口
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  };

  const handleClose = () => {
    window.close();
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <Result
            icon={<LoadingOutlined style={{ color: '#1890ff' }} spin />}
            title="正在处理认证"
            subTitle={message}
            extra={[
              <Button type="link" key="manual-close" onClick={handleClose}>
                手动关闭窗口
              </Button>
            ]}
          />
        );

      case 'success':
        return (
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="认证成功"
            subTitle={message}
            extra={[
              <Button type="primary" key="auto-close" onClick={handleClose}>
                窗口将自动关闭
              </Button>
            ]}
          />
        );

      case 'error':
        return (
          <Result
            status="error"
            icon={<CloseCircleOutlined />}
            title="认证失败"
            subTitle={message}
            extra={[
              <Space>
                <Button onClick={handleClose}>
                  关闭窗口
                </Button>
                <Button type="primary" onClick={() => window.location.reload()}>
                  重试
                </Button>
              </Space>
            ]}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <Title level={3} style={{ color: '#1890ff', margin: 0 }}>
            🚀 审批打印系统
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            飞书身份认证
          </Text>
        </div>

        {renderContent()}

        <Alert
          message="安全提示"
          description="此窗口用于处理飞书身份认证，认证完成后将自动关闭。请勿在此页面输入敏感信息。"
          type="info"
          showIcon
          style={{ marginTop: '20px', textAlign: 'left' }}
        />
      </div>
    </div>
  );
};

export default FeishuCallback;