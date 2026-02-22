import smCrypto from 'sm-crypto';
import CryptoJS from 'crypto-js';
import { EncodingUtils } from './encodingutils.js';

const { sm4 } = smCrypto;

/**
 * SM4 加密解密类
 */
export class SM4Cipher {
  /**
   * SM4 加密
   * @param {string} plaintext - 明文
   * @param {Object} config - 配置对象
   * @returns {string} 密文 (hex格式)
   */
  static encrypt(plaintext, config) {
    const { key, iv, mode = 'CBC' } = config;
    
    // 处理密钥
    let parsedKey = key.value;
    if (key.encoding && key.encoding.length > 0) {
      parsedKey = EncodingUtils.decode(key.value, 'UTF8', key.encoding);
    }
    
    // 处理初始化向量
    let parsedIv = iv?.value || '';
    if (iv?.encoding && iv.encoding.length > 0) {
      parsedIv = EncodingUtils.decode(iv.value, 'UTF8', iv.encoding);
    }
    
    // SM4 要求密钥长度为 16 字节
    const keyHex = CryptoJS.enc.Utf8.parse(parsedKey).toString(CryptoJS.enc.Hex).padEnd(32, '0').substring(0, 32);
    const ivHex = parsedIv ? CryptoJS.enc.Utf8.parse(parsedIv).toString(CryptoJS.enc.Hex).padEnd(32, '0').substring(0, 32) : '';
    
    // SM4 支持的模式映射
    const sm4ModeMap = {
      'ECB': 'ecb',
      'CBC': 'cbc'
      // 注意：sm-crypto 库可能不支持 CFB、OFB、CTR 等模式
      // 如需支持更多模式，可能需要使用其他库或自实现
    };
    
    const sm4Mode = sm4ModeMap[mode.toUpperCase()] || 'cbc';
    
    const options = {
      mode: sm4Mode,
      iv: ivHex || undefined
    };
    
    return sm4.encrypt(plaintext, keyHex, options);
  }

  /**
   * SM4 解密
   * @param {string} ciphertext - 密文 (hex格式)
   * @param {Object} config - 配置对象
   * @returns {string} 明文
   */
  static decrypt(ciphertext, config) {
    const { key, iv, mode = 'CBC' } = config;
    
    // 处理密钥
    let parsedKey = key.value;
    if (key.encoding && key.encoding.length > 0) {
      parsedKey = EncodingUtils.decode(key.value, 'UTF8', key.encoding);
    }
    
    // 处理初始化向量
    let parsedIv = iv?.value || '';
    if (iv?.encoding && iv.encoding.length > 0) {
      parsedIv = EncodingUtils.decode(iv.value, 'UTF8', iv.encoding);
    }
    
    const keyHex = CryptoJS.enc.Utf8.parse(parsedKey).toString(CryptoJS.enc.Hex).padEnd(32, '0').substring(0, 32);
    const ivHex = parsedIv ? CryptoJS.enc.Utf8.parse(parsedIv).toString(CryptoJS.enc.Hex).padEnd(32, '0').substring(0, 32) : '';
    
    // SM4 支持的模式映射
    const sm4ModeMap = {
      'ECB': 'ecb',
      'CBC': 'cbc'
      // 注意：sm-crypto 库可能不支持 CFB、OFB、CTR 等模式
      // 如需支持更多模式，可能需要使用其他库或自实现
    };
    
    const sm4Mode = sm4ModeMap[mode.toUpperCase()] || 'cbc';
    
    const options = {
      mode: sm4Mode,
      iv: ivHex || undefined
    };
    
    return sm4.decrypt(ciphertext, keyHex, options);
  }
}