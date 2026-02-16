/**
 * 秘钥配置相关的工具函数
 */
import { toast } from 'sonner';
import { StorageUtils } from './storageutils';
import { 
  DEFAULT_CONFIG_TEMPLATE, 
  NEED_PADDING_MODES, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES,
  LOADING_MESSAGES
} from './keyconfigconstants';

/**
 * 配置验证工具类
 */
export class ConfigValidator {
  /**
   * 验证配置是否有效
   * @param {Object} config - 配置对象
   * @returns {boolean} 是否有效
   */
  static isValidConfig(config) {
    if (!config || !config.name) return false;
    
    if (config.algorithm?.startsWith('RSA')) {
      // RSA配置需要公钥和私钥都有值
      return config.publicKey?.value && config.privateKey?.value;
    } else {
      // 对称算法需要密钥有值
      return config.key?.value;
    }
  }

  /**
   * 验证配置名称
   * @param {string} name - 配置名称
   * @param {Array} existingConfigs - 已存在的配置列表
   * @returns {Object} 验证结果 { isValid: boolean, message: string }
   */
  static validateConfigName(name, existingConfigs = []) {
    const trimmedName = name?.trim();
    
    if (!trimmedName) {
      return { isValid: false, message: ERROR_MESSAGES.EMPTY_CONFIG_NAME };
    }
    
    if (existingConfigs.some(c => c.name === trimmedName)) {
      return { isValid: false, message: ERROR_MESSAGES.DUPLICATE_CONFIG_NAME };
    }
    
    return { isValid: true, message: '' };
  }

  /**
   * 验证配置必填字段
   * @param {Object} config - 配置对象
   * @returns {Object} 验证结果 { isValid: boolean, message: string }
   */
  static validateRequiredFields(config) {
    if (!config.name?.trim()) {
      return { isValid: false, message: ERROR_MESSAGES.EMPTY_CONFIG_NAME };
    }
    
    if (config.algorithm?.startsWith('RSA')) {
      if (!config.publicKey?.value?.trim() || !config.privateKey?.value?.trim()) {
        return { isValid: false, message: ERROR_MESSAGES.EMPTY_RSA_KEYS };
      }
    } else {
      if (!config.key?.value?.trim()) {
        return { isValid: false, message: ERROR_MESSAGES.EMPTY_KEY_VALUE };
      }
    }
    
    return { isValid: true, message: '' };
  }
}

/**
 * 配置处理工具类
 */
export class ConfigProcessor {
  /**
   * 标准化配置对象结构
   * @param {Object} config - 原始配置
   * @returns {Object} 标准化后的配置
   */
  static normalizeConfig(config) {
    return {
      ...DEFAULT_CONFIG_TEMPLATE,
      ...config,
      key: config.key || { value: '', encoding: ['UTF8'] },
      iv: config.iv || { value: '', encoding: ['UTF8'] },
      publicKey: config.publicKey || { value: '', encoding: ['UTF8'] },
      privateKey: config.privateKey || { value: '', encoding: ['UTF8'] },
      plainEncoding: config.plainEncoding || ['UTF8'],
      cipherEncoding: config.cipherEncoding || ['BASE64']
    };
  }

  /**
   * 获取配置的显示信息
   * @param {Object} config - 配置对象
   * @returns {Object} 显示信息
   */
  static getConfigDisplayInfo(config) {
    if (!config) return {};
    
    const algorithmType = config.algorithmType || config.algorithm?.split('/')[0] || 'AES';
    const mode = config.mode || config.algorithm?.split('/')[1] || '';
    const padding = config.padding || config.algorithm?.split('/')[2] || '';
    
    return {
      algorithmType,
      mode,
      padding,
      plainEncoding: config.plainEncoding?.[0] || 'UTF8',
      cipherEncoding: config.cipherEncoding?.[0] || 'BASE64',
      needsPadding: NEED_PADDING_MODES.has(mode)
    };
  }

  /**
   * 更新复合编码
   * @param {Array} currentEncodings - 当前编码数组
   * @param {string} newEncoding - 新编码
   * @param {'add'|'remove'} action - 操作类型
   * @returns {Array} 更新后的编码数组
   */
  static updateCompoundEncoding(currentEncodings, newEncoding, action = 'add') {
    const encodings = Array.isArray(currentEncodings) ? [...currentEncodings] : [];
    
    if (action === 'add') {
      if (!encodings.includes(newEncoding)) {
        return [...encodings, newEncoding];
      }
    } else if (action === 'remove') {
      return encodings.filter(enc => enc !== newEncoding);
    }
    
    return encodings;
  }

