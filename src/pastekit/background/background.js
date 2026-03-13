// Background Service Worker 入口文件
// 使用 IIFE 格式避免 ES6 模块语法问题

// 动态导入 CipherUtils
// 静态导入 CipherUtils 以避免动态导入问题
import { CipherUtils } from '../utils/cipher/index.js';
import { ProxyWebSocketClient } from '../proxy/ws-client.js';
import { performDecryption, decryptDataBody, findAndDecryptEncodedValues, detectContentEncoding, deepDecryptJSON } from '../proxy/utils/decryptor.js';

// 存储密钥配置
let keyConfigs = [];

function loadCipherUtils() {
    console.log('[CryptoDevTools Background] CipherUtils 已静态加载');
    return CipherUtils;
}

// 加载密钥配置
async function loadKeyConfigs() {
    try {
        console.log('[CryptoDevTools Background] 开始加载密钥配置');
        const result = await chrome.storage.local.get(['keyConfigs']);

        // 处理可能的字符串格式数据
        let rawConfigs = result.keyConfigs || [];

        // 如果是字符串，尝试解析为 JSON
        if (typeof rawConfigs === 'string') {
            try {
                console.log('[CryptoDevTools Background] 检测到字符串格式密钥配置，尝试解析');
                rawConfigs = JSON.parse(rawConfigs);
            } catch (parseError) {
                console.error('[CryptoDevTools Background] 密钥配置 JSON 解析失败:', parseError);
                rawConfigs = [];
            }
        }

        // 确保密钥配置是数组格式
        keyConfigs = Array.isArray(rawConfigs) ? rawConfigs : [];

        console.log(`[CryptoDevTools Background] 加载了 ${keyConfigs.length} 个密钥配置`);
        console.log('[CryptoDevTools Background] 密钥配置详情:', keyConfigs);
    } catch (error) {
        console.error('[CryptoDevTools Background] 加载密钥配置失败:', error);
        keyConfigs = []; // 出错时设为空数组
    }
}

// 根据配置名称查找密钥配置
function findKeyConfigById(name) {
   let matchedConfig = null;
   if(name){
       matchedConfig= keyConfigs.find(config => config.name === name);
   }
    console.log(`[CryptoDevTools Background] 查找密钥配置 名称: ${name}, 结果:`, matchedConfig?.name || '未找到',keyConfigs);
    return matchedConfig;
}

// 存储解密配置
let decryptionConfigs = [];

// 存储 DevTools 连接
const devtoolsConnections = new Map();

// 存储 Options 请求查看器连接
const optionsViewerConnections = new Map();

// WebSocket 客户端连接（用于连接代理服务器）
let wsProxyConnection = null;
let wsReconnectTimer = null;
let proxyWSClient = null;

// 初始化
async function initialize() {
    console.log('[CryptoDevTools Background] 初始化开始');

    // 加载配置
    await loadDecryptionConfigs();
    await loadKeyConfigs();  // 加载密钥配置

    // 设置监听器
    setupMessageListeners();
    
    // 连接到代理 WebSocket 服务器
    connectToProxyWS();

    console.log('[CryptoDevTools Background] 初始化完成');
    
    // 定期发送心跳和域名配置
    setInterval(() => {
        if (proxyWSClient && proxyWSClient.isConnected()) {
            // 发送心跳
           proxyWSClient.ping();
            
            // 发送域名配置
            sendDomainConfig();
        }
    }, 3000); // 每 30 秒发送一次
}

