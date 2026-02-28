// 自定义编码工具类 - 纯 JavaScript 实现

class EncodingUtils {
  // 标准 Base64 字符集
  static STANDARD_BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  
  // 标准 Hex 字符集
  static STANDARD_HEX_CHARS = '0123456789abcdef';

  /**
   * 自定义 Base64 编码
   * @param {string} data 原始数据
   * @param {Object} customMap 自定义映射表
   * @returns {string} 编码后的数据
   */
  static customBase64Encode(data, customMap) {
    if (!data) return '';
    
    try {
      // 转换为字节数组并进行标准 Base64 编码
      const bytes = new TextEncoder().encode(data);
      let binary = '';
      bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
      });
      
      const base64 = btoa(binary);
      
      // 应用自定义映射
      if (customMap) {
        return this.applyCustomMapping(base64, customMap);
      }
      
      return base64;
    } catch (error) {
      console.error('Base64 编码失败:', error);
      return data; // 编码失败时返回原数据
    }
  }

  /**
   * 自定义 Base64 解码
   * @param {string} encodedData 编码数据
   * @param {Object} customMap 自定义映射表
   * @returns {string} 解码后的数据
   */
  static customBase64Decode(encodedData, customMap) {
    if (!encodedData) return '';
    
    try {
      let data = encodedData;
      
      // 应用自定义映射反向转换
      if (customMap) {
        data = this.reverseCustomMapping(data, customMap);
      }
      
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (error) {
      console.error('Base64 解码失败:', error);
      return encodedData; // 解码失败时返回原数据
    }
  }

  /**
   * 自定义 Hex 编码
   * @param {string} data 原始数据
   * @param {string} customChars 自定义字符集
   * @returns {string} Hex 编码数据
   */
  static customHexEncode(data, customChars) {
    if (!data) return '';
    
    try {
      const bytes = new TextEncoder().encode(data);
      let hex = '';
      
      bytes.forEach(byte => {
        hex += byte.toString(16).padStart(2, '0');
      });
      
      // 应用自定义字符映射
      if (customChars && customChars.length === 16) {
        hex = this.mapHexCharacters(hex, customChars);
      }
      
      return hex;
    } catch (error) {
      console.error('Hex 编码失败:', error);
      return data;
    }
  }

  /**
   * 自定义 Hex 解码
   * @param {string} hexData Hex 数据
   * @param {string} customChars 自定义字符集
   * @returns {string} 解码后的数据
   */
  static customHexDecode(hexData, customChars) {
    if (!hexData) return '';
    
    try {
      let hex = hexData.toLowerCase();
      
      // 反向字符映射
      if (customChars && customChars.length === 16) {
        hex = this.reverseHexMapping(hex, customChars);
      }
      
      // 验证是否为有效的十六进制
      if (!/^[0-9a-f]*$/.test(hex)) {
        throw new Error('无效的十六进制数据');
      }
      
      // 确保偶数长度
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }
      
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
      
      return new TextDecoder().decode(bytes);
    } catch (error) {
      console.error('Hex 解码失败:', error);
      return hexData;
    }
  }

  /**
   * 应用自定义映射表
   * @private
   */
  static applyCustomMapping(data, mapping) {
    return data.split('').map(char => mapping[char] || char).join('');
  }

  /**
   * 反向自定义映射表
   * @private
   */
  static reverseCustomMapping(data, mapping) {
    const reverseMap = {};
    Object.keys(mapping).forEach(key => {
      reverseMap[mapping[key]] = key;
    });
    return this.applyCustomMapping(data, reverseMap);
  }

  /**
   * 映射 Hex 字符
   * @private
   */
  static mapHexCharacters(hex, customChars) {
    const standardChars = this.STANDARD_HEX_CHARS;
    const mapping = {};
    
    for (let i = 0; i < 16; i++) {
      mapping[standardChars[i]] = customChars[i];
    }
    
    return this.applyCustomMapping(hex, mapping);
  }

  /**
   * 反向映射 Hex 字符
   * @private
   */
  static reverseHexMapping(hex, customChars) {
    const standardChars = this.STANDARD_HEX_CHARS;
    const mapping = {};
    
    for (let i = 0; i < 16; i++) {
      mapping[customChars[i]] = standardChars[i];
    }
    
    return this.applyCustomMapping(hex, mapping);
  }

  /**
   * 检测编码类型
   * @param {string} data 待检测的数据
   * @returns {'BASE64'|'HEX'|'UNKNOWN'} 编码类型
   */
  static detectEncoding(data) {
    // 检查是否为有效的 Base64
    if (/^[A-Za-z0-9+/]*={0,2}$/.test(data) && data.length % 4 === 0) {
      try {
        atob(data);
        return 'BASE64';
      } catch {
        // 继续检查其他类型
      }
    }
    
    // 检查是否为有效的 Hex
    if (/^[0-9a-fA-F]*$/.test(data)) {
      return 'HEX';
    }
    
    return 'UNKNOWN';
  }

  /**
   * 标准化编码数据
   * @param {string} data 原始数据
   * @param {'BASE64'|'HEX'} targetType 目标编码类型
   * @returns {string} 标准化后的数据
   */
  static normalizeEncodedData(data, targetType) {
    const currentType = this.detectEncoding(data);
    
    if (currentType === targetType) {
      return data;
    }
    
    // 转换为中间格式（文本）
    let textData;
    try {
      if (currentType === 'BASE64') {
        textData = atob(data);
      } else if (currentType === 'HEX') {
        textData = this.customHexDecode(data);
      } else {
        textData = data; // 假设已经是文本
      }
    } catch (error) {
      throw new Error(`数据格式转换失败: ${error.message}`);
    }
    
    // 转换为目标格式
    if (targetType === 'BASE64') {
      return btoa(textData);
    } else {
      return this.customHexEncode(textData);
    }
  }
}

// 导出 EncodingUtils 类
export { EncodingUtils };