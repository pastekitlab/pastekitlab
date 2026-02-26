import React from 'react';

/**
 * 国际化工具类
 * 支持中英文切换和浏览器语言检测
 */

// 支持的语言列表
const SUPPORTED_LANGUAGES = {
  ZH: 'zh',
  EN: 'en'
};

// 默认语言
const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES.EN;

// 语言存储键名
const LANGUAGE_STORAGE_KEY = 'PasteKitLabLanguage';

// 预加载翻译数据 - 提前声明确保可用性
let preloadedTranslations = {};
let isPreloading = false;
let preloadCompleted = false;
let isInitializing = true; // 新增：标识是否正在初始化

/**
 * 语言管理器类
 */
class LanguageManager {
  constructor() {
    this.currentLanguage = DEFAULT_LANGUAGE; // 先设置默认值
    this.listeners = [];
    this.initializeLanguage(); // 异步初始化
  }

  /**
   * 异步初始化语言设置
   */
  async initializeLanguage() {
    const detectedLanguage = await this.detectInitialLanguage();
    if (detectedLanguage !== this.currentLanguage) {
      this.currentLanguage = detectedLanguage;
      this.notifyListeners();
    }
    isInitializing = false; // 初始化完成
  }

  /**
   * 检测初始语言（浏览器语言 -> 存储语言 -> 默认语言）
   * @returns {Promise<string>} 检测到的语言代码
   */
  async detectInitialLanguage() {
    // 1. 检查是否有存储的语言设置
    const storedLanguage = await this.getStoredLanguage();
    if (storedLanguage && this.isSupportedLanguage(storedLanguage)) {
      return storedLanguage;
    }

    // 2. 检测浏览器语言
    const browserLanguage = this.getBrowserLanguage();
    if (this.isSupportedLanguage(browserLanguage)) {
      return browserLanguage;
    }

    // 3. 使用默认语言
    return DEFAULT_LANGUAGE;
  }

  /**
   * 获取浏览器语言设置
   * @returns {string} 浏览器语言代码
   */
  getBrowserLanguage() {
    if (typeof navigator !== 'undefined') {
      const lang = navigator.language || navigator.userLanguage || '';
      // 提取语言代码部分 (如 zh-CN -> zh, en-US -> en)
      return lang.split('-')[0].toLowerCase();
    }
    return DEFAULT_LANGUAGE;
  }

  /**
   * 获取存储的语言设置
   * @returns {Promise<string|null>} 存储的语言代码
   */
  async getStoredLanguage() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(LANGUAGE_STORAGE_KEY);
      }
      // Chrome扩展环境
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const { StorageUtils } = await import('./storageutils.js');
        const result = await StorageUtils.getItem(LANGUAGE_STORAGE_KEY);
        return result[LANGUAGE_STORAGE_KEY] || null;
      }
    } catch (error) {
      console.warn('Failed to get stored language:', error);
    }
    return null;
  }

  /**
   * 保存语言设置到存储
   * @param {string} language - 语言代码
   */
  async saveLanguage(language) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      }
      // Chrome扩展环境
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const { StorageUtils } = await import('./storageutils.js');
        await StorageUtils.setItem(LANGUAGE_STORAGE_KEY, language);
      }
    } catch (error) {
      console.warn('Failed to save language:', error);
    }
  }

  /**
   * 检查是否支持指定语言
   * @param {string} language - 语言代码
   * @returns {boolean} 是否支持
   */
  isSupportedLanguage(language) {
    return Object.values(SUPPORTED_LANGUAGES).includes(language);
  }

  /**
   * 切换语言
   * @param {string} language - 目标语言代码
   */
  async switchLanguage(language) {
    if (!this.isSupportedLanguage(language)) {
      console.warn(`Unsupported language: ${language}`);
      return;
    }

    if (language !== this.currentLanguage) {
      this.currentLanguage = language;
      await this.saveLanguage(language);
      this.notifyListeners();
    }
  }

  /**
   * 获取当前语言
   * @returns {string} 当前语言代码
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * 添加语言变化监听器
   * @param {Function} callback - 回调函数
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * 移除语言变化监听器
   * @param {Function} callback - 回调函数
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器语言已变化
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentLanguage);
      } catch (error) {
        console.error('Error in language change listener:', error);
      }
    });
  }

  /**
   * 获取支持的语言列表
   * @returns {Object} 支持的语言对象
   */
  getSupportedLanguages() {
    return { ...SUPPORTED_LANGUAGES };
  }
}

// 创建全局语言管理器实例
const languageManager = new LanguageManager();

// 确保预加载对象始终存在
if (!preloadedTranslations) {
  preloadedTranslations = {};
}

/**
 * 翻译函数
 * @param {string} key - 翻译键 (支持点号分隔的嵌套路径，如 'popup.detected_format')
 * @param {Object} params - 参数对象（用于替换占位符）
 * @returns {string} 翻译后的文本
 */
