import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';
import smCrypto from 'sm-crypto';
import { EncodingUtils } from './cipher/encodingutils.js';

// 安全地解构sm2对象
let sm2;
try {
  if (smCrypto && typeof smCrypto === 'object') {
    sm2 = smCrypto.sm2 || smCrypto.default?.sm2;
  }
  
  if (!sm2 && typeof window !== 'undefined' && window.sm2) {
    sm2 = window.sm2;
  }
  
  if (!sm2) {
    sm2 = smCrypto;
  }
} catch (e) {
  console.error('SM2库初始化失败:', e);
  sm2 = null;
}

/**
 * 签名工具类
 * 支持MD5、SHA、HMAC、RSA、SM2等多种签名方法
 */
export class SignatureUtils {
  /**
   * MD5签名
   * @param {string} data - 待签名数据
   * @returns {string} MD5哈希值
   */
  static md5(data) {
    return CryptoJS.MD5(data).toString();
  }

  /**
   * SHA-1签名
   * @param {string} data - 待签名数据
   * @returns {string} SHA-1哈希值
   */
  static sha1(data) {
    return CryptoJS.SHA1(data).toString();
  }

  /**
   * SHA-256签名
   * @param {string} data - 待签名数据
   * @returns {string} SHA-256哈希值
   */
  static sha256(data) {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * SHA-512签名
   * @param {string} data - 待签名数据
   * @returns {string} SHA-512哈希值
   */
  static sha512(data) {
    return CryptoJS.SHA512(data).toString();
  }

  /**
   * HMAC-MD5签名
   * @param {string} data - 待签名数据
   * @param {string} key - 密钥
   * @returns {string} HMAC-MD5签名结果
   */
  static hmacMd5(data, key) {
    const hmac = CryptoJS.HmacMD5(data, key);
    return hmac.toString(CryptoJS.enc.Hex);
  }

  /**
   * HMAC-SHA1签名
   * @param {string} data - 待签名数据
   * @param {string} key - 密钥
   * @returns {string} HMAC-SHA1签名结果
   */
  static hmacSha1(data, key) {
    const hmac = CryptoJS.HmacSHA1(data, key);
    return hmac.toString(CryptoJS.enc.Hex);
  }

  /**
   * HMAC-SHA256签名
   * @param {string} data - 待签名数据
   * @param {string} key - 密钥
   * @returns {string} HMAC-SHA256签名结果
   */
  static hmacSha256(data, key) {
    const hmac = CryptoJS.HmacSHA256(data, key);
    return hmac.toString(CryptoJS.enc.Hex);
  }

  /**
   * HMAC-SHA512签名
   * @param {string} data - 待签名数据
   * @param {string} key - 密钥
   * @returns {string} HMAC-SHA512签名结果
   */
  static hmacSha512(data, key) {
    const hmac = CryptoJS.HmacSHA512(data, key);
    return hmac.toString(CryptoJS.enc.Hex);
  }

  /**
   * RSA签名
   * @param {string} data - 待签名数据
   * @param {Object} config - 配置对象，包含私钥
   * @param {string} hashAlgorithm - 哈希算法 (默认sha256)
   * @returns {string} RSA签名结果(Base64格式)
   */
  static rsaSign(data, config, hashAlgorithm = 'sha256') {
    const { privateKey } = config;
    
    if (!privateKey || !privateKey.value) {
      throw new Error('RSA签名需要提供私钥');
    }
    
    // 处理私钥
    let parsedPrivateKey = privateKey.value;
    if (privateKey.encoding && privateKey.encoding.length > 0) {
      parsedPrivateKey = EncodingUtils.decode(privateKey.value, 'UTF8', privateKey.encoding);
    }
    
    try {
      // 使用JSEncrypt进行RSA签名
      const encrypt = new JSEncrypt();
      encrypt.setPrivateKey(parsedPrivateKey);
      
      // 根据指定的哈希算法进行哈希
      let hashedData, cryptoJSHash, jsEncryptHash;
      switch (hashAlgorithm.toLowerCase()) {
        case 'md5':
          hashedData = CryptoJS.MD5(data).toString();
          cryptoJSHash = CryptoJS.MD5;
          jsEncryptHash = "md5";
          break;
        case 'sha1':
          hashedData = CryptoJS.SHA1(data).toString();
          cryptoJSHash = CryptoJS.SHA1;
          jsEncryptHash = "sha1";
          break;
        case 'sha256':
        default:
          hashedData = CryptoJS.SHA256(data).toString();
          cryptoJSHash = CryptoJS.SHA256;
          jsEncryptHash = "sha256";
          break;
        case 'sha512':
          hashedData = CryptoJS.SHA512(data).toString();
          cryptoJSHash = CryptoJS.SHA512;
          jsEncryptHash = "sha512";
          break;
      }
      
      // 进行RSA签名
      const signature = encrypt.sign(hashedData, cryptoJSHash, jsEncryptHash);
      
      if (!signature) {
        throw new Error(`RSA-${hashAlgorithm.toUpperCase()}签名失败`);
      }
      
      return signature;
    } catch (error) {
      throw new Error(`RSA-${hashAlgorithm.toUpperCase()}签名失败: ${error.message}`);
    }
  }

  /**
   * RSA验签
   * @param {string} data - 原始数据
   * @param {string} signature - 签名
   * @param {Object} config - 配置对象，包含公钥
   * @param {string} hashAlgorithm - 哈希算法 (默认sha256)
   * @returns {boolean} 验签结果
   */
  static rsaVerify(data, signature, config, hashAlgorithm = 'sha256') {
    const { publicKey } = config;
    
    if (!publicKey || !publicKey.value) {
      throw new Error('RSA验签需要提供公钥');
    }
    
    // 处理公钥
    let parsedPublicKey = publicKey.value;
    if (publicKey.encoding && publicKey.encoding.length > 0) {
      parsedPublicKey = EncodingUtils.decode(publicKey.value, 'UTF8', publicKey.encoding);
    }
    
    try {
      // 使用JSEncrypt进行RSA验签
      const encrypt = new JSEncrypt();
      encrypt.setPublicKey(parsedPublicKey);
      
      // 根据指定的哈希算法进行哈希
      let hashedData, cryptoJSHash;
      switch (hashAlgorithm.toLowerCase()) {
        case 'md5':
          hashedData = CryptoJS.MD5(data).toString();
          cryptoJSHash = CryptoJS.MD5;
          break;
        case 'sha1':
          hashedData = CryptoJS.SHA1(data).toString();
          cryptoJSHash = CryptoJS.SHA1;
          break;
        case 'sha256':
        default:
          hashedData = CryptoJS.SHA256(data).toString();
          cryptoJSHash = CryptoJS.SHA256;
          break;
        case 'sha512':
          hashedData = CryptoJS.SHA512(data).toString();
          cryptoJSHash = CryptoJS.SHA512;
          break;
      }
      
      // 进行RSA验签
      const result = encrypt.verify(hashedData, signature, cryptoJSHash);
      
      return result;
    } catch (error) {
      throw new Error(`RSA-${hashAlgorithm.toUpperCase()}验签失败: ${error.message}`);
    }
  }

  /**
   * SM2签名
   * @param {string} data - 待签名数据
   * @param {Object} config - 配置对象，包含私钥
   * @returns {string} SM2签名结果(Hex格式)
   */
  static sm2Sign(data, config) {
    const { privateKey } = config;
    
    if (!privateKey || !privateKey.value) {
      throw new Error('SM2签名需要提供私钥');
    }
    
    // 处理私钥
    let parsedPrivateKey = privateKey.value;
    if (privateKey.encoding && privateKey.encoding.length > 0) {
      parsedPrivateKey = EncodingUtils.decode(privateKey.value, 'UTF8', privateKey.encoding);
    }
    
    // 提取PEM格式中的私钥内容
    const cleanPrivateKey = this.extractPrivateKeyFromPEM(parsedPrivateKey);
    
    if (!cleanPrivateKey || cleanPrivateKey.length === 0) {
      throw new Error('无法从PEM格式中提取有效的私钥内容');
    }
    
    // 验证私钥是否为有效的十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(cleanPrivateKey)) {
      throw new Error('SM2私钥必须是有效的十六进制字符串');
    }
    
    try {
      if (!sm2 || typeof sm2.doSignature !== 'function') {
        throw new Error('SM2签名库未正确加载');
      }
      
      // 使用sm-crypto进行SM2签名
      const signature = sm2.doSignature(data, cleanPrivateKey, {
        hash: true // 使用SM3哈希
      });
      
      if (!signature) {
        throw new Error('SM2签名返回空结果');
      }
      
      return signature;
    } catch (error) {
      throw new Error(`SM2签名失败: ${error.message}`);
    }
  }

