/**
 * 登录模态框组件
 * 提供邮箱登录和飞书登录功能
 */

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Divider,
  Space,
  Typography,
  Alert,
  Tabs,
  message,
} from 'antd';
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  WechatOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  SettingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from './AuthProvider';
import FeishuAuthConfig from './FeishuAuthConfig';
import { feishuAuthService } from '../services/feishuAuthService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('email');
  const [showConfig, setShowConfig] = useState(false);
  const [isFeishuConfigured, setIsFeishuConfigured] = useState(false);

  const { signInWithEmail, signInWithFeishu, signUp } = useAuth();

  // 检查飞书配置状态
  React.useEffect(() => {
    setIsFeishuConfigured(feishuAuthService.isConfigured());
  }, []);

  // 邮箱登录
  const handleEmailLogin = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      await signInWithEmail(values.email, values.password);
      onClose();
    } catch (error) {
      // 错误已在AuthProvider中处理
    } finally {
      setLoading(false);
    }
  };

  // 邮箱注册
  const handleEmailRegister = async (values: { email: string; password: string; name: string }) => {
    try {
      setLoading(true);
      await signUp(values.email, values.password, values.name);
      onClose();
    } catch (error) {
      // 错误已在AuthProvider中处理
    } finally {
      setLoading(false);
    }
  };

  // 飞书登录
  const handleFeishuLogin = async () => {
    try {
      setLoading(true);

      // 检查配置
      if (!isFeishuConfigured) {
        message.warning('请先配置飞书应用信息');
        setShowConfig(true);
        return;
      }

      await signInWithFeishu();
      onClose();
    } catch (error) {
      // 错误已在AuthProvider中处理
    } finally {
      setLoading(false);
    }
  };

  // 配置完成回调
  const handleConfigSuccess = () => {
    setIsFeishuConfigured(true);
    message.success('飞书认证配置完成');
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            🖨️ 审批打印系统
          </Title>
          <Text type="secondary">登录以启用多设备同步功能</Text>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
      destroyOnClose
    >
      <div style={{ padding: '20px 0' }}>
        <Alert
          message="多用户协作功能"
          description="登录后可享受云端数据同步、多设备协作、团队共享等功能"
          type="info"
          showIcon
          style={{ marginBottom: '20px' }}
        />

        <Tabs defaultActiveKey="login" centered>
          <TabPane tab="登录" key="login">
            <Form
              form={form}
              name="login"
              onFinish={handleEmailLogin}
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="email"
                label="邮箱地址"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="请输入邮箱地址"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{ height: '40px' }}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="注册" key="register">
            <Form
              form={registerForm}
              name="register"
              onFinish={handleEmailRegister}
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="name"
                label="姓名"
                rules={[
                  { required: true, message: '请输入姓名' },
                  { min: 2, message: '姓名至少2个字符' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入姓名"
                />
              </Form.Item>

              <Form.Item
                name="email"
                label="邮箱地址"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="请输入邮箱地址"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请设置密码（至少6位）"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{ height: '40px' }}
                >
                  注册账号
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="飞书登录" key="feishu">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {!isFeishuConfigured ? (
                <Alert
                  message="需要配置飞书应用"
                  description="请先配置飞书开放平台应用信息后才能使用飞书登录"
                  type="warning"
                  showIcon
                  style={{ marginBottom: '20px' }}
                  action={
                    <Button
                      size="small"
                      type="primary"
                      icon={<SettingOutlined />}
                      onClick={() => setShowConfig(true)}
                    >
                      配置应用
                    </Button>
                  }
                />
              ) : (
                <Alert
                  message="飞书登录可用"
                  description="使用飞书账号快速登录，享受企业级协作功能"
                  type="success"
                  showIcon
                  style={{ marginBottom: '20px' }}
                />
              )}

              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleFeishuLogin}
                loading={loading}
                block
                style={{
                  height: '40px',
                  fontSize: '16px',
                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                  border: 'none',
                }}
              >
                {isFeishuConfigured ? '飞书快速登录' : '先配置应用'}
              </Button>

              {isFeishuConfigured && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowConfig(true)}
                  style={{ marginTop: '10px' }}
                >
                  <SettingOutlined /> 修改配置
                </Button>
              )}

              <Text type="secondary" style={{ display: 'block', marginTop: '15px', fontSize: '12px' }}>
                飞书登录享受企业级数据同步和团队协作功能
              </Text>
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* 飞书认证配置弹窗 */}
      <FeishuAuthConfig
        visible={showConfig}
        onClose={() => setShowConfig(false)}
        onSuccess={handleConfigSuccess}
      />
    </Modal>
  );
};

export default LoginModal;