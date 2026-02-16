import CryptoJS from 'crypto-js';
import smCrypto from 'sm-crypto';
import JSEncrypt from 'jsencrypt';

const { sm2, sm3, sm4 } = smCrypto;

/**
 * 编码处理工具类
 */
class EncodingUtils {
  /**
   * 将数据按照指定编码方式进行编码
   * @param {string|ArrayBuffer} data - 原始数据
   * @param {string[]} encodings - 编码方式数组，从外到内应用
   * @returns {string} 编码后的字符串
   */
  static encode(data, encodings = ['UTF8']) {
    let result = data;
    
    // 确保输入是WordArray格式
    if (typeof result === 'string') {
      result = CryptoJS.enc.Utf8.parse(result);
    }
    
    // 从内到外应用编码（逆序处理）
    for (let i = encodings.length - 1; i >= 0; i--) {
      const encoding = encodings[i].toUpperCase();
      switch (encoding) {
        case 'UTF8':
          // UTF8编码保持WordArray格式
          break;
        case 'HEX':
          result = result.toString(CryptoJS.enc.Hex);
          // HEX编码后是字符串，需要重新解析为WordArray以便继续处理
          result = CryptoJS.enc.Hex.parse(result);
          break;
        case 'BASE64':
          result = result.toString(CryptoJS.enc.Base64);
          // Base64编码后是字符串，需要重新解析为WordArray
          result = CryptoJS.enc.Base64.parse(result);
          break;
        case 'BASE64_URLSAFE':
          // 先转换为标准Base64，再转换为URL安全格式
          const base64Str = result.toString(CryptoJS.enc.Base64);
          result = base64Str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          // URL安全Base64是最终输出，不再转换为WordArray
          return result;
        default:
          throw new Error(`不支持的编码方式: ${encoding}`);
      }
    }
    
    // 如果还没有返回，说明没有URL安全Base64，使用标准Base64输出
    if (result && typeof result !== 'string') {
      result = result.toString(CryptoJS.enc.Base64);
    }
    
    return result;
  }

  /**
   * 将数据按照指定编码方式进行解码
   * @param {string} data - 编码后的数据
   * @param {string[]} encodings - 编码方式数组，从外到内应用
   * @returns {string} 解码后的原始数据
   */
  static decode(data, encodings = ['UTF8']) {
    let result = data;
    
    // 按照编码顺序进行解码
    for (const encoding of encodings) {
      const upperEncoding = encoding.toUpperCase();
      switch (upperEncoding) {
        case 'UTF8':
          // UTF8 通常作为最终解码
          if (typeof result !== 'string') {
            result = CryptoJS.enc.Utf8.stringify(result);
          }
          break;
        case 'HEX':
          if (typeof result === 'string') {
            result = CryptoJS.enc.Hex.parse(result);
          }
          break;
        case 'BASE64':
          if (typeof result === 'string') {
            result = CryptoJS.enc.Base64.parse(result);
          }
          break;
        case 'BASE64_URLSAFE':
          if (typeof result === 'string') {
            // URL安全的Base64使用-和_替换+和/
            // 并补充可能缺失的填充字符
            let base64Str = result.replace(/-/g, '+').replace(/_/g, '/');
            // 补充缺失的填充字符
            while (base64Str.length % 4 !== 0) {
              base64Str += '=';
            }
            result = CryptoJS.enc.Base64.parse(base64Str);
          }
          break;
        default:
          throw new Error(`不支持的编码方式: ${encoding}`);
      }
    }
    
    // 最终转换为UTF-8字符串
    if (result && typeof result !== 'string') {
      try {
        result = CryptoJS.enc.Utf8.stringify(result);
      } catch (e) {
        // 如果UTF-8转换失败，返回Base64格式
        result = result.toString(CryptoJS.enc.Base64);
      }
    }
    
    return result;
  }

  /**
   * 解析复合编码字符串
   * @param {string} encodingString - 编码字符串，支持+号分隔
   * @returns {string[]} 编码方式数组
   */
  static parseCompoundEncoding(encodingString) {
    if (!encodingString) return ['UTF8'];
    return encodingString.split('+').map(enc => enc.trim()).filter(enc => enc);
  }

  /**
   * 格式化编码数组为字符串
   * @param {string[]} encodings - 编码方式数组
   * @returns {string} 格式化后的编码字符串
   */
  static formatEncoding(encodings) {
    return encodings.join('+');
  }

  /**
   * 处理明文编码 - 加密时使用
   * 根据明文编码配置对明文进行预处理
   * @param {string} plaintext - 原始明文
   * @param {string[]} plainEncoding - 明文编码方式数组
   * @returns {string} 处理后的明文
   */
  static processPlaintextEncoding(plaintext, plainEncoding = ['UTF8']) {
    // 明文编码方式处理：如果指定了非UTF8的编码方式，需要先解码
    let processedPlaintext = plaintext;
    
    if (plainEncoding && plainEncoding.length > 0 && !plainEncoding.includes('UTF8')) {
      // 如果明文是以其他编码方式存储的，需要先解码为UTF8
      processedPlaintext = this.decode(plaintext, plainEncoding);
    }
    
    return processedPlaintext;
  }