// 加载解密配置
async function loadDecryptionConfigs() {
    try {
        console.log('[CryptoDevTools Background] 开始加载解密配置');
        const result = await chrome.storage.local.get(['decryptionConfigs']);

        console.log('[CryptoDevTools Background] chrome.storage.local.get 返回结果:', result);
        
        // 处理可能的字符串格式数据
        let rawConfigs = result.decryptionConfigs || [];

        console.log('[CryptoDevTools Background] 原始配置数据:', rawConfigs);
        console.log('[CryptoDevTools Background] 原始配置类型:', typeof rawConfigs, Array.isArray(rawConfigs));

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

        // 确保配置是数组格式 - 增强的检查逻辑
        if (Array.isArray(rawConfigs)) {
            decryptionConfigs = rawConfigs;
        } else if (rawConfigs && typeof rawConfigs === 'object') {
            // 如果是对象，尝试提取值或转换为空数组
            console.warn('[CryptoDevTools Background] 配置数据是对象而非数组，尝试转换');
            // 如果是类数组对象，转换为数组
            if (rawConfigs.length !== undefined) {
                decryptionConfigs = Array.from(rawConfigs);
            } else {
                // 其他对象情况，设为空数组
                decryptionConfigs = [];
            }
        } else {
            decryptionConfigs = [];
        }

       console.log(`[CryptoDevTools Background] 加载了 ${decryptionConfigs.length} 个配置`);
       console.log('[CryptoDevTools Background] 配置详情:', decryptionConfigs);
        
        // 验证每个配置的结构
       decryptionConfigs.forEach((config, index) => {
           console.log(`[CryptoDevTools Background] 配置[${index}]:`, {
                domain: config.domain,
                requestKeyConfigName: config.requestKeyConfigName,
                responseKeyConfigName: config.responseKeyConfigName,
                enabled: config.enabled
            });
        });
        
        // 配置加载完成后，立即发送一次域名配置
        setTimeout(() => {
            sendDomainConfig();
        }, 1000);
    } catch (error) {
       console.error('[CryptoDevTools Background] 加载配置失败:', error);
       decryptionConfigs = []; // 出错时设为空数组
    }
}

// 监听配置变化并重新加载
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.decryptionConfigs) {
        console.log('[CryptoDevTools Background] 检测到解密配置变化，重新加载');
        loadDecryptionConfigs();
    }
});

// 监听扩展卸载事件，清理资源
if (chrome.runtime && chrome.runtime.onSuspend) {
    chrome.runtime.onSuspend.addListener(() => {
        console.log('[CryptoDevTools Background] 扩展正在卸载，清理资源...');
        
        // 关闭所有 DevTools 连接
        devtoolsConnections.forEach((port) => {
            try {
                port.disconnect();
            } catch (error) {
                // 忽略断开连接的错误
            }
        });
        devtoolsConnections.clear();
        
        // 关闭所有 Options 查看器连接
        optionsViewerConnections.forEach((port) => {
            try {
                port.disconnect();
            } catch (error) {
                // 忽略断开连接的错误
            }
        });
        optionsViewerConnections.clear();
        
        // 断开 WebSocket 连接
        if (proxyWSClient) {
            try {
                proxyWSClient.disconnect();
            } catch (error) {
                // 忽略断开连接的错误
            }
        }
        
        console.log('[CryptoDevTools Background] 资源清理完成');
    });
}

// 设置消息监听器
function setupMessageListeners() {
    console.log('[CryptoDevTools Background] 设置消息监听器');

    chrome.runtime.onConnect.addListener((port) => {
        console.log('[CryptoDevTools Background] 收到连接请求，端口名称:', port.name);
        console.log('[CryptoDevTools Background] 连接参数:', port);
        if (port.name === 'devtools-panel') {
            console.log('[CryptoDevTools Background] 处理 DevTools 面板连接');
            handleDevToolsConnection(port);
        } else if (port.name === 'options-request-viewer') {
            console.log('[CryptoDevTools Background] 处理 Options 请求查看器连接');
            handleOptionsRequestViewerConnection(port);
        } else {
            console.log('[CryptoDevTools Background] 未知端口类型:', port.name);
        }
    });

    console.log('[CryptoDevTools Background] 消息监听器设置完成');
}

// 处理 DevTools 连接
function handleDevToolsConnection(port) {
    console.log('[CryptoDevTools Background] 开始处理 DevTools 连接');
    console.log('[CryptoDevTools Background] port.sender:', port.sender);

    console.warn('[CryptoDevTools Background] 无法获取标签页 ID，但仍继续处理连接');
    // 即使没有 tabId 也继续处理，但使用特殊标识
    const connectionId = 'devtools_' + Date.now();
    devtoolsConnections.set(connectionId, port);

    // 设置消息监听器（重要！）
    port.onMessage.addListener((message) => {
        console.log('[CryptoDevTools Background] 收到来自 Panel 的消息（无 tabId）:', message.type);
        handleDevToolsMessage(message, port, connectionId);
    });
    
    // 发送连接确认消息，添加错误处理
    try {
        if (port && !port.error) {
            port.postMessage({
                type: 'CONNECTION_CONFIRMED',
                connectionId: connectionId
            });
            console.log('[CryptoDevTools Background] 已发送连接确认消息（无 tabId）');
        } else {
            console.warn('[CryptoDevTools Background] 端口无效，无法发送确认消息');
        }
    } catch (error) {
        console.error('[CryptoDevTools Background] 发送确认消息失败:', error);
    }

    port.onDisconnect.addListener(() => {
        console.log(`[CryptoDevTools Background] DevTools 面板断开连接，连接 ID: ${connectionId}`);
        devtoolsConnections.delete(connectionId);
    });

    return;
}

