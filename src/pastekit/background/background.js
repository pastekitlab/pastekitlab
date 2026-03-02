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
        return;
    }
    
    if (!responseKeyConfig) {
        console.warn(`[CryptoDevTools Background] 未找到响应密钥配置：${matchedConfig.responseKeyConfigName}`);
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
        return;
    }

    console.log(`[CryptoDevTools Background] 使用请求密钥配置：${requestKeyConfig.name}, 响应密钥配置：${responseKeyConfig.name}`);

    // 加载 CipherUtils
    const cipherUtils = loadCipherUtils();


    // 执行解密
    let plainRequestBody = null;
    let plainResponseBody = null;
    let error = null;
    try {
        // 处理响应体 - 使用响应密钥配置
        if (responseBody) {
            const responseEncoding = detectContentEncoding(responseBody);
            console.log(`[Background] 响应体编码类型：${responseEncoding}`);
            
            if (['HEX', 'BASE64', 'BASE64_URLSAFE'].includes(responseEncoding)) {
                // 直接解密编码格式的数据
                plainResponseBody = cipherUtils.decrypt(responseBody, responseKeyConfig);
                console.info(`[Background] 直接解密响应体成功：${responseBody.substring(0, 50)}... -> ${plainResponseBody?.substring(0, 50)}...`);
            } else if (responseEncoding === 'JSON') {
                // JSON 格式，查找并解密其中的编码值
                try {
                    const jsonObj = JSON.parse(responseBody);
                    const decryptedObj = findAndDecryptEncodedValues(jsonObj, responseKeyConfig, cipherUtils);
                    plainResponseBody = JSON.stringify(decryptedObj, null, 2);
                    console.info(`[Background] JSON 响应体处理完成`);
                } catch (jsonError) {
                    console.warn(`[Background] JSON 解析失败，跳过响应体处理:`, jsonError.message);
                    plainResponseBody = responseBody; // 保持原值
                }
            } else {
                // 其他格式，尝试直接解密
                try {
                    plainResponseBody = cipherUtils.decrypt(responseBody, responseKeyConfig);
                    console.info(`[Background] 尝试直接解密响应体：${responseBody.substring(0, 50)}... -> ${plainResponseBody?.substring(0, 50)}...`);
                } catch (decryptError) {
                    console.log(`[Background] 响应体直接解密失败，保持原值:`, decryptError.message);
                    plainResponseBody = responseBody; // 解密失败时保持原值
                }
            }
        }
        
        // 对解密后的明文结果进行 JSON 美化
        if (plainResponseBody) {
            try {
                // 尝试解析为 JSON 并美化
                const parsed = JSON.parse(plainResponseBody);
                plainResponseBody = JSON.stringify(parsed, null, 2);
                console.info(`[Background] 响应体明文 JSON 美化完成`);
            } catch (beautifyError) {
                // 不是有效的 JSON，保持原值
                console.debug(`[Background] 响应体明文不是 JSON 格式，跳过美化`);
            }
        }
        
        // 处理请求体 - 使用请求密钥配置
        if (requestBody) {
            const requestEncoding = detectContentEncoding(requestBody);
            console.log(`[Background] 请求体编码类型：${requestEncoding}`);
            
            if (['HEX', 'BASE64', 'BASE64_URLSAFE'].includes(requestEncoding)) {
                // 直接解密编码格式的数据
                plainRequestBody = cipherUtils.decrypt(requestBody, requestKeyConfig);
                // 检查解密结果是否为 JSON 格式，如果是则美化
                if (plainRequestBody && detectContentEncoding(plainRequestBody) === 'JSON') {
                    try {
                        // 尝试解析为 JSON 并美化
                        const parsed = JSON.parse(plainRequestBody);
                        plainRequestBody = JSON.stringify(parsed, null, 2);
                        console.info(`[Background] 响应体明文 JSON 美化完成`);
                    } catch (beautifyError) {
                        // 不是有效的 JSON，保持原值
                        console.debug(`[Background] 响应体明文不是 JSON 格式，跳过美化`);
                    }
                }
                console.info(`[Background] 直接解密请求体成功：${requestBody.substring(0, 50)}... -> ${plainRequestBody?.substring(0, 50)}...`);
            } else if (requestEncoding === 'JSON') {
                // JSON 格式，查找并解密其中的编码值
                try {
                    const jsonObj = JSON.parse(requestBody);
                    const decryptedObj = findAndDecryptEncodedValues(jsonObj, requestKeyConfig, cipherUtils);
                    plainRequestBody = JSON.stringify(decryptedObj, null, 2);
                    console.info(`[Background] JSON 请求体处理完成`);
                } catch (jsonError) {
                    console.warn(`[Background] JSON 解析失败，跳过请求体处理:`, jsonError.message);
                    plainRequestBody = requestBody; // 保持原值
                }
            } else {
                // 其他格式，尝试直接解密
                try {
                    plainRequestBody = cipherUtils.decrypt(requestBody, requestKeyConfig);
                    // 检查解密结果是否为 JSON 格式，如果是则美化
                    console.info(`[Background] 尝试直接解密请求体：${requestBody.substring(0, 50)}... -> ${plainRequestBody?.substring(0, 50)}...`);
                } catch (decryptError) {
                    console.log(`[Background] 请求体直接解密失败，保持原值:`, decryptError.message);
                    plainRequestBody = requestBody; // 解密失败时保持原值
                }
            }
        }
        
        // 对解密后的明文结果进行 JSON 美化
        if (plainRequestBody) {
            try {
                // 尝试解析为 JSON 并美化
                const parsed = JSON.parse(plainRequestBody);
                plainRequestBody = JSON.stringify(parsed, null, 2);
                console.info(`[Background] 请求体明文 JSON 美化完成`);
            } catch (beautifyError) {
                // 不是有效的 JSON，保持原值
                console.debug(`[Background] 请求体明文不是 JSON 格式，跳过美化`);
            }
        }
    } catch (error) {
        console.error('[CryptoDevTools Background] 解密过程中发生错误:', error);
        console.error('[CryptoDevTools Background] 错误详情:', {
            url: url,
            method: method,
            statusCode: statusCode,
            requestBodyLength: requestBody?.length || 0,
            responseBodyLength: responseBody?.length || 0,
            requestKeyConfigName: requestKeyConfig?.name,
            responseKeyConfigName: responseKeyConfig?.name,
            algorithm: requestKeyConfig?.algorithm,
            mode: requestKeyConfig?.mode,
            errorStack: error.stack
        });
        
        // 发送错误信息
        error='解密失败：' + error.message;
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
            requestConfig: requestKeyConfig,
            responseConfig: responseKeyConfig,
            domainConfig: matchedConfig
        }
    }
    port.postMessage(decryptMessage);

}

