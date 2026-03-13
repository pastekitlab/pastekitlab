/**
 * Charles Proxy Plugin for PasteKit
 * 
 * 使用方法：
 * 1. 在 Charles 中打开 Scripting Extension
 * 2. 添加此脚本为 JavaScript 类型
 * 3. 配置 WebSocket 地址
 * 4. 启用拦截
 */

// ==================== 配置区域 ====================
const CONFIG = {
    wsUrl: 'ws://localhost:8899', // 修改为你的服务器地址
    autoReconnect: true,
    reconnectInterval: 5000,
    logEnabled: true
};

// ==================== 全局变量 ====================
let websocket = null;
let isConnected = false;
let requestMap = new Map();

// ==================== 工具函数 ====================
function log(message) {
    if (CONFIG.logEnabled) {
        console.log('[PasteKit] ' + message);
    }
}

function generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// ==================== WebSocket 连接 ====================
function connectWebSocket() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        log('WebSocket 已连接');
        return;
    }

    try {
        websocket = new WebSocket(CONFIG.wsUrl);

        websocket.onopen = function(event) {
            isConnected = true;
            log('WebSocket 连接成功');
            
            // 发送握手消息
            sendMessage({
                type: 'handshake',
                plugin: 'charles',
                version: '1.0.0',
                timestamp: Date.now()
            });
        };

        websocket.onmessage = function(event) {
            try {
                const message = JSON.parse(event.data);
                handleServerMessage(message);
            } catch (error) {
                log('消息解析失败：' + error.message);
            }
        };

        websocket.onerror = function(error) {
            log('WebSocket 错误：' + error);
            isConnected = false;
        };

        websocket.onclose = function() {
            log('WebSocket 连接关闭');
            isConnected = false;
            
            if (CONFIG.autoReconnect) {
                log('将在 ' + CONFIG.reconnectInterval + 'ms 后重连...');
                setTimeout(connectWebSocket, CONFIG.reconnectInterval);
            }
        };

    } catch (error) {
        log('创建 WebSocket 失败：' + error.message);
        if (CONFIG.autoReconnect) {
            setTimeout(connectWebSocket, CONFIG.reconnectInterval);
        }
    }
}

function sendMessage(message) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(message));
    } else {
        log('WebSocket 未连接，消息发送失败');
    }
}

function handleServerMessage(message) {
    log('收到服务器消息：' + message.type);
    
    switch (message.type) {
        case 'connected':
            log('服务器确认连接，客户端 ID: ' + message.clientId);
            break;
        case 'pong':
            // 心跳响应，忽略
            break;
        default:
            log('未知消息类型：' + message.type);
    }
}

// ==================== Charles 拦截函数 ====================

/**
 * 拦截请求
 */
function request(context) {
    const requestId = generateRequestId();
    
    // 保存请求信息
    requestMap.set(requestId, {
        context: context,
        startTime: Date.now()
    });

    const url = context.url;
    const method = context.method;
    const headers = context.requestHeaders || {};
    
    // 获取请求体
    let body = null;
    let bodyBase64 = null;
    
    if (context.requestBody && context.requestBody.length > 0) {
        body = context.requestBody;
        try {
            // 尝试转换为 Base64
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(body);
            bodyBase64 = arrayBufferToBase64(uint8Array.buffer);
        } catch (e) {
            log('请求体编码失败：' + e.message);
        }
    }

    const requestData = {
        requestId: requestId,
        url: url,
        method: method,
        headers: headers,
        body: body,
        bodyBase64: bodyBase64,
        timestamp: Date.now(),
        plugin: 'charles'
    };

    log('拦截请求：' + method + ' ' + url);

    // 发送到 WebSocket 服务器
    sendMessage({
        type: 'request',
        data: requestData
    });

    // 继续请求（不修改）
    return context;
}

/**
 * 拦截响应
 */
function response(context) {
    const requestId = context.userContext ? context.userContext.requestId : null;
    
    // 如果没有 requestId，尝试从 URL 匹配
    const url = context.url;
    const statusCode = context.responseStatus || 200;
    const headers = context.responseHeaders || {};
    
    // 获取响应体
    let body = null;
    let bodyBase64 = null;
    
    if (context.responseBody && context.responseBody.length > 0) {
        body = context.responseBody;
        try {
            // 尝试转换为 Base64
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(body);
            bodyBase64 = arrayBufferToBase64(uint8Array.buffer);
        } catch (e) {
            log('响应体编码失败：' + e.message);
        }
    }

    const responseData = {
        requestId: requestId,
        url: url,
        statusCode: statusCode,
        headers: headers,
        body: body,
        bodyBase64: bodyBase64,
        timestamp: Date.now(),
        plugin: 'charles'
    };

    log('拦截响应：' + statusCode + ' ' + url);

    // 发送到 WebSocket 服务器
    sendMessage({
        type: 'response',
        data: responseData
    });

    // 继续响应（不修改）
    return context;
}

// ==================== 初始化 ====================
log('Charles 插件初始化...');
log('WebSocket 地址：' + CONFIG.wsUrl);

// 启动 WebSocket 连接
connectWebSocket();

// 定时发送心跳
setInterval(function() {
    if (isConnected) {
        sendMessage({
            type: 'ping',
            timestamp: Date.now()
        });
    }
}, 30000);

log('Charles 插件已就绪');
