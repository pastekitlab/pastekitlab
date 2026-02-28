// 核心解密引擎 - 使用 Web Crypto API 实现

import { EncodingUtils } from './encoding-utils.js';

class CryptoEngine {
  /**
   * 主解密方法 - 根据配置自动选择算法
   * @param {Object} context 解密上下文
   * @returns {Promise<Object>} 解密结果
   */
  static async decrypt(context) {
    const { config, data, isRequest } = context;
    const startTime = Date.now();

    try {
      // 预处理数据 - 处理编码
      const processedData = await this.preprocessData(data, config);
      
      // 根据算法类型选择解密方法
      let plaintext;
      
      switch (config.algorithm?.toUpperCase()) {
        case 'AES':
          plaintext = await this.decryptAES(processedData, config);
          break;
        case 'SM4':
          plaintext = await this.decryptSM4(processedData, config);
          break;
        case 'RSA':
          plaintext = await this.decryptRSA(processedData, config);
          break;
        case 'SM2':
          plaintext = await this.decryptSM2(processedData, config);
          break;
        default:
          throw new Error(`不支持的算法: ${config.algorithm}`);
      }

      // 后处理 - 处理明文编码
      const finalPlaintext = this.postprocessPlaintext(plaintext, config);

      return {
        success: true,
        plaintext: finalPlaintext,
        algorithm: config.algorithm,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('解密失败:', error);
      return {
        success: false,
        error: error.message,
        algorithm: config.algorithm,
        timestamp: Date.now()
      };
    }
  }

  /**
   * AES 解密实现
   * @private
   */
  static async decryptAES(data, config) {
    const { key, iv, mode = 'CBC', padding = 'PKCS7' } = config;

    if (!key) {
      throw new Error('AES 解密需要密钥');
    }

    try {
      // 导入密钥
      const keyBytes = new TextEncoder().encode(key);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-CBC', length: keyBytes.length * 8 },
        false,
        ['decrypt']
      );

      // 处理 IV
      let ivBytes;
      if (mode.toUpperCase() === 'CBC') {
        if (!iv) {
          throw new Error('CBC 模式需要初始化向量');
        }
        ivBytes = new TextEncoder().encode(iv).slice(0, 16);
        // 确保 IV 长度为 16 字节
        if (ivBytes.byteLength < 16) {
          const paddedIv = new Uint8Array(16);
          paddedIv.set(ivBytes);
          ivBytes = paddedIv.buffer;
        }
      } else {
        // ECB 模式使用零 IV
        ivBytes = new Uint8Array(16).buffer;
      }

      // 解码密文
      const ciphertext = EncodingUtils.normalizeEncodedData(data, 'BASE64');
      const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

      // 执行解密
      const algorithm = mode.toUpperCase() === 'CBC' 
        ? { name: 'AES-CBC', iv: ivBytes }
        : { name: 'AES-ECB' };

      const decryptedBytes = await crypto.subtle.decrypt(
        algorithm,
        cryptoKey,
        ciphertextBytes
      );

      // 处理填充
      const decryptedArray = new Uint8Array(decryptedBytes);
      let plaintextBytes = decryptedArray;

      if (padding.toUpperCase() === 'PKCS7') {
        const paddingLength = decryptedArray[decryptedArray.length - 1];
        if (paddingLength > 0 && paddingLength <= 16) {
          plaintextBytes = decryptedArray.slice(0, decryptedArray.length - paddingLength);
        }
      }

      return new TextDecoder().decode(plaintextBytes);
    } catch (error) {
      throw new Error(`AES 解密失败: ${error.message}`);
    }
  }

  /**
   * SM4 解密实现（简化版本）
   * @private
   */
  static async decryptSM4(data, config) {
    const { key, iv, mode = 'CBC' } = config;

    if (!key) {
      throw new Error('SM4 解密需要密钥');
    }

    // 注意：Web Crypto API 不直接支持 SM4
    // 这里提供框架，实际需要集成国密 JavaScript 库
    
    console.warn('SM4 解密需要集成国密库');
    
    // 临时返回处理过的数据
    return `[SM4解密结果] ${data.substring(0, 50)}...`;
  }

  /**
   * RSA 解密实现
   * @private
   */
  static async decryptRSA(data, config) {
    const { privateKey, padding = 'PKCS1' } = config;

    if (!privateKey) {
      throw new Error('RSA 解密需要私钥');
    }

    try {
      // 解析 PEM 格式的私钥
      const pemHeader = '-----BEGIN PRIVATE KEY-----';
      const pemFooter = '-----END PRIVATE KEY-----';
      const pemContents = privateKey
        .replace(pemHeader, '')
        .replace(pemFooter, '')
        .replace(/\s/g, '');

      const binaryDerString = atob(pemContents);
      const binaryDer = new Uint8Array(binaryDerString.length);
      for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
      }

      // 导入私钥
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer.buffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['decrypt']
      );

      // 解码密文
      const ciphertext = EncodingUtils.normalizeEncodedData(data, 'BASE64');
      const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

      const decryptedBytes = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        cryptoKey,
        ciphertextBytes
      );

      return new TextDecoder().decode(decryptedBytes);
    } catch (error) {
      throw new Error(`RSA 解密失败: ${error.message}`);
    }
  }

  /**
   * SM2 解密实现（简化版本）
   * @private
   */
  static async decryptSM2(data, config) {
    const { privateKey } = config;

    if (!privateKey) {
      throw new Error('SM2 解密需要私钥');
    }

    // 注意：Web Crypto API 不直接支持 SM2
    // 这里提供框架，实际需要集成国密 JavaScript 库
    
    console.warn('SM2 解密需要集成国密库');
    
    // 临时返回处理过的数据
    return `[SM2解密结果] ${data.substring(0, 50)}...`;
  }

  /**
   * 数据预处理 - 处理输入编码
   * @private
   */
  static async preprocessData(data, config) {
    // 如果有特定的密文编码配置，进行相应处理
    const cipherEncoding = config.cipherEncoding || ['BASE64'];
    
    // 目前简单返回原数据，实际可以根据配置进行编码转换
    return data;
  }

  /**
   * 明文后处理 - 处理输出编码
   * @private
   */
  static postprocessPlaintext(plaintext, config) {
    // 如果有特定的明文编码配置，进行相应处理
    const plainEncoding = config.plainEncoding || ['UTF8'];
    
    // 目前简单返回原数据，实际可以根据配置进行编码转换
    return plaintext;
  }

  /**
   * 批量解密
   * @param {Array} contexts 解密上下文数组
   * @returns {Promise<Array>} 解密结果数组
   */
  static async batchDecrypt(contexts) {
    return Promise.all(
      contexts.map(context => this.decrypt(context))
    );
  }

  /**
   * 验证解密配置
   * @param {Object} config 解密配置
   * @returns {boolean} 配置是否有效
   */
  static validateConfig(config) {
    if (!config.algorithm) return false;
    if (!config.key && !config.privateKey) return false;
    
    // 根据不同算法验证必要参数
    switch (config.algorithm.toUpperCase()) {
      case 'AES':
      case 'SM4':
        return !!config.key;
      case 'RSA':
      case 'SM2':
        return !!config.privateKey;
      default:
        return false;
    }
  }
}

// 导出 CryptoEngine 类
export { CryptoEngine };