// 共享类型定义和常量

// 解密配置接口
const DecryptConfig = {
  id: '',
  domain: '',
  keyConfigName: '',
  enabled: false,
  description: '',
  algorithm: '',
  key: '',
  keyEncoding: [],
  iv: '',
  ivEncoding: [],
  mode: '',
  padding: '',
  publicKey: '',
  privateKey: '',
  curve: '',
  encoding: '',
  keySize: 0
};

// 解密结果接口
const DecryptResult = {
  success: false,
  plaintext: '',
  error: '',
  algorithm: '',
  timestamp: 0
};

// 网络请求接口
const NetworkRequest = {
  requestId: '',
  url: '',
  method: '',
  requestBody: '',
  responseBody: '',
  statusCode: 0,
  timestamp: 0
};

// 解密上下文接口
const DecryptionContext = {
  config: DecryptConfig,
  data: '',
  isRequest: false
};

// 导出类型定义
export { DecryptConfig, DecryptResult, NetworkRequest, DecryptionContext };