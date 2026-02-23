import smCrypto from 'sm-crypto';
import CryptoJS from 'crypto-js';
import { EncodingUtils } from './encodingutils.js';

// 安全地解构sm2对象，添加错误处理
let sm2;
try {
  if (smCrypto && typeof smCrypto === 'object') {
    sm2 = smCrypto.sm2 || smCrypto.default?.sm2;
  }
  
  // 如果仍未获取到sm2，尝试直接访问
  if (!sm2 && typeof window !== 'undefined' && window.sm2) {
    sm2 = window.sm2;
  }
  
  // 最后的fallback
  if (!sm2) {
    sm2 = smCrypto;
  }
} catch (e) {
  console.error('SM2库初始化失败:', e);
  sm2 = null;
}

// 验证sm2库是否正确加载
if (!sm2) {
  console.error('SM2库未正确加载，可用对象:', Object.keys(smCrypto || {}));
  throw new Error('SM2加密库加载失败，请检查依赖安装');
}

console.log('SM2库加载成功，可用方法:', Object.getOwnPropertyNames(sm2).filter(name => typeof sm2[name] === 'function'));

/**
 * SM2 加密解密类
 * 支持国密SM2公钥密码算法的加密、解密、签名、验签功能
 */
export class SM2Cipher {
  /**
   * SM2 加密
   * @param {string} plaintext - 明文
   * @param {Object} config - 配置对象
   * @returns {string} 密文 (Base64格式)
   */
  static encrypt(plaintext, config) {
    console.log('=== SM2 加密开始 ===');
    console.log('输入参数:', { plaintext: plaintext?.substring(0, 50) + '...', config });
    
    const { publicKey, cipherEncoding = ['BASE64'] } = config;
    
    if (!publicKey || !publicKey.value) {
      throw new Error('SM2加密需要提供公钥');
    }
    
    console.log('原始公钥:', publicKey.value?.substring(0, 100) + '...');
    // 处理公钥
    let parsedPublicKey = publicKey.value;
    if (publicKey.encoding && publicKey.encoding.length > 0) {
      try {
        // 将公钥按照其编码格式解码为UTF8
        parsedPublicKey = EncodingUtils.decode(publicKey.value, publicKey.encoding[0], []);
        console.log('解码后公钥:', parsedPublicKey?.substring(0, 100) + '...');
      } catch (decodeError) {
        console.error('公钥解码失败:', decodeError);
        throw new Error(`公钥解码失败: ${decodeError.message}`);
      }
    }
    
    // 验证公钥格式
    if (!parsedPublicKey || typeof parsedPublicKey !== 'string') {
      console.error('公钥格式验证失败:', { parsedPublicKey, type: typeof parsedPublicKey });
      throw new Error('SM2公钥格式无效');
    }
    
    // 提取PEM格式中的公钥内容
    const cleanPublicKey = this.extractPublicKeyFromPEM(parsedPublicKey);
    console.log('提取后的公钥长度:', cleanPublicKey?.length);
    console.log('提取后的公钥预览:', cleanPublicKey?.substring(0, 100) + '...');
    
    // 验证提取后的公钥
    if (!cleanPublicKey || cleanPublicKey.length === 0) {
      console.error('公钥提取失败:', { original: parsedPublicKey?.substring(0, 100) });
      throw new Error('无法从PEM格式中提取有效的公钥内容');
    }
    
    // 验证公钥是否为有效的十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(cleanPublicKey)) {
      console.error('公钥不是有效的十六进制格式:', cleanPublicKey?.substring(0, 50));
      throw new Error('SM2公钥必须是有效的十六进制字符串');
    }
    