  /**
   * 处理明文解码 - 解密后使用
   * 根据明文编码配置对解密后的明文进行后处理
   * @param {string} plaintext - 解密后的明文（UTF8格式）
   * @param {string[]} plainEncoding - 明文编码方式数组
   * @returns {string} 处理后的明文
   */
  static processPlaintextDecoding(plaintext, plainEncoding = ['UTF8']) {
    // 明文解码处理：如果需要输出为非UTF8格式，需要重新编码
    let processedPlaintext = plaintext;
    
    if (plainEncoding && plainEncoding.length > 0 && !plainEncoding.includes('UTF8')) {
      // 如果需要输出为其他编码格式，需要重新编码
      processedPlaintext = this.encode(plaintext, plainEncoding);
    }
    
    return processedPlaintext;
  }
}

/**
 * AES 加密解密类
 */
class AESCipher {
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
      parsedKey = EncodingUtils.decode(key.value, key.encoding);
    }
    
    // 处理初始化向量
    let parsedIv = iv?.value || '';
    if (iv?.encoding && iv.encoding.length > 0) {
      parsedIv = EncodingUtils.decode(iv.value, iv.encoding);
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
      parsedKey = EncodingUtils.decode(key.value, key.encoding);
    }
    
    // 处理初始化向量
    let parsedIv = iv?.value || '';
    if (iv?.encoding && iv.encoding.length > 0) {
      parsedIv = EncodingUtils.decode(iv.value, iv.encoding);
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
    
    // 针对CTR模式的特殊处理：手动移除可能的零填充
    if (modeUpper === 'CTR') {
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
      return new TextDecoder().decode(validBytes);
    }
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
}

/**
 * RSA 加密解密类
 */
class RSACipher {
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
      processedPlaintext = EncodingUtils.decode(plaintext, plainEncoding);
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
      decrypted = EncodingUtils.encode(decrypted, plainEncoding);
    }
    
    return decrypted;
  }
}

/**
 * SM4 加密解密类
 */
class SM4Cipher {
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
      parsedKey = EncodingUtils.decode(key.value, key.encoding);
    }
    
    // 处理初始化向量
    let parsedIv = iv?.value || '';
    if (iv?.encoding && iv.encoding.length > 0) {
      parsedIv = EncodingUtils.decode(iv.value, iv.encoding);
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
      parsedKey = EncodingUtils.decode(key.value, key.encoding);
    }
    
    // 处理初始化向量
    let parsedIv = iv?.value || '';
    if (iv?.encoding && iv.encoding.length > 0) {
      parsedIv = EncodingUtils.decode(iv.value, iv.encoding);
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
        throw new Error(t('components.cipherutils.unsupported_algorithm', { algorithm }));
    }
    
    // 对密文进行后处理编码 - 支持复合编码
    if (cipherEncoding && cipherEncoding.length > 0) {
      // 处理复合编码：从左到右依次应用编码方式
      let wordArray = CryptoJS.enc.Base64.parse(ciphertext);
      
      // 注意：密文编码的处理顺序是从外到内（与明文编码相反）
      // 因为密文通常是Base64格式，我们需要将其转换为目标格式
      for (let i = 0; i < cipherEncoding.length; i++) {
        const encoding = cipherEncoding[i];
        switch (encoding.toUpperCase()) {
          case 'BASE64':
            // 已经是Base64格式，无需转换
            break;
          case 'HEX':
            ciphertext = wordArray.toString(CryptoJS.enc.Hex);
            wordArray = CryptoJS.enc.Hex.parse(ciphertext);
            break;
          case 'BASE64_URLSAFE':
            ciphertext = wordArray.toString(CryptoJS.enc.Base64)
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=/g, '');
            // URL安全Base64不是CryptoJS的标准格式，直接返回字符串
            return ciphertext;
          default:
            // 使用EncodingUtils处理其他编码方式
            ciphertext = EncodingUtils.encode(wordArray, [encoding]);
            wordArray = CryptoJS.enc.Base64.parse(ciphertext);
        }
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
    
    // 密文预处理：支持复合编码的逆向处理
    let processedCiphertext = ciphertext;
    
    // 如果有复合编码，需要按逆序进行解码处理
    if (cipherEncoding && cipherEncoding.length > 1) {
      // 从右到左逆序处理编码（解码顺序与编码顺序相反）
      for (let i = cipherEncoding.length - 1; i >= 0; i--) {
        const encoding = cipherEncoding[i];
        switch (encoding.toUpperCase()) {
          case 'BASE64':
            // Base64是默认格式，通常不需要特殊处理
            break;
          case 'HEX':
            // 如果输入是Hex格式，需要转换为Base64
            const wordArrayFromHex = CryptoJS.enc.Hex.parse(processedCiphertext);
            processedCiphertext = wordArrayFromHex.toString(CryptoJS.enc.Base64);
            break;
          case 'BASE64_URLSAFE':
            // URL安全Base64需要恢复为标准Base64
            let standardBase64 = processedCiphertext
              .replace(/-/g, '+')
              .replace(/_/g, '/');
            while (standardBase64.length % 4 !== 0) {
              standardBase64 += '=';
            }
            processedCiphertext = standardBase64;
            break;
          default:
            // 使用EncodingUtils处理其他编码方式的解码
            processedCiphertext = EncodingUtils.decode(processedCiphertext, [encoding]);
        }
      }
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
        throw new Error(t('components.cipherutils.unsupported_decrypt_algorithm', { algorithm }));
    }
    
    // 处理明文解码
    plaintext = EncodingUtils.processPlaintextDecoding(plaintext, plainEncoding);
    
    return plaintext;
  }
}

// 导出编码工具类供外部使用
export { EncodingUtils };