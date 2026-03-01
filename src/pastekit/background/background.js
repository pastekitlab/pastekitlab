// Background Service Worker 入口文件
// 使用 IIFE 格式避免 ES6 模块语法问题

// 动态导入CipherUtils
// 静态导入 CipherUtils 以避免动态导入问题
import { CipherUtils } from '../utils/cipher/cipherutils.js';

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

// 初始化
async function initialize() {
    console.log('[CryptoDevTools Background] 初始化开始');

    // 加载配置
    await loadDecryptionConfigs();
    await loadKeyConfigs();  // 加载密钥配置

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

    chrome.runtime.onConnect.addListener((port) => {
        console.log('[CryptoDevTools Background] 收到连接请求，端口名称:', port.name);
        console.log('[CryptoDevTools Background] 连接参数:', port);
        if (port.name === 'devtools-panel') {
            console.log('[CryptoDevTools Background] 处理 DevTools 面板连接');
            handleDevToolsConnection(port);
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
        console.log('[CryptoDevTools Background] 收到来自Panel的消息（无tabId）:', message.type);
        handleDevToolsMessage(message, port, connectionId);
    });

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

// 处理 DevTools 消息
async function handleDevToolsMessage(message, port) {
    switch (message.type) {
        case 'DEVTOOLS_NETWORK_DATA':
            await handleNetworkData(message, port);
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

// 处理网络数据
async function handleNetworkData(message, port) {
    const {requestId, url, method, requestBody,requestHeaders, responseBody,responseHeaders, statusCode} = message;

    // 检查是否有匹配的配置
    const matchedConfig = findMatchingConfig(url);
    if (!matchedConfig) {
        console.log(`[CryptoDevTools Background] URL 不匹配任何配置: ${url}`);
        return;
    }

    console.log(`[CryptoDevTools Background] 发现匹配配置: ${JSON.stringify(matchedConfig)}`);

    // 根据匹配配置中的keyConfigId查找实际的密钥配置
    const keyConfig = findKeyConfigById(matchedConfig.keyConfigName);
    if (!keyConfig) {
        console.warn(`[CryptoDevTools Background] 未找到ID为 ${matchedConfig.keyConfigName} 的密钥配置`);
        // 发送错误信息到 DevTools 面板
        port.postMessage({
            type: "DECRYPTION_RESULT",
            requestId,
            error: `未找到对应的密钥配置: ${matchedConfig.keyConfigName}`,
            request: {
                url,
                method,
                statusCode,
                requestBody,
                responseBody
            }
        });
        return;
    }

    console.log(`[CryptoDevTools Background] 使用密钥配置: ${keyConfig.name}`);

    // 加载CipherUtils
    const cipherUtils = loadCipherUtils();


    // 执行解密
    let plainRequestBody = null;
    let plainResponseBody = null;
    let error = null;
    try {
        if (responseBody) {
            plainResponseBody = cipherUtils.decrypt(responseBody, keyConfig);
        }
        console.info(`'解密成功， plainResponseBody:${plainResponseBody}，${responseBody}'`);

        if (requestBody) {
            plainRequestBody = cipherUtils.decrypt(requestBody, keyConfig);
        }

        console.info(`'解密成功，plainRequestBody:${plainRequestBody} ${requestBody}'`);
    } catch (error) {
        console.error('[CryptoDevTools Background] 解密过程中发生错误:', error);
        console.error('[CryptoDevTools Background] 错误详情:', {
            url: url,
            method: method,
            statusCode: statusCode,
            requestBodyLength: requestBody?.length || 0,
            responseBodyLength: responseBody?.length || 0,
            keyConfigName: keyConfig?.name,
            algorithm: keyConfig?.algorithm,
            mode: keyConfig?.mode,
            errorStack: error.stack
        });
        
        // 发送错误信息
        error='解密失败: ' + error.message;
    }

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
            config: keyConfig,
            domainConfig: matchedConfig
        }
    }
    port.postMessage(decryptMessage);

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
        throw new Error(`保存配置失败: ${error.message}`);
    }
}

// 启动初始化
initialize().catch(error => {
    console.error('[CryptoDevTools Background] 初始化失败:', error);
});
  
