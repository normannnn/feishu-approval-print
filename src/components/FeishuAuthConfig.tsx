/**
 * 飞书认证配置组件
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Alert, message, Space, Typography, Divider } from 'antd';
import { SettingOutlined, KeyOutlined, LinkOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { feishuAuthService, type FeishuAuthConfig } from '../services/feishuAuthService';
import { envConfig } from '../utils/envConfig';

const { Title, Text, Paragraph } = Typography;

interface FeishuAuthConfigProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FeishuAuthConfig: React.FC<FeishuAuthConfigProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (visible) {
      checkCurrentConfig();
    }
  }, [visible]);

  const checkCurrentConfig = () => {
    const configured = feishuAuthService.isConfigured();
    const config = feishuAuthService.getConfig();

    setIsConfigured(configured);

    if (config) {
      form.setFieldsValue(config);
    }
  };

  const handleSubmit = async (values: FeishuAuthConfig) => {
    setLoading(true);
    try {
      // 验证配置
      if (!values.appId || !values.appSecret) {
        message.error('请填写完整的应用配置信息');
        return;
      }

      // 验证appId格式
      if (!/^cli_[a-zA-Z0-9]+$/.test(values.appId)) {
        message.error('应用ID格式不正确，应以"cli_"开头');
        return;
      }

      // 保存配置
      feishuAuthService.saveConfig(values);
      message.success('飞书认证配置保存成功');

      setIsConfigured(true);
      onSuccess();

      // 延迟关闭，让用户看到成功提示
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const isDev = feishuAuthService.isDevelopment();

      if (isDev) {
        // 本地开发环境使用模拟登录
        await feishuAuthService.mockLogin();
        message.success('开发环境模拟登录测试成功');
      } else {
        // 生产环境测试配置
        const configured = feishuAuthService.isConfigured();
        if (!configured) {
          message.error('请先配置应用信息');
          return;
        }

        const authUrl = feishuAuthService.getAuthorizationUrl();
        message.info('配置正确，可以开始飞书登录');
        console.log('飞书认证URL:', authUrl);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      message.error('测试连接失败');
    } finally {
      setLoading(false);
    }
  };

  const isDevelopment = feishuAuthService.isDevelopment();

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          飞书认证配置
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="配置说明"
          description={
            <div>
              <Paragraph>
                请在飞书开放平台创建应用并获取以下信息：
              </Paragraph>
              <ol>
                <li>访问 <a href="https://open.feishu.cn/app" target="_blank" rel="noopener noreferrer">
                  飞书开放平台
                </a></li>
                <li>创建应用并记录应用ID和应用密钥</li>
                <li>配置重定向URL: {window.location.origin}/auth/feishu/callback</li>
                <li>在应用权限中添加"获取用户基本信息"权限</li>
              </ol>
            </div>
          }
          type="info"
          showIcon
        />
      </div>

      {isDevelopment && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="开发环境模式"
            description="当前处于开发环境，将使用模拟登录功能。生产环境需要真实的飞书应用配置。"
            type="warning"
            showIcon
          />
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          redirectUri: envConfig.getFeishuRedirectUri()
        }}
      >
        <Form.Item
          label={
            <Space>
              <KeyOutlined />
              应用ID (App ID)
            </Space>
          }
          name="appId"
          rules={[
            { required: true, message: '请输入应用ID' },
            {
              pattern: /^cli_[a-zA-Z0-9]+$/,
              message: '应用ID格式不正确，应以"cli_"开头'
            }
          ]}
        >
          <Input
            placeholder="cli_xxxxxxxxx"
            prefix={<LinkOutlined />}
          />
        </Form.Item>

        <Form.Item
          label={
            <Space>
              <KeyOutlined />
              应用密钥 (App Secret)
            </Space>
          }
          name="appSecret"
          rules={[
            { required: true, message: '请输入应用密钥' }
          ]}
        >
          <Input.Password
            placeholder="请输入应用密钥"
            visibilityToggle
          />
        </Form.Item>

        <Form.Item
          label="重定向URL"
          name="redirectUri"
          rules={[
            { required: true, message: '请输入重定向URL' }
          ]}
        >
          <Input
            placeholder={envConfig.getFeishuRedirectUri()}
            readOnly
          />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Button
                type="default"
                onClick={checkCurrentConfig}
              >
                检查配置
              </Button>
              <Button
                type="default"
                onClick={handleTestConnection}
                loading={loading}
              >
                测试连接
              </Button>
            </Space>

            <Space>
              <Button onClick={onClose}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
              >
                保存配置
              </Button>
            </Space>
          </Space>
        </Form.Item>

        {isConfigured && (
          <Alert
            message="配置状态"
            description="飞书认证配置已完成，可以开始使用飞书登录功能。"
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Modal>
  );
};

export default FeishuAuthConfig;