import CryptoJS from 'crypto-js';

/**
 * 编码处理工具类
 * 遵循开发规范：统一处理编码逻辑，避免重复编码
 */
export class EncodingUtils {
  /**
   * 将数据按照指定编码方式进行编码
   * @param {string|ArrayBuffer} data - 原始数据
   * @param {string} dataEncoding - 数据本身的编码格式
   * @param {string[]} encodings - 后续编码方式数组，从外到内应用
   * @returns {string} 编码后的字符串
   */
  static encode(data, dataEncoding = 'UTF8', encodings = []) {
    let result = data;
    
    // 首先处理数据本身的编码格式
    if (dataEncoding && dataEncoding.toUpperCase() !== 'UTF8') {
      result = this._convertDataEncoding(result, dataEncoding);
    }
    
    // 如果没有后续编码，直接返回
    if (!encodings || encodings.length === 0) {
      return typeof result === 'string' ? result : result.toString(CryptoJS.enc.Base64);
    }
    
    // 检查是否需要跳过重复编码
    const shouldSkipDuplicateEncoding = this.shouldSkipEncoding(dataEncoding, encodings);
    
    // 确保输入是WordArray格式
    if (typeof result === 'string') {
      result = this._parseInputToWordArray(result, shouldSkipDuplicateEncoding);
    }
    
    // 应用后续编码处理
    result = this._applyEncodings(result, encodings, shouldSkipDuplicateEncoding, dataEncoding);
    
    // 返回最终结果
    return this._formatOutput(result);
  }

  /**
   * 检查是否需要跳过重复编码
   * @private
   * @param {string} dataEncoding - 数据本身的编码格式
   * @param {string[]} encodings - 后续编码配置
   * @returns {boolean} 是否需要跳过
   */
  static shouldSkipEncoding(dataEncoding, encodings) {
    // 当数据编码格式与第一个后续编码格式一致时，跳过重复编码
    return dataEncoding && 
           encodings.length > 0 && 
           dataEncoding.toUpperCase() === encodings[0].toUpperCase();
  }

  /**
   * 将输入数据解析为WordArray格式
   * @private
   * @param {string} input - 输入字符串
   * @param {boolean} skipBase64 - 是否跳过Base64处理
   * @returns {CryptoJS.lib.WordArray} WordArray对象
   */
  static _parseInputToWordArray(input, skipBase64) {
    if (skipBase64) {
      // 直接解析为Base64 WordArray，避免重复编码
      return CryptoJS.enc.Base64.parse(input);
    } else {
      // 按UTF-8解析
      return CryptoJS.enc.Utf8.parse(input);
    }
  }

  /**
   * 应用编码处理
   * @private
   * @param {CryptoJS.lib.WordArray} data - 数据
   * @param {string[]} encodings - 编码配置
   * @param {boolean} skipFirstBase64 - 是否跳过首次Base64编码
   * @returns {any} 处理后的数据
   */
  static _applyEncodings(data, encodings, skipFirstBase64, dataEncoding = 'UTF8') {
    let result = data;
    let currentEncoding = dataEncoding;
    let shouldSkipNextBase64 = skipFirstBase64;
    
    // 从内到外应用编码（逆序处理）
    for (let i = encodings.length - 1; i >= 0; i--) {
      const encoding = encodings[i].toUpperCase();
      result = this._applySingleEncoding(result, encoding, shouldSkipNextBase64, currentEncoding);
      // 更新当前编码格式
      currentEncoding = encoding;
      // 更新跳过标志
      if (shouldSkipNextBase64 && encoding === 'BASE64') {
        shouldSkipNextBase64 = false;
      }
    }
    
    return result;
  }