// 处理 Options 请求查看器连接
function handleOptionsRequestViewerConnection(port) {
    console.log('[CryptoDevTools Background] 开始处理 Options 请求查看器连接');
    
    const connectionId = 'options_' + Date.now();
    optionsViewerConnections.set(connectionId, port);
    
    console.log('[CryptoDevTools Background] Options 请求查看器连接已建立，ID:', connectionId);
    
    // 发送连接确认
    try {
        if (port && !port.error) {
            port.postMessage({
                type: 'CONNECTION_CONFIRMED',
                connectionId: connectionId
            });
            console.log('[CryptoDevTools Background] 已发送连接确认到 Options 查看器');
        }
    } catch (error) {
        console.error('[CryptoDevTools Background] 发送确认消息失败:', error);
    }
    
    // 监听断开连接
    port.onDisconnect.addListener(() => {
        console.log(`[CryptoDevTools Background] Options 请求查看器断开连接，ID: ${connectionId}`);
        optionsViewerConnections.delete(connectionId);
    });
}

// 处理 DevTools 消息
async function handleDevToolsMessage(message, port) {
    switch (message.type) {
        case 'DEVTOOLS_NETWORK_DATA':
            await handleNetworkData(message, port);
            break;

        case 'CHECK_CONFIG_MATCH':
            const matchedConfig = findMatchingConfig(message.url);
            // 发送配置匹配结果，添加错误处理
            try {
                if (port && !port.error) {
                    port.postMessage({
                        type: 'CONFIG_MATCH_RESULT',
                        matchedConfig: matchedConfig,
                        messageId: message.messageId
                    });
                }
            } catch (error) {
                console.error('[CryptoDevTools Background] 发送配置匹配结果失败:', error);
            }
            break;
    }
}