export async function t(key, params = {}) {
  const currentLang = languageManager.getCurrentLanguage();
  const translations = await getTranslations(currentLang);
  
  // 强制调试日志
  console.group(`[TRANSLATION DEBUG] ${key}`);
  console.log('🔑 Key:', key);
  console.log('🌐 Current Language:', currentLang);
  console.log('📚 Root Translation Keys:', Object.keys(translations));
  
  // 处理嵌套键 (如 'popup.detected_format')
  let translation;
  if (key.includes('.')) {
    const parts = key.split('.');
    console.log('🧩 Key parts:', parts);
    
    let currentObj = translations;
    let pathExists = true;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      console.log(`  📂 Accessing [${i}]: ${part}`);
      console.log(`  📦 Current object keys:`, Object.keys(currentObj || {}));
      
      if (currentObj && currentObj.hasOwnProperty(part)) {
        currentObj = currentObj[part];
        console.log(`  ✅ Found:`, currentObj);
      } else {
        pathExists = false;
        console.log(`  ❌ Path broken at: ${part}`);
        break;
      }
    }
    
    if (pathExists && typeof currentObj === 'string') {
      translation = currentObj;
      console.log('🎯 Nested translation found:', translation);
    } else {
      translation = key;
      console.warn('⚠️ Using fallback - nested key not found!');
    }
  } else {
    // 处理简单键
    console.log('🎯 Simple key lookup');
    console.log('🎯 Key Exists:', translations.hasOwnProperty(key));
    translation = translations[key];
    console.log('📄 Raw Translation:', translation);
    
    if (translation === undefined) {
      translation = key;
      console.warn('⚠️ Using fallback - key not found!');
    } else {
      console.log('✅ Translation found successfully!');
    }
  }

  // 替换参数占位符 {{param}}
  Object.keys(params).forEach(param => {
    const placeholder = `{{${param}}}`;
    console.log(`🔄 Replacing parameter: ${placeholder} -> ${params[param]}`);
    translation = translation.replace(new RegExp(placeholder, 'g'), params[param]);
  });

  console.log('🏁 Final Result:', translation);
  console.groupEnd();
  
  return translation;
}

// 同步版本的翻译函数（用于向后兼容）
let cachedTranslations = {};
let cachedLanguage = '';

export function tSync(key, params = {}) {
  const currentLang = languageManager.getCurrentLanguage();
  
  // 确保预加载对象存在
  if (!preloadedTranslations) {
    console.warn('[I18N] Preloaded translations object is undefined, initializing...');
    preloadedTranslations = {};
  }
  
  // 使用预加载的翻译数据
  const translations = preloadedTranslations[currentLang] || {};
  
  // 如果还在初始化阶段或者没有翻译数据，返回键名作为后备
  if (isInitializing || Object.keys(translations).length === 0) {
    return key;
  }
  
  // 处理嵌套键 (如 'popup.detected_format')
  let translation;
  if (key.includes('.')) {
    const parts = key.split('.');
    let currentObj = translations;
    let pathExists = true;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (currentObj && currentObj.hasOwnProperty(part)) {
        currentObj = currentObj[part];
      } else {
        pathExists = false;
        break;
      }
    }
    
    if (pathExists) {
      translation = currentObj;
    } else {
      translation = key;
    }
  } else {
    // 处理简单键
    translation = translations[key];
    if (translation === undefined) {
      translation = key;
    }
  }

  // 如果是字符串类型，替换参数占位符 {{param}}
  if (typeof translation === 'string') {
    Object.keys(params).forEach(param => {
      const placeholder = `{{${param}}}`;
      translation = translation.replace(new RegExp(placeholder, 'g'), params[param]);
    });
  }
  
  return translation;
}

// 修改 getTranslations 使用预加载数据
async function getTranslations(language) {
  // 确保预加载对象存在
  if (!preloadedTranslations) {
    preloadedTranslations = {};
  }
  
  // 如果已有预加载数据，直接返回
  if (preloadedTranslations[language]) {
    return preloadedTranslations[language];
  }
  
  try {
    // 动态导入对应的翻译文件
    let translations;
    if (language === 'zh') {
      const zhModule = await import('../locales/zh.json');
      translations = zhModule.default || zhModule;
    } else {
      const enModule = await import('../locales/en.json');
      translations = enModule.default || enModule;
    }
    
    // 验证翻译对象结构
    if (!translations || typeof translations !== 'object') {
      throw new Error(`Invalid translation structure for ${language}`);
    }
    
    console.log(`[I18N] Successfully loaded ${language} translations with ${Object.keys(translations).length} root keys`);
    return translations;
  } catch (error) {
    console.warn(`Failed to load translations for ${language}:`, error);
    // 返回空对象作为后备
    return {};
  }
}