  /**
   * 应用单个编码
   * @private
   * @param {any} data - 数据
   * @param {string} encoding - 编码类型
   * @param {boolean} skipBase64 - 是否跳过Base64编码
   * @param {string} dataEncoding - 数据本身的编码格式
   * @returns {any} 编码后的数据
   */
  static _applySingleEncoding(data, encoding, skipBase64, dataEncoding = 'UTF8') {
    switch (encoding) {
      case 'UTF8':
        // UTF8编码保持WordArray格式
        return data;
      case 'HEX':
        // 根据数据编码方式先转换为字符串
        const dataStr = this._convertDataToString(data, dataEncoding);
        // 执行一次HEX编码
        const hexStr = this._stringToHex(dataStr);
        console.info(`HEX编码: ${dataStr} -> ${hexStr}`);
        // 直接返回HEX字符串，不转换为WordArray
        return hexStr;
        
      case 'BASE64':
        if (skipBase64) {
          console.info("跳过Base64编码，输入已为Base64格式");
          return data;
        }
        // 根据数据编码方式先转换为字符串
        const base64DataStr = this._convertDataToString(data, dataEncoding);
        // 执行一次Base64编码
        const base64Str = btoa(unescape(encodeURIComponent(base64DataStr)));
        console.info(`Base64编码: ${base64DataStr} -> ${base64Str}`);
        return CryptoJS.enc.Base64.parse(base64Str);
      case 'BASE64_URLSAFE':
        // 根据数据编码方式先转换为字符串
        const urlSafeDataStr = this._convertDataToString(data, dataEncoding);
        
        // 执行Base64 URL安全编码
        const urlSafeBase64 = btoa(unescape(encodeURIComponent(urlSafeDataStr)))
                              .replace(/\+/g, '-')
                              .replace(/\//g, '_')
                              .replace(/=/g, '');
        return urlSafeBase64;
        
      default:
        throw new Error(`不支持的编码方式: ${encoding}`);
    }
  }

  /**
   * 将字符串转换为HEX格式（UTF-8编码）
   * @private
   * @param {string} str - 输入字符串
   * @returns {string} HEX格式字符串
   */
  static _stringToHex(str) {
    // 先将字符串转换为UTF-8字节数组
    const utf8Bytes = [];
    for (let i = 0; i < str.length; i++) {
      let charCode = str.charCodeAt(i);
      
      // 处理UTF-16代理对
      if (charCode >= 0xD800 && charCode <= 0xDBFF) {
        // 高代理项
        if (i + 1 < str.length) {
          const lowSurrogate = str.charCodeAt(i + 1);
          if (lowSurrogate >= 0xDC00 && lowSurrogate <= 0xDFFF) {
            // 计算完整的码点
            charCode = 0x10000 + ((charCode & 0x3FF) << 10) + (lowSurrogate & 0x3FF);
            i++; // 跳过低代理项
          }
        }
      }
      
      // 转换为UTF-8字节
      if (charCode < 0x80) {
        utf8Bytes.push(charCode);
      } else if (charCode < 0x800) {
        utf8Bytes.push(0xC0 | (charCode >> 6));
        utf8Bytes.push(0x80 | (charCode & 0x3F));
      } else if (charCode < 0x10000) {
        utf8Bytes.push(0xE0 | (charCode >> 12));
        utf8Bytes.push(0x80 | ((charCode >> 6) & 0x3F));
        utf8Bytes.push(0x80 | (charCode & 0x3F));
      } else {
        utf8Bytes.push(0xF0 | (charCode >> 18));
        utf8Bytes.push(0x80 | ((charCode >> 12) & 0x3F));
        utf8Bytes.push(0x80 | ((charCode >> 6) & 0x3F));
        utf8Bytes.push(0x80 | (charCode & 0x3F));
      }
    }
    
    // 转换为HEX字符串
    let hex = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      hex += utf8Bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * Base64解码
   * @private
   * @param {string} base64Str - Base64字符串
   * @returns {string} 解码后的字符串
   */
  static _base64Decode(base64Str) {
    try {
      // 预先检查字符范围，避免atob报错
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Str)) {
        throw new Error('Invalid Base64 character');
      }
      
      const decoded = atob(base64Str);
      return decodeURIComponent(escape(decoded));
    } catch (e) {
      // 静默处理错误，返回null而不是抛出异常
      console.warn('Base64解码失败:', e.message, '输入:', base64Str.substring(0, 50) + '...');
      return null;
    }
  }