  /**
   * SM2验签
   * @param {string} data - 原始数据
   * @param {string} signature - 签名
   * @param {Object} config - 配置对象，包含公钥
   * @returns {boolean} 验签结果
   */
  static sm2Verify(data, signature, config) {
    const { publicKey } = config;
    
    if (!publicKey || !publicKey.value) {
      throw new Error('SM2验签需要提供公钥');
    }
    
    // 处理公钥
    let parsedPublicKey = publicKey.value;
    if (publicKey.encoding && publicKey.encoding.length > 0) {
      parsedPublicKey = EncodingUtils.decode(publicKey.value, 'UTF8', publicKey.encoding);
    }
    
    // 提取PEM格式中的公钥内容
    const cleanPublicKey = this.extractPublicKeyFromPEM(parsedPublicKey);
    
    if (!cleanPublicKey || cleanPublicKey.length === 0) {
      throw new Error('无法从PEM格式中提取有效的公钥内容');
    }
    
    // 验证公钥是否为有效的十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(cleanPublicKey)) {
      throw new Error('SM2公钥必须是有效的十六进制字符串');
    }
    
    try {
      if (!sm2 || typeof sm2.doVerifySignature !== 'function') {
        throw new Error('SM2验签库未正确加载');
      }
      
      // 使用sm-crypto进行SM2验签
      const result = sm2.doVerifySignature(data, signature, cleanPublicKey, {
        hash: true // 使用SM3哈希
      });
      
      return result;
    } catch (error) {
      throw new Error(`SM2验签失败: ${error.message}`);
    }
  }

  /**
   * 从PEM格式公钥中提取纯公钥内容
   * @private
   * @param {string} pemKey - PEM格式的公钥
   * @returns {string} 纯公钥内容（十六进制）
   */
  static extractPublicKeyFromPEM(pemKey) {
    let cleanPEM = pemKey
      .replace(/-----BEGIN\s+(EC\s+)?PUBLIC\s+KEY-----/gi, '')
      .replace(/-----END\s+(EC\s+)?PUBLIC\s+KEY-----/gi, '')
      .replace(/\r\n/g, '')
      .replace(/\n/g, '')
      .replace(/\s/g, '')
      .trim();
    
    try {
      const binaryString = atob(cleanPEM);
      const hexArray = [];
      for (let i = 0; i < binaryString.length; i++) {
        const hex = binaryString.charCodeAt(i).toString(16).padStart(2, '0');
        hexArray.push(hex);
      }
      const hexString = hexArray.join('');
      
      if (!/^[0-9a-fA-F]+$/.test(hexString)) {
        throw new Error('解码后的内容不是有效的十六进制格式');
      }
      
      return hexString;
    } catch (error) {
      throw new Error(`PEM格式公钥解析失败: ${error.message}`);
    }
  }

  /**
   * 从PEM格式私钥中提取纯私钥内容
   * @private
   * @param {string} pemKey - PEM格式的私钥
   * @returns {string} 纯私钥内容（十六进制）
   */
  static extractPrivateKeyFromPEM(pemKey) {
    let cleanPEM = pemKey
      .replace(/-----BEGIN\s+(EC\s+)?PRIVATE\s+KEY-----/gi, '')
      .replace(/-----END\s+(EC\s+)?PRIVATE\s+KEY-----/gi, '')
      .replace(/\r\n/g, '')
      .replace(/\n/g, '')
      .replace(/\s/g, '')
      .trim();
    
    try {
      const binaryString = atob(cleanPEM);
      const hexArray = [];
      for (let i = 0; i < binaryString.length; i++) {
        const hex = binaryString.charCodeAt(i).toString(16).padStart(2, '0');
        hexArray.push(hex);
      }
      const hexString = hexArray.join('');
      
      if (!/^[0-9a-fA-F]+$/.test(hexString)) {
        throw new Error('解码后的内容不是有效的十六进制格式');
      }
      
      return hexString;
    } catch (error) {
      throw new Error(`PEM格式私钥解析失败: ${error.message}`);
    }
  }

  /**
   * 通用签名方法
   * @param {string} data - 待签名数据
   * @param {string} method - 签名方法
   * @param {Object} config - 配置对象（对于需要密钥的方法）
   * @param {string} key - HMAC密钥（对于HMAC方法）
   * @param {string} hashAlgorithm - 哈希算法（对于RSA方法）
   * @returns {string} 签名结果
   */
  static sign(data, method, config = null, key = null, hashAlgorithm = 'sha256') {
    switch (method.toLowerCase()) {
      case 'md5':
        return this.md5(data);
      case 'sha1':
        return this.sha1(data);
      case 'sha256':
        return this.sha256(data);
      case 'sha512':
        return this.sha512(data);
      case 'hmac-md5':
        if (!key) throw new Error('HMAC-MD5需要提供密钥');
        return this.hmacMd5(data, key);
      case 'hmac-sha1':
        if (!key) throw new Error('HMAC-SHA1需要提供密钥');
        return this.hmacSha1(data, key);
      case 'hmac-sha256':
        if (!key) throw new Error('HMAC-SHA256需要提供密钥');
        return this.hmacSha256(data, key);
      case 'hmac-sha512':
        if (!key) throw new Error('HMAC-SHA512需要提供密钥');
        return this.hmacSha512(data, key);
      case 'rsa':
      case 'rsa_sign':
        if (!config) throw new Error('RSA签名需要提供配置');
        return this.rsaSign(data, config, hashAlgorithm);
      case 'sm2':
      case 'sm2_sign':
        if (!config) throw new Error('SM2签名需要提供配置');
        return this.sm2Sign(data, config);
      default:
        throw new Error(`不支持的签名方法: ${method}`);
    }
  }

  /**
   * 通用验签方法
   * @param {string} data - 原始数据
   * @param {string} signature - 签名
   * @param {string} method - 签名方法
   * @param {Object} config - 配置对象
   * @param {string} key - HMAC密钥
   * @param {string} hashAlgorithm - 哈希算法（对于RSA方法）
   * @returns {boolean|string} 验签结果
   */
  static verify(data, signature, method, config = null, key = null, hashAlgorithm = 'sha256') {
    // 对于哈希算法，直接比较结果
    const hashMethods = ['md5', 'sha1', 'sha256', 'sha512'];
    if (hashMethods.includes(method.toLowerCase())) {
      const computedHash = this.sign(data, method);
      return computedHash === signature;
    }
    
    // 对于HMAC算法
    const hmacMethods = ['hmac-md5', 'hmac-sha1', 'hmac-sha256', 'hmac-sha512'];
    if (hmacMethods.includes(method.toLowerCase())) {
      if (!key) throw new Error(`${method}验签需要提供密钥`);
      const computedSignature = this.sign(data, method, null, key);
      return computedSignature === signature;
    }
    
    // 对于非对称算法
    switch (method.toLowerCase()) {
      case 'rsa':
      case 'rsa_sign':
        if (!config) throw new Error('RSA验签需要提供配置');
        return this.rsaVerify(data, signature, config, hashAlgorithm);
      case 'sm2':
      case 'sm2_sign':
        if (!config) throw new Error('SM2验签需要提供配置');
        return this.sm2Verify(data, signature, config);
      default:
        throw new Error(`不支持的验签方法: ${method}`);
    }
  }
}