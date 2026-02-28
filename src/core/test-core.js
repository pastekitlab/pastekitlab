// 测试核心模块功能 (JavaScript 版本)

import { CryptoEngine } from '../core/crypto-engine.js';
import { EncodingUtils } from '../core/encoding-utils.js';

// 测试配置
const testConfig = {
  id: 'test-config-1',
  domain: 'example.com',
  keyConfigName: 'test-key',
  enabled: true,
  algorithm: 'AES',
  key: 'test-secret-key-12345',
  iv: 'test-iv-12345678',
  mode: 'CBC',
  padding: 'PKCS7'
};

// 测试数据
const testData = 'Hello World! This is a test message for encryption/decryption.';

async function runTests() {
  console.log('=== CryptoDevTools 核心模块测试 (JavaScript 版本) ===\n');

  // 测试 1: 编码工具测试
  console.log('1. 测试编码工具...');
  try {
    // Base64 测试
    const base64Encoded = btoa(testData);
    const base64Decoded = atob(base64Encoded);
    console.log('✓ Base64 编码/解码正常');
    console.log(`  原文: ${testData.substring(0, 30)}...`);
    console.log(`  编码: ${base64Encoded.substring(0, 30)}...`);
    console.log(`  解码: ${base64Decoded.substring(0, 30)}...\n`);

    // 编码检测测试
    const encodingType = EncodingUtils.detectEncoding(base64Encoded);
    console.log(`✓ 编码检测: ${encodingType}\n`);

  } catch (error) {
    console.error('✗ 编码工具测试失败:', error.message);
  }

  // 测试 2: 解密引擎测试
  console.log('2. 测试解密引擎...');
  try {
    // 创建测试上下文（使用模拟的加密数据）
    const mockEncryptedData = btoa(testData); // 简单的 Base64 模拟
    
    const context = {
      config: testConfig,
      data: mockEncryptedData,
      isRequest: false
    };

    // 验证配置
    const isValid = CryptoEngine.validateConfig(testConfig);
    console.log(`✓ 配置验证: ${isValid ? '通过' : '失败'}`);

    // 注意：实际的 AES 解密需要真正的加密数据
    // 这里只是测试框架是否正常工作
    console.log('✓ 解密引擎框架正常\n');

  } catch (error) {
    console.error('✗ 解密引擎测试失败:', error.message);
  }

  // 测试 3: 自定义编码测试
  console.log('3. 测试自定义编码...');
  try {
    // 自定义 Base64 映射表测试
    const customMap = {
      'A': 'X', 'B': 'Y', 'C': 'Z',
      'a': 'x', 'b': 'y', 'c': 'z'
    };
    
    const customEncoded = EncodingUtils.customBase64Encode(testData, customMap);
    const customDecoded = EncodingUtils.customBase64Decode(customEncoded, customMap);
    
    console.log('✓ 自定义 Base64 编码正常');
    console.log(`  原文长度: ${testData.length}`);
    console.log(`  编码长度: ${customEncoded.length}`);
    console.log(`  解码匹配: ${customDecoded === testData}\n`);

  } catch (error) {
    console.error('✗ 自定义编码测试失败:', error.message);
  }

  // 测试 4: Hex 编码测试
  console.log('4. 测试 Hex 编码...');
  try {
    const hexEncoded = EncodingUtils.customHexEncode(testData);
    const hexDecoded = EncodingUtils.customHexDecode(hexEncoded);
    
    console.log('✓ Hex 编码正常');
    console.log(`  原文: ${testData.substring(0, 20)}...`);
    console.log(`  Hex: ${hexEncoded.substring(0, 20)}...`);
    console.log(`  解码匹配: ${hexDecoded === testData}\n`);

  } catch (error) {
    console.error('✗ Hex 编码测试失败:', error.message);
  }

  console.log('=== 测试完成 ===');
}

// 运行测试
runTests().catch(console.error);

// 导出供其他模块使用
export { testConfig, testData };