  /**
   * 将字节数组转换为UTF-8字符串
   * @private
   * @param {number[]} bytes - 字节数组
   * @returns {string} UTF-8字符串
   */
  static _bytesToString(bytes) {
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    try {
      // 尝试解码为UTF-8
      return decodeURIComponent(escape(str));
    } catch (e) {
      // 如果解码失败，直接抛出错误
      console.error('UTF-8解码失败:', e.message);
      throw new Error(`UTF-8解码失败: ${e.message}`);
    }
  }

  /**
   * 根据数据编码方式将数据转换为UTF-8字符串
   * @private
   * @param {any} data - 原始数据
   * @param {string} dataEncoding - 数据编码格式
   * @returns {string} UTF-8字符串
   */
  static _convertDataToString(data, dataEncoding) {
    const upperEncoding = dataEncoding.toUpperCase();
    
    switch (upperEncoding) {
      case 'HEX':
        // 如果数据本身就是HEX格式，先转换为UTF-8字符串
        const hexWordArray = CryptoJS.enc.Hex.parse(data.toString(CryptoJS.enc.Hex));
        return CryptoJS.enc.Utf8.stringify(hexWordArray);
        
      case 'BASE64':
        // 如果数据是Base64格式，先转换为UTF-8字符串
        const base64WordArray = CryptoJS.enc.Base64.parse(data.toString(CryptoJS.enc.Base64));
        return CryptoJS.enc.Utf8.stringify(base64WordArray);
        
      case 'BASE64_URLSAFE':
        // 如果数据是Base64 URL安全格式，先转换为标准Base64再转换为UTF-8
        let standardBase64 = data.toString().replace(/-/g, '+').replace(/_/g, '/');
        // 补充可能缺失的填充字符
        while (standardBase64.length % 4 !== 0) {
          standardBase64 += '=';
        }
        const urlSafeWordArray = CryptoJS.enc.Base64.parse(standardBase64);
        return CryptoJS.enc.Utf8.stringify(urlSafeWordArray);
        
      default:
        // 默认UTF-8格式
        return data.toString(CryptoJS.enc.Utf8);
    }
  }

  /**
   * 格式化输出结果
   * @private
   * @param {any} data - 处理后的数据
   * @returns {string} 格式化字符串
   */
  static _formatOutput(data) {
    if (typeof data === 'string') {
      return data;
    }
    return data.toString(CryptoJS.enc.Base64);
  }

  /**
   * 转换数据本身的编码格式
   * @private
   * @param {string|ArrayBuffer} data - 原始数据
   * @param {string} dataEncoding - 数据编码格式
   * @returns {any} 转换后的数据
   */
  static _convertDataEncoding(data, dataEncoding) {
    const upperEncoding = dataEncoding.toUpperCase();
    
    switch (upperEncoding) {
      case 'HEX':
        if (typeof data === 'string') {
          return CryptoJS.enc.Hex.parse(data);
        }
        return data;
        
      case 'BASE64':
        if (typeof data === 'string') {
          return CryptoJS.enc.Base64.parse(data);
        }
        return data;
        
      case 'BASE64_URLSAFE':
        if (typeof data === 'string') {
          // URL安全Base64转换为标准Base64
          let base64Str = data.replace(/-/g, '+').replace(/_/g, '/');
          while (base64Str.length % 4 !== 0) {
            base64Str += '=';
          }
          return CryptoJS.enc.Base64.parse(base64Str);
        }
        return data;
        
      default:
        throw new Error(`不支持的数据编码格式: ${dataEncoding}`);
    }
  }

  /**
   * 从数据编码格式转换回UTF-8
   * @private
   * @param {any} data - 编码后的数据
   * @param {string} dataEncoding - 数据编码格式
   * @returns {string} UTF-8字符串
   */
  static _convertFromDataEncoding(data, dataEncoding) {
    const upperEncoding = dataEncoding.toUpperCase();
    
    switch (upperEncoding) {
      case 'HEX':
        if (typeof data === 'string') {
          const wordArray = CryptoJS.enc.Hex.parse(data);
          return CryptoJS.enc.Utf8.stringify(wordArray);
        }
        return data.toString(CryptoJS.enc.Utf8);
        
      case 'BASE64':
        if (typeof data === 'string') {
          const wordArray = CryptoJS.enc.Base64.parse(data);
          return CryptoJS.enc.Utf8.stringify(wordArray);
        }
        return data.toString(CryptoJS.enc.Utf8);
        
      case 'BASE64_URLSAFE':
        if (typeof data === 'string') {
          // URL安全Base64转换为标准Base64再解码
          let base64Str = data.replace(/-/g, '+').replace(/_/g, '/');
          while (base64Str.length % 4 !== 0) {
            base64Str += '=';
          }
          const wordArray = CryptoJS.enc.Base64.parse(base64Str);
          return CryptoJS.enc.Utf8.stringify(wordArray);
        }
        return data.toString(CryptoJS.enc.Utf8);
        
      default:
        throw new Error(`不支持的数据编码格式: ${dataEncoding}`);
    }
  }

