// Background Service Worker 入口文件
// 使用 IIFE 格式避免 ES6 模块语法问题

// 动态导入 CipherUtils
// 静态导入 CipherUtils 以避免动态导入问题
import { CipherUtils } from '../utils/cipher/index.js';

// 存储 DevTools 连接
const devtoolsConnections = new Map();

// 初始化
async function initialize() {
    console.log('[CryptoDevTools Background] 初始化开始');

    // 设置监听器
    setupMessageListeners();

    console.log('[CryptoDevTools Background] 初始化完成');
}

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
        } else {
            console.log('[CryptoDevTools Background] 未知端口类型:', port.name);
        }
    });

    // 监听快捷键命令
    chrome.commands.onCommand.addListener((command) => {
        console.log('[CryptoDevTools Background] 收到快捷键命令:', command);
        
        if (command === 'open-options-page') {
            // 打开 Options 页面
            chrome.tabs.create({
                url: chrome.runtime.getURL('options.html')
            }, (tab) => {
                console.log('[CryptoDevTools Background] Options 页面已打开:', tab.id);
            });
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

// 处理 DevTools 消息
async function handleDevToolsMessage(message, port) {
    switch (message.type) {
        case 'DEVTOOLS_NETWORK_DATA':
            await handleNetworkData(message, port);
            break;

        case 'CHECK_CONFIG_MATCH':
            // RequestListViewer 现在自己处理配置匹配，这里可以返回空或者移除
            console.log('[CryptoDevTools Background] CHECK_CONFIG_MATCH 已废弃');
            break;
    }
}

// 处理网络数据（仅用于 DevTools Panel）
async function handleNetworkData(message, port) {
    const {requestId, url, method, requestBody,requestHeaders, responseBody,responseHeaders, statusCode} = message;

    console.log('[CryptoDevTools Background] 收到 DevTools 网络数据:', requestId);
    
    // 注意：实际的解密和 WebSocket 连接现在由 RequestListViewer 组件处理
    // 这里只负责转发到 DevTools Panel
    try {
        if (port && !port.error) {
            port.postMessage({
                type: "DECRYPTION_RESULT",
                requestId,
                request: {
                    url,
                    method,
                    statusCode,
                    requestBody,
                    requestHeaders,
                    responseBody,
                    responseHeaders
                }
            });
        }
    } catch (error) {
        console.error('[CryptoDevTools Background] 发送消息到 DevTools Panel 失败:', error);
    }
}

// 启动初始化
initialize().catch(error => {
    console.error('[CryptoDevTools Background] 初始化失败:', error);
});
