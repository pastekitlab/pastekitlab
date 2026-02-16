/**
 * 通用存储工具类
 * 支持 Chrome 扩展环境和普通网页环境
 */
export class StorageUtils {
  /**
   * 检查是否在 Chrome 扩展环境中
   * @returns {boolean}
   */
  static isChromeExtension() {
    return typeof chrome !== 'undefined' && chrome.storage;
  }

  /**
   * 检查是否支持 localStorage
   * @returns {boolean}
   */
  static supportsLocalStorage() {
    try {
      return typeof localStorage !== 'undefined';
    } catch (e) {
      return false;
    }
  }

  /**
   * 设置存储项
   * @param {string} key - 键名
   * @param {*} value - 值（会被 JSON 序列化）
   * @param {string} area - 存储区域 ('local' | 'sync' | 'session')
   * @returns {Promise<void>}
   */
  static async setItem(key, value, area = 'local') {
    const serializedValue = JSON.stringify(value);
    
    if (this.isChromeExtension()) {
      // Chrome 扩展环境
      const storageObj = {};
      storageObj[key] = serializedValue;
      
      if (area === 'sync') {
        return chrome.storage.sync.set(storageObj);
      } else if (area === 'session') {
        return chrome.storage.session?.set(storageObj) || chrome.storage.local.set(storageObj);
      } else {
        return chrome.storage.local.set(storageObj);
      }
    } else if (this.supportsLocalStorage()) {
      // 普通网页环境
      localStorage.setItem(key, serializedValue);
      return Promise.resolve();
    } else {
      throw new Error('不支持的存储环境');
    }
  }

  /**
   * 获取存储项
   * @param {string|string[]} keys - 键名或键名数组
   * @param {string} area - 存储区域 ('local' | 'sync' | 'session')
   * @returns {Promise<Object>} 返回键值对对象
   */
  static async getItem(keys, area = 'local') {
    if (this.isChromeExtension()) {
      // Chrome 扩展环境
      let result;
      if (area === 'sync') {
        result = await chrome.storage.sync.get(keys);
      } else if (area === 'session') {
        result = await (chrome.storage.session?.get(keys) || chrome.storage.local.get(keys));
      } else {
        result = await chrome.storage.local.get(keys);
      }
      
      // 反序列化值
      const deserialized = {};
      for (const [key, value] of Object.entries(result)) {
        try {
          deserialized[key] = JSON.parse(value);
        } catch (e) {
          // 如果解析失败，保持原始值
          deserialized[key] = value;
        }
      }
      return deserialized;
    } else if (this.supportsLocalStorage()) {
      // 普通网页环境
      if (typeof keys === 'string') {
        const value = localStorage.getItem(keys);
        try {
          return { [keys]: value ? JSON.parse(value) : null };
        } catch (e) {
          return { [keys]: value };
        }
      } else if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          try {
            result[key] = value ? JSON.parse(value) : null;
          } catch (e) {
            result[key] = value;
          }
        });
        return result;
      } else {
        // 获取所有键值对
        const result = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key);
          try {
            result[key] = JSON.parse(value);
          } catch (e) {
            result[key] = value;
          }
        }
        return result;
      }
    } else {
      throw new Error('不支持的存储环境');
    }
  }

  /**
   * 删除存储项
   * @param {string|string[]} keys - 键名或键名数组
   * @param {string} area - 存储区域 ('local' | 'sync' | 'session')
   * @returns {Promise<void>}
   */
  static async removeItem(keys, area = 'local') {
    if (this.isChromeExtension()) {
      // Chrome 扩展环境
      if (area === 'sync') {
        return chrome.storage.sync.remove(keys);
      } else if (area === 'session') {
        return chrome.storage.session?.remove(keys) || chrome.storage.local.remove(keys);
      } else {
        return chrome.storage.local.remove(keys);
      }
    } else if (this.supportsLocalStorage()) {
      // 普通网页环境
      if (typeof keys === 'string') {
        localStorage.removeItem(keys);
      } else if (Array.isArray(keys)) {
        keys.forEach(key => localStorage.removeItem(key));
      }
      return Promise.resolve();
    } else {
      throw new Error('不支持的存储环境');
    }
  }

  /**
   * 清空存储
   * @param {string} area - 存储区域 ('local' | 'sync' | 'session')
   * @returns {Promise<void>}
   */
  static async clear(area = 'local') {
    if (this.isChromeExtension()) {
      // Chrome 扩展环境
      if (area === 'sync') {
        return chrome.storage.sync.clear();
      } else if (area === 'session') {
        return chrome.storage.session?.clear() || chrome.storage.local.clear();
      } else {
        return chrome.storage.local.clear();
      }
    } else if (this.supportsLocalStorage()) {
      // 普通网页环境
      localStorage.clear();
      return Promise.resolve();
    } else {
      throw new Error('不支持的存储环境');
    }
  }

  /**
   * 获取存储使用情况（仅 Chrome 扩展环境）
   * @param {string} area - 存储区域 ('local' | 'sync' | 'session')
   * @returns {Promise<{bytesInUse: number, quota: number}>}
   */
  static async getUsage(area = 'local') {
    if (!this.isChromeExtension()) {
      throw new Error('此功能仅在 Chrome 扩展环境中可用');
    }

    let bytesInUse, quota;
    
    if (area === 'sync') {
      bytesInUse = await chrome.storage.sync.getBytesInUse();
      quota = chrome.storage.sync.QUOTA_BYTES;
    } else if (area === 'session') {
      bytesInUse = await (chrome.storage.session?.getBytesInUse() || 0);
      quota = chrome.storage.session?.QUOTA_BYTES || 0;
    } else {
      bytesInUse = await chrome.storage.local.getBytesInUse();
      quota = chrome.storage.local.QUOTA_BYTES;
    }

    return { bytesInUse, quota };
  }

  /**
   * 监听存储变化（仅 Chrome 扩展环境）
   * @param {Function} callback - 回调函数
   * @param {string} area - 存储区域 ('local' | 'sync' | 'session')
   * @returns {Function} 取消监听的函数
   */
  static listen(callback, area = 'local') {
    if (!this.isChromeExtension()) {
      console.warn('存储监听功能仅在 Chrome 扩展环境中可用');
      return () => {};
    }

    const listener = (changes, areaName) => {
      if (areaName === area) {
        callback(changes, areaName);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    
    // 返回取消监听的函数
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }

  /**
   * 批量设置存储项
   * @param {Object} items - 键值对对象
   * @param {string} area - 存储区域 ('local' | 'sync' | 'session')
   * @returns {Promise<void>}
   */
  static async setItems(items, area = 'local') {
    const serializedItems = {};
    for (const [key, value] of Object.entries(items)) {
      serializedItems[key] = JSON.stringify(value);
    }

    if (this.isChromeExtension()) {
      if (area === 'sync') {
        return chrome.storage.sync.set(serializedItems);
      } else if (area === 'session') {
        return chrome.storage.session?.set(serializedItems) || chrome.storage.local.set(serializedItems);
      } else {
        return chrome.storage.local.set(serializedItems);
      }
    } else if (this.supportsLocalStorage()) {
      Object.entries(serializedItems).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      return Promise.resolve();
    } else {
      throw new Error('不支持的存储环境');
    }
  }
}

// 导出默认实例（可选）
export default StorageUtils;