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
} from '@ant-design/icons';
import { useAuth } from './AuthProvider';

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

  const { signInWithEmail, signInWithFeishu, signUp } = useAuth();

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
      await signInWithFeishu();
      onClose();
    } catch (error) {
      // 错误已在AuthProvider中处理
    } finally {
      setLoading(false);
    }
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
        </Tabs>

        <Divider>或</Divider>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            icon={<WechatOutlined style={{ color: '#1890ff' }} />}
            onClick={handleFeishuLogin}
            loading={loading}
            block
            size="large"
            style={{
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            飞书快速登录
          </Button>

          <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
            登录即表示同意《用户协议》和《隐私政策》
          </Text>
        </Space>
      </div>
    </Modal>
  );
};

export default LoginModal;