// 处理网络数据
async function handleNetworkData(message, port) {
    const {requestId, url, method, requestBody,requestHeaders, responseBody,responseHeaders, statusCode} = message;

    // 过滤 OPTIONS 预检请求
    if (method && method.toUpperCase() === 'OPTIONS') {
        console.log(`[CryptoDevTools Background] 跳过 OPTIONS 预检请求：${url}`);
        return;
    }

    // 检查是否有匹配的配置
    const matchedConfig = findMatchingConfig(url);
    if (!matchedConfig) {
        console.log(`[CryptoDevTools Background] URL 不匹配任何配置：${url}`);
        return;
    }

    console.log(`[CryptoDevTools Background] 发现匹配配置：${JSON.stringify(matchedConfig)}`);

    // 根据匹配配置中的 keyConfigName 查找实际的密钥配置
    // 区分请求密钥配置和响应密钥配置
    const requestKeyConfig = findKeyConfigById(matchedConfig.requestKeyConfigName);
    const responseKeyConfig = findKeyConfigById(matchedConfig.responseKeyConfigName);
    
    if (!requestKeyConfig) {
        console.warn(`[CryptoDevTools Background] 未找到请求密钥配置：${matchedConfig.requestKeyConfigName}`);
        // 发送错误消息，添加错误处理
        try {
            if (port && !port.error) {
                port.postMessage({
                    type: "DECRYPTION_RESULT",
                    requestId,
                    error: `未找到对应的请求密钥配置：${matchedConfig.requestKeyConfigName}`,
                    request: {
                        url,
                        method,
                        statusCode,
                        requestBody,
                        responseBody
                    }
                });
            }
        } catch (error) {
            console.error('[CryptoDevTools Background] 发送错误消息失败:', error);
        }
        return;
    }
    
    if (!responseKeyConfig) {
        console.warn(`[CryptoDevTools Background] 未找到响应密钥配置：${matchedConfig.responseKeyConfigName}`);
        // 发送错误消息，添加错误处理
        try {
            if (port && !port.error) {
                port.postMessage({
                    type: "DECRYPTION_RESULT",
                    requestId,
                    error: `未找到对应的响应密钥配置：${matchedConfig.responseKeyConfigName}`,
                    request: {
                        url,
                        method,
                        statusCode,
                        requestBody,
                        responseBody
                    }
                });
            }
        } catch (error) {
            console.error('[CryptoDevTools Background] 发送错误消息失败:', error);
        }
        return;
    }

    console.log(`[CryptoDevTools Background] 使用请求密钥配置：${requestKeyConfig.name}, 响应密钥配置：${responseKeyConfig.name}`);

    // 使用工具类执行解密
    const { plainRequestBody, plainResponseBody, error } = await performDecryption({
        requestBody,
        responseBody,
        requestKeyConfig,
        responseKeyConfig
    });

    const decryptMessage = {
        type: "DECRYPTION_RESULT",
        requestId,
        request: {
            url,
            method,
            error:error,
            statusCode,
            requestBody,
            requestHeaders,
            responseBody,
            responseHeaders,
            plainRequestBody,
            plainResponseBody,
            requestConfig: requestKeyConfig,
            responseConfig: responseKeyConfig,
            domainConfig: matchedConfig
        }
    }
    
    // 发送解密结果，添加错误处理
    try {
        if (port && !port.error) {
            port.postMessage(decryptMessage);
        } else {
            console.warn('[CryptoDevTools Background] 端口已失效，无法发送解密结果');
        }
    } catch (postError) {
        console.error('[CryptoDevTools Background] 发送解密结果失败:', postError);
        // Extension context invalidated 错误，忽略或清理
    }

}

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

        console.log('[CryptoDevTools Background] 匹配结果:', matchedConfig ? matchedConfig.domain : '无匹配', url);
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
        await chrome.storage.local.set({decryptionConfigs: configs});
        decryptionConfigs = configs;
        console.log(`[CryptoDevTools Background] 保存了 ${configs.length} 个配置`);
    } catch (error) {
        throw new Error(`保存配置失败：${error.message}`);
    }
}

/**
 * 发送域名配置到代理服务器
 */
function sendDomainConfig() {
    if (!proxyWSClient || !proxyWSClient.isConnected()) {
        return;
    }
    
    try {
        // 提取所有启用的域名
       const enabledDomains = decryptionConfigs
            .filter(config => config.enabled)
            .map(config => config.domain)
            .filter(domain => domain); // 过滤掉空值
        
       console.log('[Background Domain Config] 发送域名配置:', enabledDomains);
        
        // 发送域名配置消息
       proxyWSClient.send('domain', {
            msgType: 'domain',
            domain: enabledDomains
        });
    } catch (error) {
       console.error('[Background Domain Config] 发送域名配置失败:', error);
    }
}

/**
 * 连接到代理 WebSocket服务器（使用新的客户端类）
 */
function connectToProxyWS() {
    try {
        const wsUrl = 'ws://127.0.0.1:8889/ws';
        console.log('[Background WS] 正在连接到代理 WebSocket:', wsUrl);
        
        // 创建新的 WebSocket 客户端实例
        proxyWSClient = new ProxyWebSocketClient(wsUrl);
        
        // 注册消息处理器
        proxyWSClient.on('proxy-request', async (message) => {
            console.log('[Background WS] 收到代理请求:', message.url);
            await handleProxyRequest(message);
        });

        proxyWSClient.on('REQUEST', async (message) => {
            console.log('[Background WS] 收到代理请求:', message.url);
            await handleProxyRequest(message);
        });

        proxyWSClient.on('RESPONSE', async (message) => {
            console.log('[Background WS] 收到代理请求:', message.url);
            await handleProxyRequest(message);
        });


        // 连接到服务器
        proxyWSClient.connect().catch(error => {
            console.error('[Background WS] 连接失败:', error);
        });
        
        // 更新旧的引用以保持兼容性
        wsProxyConnection = proxyWSClient.ws;
        
    } catch (error) {
        console.error('[Background WS] 连接失败:', error);
        // 失败后尝试重连
        if (!wsReconnectTimer) {
            wsReconnectTimer = setTimeout(() => {
                connectToProxyWS();
            }, 5000);
        }
    }
}

