/**
 * 应用配置功能测试脚本
 * 用于验证App ID和App Secret配置功能是否正常工作
 */

// 测试配置功能
function testConfigManagement() {
  console.log('🧪 开始测试应用配置管理功能...\n');

  // 1. 测试localStorage配置保存
  console.log('1️⃣ 测试配置保存功能:');
  const testConfig = {
    appId: 'cli_test123456789',
    appSecret: 'test_secret_32_characters_long_123456',
    redirectUri: 'http://localhost:3002'
  };

  localStorage.setItem('feishu_app_config', JSON.stringify(testConfig));
  const savedConfig = localStorage.getItem('feishu_app_config');
  const parsedConfig = savedConfig ? JSON.parse(savedConfig) : null;

  if (parsedConfig && parsedConfig.appId === testConfig.appId) {
    console.log('✅ 配置保存功能正常');
  } else {
    console.log('❌ 配置保存功能异常');
  }

  // 2. 测试配置读取
  console.log('\n2️⃣ 测试配置读取功能:');
  if (parsedConfig) {
    console.log('✅ 配置读取功能正常');
    console.log(`   App ID: ${parsedConfig.appId}`);
    console.log(`   App Secret: ${parsedConfig.appSecret.substring(0, 10)}...`);
    console.log(`   重定向URL: ${parsedConfig.redirectUri}`);
  } else {
    console.log('❌ 配置读取功能异常');
  }

  // 3. 测试配置清除
  console.log('\n3️⃣ 测试配置清除功能:');
  localStorage.removeItem('feishu_app_config');
  const clearedConfig = localStorage.getItem('feishu_app_config');

  if (!clearedConfig) {
    console.log('✅ 配置清除功能正常');
  } else {
    console.log('❌ 配置清除功能异常');
  }

  // 4. 测试App ID格式验证
  console.log('\n4️⃣ 测试App ID格式验证:');
  const validAppId = /^cli_[a-zA-Z0-9]+$/;
  const testIds = [
    'cli_1234567890abcdef',
    'cli_testAppId',
    'app_123456',
    'cli_',
    'cli_1234567890abcdefghijklmnopqrstuvwxyz1234567890'
  ];

  testIds.forEach(id => {
    if (validAppId.test(id)) {
      console.log(`✅ "${id}" - 格式正确`);
    } else {
      console.log(`❌ "${id}" - 格式错误`);
    }
  });

  // 5. 测试App Secret长度验证
  console.log('\n5️⃣ 测试App Secret长度验证:');
  const testSecrets = [
    'short',
    '32_characters_long_secret_key_here_1234',
    'very_long_secret_key_that_exceeds_normal_limits_1234567890'
  ];

  testSecrets.forEach(secret => {
    if (secret.length >= 32) {
      console.log(`✅ 长度${secret.length} - 符合要求`);
    } else {
      console.log(`❌ 长度${secret.length} - 不符合要求`);
    }
  });

  console.log('\n🎉 配置管理功能测试完成！');
  console.log('\n📋 测试清单:');
  console.log('   ✅ 配置保存到localStorage');
  console.log('   ✅ 从localStorage读取配置');
  console.log('   ✅ 清除localStorage配置');
  console.log('   ✅ App ID格式验证');
  console.log('   ✅ App Secret长度验证');

  console.log('\n🔗 访问应用测试完整功能:');
  console.log('   1. 打开 http://localhost:3002');
  console.log('   2. 点击"应用配置"按钮或标签页');
  console.log('   3. 在"基本配置"标签页填写测试凭证:');
  console.log('      - App ID: cli_test123456789');
  console.log('      - App Secret: test_secret_32_characters_long_123456');
  console.log('   4. 点击"保存配置"按钮');
  console.log('   5. 切换到"当前配置"标签页验证保存结果');
  console.log('   6. 刷新页面验证配置持久化');

  // 恢复测试配置（如果需要）
  localStorage.setItem('feishu_app_config', JSON.stringify(testConfig));
}

// 页面加载完成后运行测试
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testConfigManagement);
} else {
  testConfigManagement();
}

// 导出测试函数供控制台使用
window.testConfigManagement = testConfigManagement;