import CryptoJS from 'crypto-js';
import { EncodingUtils } from './encodingutils.js';
import { AESCipher } from './aescipher.js';
import { RSACipher } from './rsacipher.js';
import { SM2Cipher } from './sm2cipher.js';
import { SM4Cipher } from './sm4cipher.js';

/**
 * 主要的加密解密工具类
 */
export class CipherUtils {
  /**
   * 通用加密方法
   * @param {string} plaintext - 明文
   * @param {Object} config - 加密配置
   * @returns {string} 密文
   */
  static encrypt(plaintext, config) {
    const { algorithm, plainEncoding = ['UTF8'], cipherEncoding = ['BASE64'] } = config;
    
    // 处理明文编码
    const processedPlaintext = EncodingUtils.processPlaintextEncoding(plaintext, plainEncoding);
    
    // 解析算法配置: AES/CBC/PKCS5Padding
    const algParts = algorithm.split('/');
    const mainAlgorithm = algParts[0].toUpperCase();
    const mode = algParts[1] ? algParts[1].toUpperCase() : 'CBC';
    const padding = algParts[2] ? algParts[2].toUpperCase() : 'PKCS5PADDING';
    
    // 构建传递给具体算法的配置
    const algorithmConfig = {
      ...config,
      mode: mode,
      padding: padding
    };
    
    // 根据算法选择加密方式
    let ciphertext;
    
    switch (mainAlgorithm) {
      case 'AES':
        ciphertext = AESCipher.encrypt(processedPlaintext, algorithmConfig);
        break;
      case 'SM2':
        ciphertext = SM2Cipher.encrypt(processedPlaintext, config);
        break;
      case 'SM4':
        ciphertext = SM4Cipher.encrypt(processedPlaintext, algorithmConfig);
        // SM4 返回的是 hex 格式，可能需要转换
        if (cipherEncoding.includes('BASE64')) {
          const wordArray = CryptoJS.enc.Hex.parse(ciphertext);
          ciphertext = wordArray.toString(CryptoJS.enc.Base64);
        }
        break;
      case 'RSA':
        ciphertext = RSACipher.encrypt(processedPlaintext, config);
        break;
      default:
        throw new Error(`不支持的加密算法: ${algorithm}`);
    }
    
    // 对密文进行后处理编码 - 统一使用EncodingUtils
    if (cipherEncoding && cipherEncoding.length > 0) {
      // 使用EncodingUtils处理所有密文编码
      ciphertext = EncodingUtils.encode(ciphertext, 'UTF8', cipherEncoding);
    }
    
    return ciphertext;
  }

  /**
   * 通用解密方法
   * @param {string} ciphertext - 密文
   * @param {Object} config - 解密配置
   * @returns {string} 明文
   */
  static decrypt(ciphertext, config) {
    const { algorithm, plainEncoding = ['UTF8'], cipherEncoding = ['BASE64'] } = config;
    
    // 解析算法配置
    const algParts = algorithm.split('/');
    const mainAlgorithm = algParts[0].toUpperCase();
    
    // 密文预处理：统一使用EncodingUtils进行解码
    let processedCiphertext = ciphertext;
    
    // 如果有编码配置，使用EncodingUtils进行解码处理
    if (cipherEncoding && cipherEncoding.length > 0) {
      processedCiphertext = EncodingUtils.decode(ciphertext, 'UTF8', cipherEncoding);
    } else if (mainAlgorithm === 'SM4' && cipherEncoding.includes('HEX')) {
      // 特殊处理：如果是 SM4 且输出为 HEX，则直接使用
      processedCiphertext = ciphertext;
    }
    // 对于AES等算法，密文通常已经是Base64格式，可以直接使用
    
    // 根据算法选择解密方式
    let plaintext;
    
    switch (mainAlgorithm) {
      case 'AES':
        plaintext = AESCipher.decrypt(processedCiphertext, config);
        break;
      case 'SM2':
        plaintext = SM2Cipher.decrypt(processedCiphertext, config);
        break;
      case 'SM4':
        // 如果密文是 base64 格式，需要先转换为 hex
        let hexCiphertext = processedCiphertext;
        if (!cipherEncoding.includes('HEX')) {
          const wordArray = CryptoJS.enc.Base64.parse(processedCiphertext);
          hexCiphertext = wordArray.toString(CryptoJS.enc.Hex);
        }
        plaintext = SM4Cipher.decrypt(hexCiphertext, config);
        break;
      case 'RSA':
        plaintext = RSACipher.decrypt(processedCiphertext, config);
        break;
      default:
        throw new Error(`不支持的解密算法: ${algorithm}`);
    }

    // 处理明文解码
    plaintext = EncodingUtils.processPlaintextDecoding(plaintext, plainEncoding);
    return plaintext;
  }
}