  /**
   * 将数据按照指定编码方式进行解码
   * @param {string} data - 编码后的数据
   * @param {string} dataEncoding - 数据本身的编码格式
   * @param {string[]} encodings - 前置编码方式数组，从外到内应用
   * @returns {string} 解码后的原始数据
   */
  static decode(data, dataEncoding = 'UTF8', encodings = []) {
    let result = data;
    
    // 如果没有前置编码，直接处理数据编码
    if (!encodings || encodings.length === 0) {
      if (dataEncoding && dataEncoding.toUpperCase() !== 'UTF8') {
        result = this._convertFromDataEncoding(result, dataEncoding);
      }
      return typeof result === 'string' ? result : CryptoJS.enc.Utf8.stringify(result);
    }
    
    // 确保输入是字符串格式进行解码处理
    if (typeof result !== 'string') {
      result = result.toString(CryptoJS.enc.Base64);
    }
    
    // 按照编码顺序进行解码（从外到内，即从数组开头到结尾）
    for (const encoding of encodings) {
      const upperEncoding = encoding.toUpperCase();
      switch (upperEncoding) {
        case 'UTF8':
          // UTF8 通常作为最终解码
          break;
        case 'HEX':
          if (typeof result === 'string') {
            try {
              // 首先检查是否为有效的HEX字符串
              if (!/^[0-9a-fA-F]*$/.test(result) || result.length % 2 !== 0) {
                // 如果不是有效的HEX格式，直接返回原数据
                console.info(`跳过HEX解码，输入不是有效HEX格式: ${result}`);
                break;
              }
              
              // 将HEX字符串转换为UTF-8字符串
              let str = '';
              for (let i = 0; i < result.length; i += 2) {
                const byte = parseInt(result.substr(i, 2), 16);
                str += String.fromCharCode(byte);
              }
              // 尝试UTF-8解码
              try {
                result = decodeURIComponent(escape(str));
              } catch (utf8Error) {
                // 如果UTF-8解码失败，直接抛出错误
                console.error('UTF-8解码失败:', utf8Error.message);
                throw new Error(`UTF-8解码失败: ${utf8Error.message}`);
              }
              console.info(`HEX解码: ${result}`);
            } catch (e) {
              console.warn('HEX解码失败:', e.message);
            }
          }
          break;
        case 'BASE64':
          if (typeof result === 'string') {
            const decoded = this._base64Decode(result);
            if (decoded !== null) {
              result = decoded;
              console.info(`Base64解码: ${result}`);
            } else {
              console.warn('Base64解码失败，保持原始数据');
            }
          }
          break;
        case 'BASE64_URLSAFE':
          if (typeof result === 'string') {
            try {
              // URL安全的Base64使用-和_替换+和/
              let base64Str = result.replace(/-/g, '+').replace(/_/g, '/');
              // 补充缺失的填充字符
              while (base64Str.length % 4 !== 0) {
                base64Str += '=';
              }
              result = this._base64Decode(base64Str);
              console.info(`Base64 URL安全解码: ${result}`);
            } catch (e) {
              console.warn('Base64 URL安全解码失败:', e.message);
            }
          }
          break;
        default:
          throw new Error(`不支持的编码方式: ${encoding}`);
      }
    }
    
    // 最后处理数据本身的编码格式
    if (dataEncoding && dataEncoding.toUpperCase() !== 'UTF8') {
      result = this._convertFromDataEncoding(result, dataEncoding);
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