/**
 * 数据迁移模态框组件
 * 引导用户将本地数据迁移到云端
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Steps,
  Progress,
  Space,
  Typography,
  Alert,
  Card,
  List,
  Statistic,
  Divider,
  message,
} from 'antd';
import {
  CloudOutlined,
  DatabaseOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useAuth } from './AuthProvider';
import { migrationService } from '../services/migrationService';
import { templateDataManager } from '../utils/templateDataManager';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface MigrationModalProps {
  visible: boolean;
  onClose: () => void;
}

const MigrationModal: React.FC<MigrationModalProps> = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [migrationProgress, setMigrationProgress] = useState<any>(null);
  const [localDataStats, setLocalDataStats] = useState({
    templates: 0,
    printRecords: 0,
  });

  const { user, startMigration, isMigrating } = useAuth();

  // 获取本地数据统计
  useEffect(() => {
    if (visible) {
      const templates = templateDataManager.getTemplates();
      const records = templateDataManager.getPrintRecords();
      setLocalDataStats({
        templates: templates.length,
        printRecords: records.length,
      });

      // 监听迁移进度
      migrationService.onProgress((progress) => {
        setMigrationProgress(progress);
        if (progress.stage === 'completed') {
          setCurrentStep(3);
        }
      });
    }
  }, [visible]);

  // 开始迁移
  const handleStartMigration = async () => {
    try {
      setCurrentStep(1);
      await startMigration();
    } catch (error) {
      setCurrentStep(0);
      console.error('迁移失败:', error);
    }
  };

  // 备份本地数据
  const handleBackup = async () => {
    try {
      await migrationService.backupLocalData();
      message.success('数据备份完成！');
    } catch (error) {
      message.error('备份失败');
    }
  };

  // 关闭模态框
  const handleClose = () => {
    if (!isMigrating) {
      setCurrentStep(0);
      setMigrationProgress(null);
      onClose();
    }
  };

  // 获取步骤状态
  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'finish';
    if (step === currentStep) return 'process';
    return 'wait';
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <CloudOutlined style={{ fontSize: '24px', marginRight: '8px', color: '#1890ff' }} />
          <span>数据云端迁移</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      width={600}
      footer={
        <Space>
          {currentStep === 0 && (
            <>
              <Button onClick={handleBackup} icon={<DownloadOutlined />}>
                备份本地数据
              </Button>
              <Button onClick={handleClose}>稍后迁移</Button>
              <Button type="primary" onClick={handleStartMigration}>
                开始迁移
              </Button>
            </>
          )}
          {currentStep === 1 && (
            <Button disabled onClick={handleClose}>
              迁移进行中...
            </Button>
          )}
          {currentStep === 2 && (
            <Button type="primary" onClick={handleClose}>
              完成
            </Button>
          )}
        </Space>
      }
      closable={!isMigrating}
      maskClosable={!isMigrating}
    >
      <div style={{ padding: '20px 0' }}>
        {/* 迁移步骤 */}
        <Steps current={currentStep} style={{ marginBottom: '24px' }}>
          <Step title="准备迁移" description="检查本地数据" icon={<DatabaseOutlined />} />
          <Step title="上传数据" description="同步到云端" icon={<CloudOutlined />} />
          <Step title="迁移完成" description="验证数据完整性" icon={<CheckCircleOutlined />} />
        </Steps>

        {/* 数据统计 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <Space split={<Divider type="vertical" />}>
              <Statistic
                title="本地模板"
                value={localDataStats.templates}
                prefix={<DatabaseOutlined />}
              />
              <Statistic
                title="打印记录"
                value={localDataStats.printRecords}
                prefix={<DatabaseOutlined />}
              />
            </Space>
          </div>
        </Card>

        {/* 迁移说明 */}
        {currentStep === 0 && (
          <Alert
            message="数据迁移说明"
            description={
              <div>
                <Paragraph>
                  检测到您有本地数据需要迁移到云端。迁移后您可以：
                </Paragraph>
                <ul>
                  <li>在多设备间同步数据</li>
                  <li>与团队成员共享模板</li>
                  <li>享受自动备份功能</li>
                  <li>防止数据丢失</li>
                </ul>
                <Paragraph>
                  迁移过程是安全的，您的本地数据将被保留作为备份。
                </Paragraph>
              </div>
            }
            type="info"
            showIcon
          />
        )}

        {/* 迁移进度 */}
        {currentStep === 1 && migrationProgress && (
          <div>
            <Alert
              message={
                <Space>
                  <SyncOutlined spin />
                  <span>{migrationProgress.currentStep}</span>
                </Space>
              }
              description={
                <div style={{ marginTop: '12px' }}>
                  <Progress
                    percent={migrationProgress.progress}
                    status="active"
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />

                  <div style={{ marginTop: '12px' }}>
                    <Space split={<Divider type="vertical" />}>
                      <Text>
                        步骤: {migrationProgress.completedSteps} / {migrationProgress.totalSteps}
                      </Text>
                      <Text>
                        模板: {migrationProgress.migratedItems.templates} / {migrationProgress.totalItems.templates}
                      </Text>
                      <Text>
                        记录: {migrationProgress.migratedItems.printRecords} / {migrationProgress.totalItems.printRecords}
                      </Text>
                    </Space>
                  </div>

                  {migrationProgress.errorMessage && (
                    <Alert
                      message={migrationProgress.errorMessage}
                      type="error"
                      style={{ marginTop: '12px' }}
                    />
                  )}
                </div>
              }
              type="info"
            />
          </div>
        )}

        {/* 迁移完成 */}
        {currentStep === 2 && migrationProgress && (
          <Alert
            message="迁移完成！"
            description={
              <div>
                <Paragraph>
                  恭喜！您的数据已成功迁移到云端。
                </Paragraph>
                <List
                  size="small"
                  dataSource={[
                    `✅ 成功迁移 ${migrationProgress.migratedItems.templates} 个模板`,
                    `✅ 成功迁移 ${migrationProgress.migratedItems.printRecords} 条打印记录`,
                    '✅ 数据完整性验证通过',
                    '✅ 云端同步功能已启用',
                  ]}
                  renderItem={(item) => <List.Item>{item}</List.Item>}
                />
                <Paragraph>
                  现在您可以享受多设备同步和团队协作功能了！
                </Paragraph>
              </div>
            }
            type="success"
            showIcon
          />
        )}

        {/* 用户信息 */}
        {user && (
          <Card size="small" style={{ marginTop: '16px', backgroundColor: '#f5f5f5' }}>
            <Space>
              <Text type="secondary">当前用户:</Text>
              <Text strong>{user.name}</Text>
              <Text type="secondary">({user.email})</Text>
            </Space>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default MigrationModal;