// 预加载函数
export async function preloadTranslations() {
  // 如果正在预加载，等待完成
  if (isPreloading) {
    console.log('[I18N] Preload already in progress, waiting...');
    while (isPreloading) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return preloadedTranslations;
  }
  
  // 如果已经预加载完成，直接返回
  if (preloadCompleted) {
    console.log('[I18N] Translations already preloaded');
    return preloadedTranslations;
  }
  
  try {
    isPreloading = true;
    console.log('[I18N] Starting translations preload...');
    
    // 确保预加载对象存在
    if (!preloadedTranslations) {
      preloadedTranslations = {};
    }
    
    const languages = ['zh', 'en'];
    for (const lang of languages) {
      try {
        console.log(`[I18N] Loading ${lang} translations...`);
        const translations = await getTranslations(lang);
        preloadedTranslations[lang] = translations;
        console.log(`[I18N] Successfully preloaded ${lang} translations with ${Object.keys(translations).length} keys`);
      } catch (langError) {
        console.error(`[I18N] Failed to preload ${lang} translations:`, langError);
        preloadedTranslations[lang] = {};
      }
    }
    
    preloadCompleted = true;
    console.log('[I18N] All translations preloaded successfully');
    return preloadedTranslations;
  } catch (error) {
    console.error('[I18N] Failed to preload translations:', error);
    // 确保即使出错也有基本的对象结构
    if (!preloadedTranslations) {
      preloadedTranslations = { zh: {}, en: {} };
    }
    preloadCompleted = true; // 即使出错也要标记为完成
    return preloadedTranslations;
  } finally {
    isPreloading = false;
  }
}

// 自动预加载翻译数据 - 延迟到所有依赖都初始化后再执行
setTimeout(async () => {
  try {
    await preloadTranslations();
    console.log('[I18N] Translations preloaded automatically');
  } catch (error) {
    console.error('[I18N] Failed to auto-preload translations:', error);
  }
}, 0);

export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = React.useState(languageManager.getCurrentLanguage());
  const [isReady, setIsReady] = React.useState(preloadCompleted && !isInitializing);

  React.useEffect(() => {
    const handleLanguageChange = (newLanguage) => {
      setCurrentLanguage(newLanguage);
    };

    const handlePreloadComplete = () => {
      setIsReady(true);
    };

    languageManager.addListener(handleLanguageChange);
    
    // 监听预加载完成事件
    if (!preloadCompleted || isInitializing) {
      const interval = setInterval(() => {
        if (preloadCompleted && !isInitializing) {
          setIsReady(true);
          clearInterval(interval);
        }
      }, 50);
      
      return () => {
        clearInterval(interval);
        languageManager.removeListener(handleLanguageChange);
      };
    }
    
    // 确保获取最新的语言设置
    setCurrentLanguage(languageManager.getCurrentLanguage());
    
    return () => {
      languageManager.removeListener(handleLanguageChange);
    };
  }, []);

  // 返回同步翻译函数和准备状态
  return [tSync, currentLanguage, isReady];
}

/**
 * React Hook: 使用语言管理
 * @returns {Object} 语言管理相关方法
 */
export function useLanguage() {
  const [currentLanguage, setCurrentLanguage] = React.useState(languageManager.getCurrentLanguage());

  React.useEffect(() => {
    const handleLanguageChange = (newLanguage) => {
      setCurrentLanguage(newLanguage);
    };

    languageManager.addListener(handleLanguageChange);
    
    // 确保获取最新的语言设置
    setCurrentLanguage(languageManager.getCurrentLanguage());
    
    return () => {
      languageManager.removeListener(handleLanguageChange);
    };
  }, []);

  const switchLanguage = async (language) => {
    // 确保预加载已完成
    if (!preloadCompleted) {
      console.log(`[I18N] Waiting for preload completion before switching to ${language}`);
      await preloadTranslations();
    }
    
    // 检查目标语言是否已加载
    if (!preloadedTranslations[language] || Object.keys(preloadedTranslations[language]).length === 0) {
      console.log(`[I18N] Target language ${language} not loaded, loading now...`);
      try {
        const translations = await getTranslations(language);
        preloadedTranslations[language] = translations;
        console.log(`[I18N] Loaded ${language} translations with ${Object.keys(translations).length} keys`);
      } catch (error) {
        console.error(`[I18N] Failed to load ${language} translations:`, error);
        preloadedTranslations[language] = {};
      }
    }
    
    await languageManager.switchLanguage(language);
  };

  const getSupportedLanguages = () => languageManager.getSupportedLanguages();

  return {
    currentLanguage,
    switchLanguage,
    getSupportedLanguages,
    languageManager
  };
}

// 导出公共API
export {
  languageManager,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY
};

// 默认导出翻译函数
export default t;