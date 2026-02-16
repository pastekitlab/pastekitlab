/**
 * 秘钥配置相关的常量定义
 */

// 需要填充的加密模式集合
export const NEED_PADDING_MODES = new Set(['CBC', 'ECB']);

// 每页显示的配置数量
export const ITEMS_PER_PAGE = 5;

// 默认配置模板
export const DEFAULT_CONFIG_TEMPLATE = {
  name: '',
  algorithm: 'AES/CBC/PKCS5Padding',
  algorithmType: 'AES',
  mode: 'CBC',
  padding: 'PKCS5Padding',
  key: {
    value: '',
    encoding: ['UTF8']
  },
  iv: {
    value: '',
    encoding: ['UTF8']
  },
  publicKey: {
    value: '',
    encoding: ['UTF8']
  },
  privateKey: {
    value: '',
    encoding: ['UTF8']
  },
  plainEncoding: ['UTF8'],
  cipherEncoding: ['BASE64'],
  createdAt: Date.now()
};

// 编码选项配置
export const ENCODING_OPTIONS = [
  { value: 'UTF8', label: 'UTF-8' },
  { value: 'HEX', label: 'Hex' },
  { value: 'BASE64', label: 'Base64' }
];

// 明文编码选项
export const PLAINTEXT_ENCODING_OPTIONS = [
  { value: 'UTF8', label: 'UTF-8' },
  { value: 'ASCII', label: 'ASCII' },
  { value: 'GBK', label: 'GBK' }
];

// 密文编码选项
export const CIPHERTEXT_ENCODING_OPTIONS = [
  { value: 'BASE64', label: 'Base64' },
  { value: 'HEX', label: 'Hex' },
  { value: 'BASE64_URLSAFE', label: 'Base64 URL Safe' }
];

// 存储键名常量
export const STORAGE_KEYS = {
  KEY_CONFIGS: 'keyConfigs',
  SELECTED_CONFIG: 'selectedKeyConfig'
};

// 错误消息常量
export const ERROR_MESSAGES = {
  EMPTY_CONFIG_NAME: '请输入配置名称',
  DUPLICATE_CONFIG_NAME: '配置名称已存在',
  MINIMUM_ONE_CONFIG: '至少需要保留一个配置',
  EMPTY_KEY_VALUE: '对称算法需要配置密钥',
  EMPTY_RSA_KEYS: 'RSA算法需要配置公钥和私钥',
  INVALID_CONFIG: '配置无效',
  SAVE_FAILED: '保存配置失败',
  LOAD_FAILED: '加载配置失败'
};

// 成功消息常量
export const SUCCESS_MESSAGES = {
  CONFIG_CREATED: '配置已创建并保存',
  CONFIG_SAVED: '配置已保存',
  CONFIG_DELETED: '配置已删除',
  RSA_KEYS_GENERATED: 'RSA密钥对生成成功！请手动点击保存按钮保存配置'
};

// 加载状态消息
export const LOADING_MESSAGES = {
  LOADING_CONFIGS: '加载配置中...',
  GENERATING_RSA_KEYS: '正在生成RSA密钥对...'
};