/**
 * 处理来自代理的请求（优化版本 - 支持 requestId 关联和解密）
 */
async function handleProxyRequest(requestData) {
    // 兼容两种格式：直接数据和嵌套在 data 字段中的数据
    if(!requestData || !requestData.url){
        console.log('[Background Proxy] 处理代理请求,无效消息:', JSON.stringify(requestData));
    }

    console.log('[Background Proxy] 处理代理请求:', requestData.url);
    
    // 检查是否有匹配的配置
    const matchedConfig = findMatchingConfig(requestData.url);
    if (!matchedConfig) {
        console.log('[Background Proxy] URL 不匹配任何配置，跳过');
        return;
    }
    
    // 查找密钥配置
    const requestKeyConfig = findKeyConfigById(matchedConfig.requestKeyConfigName);
    const responseKeyConfig = findKeyConfigById(matchedConfig.responseKeyConfigName);
    
    if (!requestKeyConfig || !responseKeyConfig) {
        console.warn('[Background Proxy] 未找到匹配的密钥配置');
        return;
    }
    
    // 加载 CipherUtils（由工具类内部使用）
    const cipherUtils = loadCipherUtils();
    
    // 使用工具类执行解密
    const { plainRequestBody, plainResponseBody, error } = await performDecryption({
        requestBody: requestData.requestBody || requestData.body,
        responseBody: requestData.responseBody || requestData.body,
        requestKeyConfig,
        responseKeyConfig
    });
    
    // 构建完整的请求对象（包含 requestId 用于关联）
    const fullRequest = {
        requestId: requestData.eventId || requestData.timestamp?.toString() || Date.now().toString(),
        url: requestData.url,
        method: requestData.method,
        requestHeaders: requestData.headers || {},
        responseHeaders: requestData.headers || {},
        requestBody: requestData.body || requestData.requestBody,
        responseBody: requestData.body || requestData.responseBody,
        plainRequestBody: plainRequestBody,
        plainResponseBody: plainResponseBody,
        statusCode: requestData.statusCode,
        timestamp: requestData.timestamp || Date.now(),
        requestConfig: requestKeyConfig,
        responseConfig: responseKeyConfig,
        domainConfig: matchedConfig
    };
    
    // 发送到所有连接的 DevTools Panel（Options 看板）
    devtoolsConnections.forEach((port, connectionId) => {
        try {
            // 检查连接是否仍然有效
            if (port && !port.error) {
                port.postMessage({
                    type: 'DECRYPTION_RESULT',
                    requestId: fullRequest.requestId,
                    request: fullRequest
                });
                console.log('[Background Proxy] 已发送解密结果到 Panel:', fullRequest.requestId);
            } else {
                console.warn('[Background Proxy] 连接已失效，移除:', connectionId);
                devtoolsConnections.delete(connectionId);
            }
        } catch (error) {
            // Extension context invalidated 错误，移除失效的连接
            console.warn('[Background Proxy] 发送消息失败，连接可能已失效:', error.message);
            devtoolsConnections.delete(connectionId);
        }
    });
    
    // 发送到所有连接的 Options 请求查看器
    optionsViewerConnections.forEach((port, connectionId) => {
        try {
            // 检查连接是否仍然有效
            if (port && !port.error) {
                port.postMessage({
                    type: 'DECRYPTION_RESULT',
                    requestId: fullRequest.requestId,
                    request: fullRequest
                });
                console.log('[Background Proxy] 已发送解密结果到 Options 查看器:', fullRequest.requestId);
            } else {
                console.warn('[Background Proxy] Options 查看器连接已失效，移除:', connectionId);
                optionsViewerConnections.delete(connectionId);
            }
        } catch (error) {
            console.warn('[Background Proxy] 发送消息到 Options 查看器失败:', error.message);
            optionsViewerConnections.delete(connectionId);
        }
    });
    
    console.log('[Background Proxy] 解密结果已发送到 Options 看板');
}

// 启动初始化
initialize().catch(error => {
    console.error('[CryptoDevTools Background] 初始化失败:', error);
});
  
