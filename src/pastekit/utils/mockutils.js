/**
 * Mock 功能相关的工具类
 * 提供 Mock 规则管理和数据存储功能
 */

import { StorageUtils } from './storageutils.js';

// Mock 规则存储键名
const MOCK_RULES_STORAGE_KEY = 'mockRules';
const MOCK_DATA_STORAGE_KEY = 'mockData';

// 默认 Mock 规则模板
const DEFAULT_MOCK_RULE = {
  id: '',
  name: '',
  urlPattern: '',
  method: 'GET',
  contentType: 'application/json',
  statusCode: 200,
  enabled: true,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// 支持的 HTTP 方法
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

// 支持的内容类型
export const CONTENT_TYPES = [
  'application/json',
  'text/html',
  'text/plain',
  'application/xml',
  'text/xml'
];

export class MockStorageManager {
  /**
   * 加载所有 Mock 规则
   * @returns {Promise<Array>} Mock 规则数组
   */
  static async loadMockRules() {
    try {
      const result = await StorageUtils.getItem(MOCK_RULES_STORAGE_KEY);
      return result[MOCK_RULES_STORAGE_KEY] || [];
    } catch (error) {
      console.error('加载 Mock 规则失败:', error);
      return [];
    }
  }

  /**
   * 保存 Mock 规则
   * @param {Array} rules - Mock 规则数组
   * @returns {Promise<boolean>} 是否保存成功
   */
  static async saveMockRules(rules) {
    try {
      await StorageUtils.setItem(MOCK_RULES_STORAGE_KEY, rules);
      return true;
    } catch (error) {
      console.error('保存 Mock 规则失败:', error);
      return false;
    }
  }

  /**
   * 添加新的 Mock 规则
   * @param {Object} ruleData - 规则数据
   * @returns {Promise<Object|null>} 新创建的规则或 null
   */
  static async addMockRule(ruleData) {
    try {
      const rules = await this.loadMockRules();
      const newRule = {
        ...DEFAULT_MOCK_RULE,
        ...ruleData,
        id: this.generateRuleId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      rules.push(newRule);
      const success = await this.saveMockRules(rules);
      
      return success ? newRule : null;
    } catch (error) {
      console.error('添加 Mock 规则失败:', error);
      return null;
    }
  }

  /**
   * 更新 Mock 规则
   * @param {string} ruleId - 规则ID
   * @param {Object} updates - 更新的数据
   * @returns {Promise<boolean>} 是否更新成功
   */
  static async updateMockRule(ruleId, updates) {
    try {
      const rules = await this.loadMockRules();
      const ruleIndex = rules.findIndex(rule => rule.id === ruleId);
      
      if (ruleIndex === -1) return false;
      
      rules[ruleIndex] = {
        ...rules[ruleIndex],
        ...updates,
        updatedAt: Date.now()
      };
      
      return await this.saveMockRules(rules);
    } catch (error) {
      console.error('更新 Mock 规则失败:', error);
      return false;
    }
  }

  /**
   * 删除 Mock 规则
   * @param {string} ruleId - 规则ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async deleteMockRule(ruleId) {
    try {
      const rules = await this.loadMockRules();
      const filteredRules = rules.filter(rule => rule.id !== ruleId);
      
      // 同时删除对应的 Mock 数据
      await MockDataManager.deleteMockData(ruleId);
      
      return await this.saveMockRules(filteredRules);
    } catch (error) {
      console.error('删除 Mock 规则失败:', error);
      return false;
    }
  }

  /**
   * 根据 URL 模式匹配规则
   * @param {string} url - 请求URL
   * @param {string} method - HTTP方法
   * @returns {Promise<Object|null>} 匹配的规则或 null
   */
  static async matchMockRule(url, method) {
    try {
      const rules = await this.loadMockRules();
      const enabledRules = rules.filter(rule => rule.enabled);
      
      // 按照创建时间倒序排列，优先匹配最新的规则
      enabledRules.sort((a, b) => b.createdAt - a.createdAt);
      
      for (const rule of enabledRules) {
        if (rule.method === method && this.urlMatchesPattern(url, rule.urlPattern)) {
          return rule;
        }
      }
      
      return null;
    } catch (error) {
      console.error('匹配 Mock 规则失败:', error);
      return null;
    }
  }

  /**
   * 检查 URL 是否匹配模式
   * @param {string} url - 请求URL
   * @param {string} pattern - URL模式
   * @returns {boolean} 是否匹配
   */
  static urlMatchesPattern(url, pattern) {
    if (!pattern) return false;
    
    try {
      // 简单的通配符匹配
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
        .replace(/\*/g, '.*'); // 将 * 替换为 .* 
        
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(url);
    } catch (error) {
      console.error('URL 模式匹配失败:', error);
      return false;
    }
  }

  /**
   * 生成唯一的规则ID
   * @returns {string} 规则ID
   */
  static generateRuleId() {
    return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class MockDataManager {
  /**
   * 保存 Mock 数据
   * @param {string} ruleId - 关联的规则ID
   * @param {any} data - Mock 数据
   * @param {string} contentType - 内容类型
   * @returns {Promise<boolean>} 是否保存成功
   */
  static async saveMockData(ruleId, data, contentType = 'application/json') {
    try {
      const mockData = {
        ruleId,
        data,
        contentType,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await StorageUtils.setItem(`${MOCK_DATA_STORAGE_KEY}_${ruleId}`, mockData);
      return true;
    } catch (error) {
      console.error('保存 Mock 数据失败:', error);
      return false;
    }
  }

  /**
   * 加载 Mock 数据
   * @param {string} ruleId - 规则ID
   * @returns {Promise<Object|null>} Mock 数据对象或 null
   */
  static async loadMockData(ruleId) {
    try {
      const key = `${MOCK_DATA_STORAGE_KEY}_${ruleId}`;
      const result = await StorageUtils.getItem(key);
      return result[key] || null;
    } catch (error) {
      console.error('加载 Mock 数据失败:', error);
      return null;
    }
  }

  /**
   * 删除 Mock 数据
   * @param {string} ruleId - 规则ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async deleteMockData(ruleId) {
    try {
      const key = `${MOCK_DATA_STORAGE_KEY}_${ruleId}`;
      await StorageUtils.removeItem(key);
      return true;
    } catch (error) {
      console.error('删除 Mock 数据失败:', error);
      return false;
    }
  }

  /**
   * 获取所有 Mock 数据的统计信息
   * @returns {Promise<Object>} 统计信息
   */
  static async getStatistics() {
    try {
      const rules = await MockStorageManager.loadMockRules();
      const stats = {
        totalRules: rules.length,
        enabledRules: rules.filter(rule => rule.enabled).length,
        dataEntries: 0
      };

      // 计算数据条目数
      for (const rule of rules) {
        const mockData = await this.loadMockData(rule.id);
        if (mockData) {
          stats.dataEntries++;
        }
      }

      return stats;
    } catch (error) {
      console.error('获取 Mock 统计信息失败:', error);
      return { totalRules: 0, enabledRules: 0, dataEntries: 0 };
    }
  }
}

export class DNRManager {
  /**
   * 注册 DNR 规则
   * @param {Array} mockRules - Mock 规则数组
   * @returns {Promise<boolean>} 是否注册成功
   */
  static async registerDNRRules(mockRules) {
    try {
      // 先清除现有的 DNR 规则
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIds = existingRules.map(rule => rule.id);
      
      if (ruleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds
        });
      }

      // 创建新的 DNR 规则
      const dnrRules = [];
      
      mockRules
        .filter(rule => rule.enabled)
        .forEach((rule, index) => {
          // 参数验证
          if (!rule || !rule.urlPattern) {
            console.warn(`[DNR] 跳过无效规则:`, rule);
            return;
          }
          
          // 优先尝试生成 regexSubstitution 规则
          const regexRule = this.generateRegexSubstitutionRule(rule.urlPattern, rule.redirectUrl);
          
          let dnrRule;
          
          if (regexRule) {
            // 使用 regexSubstitution
            console.log(`[DNR] 使用 regexSubstitution 规则 ${rule.id}`);
            dnrRule = {
              id: index + 1,
              priority: 1,
              action: {
                type: 'redirect',
                redirect: {
                  regexSubstitution: regexRule.regexSubstitution
                }
              },
              condition: {
                regexFilter: regexRule.regexFilter,
                resourceTypes: rule.resourceTypes && rule.resourceTypes.length > 0 
                  ? rule.resourceTypes 
                  : ['xmlhttprequest']
              }
            };
          } else {
            // 使用传统的 urlFilter + redirect.url
            let finalRedirectUrl = rule.redirectUrl || `https://localhost:8443/${rule.id}`;
            
            // 如果 pattern 和 redirectUrl 都包含通配符，进行智能替换
            if (rule.urlPattern.includes('*') && finalRedirectUrl.includes('*')) {
              // 对于常见的通配符模式，我们可以预先生成一些变体
              // 这里我们生成一个示例 URL 来演示替换逻辑
              const sampleOriginalUrl = rule.urlPattern
                .replace(/\*/g, 'example')
                .replace(/^\*\./, 'www.')
                .replace(/\*$/, '.com');
              
              finalRedirectUrl = this.replaceWildcardUrl(sampleOriginalUrl, rule.urlPattern, finalRedirectUrl);
            }
            
            console.log(`[DNR] 规则 ${rule.id} 使用传统重定向:`, finalRedirectUrl);
            dnrRule = {
              id: index + 1,
              priority: 1,
              action: {
                type: 'redirect',
                redirect: {
                  url: finalRedirectUrl
                }
              },
              condition: {
                urlFilter: this.convertToUrlFilter(rule.urlPattern),
                resourceTypes: rule.resourceTypes && rule.resourceTypes.length > 0 
                  ? rule.resourceTypes 
                  : ['xmlhttprequest']
              }
            };
          }
          
          console.log(`[DNR] 规则 ${rule.id} 配置:`, {
            urlPattern: rule.urlPattern,
            redirectUrl: rule.redirectUrl,
            hasRegexSubstitution: !!regexRule
          });
          
          dnrRules.push(dnrRule);
        });

      // 过滤掉 null 规则
      const validDnrRules = dnrRules.filter(rule => rule !== null);
      
      if (validDnrRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: validDnrRules
        });
      }

      console.log(`成功注册 ${dnrRules.length} 条 DNR 规则`);
      return true;
    } catch (error) {
      console.error('注册 DNR 规则失败:', error);
      return false;
    }
  }

  /**
   * 将 URL 模式转换为 DNR 的 urlFilter 格式
   * @param {string} urlPattern - URL 模式
   * @returns {string} urlFilter 格式
   */
  static convertToUrlFilter(urlPattern) {
    // 更精确的 URL 模式转换
    let filter = urlPattern;
    
    // 处理通配符
    filter = filter.replace(/\*\*/g, '*'); // 双星号转换为单星号
    filter = filter.replace(/\*/g, '*');   // 保持单星号
    
    // 确保以 http 开头的模式正确处理
    if (filter.startsWith('http') && !filter.includes('*')) {
      filter = filter + '*';
    }
    
    console.log(`[DNR] 转换 URL 模式: ${urlPattern} -> ${filter}`);
    return filter;
  }

  /**
   * 生成 regexSubstitution 规则
   * @param {string} urlPattern - URL 模式 (包含 *)
   * @param {string} redirectUrl - 重定向 URL (包含 *)
   * @returns {Object|null} 包含 regexFilter 和 regexSubstitution 的对象，或 null
   */
  static generateRegexSubstitutionRule(urlPattern, redirectUrl) {
    try {
      // 参数验证
      if (!urlPattern || typeof urlPattern !== 'string') {
        console.warn('[DNR] urlPattern 参数无效:', urlPattern);
        return null;
      }
      
      if (!redirectUrl || typeof redirectUrl !== 'string') {
        console.warn('[DNR] redirectUrl 参数无效:', redirectUrl);
        return null;
      }
      
      // 只有当两个都包含通配符时才使用 regexSubstitution
      if (!urlPattern.includes('*') || !redirectUrl.includes('*')) {
        return null;
      }
      
      console.log(`[DNR] 生成 regexSubstitution 规则:`, { urlPattern, redirectUrl });
      
      // 将 urlPattern 转换为 regexFilter
      // 例如: https://api.example.com/* -> ^https://api\.example\.com/(.*)$
      let regexFilter = urlPattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义正则特殊字符
        .replace(/\\\*/g, '(.*)'); // 将 * 转换为捕获组
      
      regexFilter = `^${regexFilter}$`;
      
      // 将 redirectUrl 转换为 regexSubstitution
      // 例如: https://mock-api.company.com/* -> https://mock-api.company.com/\1
      let regexSubstitution = redirectUrl
        .replace(/\*/g, '\\1'); // 将 * 替换为第一个捕获组
      
      console.log(`[DNR] 生成的规则:`, { 
        regexFilter, 
        regexSubstitution 
      });
      
      return {
        regexFilter,
        regexSubstitution
      };
      
    } catch (error) {
      console.error('[DNR] 生成 regexSubstitution 规则失败:', error);
      return null;
    }
  }
  
  /**
   * 智能替换带有通配符的 URL
   * @param {string} originalUrl - 原始请求 URL
   * @param {string} pattern - URL 模式 (可能包含 *)
   * @param {string} redirectUrl - 重定向 URL (可能包含 *)
   * @returns {string} 替换后的 URL
   */
  static replaceWildcardUrl(originalUrl, pattern, redirectUrl) {
    try {
      console.log(`[DNR] URL 替换 - 原始: ${originalUrl}, 模式: ${pattern}, 重定向: ${redirectUrl}`);
      
      // 如果没有通配符，直接返回 redirectUrl
      if (!pattern.includes('*') && !redirectUrl.includes('*')) {
        console.log(`[DNR] 无通配符，直接返回: ${redirectUrl}`);
        return redirectUrl;
      }
      
      // 解析原始 URL
      const urlObj = new URL(originalUrl);
      const originalPath = urlObj.pathname + urlObj.search + urlObj.hash;
      
      // 处理模式匹配和替换
      if (pattern.includes('*') && redirectUrl.includes('*')) {
        // 两种情况：* 在末尾或中间
        
        // 情况1: pattern 以 * 结尾，redirectUrl 也以 * 结尾
        if (pattern.endsWith('*') && redirectUrl.endsWith('*')) {
          // 提取基础路径
          const patternBase = pattern.slice(0, -1); // 移除最后的 *
          const redirectBase = redirectUrl.slice(0, -1); // 移除最后的 *
          
          // 如果原始 URL 匹配模式基础
          if (originalUrl.startsWith(patternBase)) {
            const result = redirectBase + originalPath;
            console.log(`[DNR] 路径追加替换: ${result}`);
            return result;
          }
        }
        
        // 情况2: 更复杂的通配符匹配
        // 将模式转换为正则表达式进行匹配
        const regexPattern = pattern
          .replace(/[-\/\^$*+?.()|[\]{}]/g, '\$&') // 转义特殊字符
          .replace(/\\*/g, '(.*)'); // 将 * 转换为捕获组
        
        const regex = new RegExp(`^${regexPattern}$`);
        const match = originalUrl.match(regex);
        
        if (match) {
          // 使用捕获组内容替换 redirectUrl 中的 *
          let result = redirectUrl;
          for (let i = 1; i < match.length; i++) {
            result = result.replace('*', match[i]);
          }
          console.log(`[DNR] 正则替换结果: ${result}`);
          return result;
        }
      }
      
      // 默认情况：返回 redirectUrl
      console.log(`[DNR] 默认返回: ${redirectUrl}`);
      return redirectUrl;
      
    } catch (error) {
      console.error('[DNR] URL 替换出错:', error);
      return redirectUrl; // 出错时返回原始 redirectUrl
    }
  }
  
  /**
   * 清除所有 DNR 规则
   * @returns {Promise<boolean>} 是否清除成功
   */
  static async clearDNRRules() {
    try {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIds = existingRules.map(rule => rule.id);
      
      if (ruleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds
        });
      }
      return true;
    } catch (error) {
      console.error('清除 DNR 规则失败:', error);
      return false;
    }
  }
}