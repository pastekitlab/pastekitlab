/**
 * WebSocket Client for Proxy Server
 * 连接到代理服务器并发送/接收消息
 */

export class ProxyWebSocketClient {
    constructor(url = 'ws://127.0.0.1:8889') {
        this.url = url;
        this.ws = null;
        this.reconnectTimer = null;
        this.reconnectInterval = 5000; // 5 秒重连间隔
        this.messageHandlers = new Map();
        this.connected = false;
    }

    /**
     * 连接到 WebSocket服务器
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log('[ProxyWS Client] 正在连接到:', this.url);
                
                this.ws = new WebSocket(this.url);
                
                this.ws.onopen = () => {
                    this.connected = true;
                    console.log('[ProxyWS Client] 已连接到代理 WebSocket服务器');
                    
                    if (this.reconnectTimer) {
                        clearTimeout(this.reconnectTimer);
                        this.reconnectTimer = null;
                    }
                    
                    resolve();
                };
                
                this.ws.onmessage = async (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log('[ProxyWS Client] 收到消息:', JSON.stringify(message));
                        
                        // 调用对应的处理器
                        if (this.messageHandlers.has(message.type)) {
                            const handlers = this.messageHandlers.get(message.type);
                            handlers.forEach(handler => handler(message));
                        }
                        
                        // 通用消息处理
                        await this.handleMessage(message);
                    } catch (error) {
                        console.error('[ProxyWS Client] 解析消息失败:', error);
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error('[ProxyWS Client] 连接错误:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    this.connected = false;
                    console.log('[ProxyWS Client] 连接关闭，准备重连...');
                    
                    // 自动重连
                    if (!this.reconnectTimer) {
                        this.reconnectTimer = setTimeout(() => {
                            console.log('[ProxyWS Client] 尝试重新连接');
                            this.connect().catch(err => {
                                console.error('[ProxyWS Client] 重连失败:', err);
                            });
                        }, this.reconnectInterval);
                    }
                };
                
            } catch (error) {
                console.error('[ProxyWS Client] 连接失败:', error);
                reject(error);
            }
        });
    }

    /**
     * 处理来自服务器的消息
     */
    async handleMessage(message) {
        switch (message.type) {
            case 'connected':
                console.log('[ProxyWS Client] 服务器欢迎消息，客户端 ID:', message.clientId);
                break;
                
            case 'REQUEST':
                console.log('[ProxyWS Client] 收到代理请求:', JSON.stringify(message));
                // 可以在这里处理代理请求
                break;
                
            case 'RESPONSE':
                console.log('[ProxyWS Client] 收到代理响应:', JSON.stringify(message));
                // 可以在这里处理代理响应
                break;
                
            case 'pong':
                console.log('[ProxyWS Client] 心跳响应，服务器时间:', new Date(message.timestamp));
                break;
                
            default:
                console.warn('[ProxyWS Client] 未知消息类型:', message.type);
        }
    }

    /**
     * 发送消息到服务器
     */
    send(messageType, data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('[ProxyWS Client] 无法发送消息：未连接');
            return false;
        }
        
        const message = {
            type: messageType,
            data: data,
            timestamp: Date.now()
        };
        
        try {
            this.ws.send(JSON.stringify(message));
            console.log('[ProxyWS Client] 已发送消息:', messageType);
            return true;
        } catch (error) {
            console.error('[ProxyWS Client] 发送消息失败:', error);
            return false;
        }
    }

    /**
     * 发送请求数据
     */
    sendRequest(requestData) {
        return this.send('request', requestData);
    }

    /**
     * 发送响应数据
     */
    sendResponse(responseData) {
        return this.send('response', responseData);
    }

    /**
     * 发送心跳
     */
    ping() {
        return this.send('ping', {});
    }

    /**
     * 注册消息处理器
     */
    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
        
        // 返回取消注册的函数
        return () => {
            const handlers = this.messageHandlers.get(messageType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        };
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
            console.log('[ProxyWS Client] 已断开连接');
        }
    }

    /**
     * 检查连接状态
     */
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}
