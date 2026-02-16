/**
 * 编码处理工具类
 * 集中处理各种编码相关的操作
 */

// 编码选项配置
export const ENCODING_OPTIONS = [
  { value: 'UTF8', label: 'UTF-8' },
  { value: 'HEX', label: 'Hex' },
  { value: 'BASE64', label: 'Base64' }
];

// 明文编码选项
export const PLAINTEXT_ENCODING_OPTIONS = [
  { value: 'UTF8', label: 'UTF-8' },
  { value: 'ASCII', label: 'ASCII' },
  { value: 'GBK', label: 'GBK' }
];

// 密文编码选项
export const CIPHERTEXT_ENCODING_OPTIONS = [
  { value: 'BASE64', label: 'Base64' },
  { value: 'HEX', label: 'Hex' },
  { value: 'BASE64_URLSAFE', label: 'Base64 URL Safe' }
];

/**
 * 编码处理器类
 */
export class EncodingHandler {
  /**
   * 更新密钥值
   * @param {Function} setState - 状态设置函数
   * @param {string} value - 新值
   */
  static updateKeyValue(setState, value) {
    setState(prev => ({
      ...prev,
      key: {
        ...prev.key,
        value: value
      }
    }));
  }

  /**
   * 更新密钥编码
   * @param {Function} setState - 状态设置函数
   * @param {string} encoding - 编码方式
   */
  static updateKeyEncoding(setState, encoding) {
    setState(prev => ({
      ...prev,
      key: {
        ...prev.key,
        encoding: [encoding]
      }
    }));
  }

  /**
   * 更新IV值
   * @param {Function} setState - 状态设置函数
   * @param {string} value - 新值
   */
  static updateIvValue(setState, value) {
    setState(prev => ({
      ...prev,
      iv: {
        ...prev.iv,
        value: value
      }
    }));
  }

  /**
   * 更新IV编码
   * @param {Function} setState - 状态设置函数
   * @param {string} encoding - 编码方式
   */
  static updateIvEncoding(setState, encoding) {
    setState(prev => ({
      ...prev,
      iv: {
        ...prev.iv,
        encoding: [encoding]
      }
    }));
  }

  /**
   * 更新明文编码
   * @param {Function} setState - 状态设置函数
   * @param {string} encoding - 编码字符串
   */
  static updatePlainEncoding(setState, encoding) {
    const encodings = encoding.split('+').map(enc => enc.trim()).filter(enc => enc);
    setState(prev => ({
      ...prev,
      plainEncoding: encodings
    }));
  }

  /**
   * 添加明文编码
   * @param {Function} setState - 状态设置函数
   * @param {string} encoding - 要添加的编码
   */
  static addPlainEncoding(setState, encoding) {
    setState(prev => {
      const currentEncodings = prev.plainEncoding || [];
      return {
        ...prev,
        plainEncoding: [...currentEncodings, encoding]
      };
    });
  }

  /**
   * 移除明文编码
   * @param {Function} setState - 状态设置函数
   * @param {string} encoding - 要移除的编码
   */
  static removePlainEncoding(setState, encoding) {
    setState(prev => {
      const currentEncodings = prev.plainEncoding || [];
      return {
        ...prev,
        plainEncoding: currentEncodings.filter(enc => enc !== encoding)
      };
    });
  }

  /**
   * 更新密文编码
   * @param {Function} setState - 状态设置函数
   * @param {string} encoding - 编码字符串
   */
  static updateCipherEncoding(setState, encoding) {
    const encodings = encoding.split('+').map(enc => enc.trim()).filter(enc => enc);
    setState(prev => ({
      ...prev,
      cipherEncoding: encodings
    }));
  }

  /**
   * 添加密文编码
   * @param {Function} setState - 状态设置函数
   * @param {string} encoding - 要添加的编码
   */
  static addCipherEncoding(setState, encoding) {
    setState(prev => {
      const currentEncodings = prev.cipherEncoding || [];
      if (!currentEncodings.includes(encoding)) {
        return {
          ...prev,
          cipherEncoding: [...currentEncodings, encoding]
        };
      }
      return prev;
    });
  }

  /**
   * 移除密文编码
   * @param {Function} setState - 状态设置函数
   * @param {string} encoding - 要移除的编码
   */
  static removeCipherEncoding(setState, encoding) {
    setState(prev => {
      const currentEncodings = prev.cipherEncoding || [];
      return {
        ...prev,
        cipherEncoding: currentEncodings.filter(enc => enc !== encoding)
      };
    });
  }

  /**
   * 获取编码选项标签
   * @param {string} value - 编码值
   * @returns {string} 标签文本
   */
  static getEncodingLabel(value) {
    const allOptions = [...ENCODING_OPTIONS, ...PLAINTEXT_ENCODING_OPTIONS, ...CIPHERTEXT_ENCODING_OPTIONS];
    const option = allOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  }

  /**
   * 验证编码组合是否有效
   * @param {Array} encodings - 编码数组
   * @returns {Object} 验证结果 {isValid: boolean, message: string}
   */
  static validateEncodingCombination(encodings) {
    if (!encodings || encodings.length === 0) {
      return { isValid: false, message: '请选择至少一种编码方式' };
    }
    
    // 检查是否有重复的编码
    const uniqueEncodings = [...new Set(encodings)];
    if (uniqueEncodings.length !== encodings.length) {
      return { isValid: false, message: '编码方式不能重复' };
    }
    
    return { isValid: true, message: '' };
  }
}

// 导出便捷函数
export const updateKeyValue = EncodingHandler.updateKeyValue;
export const updateKeyEncoding = EncodingHandler.updateKeyEncoding;
export const updateIvValue = EncodingHandler.updateIvValue;
export const updateIvEncoding = EncodingHandler.updateIvEncoding;
export const updatePlainEncoding = EncodingHandler.updatePlainEncoding;
export const addPlainEncoding = EncodingHandler.addPlainEncoding;
export const removePlainEncoding = EncodingHandler.removePlainEncoding;
export const updateCipherEncoding = EncodingHandler.updateCipherEncoding;
export const addCipherEncoding = EncodingHandler.addCipherEncoding;
export const removeCipherEncoding = EncodingHandler.removeCipherEncoding;
export const getEncodingLabel = EncodingHandler.getEncodingLabel;
export const validateEncodingCombination = EncodingHandler.validateEncodingCombination;