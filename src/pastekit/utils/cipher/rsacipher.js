import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';
import { EncodingUtils } from './encodingutils.js';

/**
 * RSA 加密解密类
 */
export class RSACipher {
  /**
   * RSA 加密
   * @param {string} plaintext - 明文
   * @param {Object} config - 配置对象
   * @returns {string} 密文
   */
  static encrypt(plaintext, config) {
    const { publicKey, plainEncoding = ['UTF8'], cipherEncoding = ['BASE64'] } = config;
    
    if (!publicKey || !publicKey.value) {
      throw new Error('RSA加密需要提供公钥');
    }
    
    // 明文编码方式处理：如果指定了非UTF8的编码方式，需要先解码
    let processedPlaintext = plaintext;
    if (plainEncoding && plainEncoding.length > 0 && !plainEncoding.includes('UTF8')) {
      // 如果明文是以其他编码方式存储的，需要先解码为UTF8
      processedPlaintext = EncodingUtils.decode(plaintext, 'UTF8', plainEncoding);
    }
    
    // 处理公钥
    // 使用JSEncrypt进行RSA加密（适用于浏览器环境）
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey.value);
    
    let encrypted = encrypt.encrypt(processedPlaintext);
    
    if (!encrypted) {
      throw new Error('RSA加密失败，请检查公钥格式是否正确');
    }
    
    // 处理密文编码
    if (cipherEncoding && cipherEncoding.length > 0) {
      if (cipherEncoding.includes('HEX')) {
        // 转换为HEX格式
        const wordArray = CryptoJS.enc.Base64.parse(encrypted);
        encrypted = wordArray.toString(CryptoJS.enc.Hex);
      } else if (cipherEncoding.includes('BASE64_URLSAFE')) {
        // 转换为URL安全的Base64
        encrypted = encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      }
      // 如果是标准BASE64，保持不变
    }
    
    return encrypted;
  }

  /**
   * RSA 解密
   * @param {string} ciphertext - 密文
   * @param {Object} config - 配置对象
   * @returns {string} 明文
   */
  static decrypt(ciphertext, config) {
    const { privateKey, plainEncoding = ['UTF8'], cipherEncoding = ['BASE64'] } = config;
    
    if (!privateKey || !privateKey.value) {
      throw new Error('RSA解密需要提供私钥');
    }
    
    // 密文预处理：根据cipherEncoding进行相应处理
    let processedCiphertext = ciphertext;
    if (cipherEncoding && cipherEncoding.length > 0) {
      if (cipherEncoding.includes('HEX')) {
        // HEX格式需要转换为Base64
        const wordArray = CryptoJS.enc.Hex.parse(processedCiphertext);
        processedCiphertext = wordArray.toString(CryptoJS.enc.Base64);
      } else if (cipherEncoding.includes('BASE64_URLSAFE')) {
        // URL安全Base64需要转换为标准Base64
        let base64Str = processedCiphertext.replace(/-/g, '+').replace(/_/g, '/');
        // 补充缺失的填充字符
        while (base64Str.length % 4 !== 0) {
          base64Str += '=';
        }
        processedCiphertext = base64Str;
      }
      // 如果是标准BASE64，保持不变
    }
    
    // 处理私钥
    // 使用JSEncrypt进行RSA解密（适用于浏览器环境）
    const decrypt = new JSEncrypt();
    decrypt.setPrivateKey(privateKey.value);
    
    let decrypted = decrypt.decrypt(processedCiphertext);
    
    if (decrypted === false || decrypted === null) {
      throw new Error('RSA解密失败，请检查私钥格式是否正确或密文是否有效');
    }
    
    // 明文编码方式处理：如果指定了非UTF8的编码方式，需要重新编码
    if (plainEncoding && plainEncoding.length > 0 && !plainEncoding.includes('UTF8')) {
      // 解密得到的是UTF8格式，如果需要其他编码格式，需要重新编码
      decrypted = EncodingUtils.encode(decrypted, 'UTF8', plainEncoding);
    }
    
    return decrypted;
  }
}