// Background Service Worker 入口文件
// 使用 IIFE 格式避免 ES6 模块语法问题

(function() {
  'use strict';
  
  // 存储解密配置
  let decryptionConfigs = [];
  
  // 存储 DevTools 连接
  const devtoolsConnections = new Map();
  
  // 初始化
  async function initialize() {
    console.log('[CryptoDevTools Background] 初始化开始');
    
    // 加载配置
    await loadDecryptionConfigs();
    
    // 设置监听器
    setupMessageListeners();
    
    console.log('[CryptoDevTools Background] 初始化完成');
  }
  
  // 加载解密配置
  async function loadDecryptionConfigs() {
    try {
      console.log('[CryptoDevTools Background] 开始加载解密配置');
      const result = await chrome.storage.local.get(['decryptionConfigs']);
      
      // 处理可能的字符串格式数据
      let rawConfigs = result.decryptionConfigs || [];
      
      // 如果是字符串，尝试解析为 JSON
      if (typeof rawConfigs === 'string') {
        try {
          console.log('[CryptoDevTools Background] 检测到字符串格式配置，尝试解析');
          rawConfigs = JSON.parse(rawConfigs);
        } catch (parseError) {
          console.error('[CryptoDevTools Background] JSON 解析失败:', parseError);
          rawConfigs = [];
        }
      }
      
      // 确保配置是数组格式
      decryptionConfigs = Array.isArray(rawConfigs) ? rawConfigs : [];
      
      console.log(`[CryptoDevTools Background] 加载了 ${decryptionConfigs.length} 个配置`);
      console.log('[CryptoDevTools Background] 配置详情:', decryptionConfigs);
    } catch (error) {
      console.error('[CryptoDevTools Background] 加载配置失败:', error);
      decryptionConfigs = []; // 出错时设为空数组
    }
  }
  
  // 设置消息监听器
  function setupMessageListeners() {
    console.log('[CryptoDevTools Background] 设置消息监听器');
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[CryptoDevTools Background] 收到 runtime 消息:', message.type);
      handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });
  
    chrome.runtime.onConnect.addListener((port) => {
      console.log('[CryptoDevTools Background] 收到连接请求，端口名称:', port.name);
      if (port.name === 'devtools-panel') {
        console.log('[CryptoDevTools Background] 处理 DevTools 面板连接');
        handleDevToolsConnection(port);
      } else {
        console.log('[CryptoDevTools Background] 未知端口类型:', port.name);
      }
    });
    
    console.log('[CryptoDevTools Background] 消息监听器设置完成');
  }
  
  // 处理消息
  async function handleMessage(message, sender, sendResponse) {
    try {
      console.log('[CryptoDevTools Background] 收到消息:', message.type);
      
      switch (message.type) {
          
        case 'DECRYPT_DATA':
          const decryptResult = await handleDecryptRequest(message);
          sendResponse(decryptResult);
          break;
          
        case 'SAVE_CONFIGS':
          await handleSaveConfigs(message.configs);
          sendResponse({ success: true });
          break;
          
        case 'GET_CONFIGS':
          sendResponse({ configs: decryptionConfigs });
          break;
          
        case 'CHECK_CONFIG_MATCH':
          // 统一使用 port 通信方式
          console.log('[CryptoDevTools Background] 收到 CHECK_CONFIG_MATCH 消息');
          const matchedConfig = findMatchingConfig(message.url);
          console.log('[CryptoDevTools Background] 匹配结果:', matchedConfig?.domain || '无匹配');
          sendResponse({ 
            matchedConfig: matchedConfig,
            messageId: message.messageId 
          });
          // 同时通过 port 发送消息以确保兼容性
          if (port) {
            port.postMessage({
              type: 'CONFIG_MATCH_RESULT',
              matchedConfig: matchedConfig,
              messageId: message.messageId
            });
          }
          break;
          
        case 'REQUEST_DECRYPTION':
          const decryptionResult = await handleDecryptRequest(message);
          sendResponse({
            requestId: message.requestId,
            result: decryptionResult
          });
          break;
          
        case 'DEVTOOLS_NETWORK_DATA':
          await handleNetworkData(message, sender.tab?.id);
          sendResponse({ success: true });
          break;
          
        case 'REFRESH_CONFIGURATION':
          await loadDecryptionConfigs();
          sendResponse({ success: true });
          break;
          
        default:
          console.log('[CryptoDevTools Background] 未知消息类型:', message.type);
          sendResponse({ error: '未知消息类型: ' + message.type });
      }
      
      return true; // 保持消息通道开放
    } catch (error) {
      console.error('[CryptoDevTools Background] 处理消息失败:', error);
      sendResponse({ error: error.message });
      return true;
    }
  }
  
  // 处理 DevTools 连接
  function handleDevToolsConnection(port) {
    console.log('[CryptoDevTools Background] 开始处理 DevTools 连接');
    console.log('[CryptoDevTools Background] port.sender:', port.sender);
    
    const tabId = port.sender?.tab?.id;
    console.log('[CryptoDevTools Background] 提取的 tabId:', tabId);
    
    if (!tabId) {
      console.warn('[CryptoDevTools Background] 无法获取标签页 ID，但仍继续处理连接');
      // 即使没有 tabId 也继续处理，但使用特殊标识
      const connectionId = 'devtools_' + Date.now();
      devtoolsConnections.set(connectionId, port);
      
      // 设置消息监听器（重要！）
      port.onMessage.addListener((message) => {
        console.log('[CryptoDevTools Background] 收到来自Panel的消息（无tabId）:', message.type);
        handleDevToolsMessage(message, port, connectionId);
      });
      
      // 发送连接确认（即使没有 tabId）
      port.postMessage({
        type: 'CONNECTION_CONFIRMED',
        connectionId: connectionId
      });
      
      console.log('[CryptoDevTools Background] 已发送连接确认消息（无 tabId）');
      
      port.onDisconnect.addListener(() => {
        console.log(`[CryptoDevTools Background] DevTools 面板断开连接，连接 ID: ${connectionId}`);
        devtoolsConnections.delete(connectionId);
      });
      
      return;
    }
  
    console.log(`[CryptoDevTools Background] DevTools 面板连接建立，标签页 ID: ${tabId}`);
    devtoolsConnections.set(tabId, port);
  
    port.onMessage.addListener((message) => {
      handleDevToolsMessage(message, port, tabId);
    });
  
    port.onDisconnect.addListener(() => {
      console.log(`[CryptoDevTools Background] DevTools 面板断开连接，标签页 ID: ${tabId}`);
      devtoolsConnections.delete(tabId);
    });
  
    // 发送连接确认
    port.postMessage({
      type: 'CONNECTION_CONFIRMED',
      tabId
    });
    
    console.log(`[CryptoDevTools Background] 已发送连接确认消息`);
  }
  
  // 处理 DevTools 消息
  async function handleDevToolsMessage(message, port, tabId) {
    switch (message.type) {
      case 'DEVTOOLS_NETWORK_DATA':
        await handleNetworkData(message, tabId);
        break;
            
      case 'REQUEST_DECRYPTION':
        const result = await handleDecryptRequest(message);
        port.postMessage({
          type: 'DECRYPTION_RESULT',
          requestId: message.requestId,
          result
        });
        break;
            
      case 'CHECK_CONFIG_MATCH':
        const matchedConfig = findMatchingConfig(message.url);
        port.postMessage({
          type: 'CONFIG_MATCH_RESULT',
          matchedConfig: matchedConfig,
          messageId: message.messageId
        });
        break;
    }
  }
  
  // 处理解密请求
  async function handleDecryptRequest(message) {
    const { data, config, isRequest } = message;
    
    if (!data || !config) {
      return {
        success: false,
        error: '缺少必要参数',
        algorithm: config?.algorithm || 'unknown',
        timestamp: Date.now()
      };
    }
  
    try {
      // 注意：这里暂时使用模拟解密，因为我们需要将核心逻辑也改为非模块格式
      // 实际应用中需要将 CryptoEngine 也转换为 IIFE 格式
      const result = {
        success: true,
        plaintext: '[解密结果] ' + data.substring(0, 50) + '...',
        algorithm: config.algorithm,
        timestamp: Date.now()
      };
      
      console.log(`[CryptoDevTools Background] 解密${result.success ? '成功' : '失败'}:`, {
        algorithm: config.algorithm,
        success: result.success
      });
      
      return result;
    } catch (error) {
      console.error('[CryptoDevTools Background] 解密执行失败:', error);
      return {
        success: false,
        error: error.message,
        algorithm: config.algorithm,
        timestamp: Date.now()
      };
    }
  }
  
  // 处理网络数据
  async function handleNetworkData(message, tabId) {
    const { requestId, url, method, requestBody, responseBody, statusCode } = message;
    
    // 检查是否有匹配的配置
    const matchedConfig = findMatchingConfig(url);
    if (!matchedConfig) {
      console.log(`[CryptoDevTools Background] URL 不匹配任何配置: ${url}`);
      return;
    }
  
    console.log(`[CryptoDevTools Background] 发现匹配配置: ${matchedConfig.domain}`);
  
    // 准备解密任务
    const decryptionTasks = [];
    
    if (requestBody) {
      decryptionTasks.push({
        context: {
          config: matchedConfig,
          data: requestBody,
          isRequest: true
        },
        type: 'request'
      });
    }
    
    if (responseBody) {
      decryptionTasks.push({
        context: {
          config: matchedConfig,
          data: responseBody,
          isRequest: false
        },
        type: 'response'
      });
    }
  
    // 执行批量解密（模拟）
    const results = decryptionTasks.map(task => ({
      success: true,
      plaintext: '[批量解密结果] ' + task.context.data.substring(0, 30) + '...',
      algorithm: task.context.config.algorithm,
      timestamp: Date.now()
    }));
  
    // 发送结果到 DevTools 面板
    const port = devtoolsConnections.get(tabId);
    if (port) {
      port.postMessage({
        type: 'BATCH_DECRYPTION_RESULT',
        requestId,
        results: results.map((result, index) => ({
          ...result,
          dataType: decryptionTasks[index].type
        }))
      });
    }
  }
  
  // 查找匹配的配置
  function findMatchingConfig(url) {
    try {
      console.log('[CryptoDevTools Background] 开始匹配配置，URL:', url);
      console.log('[CryptoDevTools Background] 当前配置列表类型:', typeof decryptionConfigs);
      console.log('[CryptoDevTools Background] 当前配置列表:', decryptionConfigs);
      
      // 确保 decryptionConfigs 是数组
      if (!Array.isArray(decryptionConfigs)) {
        console.log('[CryptoDevTools Background] 配置列表不是数组，当前值:', decryptionConfigs);
        return null;
      }
      
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      console.log('[CryptoDevTools Background] 请求主机名:', hostname);
      
      const matchedConfig = decryptionConfigs.find(config => {
        console.log(`[CryptoDevTools Background] 检查配置: ${config.domain} (enabled: ${config.enabled})`);
        
        if (!config.enabled) {
          console.log('[CryptoDevTools Background] 配置未启用，跳过');
          return false;
        }
        
        const configDomain = config.domain.replace(/^www\./, ''); // 移除 www 前缀进行比较
        const requestDomain = hostname.replace(/^www\./, '');
        
        console.log(`[CryptoDevTools Background] 比较: ${configDomain} vs ${requestDomain}`);
        
        const isMatch = configDomain === requestDomain || hostname.endsWith('.' + configDomain);
        
        if (isMatch) {
          console.log('[CryptoDevTools Background] 找到匹配配置:', config.domain);
        }
        
        return isMatch;
      });
      
      console.log('[CryptoDevTools Background] 匹配结果:', matchedConfig ? matchedConfig.domain : '无匹配',url);
      return matchedConfig;
    } catch (error) {
      console.error('[CryptoDevTools Background] 解析 URL 失败:', error);
      console.error('[CryptoDevTools Background] 错误详情:', error.stack);
      return null;
    }
  }
  
  // 保存配置
  async function handleSaveConfigs(configs) {
    try {
      await chrome.storage.local.set({ decryptionConfigs: configs });
      decryptionConfigs = configs;
      console.log(`[CryptoDevTools Background] 保存了 ${configs.length} 个配置`);
    } catch (error) {
      throw new Error(`保存配置失败: ${error.message}`);
    }
  }
  
  // 启动初始化
  initialize().catch(error => {
    console.error('[CryptoDevTools Background] 初始化失败:', error);
  });
  
})();