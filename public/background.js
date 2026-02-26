// Background script for handling keyboard shortcuts and Mock functionality
// 完全静态版本 - 不使用任何动态导入

// 简单直接的实现
chrome.commands.onCommand.addListener((command) => {
  console.log('[PasteKitLab] 收到命令:', command);
  
  if (command === '_execute_action') {
    console.log('[PasteKitLab] 快捷键触发成功:', command);

    // 同时尝试激活扩展（在支持的窗口中）
    chrome.action.openPopup().catch(err => {
      console.log('[PasteKitLab] openPopup 在此窗口不可用（正常）:', err.message);
      console.log('[PasteKitLab] ℹ️ 这是正常现象，特别是在全屏或特殊窗口中');
    });
  } else if (command === 'open-options') {
    console.log('[PasteKitLab] 打开 options 页面命令触发:', command);
    
    // 打开 options 页面
    chrome.runtime.openOptionsPage().catch(err => {
      console.error('[PasteKitLab] 打开 options 页面失败:', err);
    });
  }
});

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('PasteKitLab extension installed');
    // 初始化 Mock 功能
    await initializeMockFunctionality();
  } else if (details.reason === 'update') {
    console.log('PasteKitLab extension updated');
    // 更新时重新注册 Mock 规则
    await reinitializeMockRules();
  }
});

// 监听来自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[PasteKitLab] 收到消息:', request);
  
  if (request.type === 'GET_MOCK_DATA') {
    console.log('[PasteKitLab] 处理 GET_MOCK_DATA 请求:', request);
    console.log('[PasteKitLab] 发送者信息:', sender);
    handleGetMockData(request, sender, sendResponse);
    return true; // 保持消息通道开放以进行异步响应
  }
  
  if (request.type === 'REFRESH_MOCK_RULES') {
    handleRefreshMockRules(request, sender, sendResponse);
    return true;
  }
});


/**
 * 初始化 Mock 功能
 */
async function initializeMockFunctionality() {
  try {
    console.log('[PasteKitLab] 初始化 Mock 功能');
    
    // 加载现有的 Mock 规则
    const mockRules = await loadMockRules();
    
    if (mockRules.length > 0) {
      // 注册 DNR 规则
      await registerDNRRules(mockRules);
      console.log(`[PasteKitLab] 成功注册 ${mockRules.length} 条 Mock 规则`);
    }
    
  } catch (error) {
    console.error('[PasteKitLab] 初始化 Mock 功能失败:', error);
  }
}

/**
 * 重新初始化 Mock 规则
 */
async function reinitializeMockRules() {
  try {
    console.log('[PasteKitLab] 重新初始化 Mock 规则');
    
    // 清除现有的 DNR 规则
    await clearDNRRules();
    
    // 重新加载并注册规则
    const mockRules = await loadMockRules();
    if (mockRules.length > 0) {
      await registerDNRRules(mockRules);
      console.log(`[PasteKitLab] 重新注册 ${mockRules.length} 条 Mock 规则`);
    }
    
  } catch (error) {
    console.error('[PasteKitLab] 重新初始化 Mock 规则失败:', error);
  }
}

/**
 * 处理获取 Mock 数据的请求
 */