// 检测内容编码类型
function detectContentEncoding(content) {
    if (!content || typeof content !== 'string') {
        return 'UNKNOWN';
    }
    
    const trimmed = content.trim();
    
    // 检测Hex格式 (只包含0-9, a-f, A-F且长度为偶数)
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
        return 'HEX';
    }
    
    // 检测Base64格式
    if (/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed) && trimmed.length % 4 === 0) {
        // 进一步验证Base64字符范围
        if (/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed)) {
            return 'BASE64';
        }
    }
    
    // 检测Base64 URL安全格式
    if (/^[-_A-Za-z0-9]*=?=?$/.test(trimmed)) {
        return 'BASE64_URLSAFE';
    }
    
    // 检测JSON格式
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            JSON.parse(trimmed);
            return 'JSON';
        } catch (e) {
            // 不是有效的JSON
        }
    }
    
    return 'PLAIN';
}

// 在JSON中查找编码值并解密
function findAndDecryptEncodedValues(obj, keyConfig, cipherUtils) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    
    const result = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            const encodingType = detectContentEncoding(value);
            if (['HEX', 'BASE64', 'BASE64_URLSAFE'].includes(encodingType)) {
                try {
                    // 尝试解密
                    const decrypted = cipherUtils.decrypt(value, keyConfig);
                    if (decrypted && decrypted !== value) {
                        result[key] = decrypted;
                        console.log(`[Background] 成功解密JSON字段 ${key}: ${value.substring(0, 30)}... -> ${decrypted.substring(0, 30)}...`);
                        if(detectContentEncoding(decrypted)==='JSON'){
                            return JSON.parse(decrypted)
                        }
                        continue;
                    }
                } catch (decryptError) {
                    console.log(`[Background] JSON字段 ${key} 解密失败:`, decryptError.message);
                }
            }
            // 如果不是编码格式或解密失败，保持原值
            result[key] = value;
        } else {
            result[key] = value;
        }
    }
    return result;
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
        throw new Error(`保存配置失败: ${error.message}`);
    }
}

// 启动初始化
initialize().catch(error => {
    console.error('[CryptoDevTools Background] 初始化失败:', error);
});
  
