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
        // SM4 返回的是 hex 格式，如果最终需要 BASE64 输出，在此处转换
        // 注意：不要在这里就转 Base64，而是保持 hex 格式传递给后续处理
        break;
      case 'RSA':
        ciphertext = RSACipher.encrypt(processedPlaintext, config);
        break;
      default:
        throw new Error(`不支持的加密算法: ${algorithm}`);
    }
    
    // 对密文进行后处理编码 - 统一使用 EncodingUtils
    if (cipherEncoding && cipherEncoding.length > 0) {
      // SM4 返回的是 HEX 格式，需要转换为 Base64 或其他指定格式
      if (mainAlgorithm === 'SM4') {
        ciphertext = EncodingUtils.encode(ciphertext, 'HEX', cipherEncoding);
      } else {
        // AES/RSA 等算法的密文通常已经是 Base64 格式
        ciphertext = EncodingUtils.encode(ciphertext, 'Base64', cipherEncoding);
      }
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
    
    // 密文预处理：统一使用 EncodingUtils 进行解码
    let processedCiphertext = ciphertext;
        
    // 如果有编码配置，使用 EncodingUtils 进行解码处理
    if (cipherEncoding && cipherEncoding.length > 0) {
      if (mainAlgorithm === 'SM4') {
        // SM4 密文通常是 BASE64 格式，需要解码为 HEX
        processedCiphertext = EncodingUtils.decode(ciphertext, "BASE64", cipherEncoding);
      } else {
        // AES/RSA 等算法的密文通常已经是 Base64 格式，可以直接使用
        processedCiphertext = EncodingUtils.decode(ciphertext, "BASE64", cipherEncoding);
      }
    }
    
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
        // SM4Cipher.decrypt 接收 HEX 格式的密文
        // 如果 cipherEncoding 包含 BASE64，需要先从 Base64 转为 HEX
        let hexCiphertext = processedCiphertext;
        if (!cipherEncoding.includes('HEX')) {
          // 默认是 BASE64 格式，需要转换为 HEX
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