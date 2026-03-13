/**
 * Whistle Plugin for PasteKit
 * 
 * 使用方法：
 * 1. 安装 whistle: npm install -g whistle
 * 2. 安装 whistle-ws 插件：npm install -g whistle-ws
 * 3. 启动 whistle: w2 start
 * 4. 在 whistle 界面添加以下规则
 */

// ==================== Whistle 规则配置 ====================
// 在 whistle 的 Rules 中添加以下内容：
/*
# PasteKit Proxy Rules
ws://localhost:8899/plugin pasteKitProxy

# 拦截所有 HTTP/HTTPS 请求
http://*.* pasteKitProxy
https://*.* pasteKitProxy

# 或者只拦截特定域名
# http://api.example.com/* pasteKitProxy
# https://api.example.com/* pasteKitProxy
*/

// ==================== 插件实现 ====================
const CONFIG = {
    wsUrl: 'ws://localhost:8899', // WebSocket 服务器地址
    logEnabled: true,
    enabled: true
};

let websocket = null;
let isConnected = false;
let requestMap = new Map();

// 工具函数
function log(message) {
    if (CONFIG.logEnabled) {
        console.log('[PasteKit] ' + message);
    }
}

function generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function bufferToBase64(buffer) {
    try {
        return buffer.toString('base64');
    } catch (e) {
        log('Base64 编码失败：' + e.message);
        return null;
    }
}

function base64ToBuffer(base64) {
    try {
        return Buffer.from(base64, 'base64');
    } catch (e) {
        log('Base64 解码失败：' + e.message);
        return null;
    }
}

function getStringFromBuffer(buffer) {
    try {
        const result = buffer.toString('utf8');
        // 检查是否包含不可打印字符
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(result)) {
            return null; // 二进制数据
        }
        return result;
    } catch (e) {
        return null;
    }
}

// WebSocket 连接
function connectWebSocket() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        log('WebSocket 已连接');
        return;
    }

    try {
        const WebSocketClient = require('ws');
        websocket = new WebSocketClient(CONFIG.wsUrl);

        websocket.on('open', () => {
            isConnected = true;
            log('WebSocket 连接成功');
            
            // 发送握手消息
            sendMessage({
                type: 'handshake',
                plugin: 'whistle',
                version: '1.0.0',
                timestamp: Date.now()
            });
        });

        websocket.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                handleServerMessage(message);
            } catch (error) {
                log('消息解析失败：' + error.message);
            }
        });

        websocket.on('error', (error) => {
            log('WebSocket 错误：' + error.message);
            isConnected = false;
        });

        websocket.on('close', () => {
            log('WebSocket 连接关闭');
            isConnected = false;
            
            // 自动重连
            setTimeout(connectWebSocket, 5000);
        });

    } catch (error) {
        log('创建 WebSocket 失败：' + error.message);
        setTimeout(connectWebSocket, 5000);
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
            // 心跳响应
            break;
        default:
            log('未知消息类型：' + message.type);
    }
}

// Whistle 插件导出
module.exports = {
    /**
     * 处理请求
     */
    '*': async function (req, res, next) {
        if (!CONFIG.enabled) {
            return next();
        }

        const requestId = generateRequestId();
        
        // 保存请求信息
        requestMap.set(requestId, {
            req: req,
            startTime: Date.now()
        });

        const url = req.url;
        const method = req.method;
        const headers = req.headers;
        
        // 获取请求体
        let body = null;
        let bodyBase64 = null;
        
        if (req.body) {
            body = getStringFromBuffer(req.body);
            bodyBase64 = bufferToBase64(req.body);
        }

        const requestData = {
            requestId: requestId,
            url: url,
            method: method,
            headers: headers,
            body: body,
            bodyBase64: bodyBase64,
            timestamp: Date.now(),
            plugin: 'whistle'
        };

        log('拦截请求：' + method + ' ' + url);

        // 发送到 WebSocket 服务器
        sendMessage({
            type: 'request',
            data: requestData
        });

        next();
    },

    /**
     * 处理响应
     */
    '*': async function (req, res, next) {
        if (!CONFIG.enabled) {
            return next();
        }

        const url = req.url;
        const statusCode = res.statusCode;
        const headers = res.headers;
        
        // 获取响应体
        let body = null;
        let bodyBase64 = null;
        
        if (res.body) {
            body = getStringFromBuffer(res.body);
            bodyBase64 = bufferToBase64(res.body);
        }

        const responseData = {
            requestId: null, // Whistle 中较难关联 requestId
            url: url,
            statusCode: statusCode,
            headers: headers,
            body: body,
            bodyBase64: bodyBase64,
            timestamp: Date.now(),
            plugin: 'whistle'
        };

        log('拦截响应：' + statusCode + ' ' + url);

        // 发送到 WebSocket 服务器
        sendMessage({
            type: 'response',
            data: responseData
        });

        next();
    }
};

// ==================== 初始化 ====================
log('Whistle 插件初始化...');
log('WebSocket 地址：' + CONFIG.wsUrl);

// 启动 WebSocket 连接
connectWebSocket();

// 定时发送心跳
setInterval(() => {
    if (isConnected) {
        sendMessage({
            type: 'ping',
            timestamp: Date.now()
        });
    }
}, 30000);

log('Whistle 插件已就绪');