async function handleGetMockData(request, sender, sendResponse) {
  try {
    const { ruleId } = request;
    console.log(`[PasteKitLab] 获取 Mock 数据，规则ID: ${ruleId}`);
    
    if (!ruleId) {
      sendResponse({
        success: false,
        error: 'Missing ruleId'
      });
      return;
    }
    
    // 获取 Mock 数据
    const mockDataResult = await getItem(`mockData_${ruleId}`);
    const mockData = mockDataResult[`mockData_${ruleId}`];
    console.log(`[PasteKitLab] 加载到的 Mock 数据:`, mockData);
    
    if (!mockData) {
      // 如果没有找到具体数据，返回默认数据
      const rule = await loadMockRules()
        .then(rules => rules.find(r => r.id === ruleId));
      
      if (rule) {
        const defaultData = getDefaultMockData(rule.contentType);
        console.log(`[PasteKitLab] 返回默认 Mock 数据，类型: ${rule.contentType}`);
        sendResponse({
          success: true,
          data: defaultData,
          contentType: rule.contentType,
          statusCode: rule.statusCode
        });
      } else {
        sendResponse({
          success: false,
          error: 'Rule not found'
        });
      }
      return;
    }
    
    sendResponse({
      success: true,
      data: mockData.data,
      contentType: mockData.contentType,
      statusCode: mockData.statusCode || 200
    });
    
  } catch (error) {
    console.error('[PasteKitLab] 处理 Mock 数据请求失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 处理刷新 Mock 规则的请求
 */
async function handleRefreshMockRules(request, sender, sendResponse) {
  try {
    console.log('[PasteKitLab] 刷新 Mock 规则');
    
    // 重新加载并注册规则
    const mockRules = await loadMockRules();
    await registerDNRRules(mockRules);
    
    sendResponse({
      success: true,
      message: `成功刷新 ${mockRules.length} 条规则`
    });
    
  } catch (error) {
    console.error('[PasteKitLab] 刷新 Mock 规则失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// ==================== 存储工具函数 ====================

/**
 * 设置存储项
 */
async function setItem(key, value, area = 'local') {
  const serializedValue = JSON.stringify(value);
  
  if (typeof chrome !== 'undefined' && chrome.storage) {
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
  } else {
    throw new Error('不支持的存储环境');
  }
}

/**
 * 获取存储项
 */
async function getItem(keys, area = 'local') {
  if (typeof chrome !== 'undefined' && chrome.storage) {
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
  } else {
    throw new Error('不支持的存储环境');
  }
}

/**
 * 删除存储项
 */
async function removeItem(keys, area = 'local') {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    // Chrome 扩展环境
    if (area === 'sync') {
      return chrome.storage.sync.remove(keys);
    } else if (area === 'session') {
      return chrome.storage.session?.remove(keys) || chrome.storage.local.remove(keys);
    } else {
      return chrome.storage.local.remove(keys);
    }
  } else {
    throw new Error('不支持的存储环境');
  }
}

// ==================== 本地 Mock 服务器通信 ====================

/**
 * 向本地 Mock 服务器发送 Mock 数据
 */
async function sendMockDataToServer(ruleId, mockData) {
  try {
    const response = await fetch(`http://localhost:8787/api/set-mock-data/${ruleId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockData)
    });
    
    if (response.ok) {
      console.log(`[MockServer] 成功发送 Mock 数据到服务器: ${ruleId}`);
      return true;
    } else {
      console.error(`[MockServer] 发送 Mock 数据失败: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`[MockServer] 连接本地服务器失败:`, error);
    return false;
  }
}

/**
 * 从本地 Mock 服务器获取 Mock 数据
 */
async function getMockDataFromServer(ruleId) {
  try {
    const response = await fetch(`http://localhost:8787/api/get-mock-data/${ruleId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[MockServer] 成功从服务器获取 Mock 数据: ${ruleId}`);
      return data;
    } else {
      console.error(`[MockServer] 获取 Mock 数据失败: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error(`[MockServer] 连接本地服务器失败:`, error);
    return null;
  }
}

/**
 * 检查本地 Mock 服务器状态
 */
async function checkMockServerStatus() {
  try {
    const response = await fetch('http://localhost:8787/api/status');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// ==================== Mock 规则管理函数 ====================

const MOCK_RULES_STORAGE_KEY = 'mockRules';
const MOCK_DATA_STORAGE_KEY = 'mockData';

/**
 * 加载所有 Mock 规则
 */
async function loadMockRules() {
  try {
    const result = await getItem([MOCK_RULES_STORAGE_KEY]);
    return result[MOCK_RULES_STORAGE_KEY] || [];
  } catch (error) {
    console.error('加载 Mock 规则失败:', error);
    return [];
  }
}

/**
 * 保存 Mock 规则
 */
async function saveMockRules(rules) {
  try {
    await setItem(MOCK_RULES_STORAGE_KEY, rules);
    return true;
  } catch (error) {
    console.error('保存 Mock 规则失败:', error);
    return false;
  }
}

/**
 * 添加新的 Mock 规则
 */
async function addMockRule(ruleData) {
  try {
    const rules = await loadMockRules();
    const newRule = {
      ...getDefaultMockRule(),
      ...ruleData,
      id: generateRuleId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    rules.push(newRule);
    const success = await saveMockRules(rules);
    
    return success ? newRule : null;
  } catch (error) {
    console.error('添加 Mock 规则失败:', error);
    return null;
  }
}

/**
 * 更新 Mock 规则
 */
async function updateMockRule(ruleId, updates) {
  try {
    const rules = await loadMockRules();
    const ruleIndex = rules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) return false;
    
    rules[ruleIndex] = {
      ...rules[ruleIndex],
      ...updates,
      updatedAt: Date.now()
    };
    
    return await saveMockRules(rules);
  } catch (error) {
    console.error('更新 Mock 规则失败:', error);
    return false;
  }
}

/**
 * 删除 Mock 规则
 */
async function deleteMockRule(ruleId) {
  try {
    const rules = await loadMockRules();
    const filteredRules = rules.filter(rule => rule.id !== ruleId);
    
    // 同时删除对应的 Mock 数据
    await deleteMockData(ruleId);
    
    return await saveMockRules(filteredRules);
  } catch (error) {
    console.error('删除 Mock 规则失败:', error);
    return false;
  }
}

/**
 * 获取默认 Mock 规则模板
 */
function getDefaultMockRule() {
  return {
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
}

/**
 * 生成唯一的规则ID
 */
function generateRuleId() {
  return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 保存 Mock 数据
 */
async function saveMockData(ruleId, data, contentType = 'application/json') {
  try {
    const mockData = {
      ruleId,
      data,
      contentType,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await setItem(`${MOCK_DATA_STORAGE_KEY}_${ruleId}`, mockData);
    return true;
  } catch (error) {
    console.error('保存 Mock 数据失败:', error);
    return false;
  }
}

/**
 * 加载 Mock 数据
 */
async function loadMockData(ruleId) {
  try {
    const key = `${MOCK_DATA_STORAGE_KEY}_${ruleId}`;
    const result = await getItem([key]);
    return result[key] || null;
  } catch (error) {
    console.error('加载 Mock 数据失败:', error);
    return null;
  }
}

/**
 * 删除 Mock 数据
 */
async function deleteMockData(ruleId) {
  try {
    const key = `${MOCK_DATA_STORAGE_KEY}_${ruleId}`;
    await removeItem(key);
    return true;
  } catch (error) {
    console.error('删除 Mock 数据失败:', error);
    return false;
  }
}

// ==================== 动态权限管理 ====================

/**
 * 动态申请主机权限
 */
async function requestHostPermission(origin) {
  try {
    console.log(`[Permissions] 开始申请权限: ${origin}`);
    
    // 检查是否已有权限
    const hasPermission = await chrome.permissions.contains({
      origins: [origin]
    });
    
    if (hasPermission) {
      console.log(`[Permissions] 已拥有权限: ${origin}`);
      return true;
    }
    
    console.log(`[Permissions] 当前无权限，准备申请: ${origin}`);
    
    // 请求新权限
    const granted = await chrome.permissions.request({
      origins: [origin]
    });
    
    if (granted) {
      console.log(`[Permissions] 成功申请权限: ${origin}`);
    } else {
      console.warn(`[Permissions] 用户拒绝权限申请: ${origin}`);
    }
    
    return granted;
  } catch (error) {
    console.error(`[Permissions] 申请权限失败: ${origin}`, error);
    return false;
  }
}

/**
 * 从 URL 模式提取主机名
 */
function extractOriginFromPattern(urlPattern) {
  try {
    // 处理通配符模式
    let cleanPattern = urlPattern
      .replace(/\*\*/g, '*')
      .replace(/^\*\./, '')  // 移除前导 *.
      .replace(/\*$/, '');   // 移除尾随 *
    
    // 如果没有协议，添加 https://
    if (!cleanPattern.match(/^https?:\/\//)) {
      cleanPattern = 'https://' + cleanPattern;
    }
    
    const url = new URL(cleanPattern);
    return `${url.protocol}//${url.hostname}/*`;
  } catch (error) {
    console.error(`[Permissions] 解析 URL 模式失败: ${urlPattern}`, error);
    return null;
  }
}

// ==================== DNR 管理函数 ====================

/**
 * 注册 DNR 规则
 */
async function registerDNRRules(mockRules) {
  try {
    // 先清除现有的 DNR 规则
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    console.log('[DNR] 现有规则数量:', existingRules.length);
    console.log('[DNR] 现有规则详情:', existingRules);
    
    const ruleIds = existingRules.map(rule => rule.id);
    
    if (ruleIds.length > 0) {
      console.log('[DNR] 清除旧规则 IDs:', ruleIds);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
      console.log('[DNR] 旧规则清除完成');
    } else {
      console.log('[DNR] 没有需要清除的旧规则');
    }

    // 注意：权限申请已移至前端用户手势上下文处理
    // 此处仅注册已授权的规则

    // 创建新的 DNR 规则
    const dnrRules = mockRules
      .filter(rule => rule.enabled)
      .map((rule, index) => {
        // 参数验证
        if (!rule || !rule.urlPattern) {
          console.warn(`[DNR] 跳过无效规则:`, rule);
          return null;
        }
        // 构建动作对象
        let action = {};
        switch (rule.actionType) {
          case 'block':
            action = { type: 'block' };
            break;
          case 'allow':
            action = { type: 'allow' };
            break;
          case 'redirect':
          default:
            const redirectUrl = rule.redirectUrl || `https://localhost:8443/${rule.id}`;
            console.log(`[DNR] 规则 ${rule.id} 重定向URL:`, redirectUrl);
            console.log(`[DNR] 规则 ${rule.id} 原始redirectUrl:`, rule.redirectUrl);
            action = {
              type: 'redirect',
              redirect: {
                url: redirectUrl
              }
            };
            break;
        }
        
        // 构建条件对象
        const condition = {
          urlFilter: convertToUrlFilter(rule.urlPattern),
          resourceTypes: rule.resourceTypes && rule.resourceTypes.length > 0 
            ? rule.resourceTypes 
            : ['xmlhttprequest'],
          excludedInitiatorDomains: rule.excludedInitiatorDomains || [],
          excludedRequestDomains: rule.excludedRequestDomains || []
        };
        
        return {
          id: index + 1,
          priority: rule.priority || 1,
          action: action,
          condition: condition
        };
      });

    // 过滤掉 null 规则
    const validDnrRules = dnrRules.filter(rule => rule !== null);
    
    if (validDnrRules.length > 0) {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: validDnrRules
        });
        console.log('[DNR] 规则更新成功');
      } catch (updateError) {
        console.error('[DNR] 规则更新失败:', updateError);
        // 尝试逐个注册规则以定位问题
        for (let i = 0; i < dnrRules.length; i++) {
          try {
            await chrome.declarativeNetRequest.updateDynamicRules({
              addRules: [dnrRules[i]]
            });
            console.log(`[DNR] 单个规则 ${i} 注册成功`);
          } catch (singleError) {
            console.error(`[DNR] 单个规则 ${i} 注册失败:`, singleError);
            console.log(`[DNR] 问题规则详情:`, dnrRules[i]);
          }
        }
      }
    }

    console.log(`成功注册 ${dnrRules.length} 条 DNR 规则`);
    console.log('DNR 规则详情:', JSON.stringify(dnrRules, null, 2));
    
    // 验证每条规则的重定向URL
    dnrRules.forEach((rule, index) => {
      console.log(`[DNR] 规则 ${index + 1} 详细信息:`, {
        id: rule.id,
        actionType: rule.action.type,
        redirectUrl: rule.action.redirect?.url,
        urlFilter: rule.condition.urlFilter,
        resourceTypes: rule.condition.resourceTypes
      });
    });
    
    // 验证规则是否正确注册
    const registeredRules = await chrome.declarativeNetRequest.getDynamicRules();
    console.log('实际注册的规则:', registeredRules);
    return true;
  } catch (error) {
    console.error('注册 DNR 规则失败:', error);
    return false;
  }
}

/**
 * 清除所有 DNR 规则
 */
async function clearDNRRules() {
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

/**
 * 将 URL 模式转换为 DNR 的 urlFilter 格式
 */
function convertToUrlFilter(urlPattern) {
  // 更精确的 URL 模式转换
  let filter = urlPattern.trim();
  
  // 处理通配符
  filter = filter.replace(/\*\*/g, '*'); // 双星号转换为单星号
  filter = filter.replace(/\*/g, '*');   // 保持单星号
  
  // 处理协议相关的模式
  if (filter.startsWith('http://') || filter.startsWith('https://')) {
    // 已有协议的完整 URL，添加通配符
    if (!filter.includes('*')) {
      filter = filter + '*';
    }
  } else if (filter.startsWith('//')) {
    // 协议相对 URL
    filter = 'https:' + filter + '*';
  } else if (!filter.startsWith('*')) {
    // 没有协议的模式，添加通用前缀
    filter = '*' + filter;
  }
  
  // 确保以通配符结尾（如果不是已经有的话）
  if (!filter.endsWith('*') && filter.includes('.')) {
    filter = filter + '*';
  }
  
  console.log(`[DNR] 转换 URL 模式: ${urlPattern} -> ${filter}`);
  return filter;
}

/**
 * 获取默认 Mock 数据
 */
function getDefaultMockData(contentType) {
  if (contentType.includes('application/json')) {
    return JSON.stringify({
      message: "This is a mock response",
      timestamp: Date.now(),
      data: {
        id: 1,
        name: "Mock Data",
        status: "success"
      }
    }, null, 2);
  } else if (contentType.includes('text/html')) {
    return `<html>
<head><title>Mock Response</title></head>
<body>
  <h1>Mock Response</h1>
  <p>This is a mocked HTML response generated by PasteKit Lab.</p>
  <p>Generated at: ${new Date().toISOString()}</p>
</body>
</html>`;
  } else {
    return `Mock response generated at ${new Date().toISOString()}

This is a default mock response from PasteKit Lab.`;
  }
}

console.log('Background script loaded - 监听快捷键 Alt+Shift+A 和 Alt+Shift+Z，以及 Mock 功能');

// ==================== 消息处理 ====================

// 监听来自 content script 和 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] 收到消息:', request);
  
  switch (request.action) {
    case 'checkPermission':
      checkPermissionHandler(request, sender, sendResponse);
      return true; // 保持消息通道开放以支持异步响应
      
    case 'requestPermission':
      requestPermissionHandler(request, sender, sendResponse);
      return true; // 保持消息通道开放以支持异步响应
      
    case 'getMockData':
      getMockDataHandler(request, sender, sendResponse);
      return true;
      
    case 'registerDNRRules':
      registerDNRRulesHandler(request, sender, sendResponse);
      return true;
      
    default:
      console.log('[Background] 未知消息类型:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// 权限检查处理器
async function checkPermissionHandler(request, sender, sendResponse) {
  try {
    console.log(`[Permissions] 检查权限: ${request.origin}`);
    
    const hasPermission = await chrome.permissions.contains({
      origins: [request.origin]
    });
    
    console.log(`[Permissions] 权限检查结果: ${request.origin} -> ${hasPermission}`);
    sendResponse({ success: true, hasPermission: hasPermission });
  } catch (error) {
    console.error(`[Permissions] 检查权限失败: ${request.origin}`, error);
    sendResponse({ success: false, error: error.message });
  }
}

// 权限申请处理器
async function requestPermissionHandler(request, sender, sendResponse) {
  try {
    console.log(`[Permissions] 用户申请权限: ${request.origin}`);
    
    // 检查是否已有权限
    const hasPermission = await chrome.permissions.contains({
      origins: [request.origin]
    });
    
    if (hasPermission) {
      console.log(`[Permissions] 已拥有权限: ${request.origin}`);
      sendResponse({ success: true, alreadyGranted: true });
      return;
    }
    
    // 请求新权限
    const granted = await chrome.permissions.request({
      origins: [request.origin]
    });
    
    if (granted) {
      console.log(`[Permissions] 用户授予权限: ${request.origin}`);
      sendResponse({ success: true, granted: true });
    } else {
      console.log(`[Permissions] 用户拒绝权限: ${request.origin}`);
      sendResponse({ success: false, granted: false });
    }
  } catch (error) {
    console.error(`[Permissions] 申请权限失败: ${request.origin}`, error);
    sendResponse({ success: false, error: error.message });
  }
}

// 获取 Mock 数据处理器
async function getMockDataHandler(request, sender, sendResponse) {
  try {
    const ruleId = request.ruleId;
    console.log(`[Background] 获取 Mock 数据: ${ruleId}`);
    
    const mockData = await chrome.storage.local.getItem(`mockData_${ruleId}`);
    console.log(`[Background] Mock 数据获取结果:`, mockData);
    
    sendResponse({ success: true, data: mockData });
  } catch (error) {
    console.error(`[Background] 获取 Mock 数据失败: ${request.ruleId}`, error);
    sendResponse({ success: false, error: error.message });
  }
}

// 注册 DNR 规则处理器
async function registerDNRRulesHandler(request, sender, sendResponse) {
  try {
    console.log('[Background] 注册 DNR 规则请求');
    const result = await registerDNRRules(request.mockRules);
    sendResponse({ success: result });
  } catch (error) {
    console.error('[Background] 注册 DNR 规则失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}