  /**
   * 解析复合编码字符串
   * @param {string} encodingString - 编码字符串，如 "BASE64+HEX"
   * @returns {Array} 编码数组
   */
  static parseCompoundEncoding(encodingString) {
    if (!encodingString) return ['UTF8'];
    return encodingString.split('+').map(enc => enc.trim()).filter(enc => enc);
  }
}

/**
 * 存储管理工具类
 */
export class ConfigStorageManager {
  /**
   * 从存储加载配置
   * @param {string} storageKey - 存储键名
   * @param {Array} initialConfigs - 初始配置
   * @returns {Promise<Object>} 加载结果 { configs: Array, selectedConfig: string }
   */
  static async loadConfigs(storageKey, initialConfigs = []) {
    try {
      const storedResult = await StorageUtils.getItem(storageKey);
      const storedConfigs = storedResult[storageKey];
      
      let configs = [];
      let selectedConfig = '';
      
      if (storedConfigs && Array.isArray(storedConfigs) && storedConfigs.length > 0) {
        configs = storedConfigs;
        selectedConfig = storedConfigs[0].name;
      } else if (initialConfigs.length > 0) {
        configs = initialConfigs;
        selectedConfig = initialConfigs[0].name;
        // 保存初始配置到存储
        await StorageUtils.setItem(storageKey, initialConfigs);
      }
      
      return { configs, selectedConfig };
    } catch (error) {
      console.error(ERROR_MESSAGES.LOAD_FAILED, error);
      toast.error(ERROR_MESSAGES.LOAD_FAILED + ': ' + error.message);
      
      // 出错时使用初始配置
      if (initialConfigs.length > 0) {
        return { configs: initialConfigs, selectedConfig: initialConfigs[0].name };
      }
      
      return { configs: [], selectedConfig: '' };
    }
  }

  /**
   * 保存配置到存储
   * @param {string} storageKey - 存储键名
   * @param {Array} configs - 配置数组
   * @returns {Promise<boolean>} 是否保存成功
   */
  static async saveConfigs(storageKey, configs) {
    try {
      await StorageUtils.setItem(storageKey, configs);
      return true;
    } catch (error) {
      console.error(ERROR_MESSAGES.SAVE_FAILED, error);
      toast.error(ERROR_MESSAGES.SAVE_FAILED + ': ' + error.message);
      return false;
    }
  }
}

/**
 * RSA密钥生成工具类
 */
export class RSAKeyGenerator {
  /**
   * 生成RSA密钥对
   * @param {Function} onUpdateCallback - 更新回调函数
   * @returns {Promise<void>}
   */
  static async generateKeys(onUpdateCallback) {
    try {
      toast.info(LOADING_MESSAGES.GENERATING_RSA_KEYS);
      
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      );

      const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      const publicKeyPEM = this.arrayBufferToPEM(publicKey, "PUBLIC KEY");

      const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      const privateKeyPEM = this.arrayBufferToPEM(privateKey, "PRIVATE KEY");

      const keyPairData = {
        publicKey: {
          value: publicKeyPEM,
          encoding: ['UTF8']
        },
        privateKey: {
          value: privateKeyPEM,
          encoding: ['UTF8']
        }
      };

      if (onUpdateCallback && typeof onUpdateCallback === 'function') {
        onUpdateCallback(keyPairData);
      }
      
      toast.success(SUCCESS_MESSAGES.RSA_KEYS_GENERATED);
    } catch (error) {
      console.error('生成RSA密钥失败:', error);
      toast.error(`生成失败: ${error.message}`);
    }
  }

  /**
   * ArrayBuffer转PEM格式（去除头部尾部标记，只保留Base64内容）
   * @param {ArrayBuffer} buffer - 数据缓冲区
   * @param {string} type - 类型标识
   * @returns {string} PEM格式字符串
   */
  static arrayBufferToPEM(buffer, type) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64;
  }
}

/**
 * 分页工具类
 */
export class PaginationHelper {
  /**
   * 计算分页信息
   * @param {number} totalItems - 总项目数
   * @param {number} currentPage - 当前页码
   * @param {number} itemsPerPage - 每页项目数
   * @returns {Object} 分页信息
   */
  static calculatePagination(totalItems, currentPage, itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      totalPages,
      startIndex,
      endIndex,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  }