    try {
      // 验证sm2库是否正确加载
      if (!sm2) {
        throw new Error('SM2加密库未加载');
      }
      
      if (typeof sm2.doEncrypt !== 'function') {
        console.error('SM2库可用方法:', Object.getOwnPropertyNames(sm2).filter(name => typeof sm2[name] === 'function'));
        throw new Error('SM2加密库未正确加载，缺少doEncrypt方法');
      }
      
      console.log('开始调用sm2.doEncrypt...');
      console.log('参数详情:', {
        plaintextLength: plaintext.length,
        publicKeyLength: cleanPublicKey.length,
        mode: 1
      });
      
      // 使用sm-crypto进行SM2加密
      const encrypted = sm2.doEncrypt(plaintext, cleanPublicKey, 1); // mode=1表示C1C3C2格式
      
      console.log('加密结果:', { encrypted: encrypted?.substring(0, 50) + '...', type: typeof encrypted });
      
      // 验证加密结果
      if (!encrypted) {
        throw new Error('SM2加密返回空结果');
      }
      
      if (typeof encrypted !== 'string') {
        throw new Error(`SM2加密返回非字符串结果: ${typeof encrypted}`);
      }
      
      // 处理密文编码
      let result = encrypted;
      if (cipherEncoding.includes('BASE64')) {
        // sm2加密结果已经是hex格式，转换为Base64
        const wordArray = CryptoJS.enc.Hex.parse(encrypted);
        result = wordArray.toString(CryptoJS.enc.Base64);
        console.log('Base64编码后的结果:', result?.substring(0, 50) + '...');
      } else if (cipherEncoding.includes('HEX')) {
        // 保持hex格式
        result = encrypted;
        console.log('保持HEX格式:', result);
      }
      
      console.log('=== SM2 加密完成 ===');
      return result;
    } catch (error) {
      console.error('=== SM2 加密失败 ===');
      console.error('错误详情:', {
        errorMessage: error.message,
        errorStack: error.stack,
        publicKeyLength: cleanPublicKey.length,
        publicKeyPreview: cleanPublicKey.substring(0, 50) + '...',
        plaintextLength: plaintext.length,
        plaintextPreview: plaintext.substring(0, 50) + '...'
      });
      
      // 提供更具体的错误信息
      if (error.message.includes('multiply')) {
        throw new Error('SM2加密失败：椭圆曲线参数初始化失败，请检查公钥格式是否正确');
      }
      
      throw new Error(`SM2加密失败: ${error.message}`);
    }
  }

  /**
   * SM2 解密
   * @param {string} ciphertext - 密文
   * @param {Object} config - 配置对象
   * @returns {string} 明文
   */
  static decrypt(ciphertext, config) {
    const { privateKey, cipherEncoding = ['BASE64'] } = config;
    
    if (!privateKey || !privateKey.value) {
      throw new Error('SM2解密需要提供私钥');
    }
    
    // 处理密文编码
    let processedCiphertext = ciphertext;
    if (cipherEncoding.includes('BASE64')) {
      // Base64转hex
      const wordArray = CryptoJS.enc.Base64.parse(ciphertext);
      processedCiphertext = wordArray.toString(CryptoJS.enc.Hex);
    } else if (cipherEncoding.includes('HEX')) {
      // 保持hex格式
      processedCiphertext = ciphertext;
    }
    
    // 验证密文格式
    if (!processedCiphertext || typeof processedCiphertext !== 'string') {
      throw new Error('SM2密文格式无效');
    }
    
    // 处理私钥
    let parsedPrivateKey = privateKey.value;
    if (privateKey.encoding && privateKey.encoding.length > 0) {
      // 将私钥按照其编码格式解码为UTF8
      parsedPrivateKey = EncodingUtils.decode(privateKey.value, privateKey.encoding[0], []);
    }
    
    // 验证私钥格式
    if (!parsedPrivateKey || typeof parsedPrivateKey !== 'string') {
      throw new Error('SM2私钥格式无效');
    }
    
    // 提取PEM格式中的私钥内容
    const cleanPrivateKey = this.extractPrivateKeyFromPEM(parsedPrivateKey);
    
    // 验证提取后的私钥
    if (!cleanPrivateKey || cleanPrivateKey.length === 0) {
      throw new Error('无法从PEM格式中提取有效的私钥内容');
    }
    
    // 验证私钥是否为有效的十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(cleanPrivateKey)) {
      console.error('私钥不是有效的十六进制格式:', cleanPrivateKey?.substring(0, 50));
      throw new Error('SM2私钥必须是有效的十六进制字符串');
    }
    
    try {
      // 验证sm2库是否正确加载
      if (!sm2 || typeof sm2.doDecrypt !== 'function') {
        throw new Error('SM2解密库未正确加载');
      }
      
      // 使用sm-crypto进行SM2解密
      const decrypted = sm2.doDecrypt(processedCiphertext, cleanPrivateKey, 1); // mode=1表示C1C3C2格式
      
      if (!decrypted) {
        throw new Error('SM2解密失败，可能是密文无效或密钥不匹配');
      }
      
      return decrypted;
    } catch (error) {
      console.error('SM2解密详细错误:', {
        errorMessage: error.message,
        privateKeyLength: cleanPrivateKey.length,
        privateKeyPreview: cleanPrivateKey.substring(0, 50) + '...',
        ciphertextLength: processedCiphertext.length,
        ciphertextPreview: processedCiphertext.substring(0, 50) + '...'
      });
      throw new Error(`SM2解密失败: ${error.message}`);
    }
  }

  /**
   * SM2 签名
   * @param {string} data - 待签名数据
   * @param {Object} config - 配置对象
   * @returns {string} 签名结果 (Base64格式)
   */
  static sign(data, config) {
    const { privateKey, cipherEncoding = ['BASE64'] } = config;
    
    if (!privateKey || !privateKey.value) {
      throw new Error('SM2签名需要提供私钥');
    }
    
    // 处理私钥
    let parsedPrivateKey = privateKey.value;
    if (privateKey.encoding && privateKey.encoding.length > 0) {
      parsedPrivateKey = EncodingUtils.decode(privateKey.value, 'UTF8', privateKey.encoding);
    }
    
    // 验证私钥格式
    if (!parsedPrivateKey || typeof parsedPrivateKey !== 'string') {
      throw new Error('SM2私钥格式无效');
    }
    
    // 提取PEM格式中的私钥内容
    const cleanPrivateKey = this.extractPrivateKeyFromPEM(parsedPrivateKey);
    
    // 验证提取后的私钥
    if (!cleanPrivateKey || cleanPrivateKey.length === 0) {
      throw new Error('无法从PEM格式中提取有效的私钥内容');
    }
    
    // 验证私钥是否为有效的十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(cleanPrivateKey)) {
      console.error('私钥不是有效的十六进制格式:', cleanPrivateKey?.substring(0, 50));
      throw new Error('SM2私钥必须是有效的十六进制字符串');
    }
    
    try {
      // 验证sm2库是否正确加载
      if (!sm2 || typeof sm2.doSignature !== 'function') {
        throw new Error('SM2签名库未正确加载');
      }
      
      // 使用sm-crypto进行SM2签名
      const signature = sm2.doSignature(data, cleanPrivateKey, {
        hash: true // 使用SM3哈希
      });
      
      // 验证签名结果
      if (!signature) {
        throw new Error('SM2签名返回空结果');
      }
      
      // 处理签名编码
      let result = signature;
      if (cipherEncoding.includes('BASE64')) {
        // 签名结果转Base64
        const wordArray = CryptoJS.enc.Hex.parse(signature);
        result = wordArray.toString(CryptoJS.enc.Base64);
      }
      
      return result;
    } catch (error) {
      console.error('SM2签名详细错误:', {
        errorMessage: error.message,
        privateKeyLength: cleanPrivateKey.length,
        privateKeyPreview: cleanPrivateKey.substring(0, 50) + '...',
        dataLength: data.length,
        dataPreview: data.substring(0, 50) + '...'
      });
      throw new Error(`SM2签名失败: ${error.message}`);
    }
  }

  /**
   * SM2 验签
   * @param {string} data - 原始数据
   * @param {string} signature - 签名
   * @param {Object} config - 配置对象
   * @returns {boolean} 验签结果
   */
  static verify(data, signature, config) {
    const { publicKey, cipherEncoding = ['BASE64'] } = config;
    
    if (!publicKey || !publicKey.value) {
      throw new Error('SM2验签需要提供公钥');
    }
    
    // 处理签名编码
    let processedSignature = signature;
    if (cipherEncoding.includes('BASE64')) {
      // Base64转hex
      const wordArray = CryptoJS.enc.Base64.parse(signature);
      processedSignature = wordArray.toString(CryptoJS.enc.Hex);
    }
    
    // 验证签名格式
    if (!processedSignature || typeof processedSignature !== 'string') {
      throw new Error('SM2签名格式无效');
    }
    
    // 处理公钥
    let parsedPublicKey = publicKey.value;
    if (publicKey.encoding && publicKey.encoding.length > 0) {
      parsedPublicKey = EncodingUtils.decode(publicKey.value, 'UTF8', publicKey.encoding);
    }
    
    // 验证公钥格式
    if (!parsedPublicKey || typeof parsedPublicKey !== 'string') {
      throw new Error('SM2公钥格式无效');
    }
    
    // 提取PEM格式中的公钥内容
    const cleanPublicKey = this.extractPublicKeyFromPEM(parsedPublicKey);
    
    // 验证提取后的公钥
    if (!cleanPublicKey || cleanPublicKey.length === 0) {
      throw new Error('无法从PEM格式中提取有效的公钥内容');
    }
    
    // 验证公钥是否为有效的十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(cleanPublicKey)) {
      console.error('公钥不是有效的十六进制格式:', cleanPublicKey?.substring(0, 50));
      throw new Error('SM2公钥必须是有效的十六进制字符串');
    }
    
    try {
      // 验证sm2库是否正确加载
      if (!sm2 || typeof sm2.doVerifySignature !== 'function') {
        throw new Error('SM2验签库未正确加载');
      }
      
      // 使用sm-crypto进行SM2验签
      const result = sm2.doVerifySignature(data, processedSignature, cleanPublicKey, {
        hash: true // 使用SM3哈希
      });
      
      return result;
    } catch (error) {
      console.error('SM2验签详细错误:', {
        errorMessage: error.message,
        publicKeyLength: cleanPublicKey.length,
        publicKeyPreview: cleanPublicKey.substring(0, 50) + '...',
        dataLength: data.length,
        dataPreview: data.substring(0, 50) + '...',
        signatureLength: processedSignature.length,
        signaturePreview: processedSignature.substring(0, 50) + '...'
      });
      throw new Error(`SM2验签失败: ${error.message}`);
    }
  }

  /**
   * 生成SM2密钥对
   * @returns {Object} 包含公钥和私钥的对象
   */
  static generateKeyPair() {
    try {
      // 生成密钥对
      const keypair = sm2.generateKeyPairHex();
      
      // 转换为PEM格式
      const publicKeyPEM = this.convertToPublicKeyPEM(keypair.publicKey);
      const privateKeyPEM = this.convertToPrivateKeyPEM(keypair.privateKey);
      
      return {
        publicKey: publicKeyPEM,
        privateKey: privateKeyPEM,
        publicKeyHex: keypair.publicKey,
        privateKeyHex: keypair.privateKey
      };
    } catch (error) {
      throw new Error(`生成SM2密钥对失败: ${error.message}`);
    }
  }

  /**
   * 从PEM格式公钥中提取纯公钥内容
   * @private
   * @param {string} pemKey - PEM格式的公钥
   * @returns {string} 纯公钥内容（十六进制）
   */
  static extractPublicKeyFromPEM(pemKey) {
    console.log('原始PEM公钥:', pemKey?.substring(0, 100) + '...');
    
    // 更严格的PEM格式移除
    let cleanPEM = pemKey
      .replace(/-----BEGIN\s+(EC\s+)?PUBLIC\s+KEY-----/gi, '')
      .replace(/-----END\s+(EC\s+)?PUBLIC\s+KEY-----/gi, '')
      .replace(/\r\n/g, '')
      .replace(/\n/g, '')
      .replace(/\s/g, '')
      .trim();
    
    console.log('清理后的PEM内容:', cleanPEM?.substring(0, 50) + '...');
    
    // Base64解码为十六进制
    try {
      const binaryString = atob(cleanPEM);
      const hexArray = [];
      for (let i = 0; i < binaryString.length; i++) {
        const hex = binaryString.charCodeAt(i).toString(16).padStart(2, '0');
        hexArray.push(hex);
      }
      const hexString = hexArray.join('');
      
      console.log('解码后的十六进制公钥:', hexString?.substring(0, 50) + '...');
      console.log('十六进制长度:', hexString.length);
      
      // 验证是否为有效的十六进制字符串
      if (!/^[0-9a-fA-F]+$/.test(hexString)) {
        throw new Error('解码后的内容不是有效的十六进制格式');
      }
      
      return hexString;
    } catch (error) {
      console.error('PEM到十六进制转换失败:', error);
      console.error('原始PEM内容:', pemKey);
      console.error('清理后内容:', cleanPEM);
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
    console.log('原始PEM私钥:', pemKey?.substring(0, 100) + '...');
    
    // 更严格的PEM格式移除
    let cleanPEM = pemKey
      .replace(/-----BEGIN\s+(EC\s+)?PRIVATE\s+KEY-----/gi, '')
      .replace(/-----END\s+(EC\s+)?PRIVATE\s+KEY-----/gi, '')
      .replace(/\r\n/g, '')
      .replace(/\n/g, '')
      .replace(/\s/g, '')
      .trim();
    
    console.log('清理后的PEM内容:', cleanPEM?.substring(0, 50) + '...');
    
    // Base64解码为十六进制
    try {
      const binaryString = atob(cleanPEM);
      const hexArray = [];
      for (let i = 0; i < binaryString.length; i++) {
        const hex = binaryString.charCodeAt(i).toString(16).padStart(2, '0');
        hexArray.push(hex);
      }
      const hexString = hexArray.join('');
      
      console.log('解码后的十六进制私钥:', hexString?.substring(0, 50) + '...');
      console.log('十六进制长度:', hexString.length);
      
      // 验证是否为有效的十六进制字符串
      if (!/^[0-9a-fA-F]+$/.test(hexString)) {
        throw new Error('解码后的内容不是有效的十六进制格式');
      }
      
      return hexString;
    } catch (error) {
      console.error('PEM到十六进制转换失败:', error);
      console.error('原始PEM内容:', pemKey);
      console.error('清理后内容:', cleanPEM);
      throw new Error(`PEM格式私钥解析失败: ${error.message}`);
    }
  }

  /**
   * 将十六进制公钥转换为PEM格式
   * @private
   * @param {string} hexKey - 十六进制公钥
   * @returns {string} PEM格式公钥
   */
  static convertToPublicKeyPEM(hexKey) {
    // SM2公钥通常是压缩格式的点坐标
    const base64Key = btoa(String.fromCharCode(...hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16))));
    
    // 格式化Base64，每64个字符换行
    let pemFormatted = '-----BEGIN PUBLIC KEY-----\n';
    for (let i = 0; i < base64Key.length; i += 64) {
      pemFormatted += base64Key.substr(i, 64) + '\n';
    }
    pemFormatted += '-----END PUBLIC KEY-----';
    
    return pemFormatted;
  }

  /**
   * 将十六进制私钥转换为PEM格式
   * @private
   * @param {string} hexKey - 十六进制私钥
   * @returns {string} PEM格式私钥
   */
  static convertToPrivateKeyPEM(hexKey) {
    const base64Key = btoa(String.fromCharCode(...hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16))));
    
    // 格式化Base64，每64个字符换行
    let pemFormatted = '-----BEGIN PRIVATE KEY-----\n';
    for (let i = 0; i < base64Key.length; i += 64) {
      pemFormatted += base64Key.substr(i, 64) + '\n';
    }
    pemFormatted += '-----END PRIVATE KEY-----';
    
    return pemFormatted;
  }
}