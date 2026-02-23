import CryptoJS from 'crypto-js';
import { EncodingUtils } from './encodingutils.js';

/**
 * AES 加密解密类
 */
export class AESCipher {
  /**
   * AES 加密
   * @param {string} plaintext - 明文
   * @param {Object} config - 配置对象
   * @returns {string} 密文
   */
  static encrypt(plaintext, config) {
    const { key, iv, mode = 'CBC', padding = 'Pkcs7' } = config;
    
    // 处理密钥
    let parsedKey = key.value;
    if (key.encoding && key.encoding.length > 0) {
      parsedKey = EncodingUtils.decode(key.value, key.encoding[0], []);
    }
    
    // 处理初始化向量
    let parsedIv = iv?.value || '';
    if (iv?.encoding && iv.encoding.length > 0) {
      parsedIv = EncodingUtils.decode(iv.value, iv.encoding[0], []);
    }
    
    // 根据模式选择加密方式
    const keyWordArray = CryptoJS.enc.Utf8.parse(parsedKey);
    const ivWordArray = CryptoJS.enc.Utf8.parse(parsedIv);
    
    let encrypted;
    const cryptoMode = CryptoJS.mode[mode.toUpperCase()] || CryptoJS.mode.CBC;
    const cryptoPadding = CryptoJS.pad[padding.toUpperCase()] || CryptoJS.pad.Pkcs7;
    
    switch (mode.toUpperCase()) {
      case 'ECB':
        encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
          mode: cryptoMode,
          padding: cryptoPadding
        });
        break;
      case 'CBC':
      case 'CFB':
      case 'OFB':
      case 'CTR':
        encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
          iv: ivWordArray,
          mode: cryptoMode,
          padding: cryptoPadding
        });
        break;
      default:
        // 默认使用 CBC 模式
        encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
          iv: ivWordArray,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        break;
    }
    
    return encrypted.toString();
  }

  /**
   * AES 解密
   * @param {string} ciphertext - 密文
   * @param {Object} config - 配置对象
   * @returns {string} 明文
   */
  static decrypt(ciphertext, config) {
    const { key, iv, mode = 'CBC', padding = 'Pkcs7' } = config;
    
    // 处理密钥
    let parsedKey = key.value;
    if (key.encoding && key.encoding.length > 0) {
      parsedKey = EncodingUtils.decode(key.value, key.encoding[0], []);
    }
    
    // 处理初始化向量
    let parsedIv = iv?.value || '';
    if (iv?.encoding && iv.encoding.length > 0) {
      parsedIv = EncodingUtils.decode(iv.value, iv.encoding[0], []);
    }
    
    const keyWordArray = CryptoJS.enc.Utf8.parse(parsedKey);
    const ivWordArray = CryptoJS.enc.Utf8.parse(parsedIv);
    
    let decrypted;
    // 处理模式和填充方式
    const modeUpper = mode.toUpperCase();
    const paddingUpper = padding.toUpperCase().replace('PADDING', '');
    
    const cryptoMode = CryptoJS.mode[modeUpper] || CryptoJS.mode.CBC;
    const cryptoPadding = CryptoJS.pad[paddingUpper] || CryptoJS.pad.Pkcs7;
    
    // CFB, OFB, CTR 模式通常不使用填充
    const usePadding = ['ECB', 'CBC'].includes(modeUpper);
    
    const decryptOptions = {
      mode: cryptoMode,
      padding: usePadding ? cryptoPadding : CryptoJS.pad.NoPadding
    };
    
    // 只有需要IV的模式才添加iv参数
    if (['CBC', 'CFB', 'OFB', 'CTR'].includes(modeUpper)) {
      decryptOptions.iv = ivWordArray;
    }
    
    decrypted = CryptoJS.AES.decrypt(ciphertext, keyWordArray, decryptOptions);
    
    // 增加解密结果有效性检查
    if (!decrypted || decrypted.toString() === '') {
      throw new Error('AES解密失败：解密结果为空');
    }
    
    // 针对流模式的特殊处理：手动移除可能的零填充
    if (['CFB', 'OFB', 'CTR'].includes(modeUpper)) {
      // 获取原始字节数组
      const words = decrypted.words;
      const sigBytes = decrypted.sigBytes;
      
      // 转换为Uint8Array
      const bytes = new Uint8Array(sigBytes);
      for (let i = 0; i < sigBytes; i++) {
        const wordIndex = Math.floor(i / 4);
        const byteIndex = i % 4;
        bytes[i] = (words[wordIndex] >>> (24 - byteIndex * 8)) & 0xff;
      }
      
      // 查找并移除末尾的零字节填充
      let actualLength = sigBytes;
      for (let i = sigBytes - 1; i >= 0; i--) {
        if (bytes[i] === 0) {
          actualLength = i;
        } else {
          break;
        }
      }
      
      // 只取有效部分转换为字符串
      const validBytes = bytes.slice(0, actualLength);
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(validBytes);
      } catch (decodeError) {
        // 如果UTF-8转换失败，直接抛出错误
        console.error('UTF-8转换失败:', decodeError.message);
        throw new Error(`UTF-8转换失败: ${decodeError.message}`);
      }
    }
    
    // 对于块模式，安全地转换为UTF-8字符串
    try {
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      
      // 增加解密结果验证
      if (!result || result.trim() === '') {
        throw new Error('解密结果为空或无效');
      }
      
      // 移除可能的PKCS#7填充
      if (['CBC', 'ECB'].includes(modeUpper)) {
        const paddingLength = result.charCodeAt(result.length - 1);
        if (paddingLength > 0 && paddingLength <= 16) {
          // 验证填充是否正确
          let isValidPadding = true;
          for (let i = result.length - paddingLength; i < result.length; i++) {
            if (result.charCodeAt(i) !== paddingLength) {
              isValidPadding = false;
              break;
            }
          }
          if (isValidPadding) {
            return result.substring(0, result.length - paddingLength);
          }
        }
      }
      return result;
    } catch (utf8Error) {
      // 如果UTF-8转换失败，直接抛出错误
      console.error('UTF-8转换失败:', utf8Error.message);
      throw new Error(`UTF-8转换失败: ${utf8Error.message}`);
    }
  }
}