  /**
   * 生成分页链接数组
   * @param {number} currentPage - 当前页码
   * @param {number} totalPages - 总页数
   * @returns {Array} 页码数组
   */
  static generatePageNumbers(currentPage, totalPages) {
    const pageNumbers = [];
    
    if (totalPages <= 5) {
      // 总页数小于等于5，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else if (currentPage <= 3) {
      // 当前页在前3页，显示前5页
      for (let i = 1; i <= 5; i++) {
        pageNumbers.push(i);
      }
    } else if (currentPage >= totalPages - 2) {
      // 当前页在后3页，显示后5页
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // 当前页在中间，显示前后各2页
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  }
}

// 配置操作便捷函数
export const isValidConfig = ConfigValidator.isValidConfig;
export const validateConfigName = ConfigValidator.validateConfigName;
export const validateRequiredFields = ConfigValidator.validateRequiredFields;

// 配置处理便捷函数
export const normalizeConfig = ConfigProcessor.normalizeConfig;
export const getConfigDisplayInfo = ConfigProcessor.getConfigDisplayInfo;
export const updateCompoundEncoding = ConfigProcessor.updateCompoundEncoding;
export const parseCompoundEncoding = ConfigProcessor.parseCompoundEncoding;

// 存储管理便捷函数
export const loadConfigs = ConfigStorageManager.loadConfigs;
export const saveConfigs = ConfigStorageManager.saveConfigs;

// RSA密钥生成便捷函数
export const generateRSAKeys = RSAKeyGenerator.generateKeys;

// 分页处理便捷函数
export const calculatePagination = PaginationHelper.calculatePagination;
export const generatePageNumbers = PaginationHelper.generatePageNumbers;

// 新增的配置管理工具函数

/**
 * 配置管理工具类
 * 集中处理配置相关的业务逻辑
 */
export class ConfigManager {
  /**
   * 创建新的配置模板
   * @param {string} name - 配置名称
   * @returns {Object} 新配置对象
   */
  static createNewConfig(name) {
    return {
      name: name.trim(),
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
  }

  /**
   * 更新配置算法信息
   * @param {Object} config - 原配置
   * @param {Object} algorithmData - 算法数据 {algorithm, model, padding}
   * @returns {Object} 更新后的配置
   */
  static updateAlgorithmConfig(config, algorithmData) {
    const { algorithm, model, padding } = algorithmData;
    
    return {
      ...config,
      algorithm: algorithm === 'RSA' 
        ? 'RSA'
        : `${algorithm}${model ? '/' + model : ''}${padding ? '/' + padding : ''}`,
      algorithmType: algorithm || config.algorithmType,
      mode: algorithm === 'RSA' ? '' : (model || config.mode),
      model: algorithm === 'RSA' ? '' : (model || config.model),
      padding: algorithm === 'RSA' ? '' : (padding !== undefined ? padding : config.padding)
    };
  }

  /**
   * 获取RSA密钥对数据
   * @param {Object} keyPairData - 密钥对数据
   * @returns {Object} 格式化的密钥对象
   */
  static formatRSAKeyPair(keyPairData) {
    return {
      publicKey: {
        value: keyPairData.publicKeyPEM || keyPairData.publicKey,
        encoding: ['UTF8']
      },
      privateKey: {
        value: keyPairData.privateKeyPEM || keyPairData.privateKey,
        encoding: ['UTF8']
      }
    };
  }

  /**
   * 验证是否可以删除配置
   * @param {Array} configs - 配置数组
   * @param {string} configName - 要删除的配置名称
   * @returns {Object} 验证结果 {canDelete: boolean, message: string}
   */
  static canDeleteConfig(configs, configName) {
    if (configs.length <= 1) {
      return { 
        canDelete: false, 
        message: ERROR_MESSAGES.MINIMUM_ONE_CONFIG 
      };
    }
    return { canDelete: true, message: '' };
  }

  /**
   * 获取当前选中的配置
   * @param {Array} configs - 配置数组
   * @param {string} selectedConfigName - 选中的配置名称
   * @returns {Object|null} 选中的配置对象
   */
  static getCurrentConfig(configs, selectedConfigName) {
    return configs.find(c => c.name === selectedConfigName) || null;
  }

  /**
   * 更新配置列表中的特定配置
   * @param {Array} configs - 配置数组
   * @param {Object} updatedConfig - 更新后的配置
   * @returns {Array} 更新后的配置数组
   */
  static updateConfigInList(configs, updatedConfig) {
    return configs.map(config => 
      config.name === updatedConfig.name ? updatedConfig : config
    );
  }

  /**
   * 从配置列表中删除指定配置
   * @param {Array} configs - 配置数组
   * @param {string} configName - 要删除的配置名称
   * @returns {Array} 删除后的配置数组
   */
  static removeConfigFromList(configs, configName) {
    return configs.filter(c => c.name !== configName);
  }
}