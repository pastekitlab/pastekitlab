# WebSocket 客户端使用指南

## 概述

本项目实现了完整的 WebSocket 客户端功能，用于连接代理服务器 `ws://127.0.0.1:8889` 并发送/接收消息。

## 文件结构

```
src/pastekit/proxy/
├── ws-server.js           # WebSocket服务器（端口 8889）
├── ws-client.js          # WebSocket 客户端类
├── ws-client-example.js  # 使用示例代码
├── ws-client-test.html   # 浏览器测试页面
└── test-ws-client.js     # Node.js 测试脚本
```

## 快速开始

### 1. 启动WebSocket服务器

```bash
npm run proxy-server
```

这将启动监听端口 8889 的 WebSocket服务器。

### 2. 使用 Node.js 测试客户端

```bash
npm run ws-client-test
```

这会自动连接到 `ws://127.0.0.1:8889` 并发送测试消息。

或者指定其他地址：
```bash
node src/pastekit/proxy/test-ws-client.js ws://localhost:8889
```

### 3. 在浏览器中测试

打开 `src/pastekit/proxy/ws-client-test.html` 文件到浏览器中，点击"连接"按钮即可。

## 使用方法

### 方式一：使用 ProxyWebSocketClient 类

```javascript
import { ProxyWebSocketClient } from './ws-client.js';

// 创建客户端实例
const client = new ProxyWebSocketClient('ws://127.0.0.1:8889');

// 注册消息处理器
client.on('connected', (message) => {
    console.log('已连接:', message.clientId);
});

client.on('proxy-request', (message) => {
    console.log('收到代理请求:', message.data?.url);
});

client.on('proxy-response', (message) => {
    console.log('收到代理响应:', message.data?.url);
});

// 连接到服务器
await client.connect();

// 发送消息
client.sendRequest({
    url: 'https://api.example.com/data',
   method: 'GET'
});

client.sendResponse({
    url: 'https://api.example.com/data',
   statusCode: 200,
    body: JSON.stringify({ data: 'test' })
});

// 发送心跳
client.ping();

// 断开连接
client.disconnect();
```

### 方式二：直接使用 WebSocket API（浏览器环境）

```javascript
const ws = new WebSocket('ws://127.0.0.1:8889');

ws.onopen = () => {
    console.log('已连接');
    
    // 发送消息
    ws.send(JSON.stringify({
        type: 'request',
        data: {
            url: 'https://api.example.com/test',
           method: 'POST',
            body: 'test data'
        },
        timestamp: Date.now()
    }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('收到消息:', message);
};

ws.onerror = (error) => {
    console.error('连接错误:', error);
};
```

### 方式三：使用 Node.js ws 库

```javascript
import { WebSocket } from 'ws';

const ws = new WebSocket('ws://127.0.0.1:8889');

ws.on('open', () => {
    console.log('已连接');
    
    ws.send(JSON.stringify({
        type: 'request',
        data: {
            url: 'https://api.example.com/test',
           method: 'GET'
        },
        timestamp: Date.now()
    }));
});

ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('收到消息:', message);
});

ws.on('error', (error) => {
    console.error('连接错误:', error);
});
```

## 消息格式

### 客户端发送的消息

#### 1. 请求消息
```json
{
  "type": "request",
  "data": {
    "url": "https://api.example.com/users",
    "method": "GET",
    "headers": {
      "Accept": "application/json"
    },
    "timestamp": 1234567890
  }
}
```

#### 2. 响应消息
```json
{
  "type": "response",
  "data": {
    "url": "https://api.example.com/users",
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"users\": []}",
    "timestamp": 1234567890
  }
}
```

#### 3. 心跳消息
```json
{
  "type": "ping",
  "timestamp": 1234567890
}
```

#### 4. 解密请求
```json
{
  "type": "decrypt",
  "data": {
    "requestId": "test-123",
    "algorithm": "AES",
    "mode": "CBC",
    "encryptedData": "U2FtcGxlRW5jcnlwdGVkRGF0YQ==",
    "key": "sample-key"
  },
  "timestamp": 1234567890
}
```

### 服务器返回的消息

#### 1. 连接成功
```json
{
  "type": "connected",
  "clientId": "127.0.0.1:12345",
  "timestamp": 1234567890
}
```

#### 2. 心跳响应
```json
{
  "type": "pong",
  "timestamp": 1234567890
}
```

#### 3. 代理请求转发
```json
{
  "type": "proxy-request",
  "data": {
    "url": "https://api.example.com/data",
    "method": "POST",
    "body": "encrypted-data"
  },
  "timestamp": 1234567890
}
```

#### 4. 代理响应转发
```json
{
  "type": "proxy-response",
  "data": {
    "url": "https://api.example.com/data",
    "statusCode": 200,
    "body": "encrypted-response"
  },
  "timestamp": 1234567890
}
```

## 功能特性

### ProxyWebSocketClient 类提供的方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `connect()` | 连接到服务器 | 无 | Promise |
| `disconnect()` | 断开连接 | 无 | void |
| `send(type, data)` | 发送自定义消息 | type: 消息类型，data: 消息数据 | boolean |
| `sendRequest(requestData)` | 发送请求消息 | requestData: 请求数据对象 | boolean |
| `sendResponse(responseData)` | 发送响应消息 | responseData: 响应数据对象 | boolean |
| `ping()` | 发送心跳 | 无 | boolean |
| `on(type, handler)` | 注册消息处理器 | type: 消息类型，handler: 处理函数 | 取消注册函数 |
| `isConnected()` | 检查连接状态 | 无 | boolean |

### 自动重连

客户端内置自动重连机制：
- 当连接断开时，会在 5 秒后自动尝试重连
- 重连间隔可通过 `reconnectInterval` 属性配置

### 消息处理器

可以为不同类型的消息注册处理器：

```javascript
// 注册处理器
const unregister = client.on('connected', (message) => {
    console.log('连接成功:', message);
});

// 取消注册
unregister();
```

## 集成到 Background Service

在 Chrome 扩展的 background.js 中使用：

```javascript
import { ProxyWebSocketClient } from '../proxy/ws-client.js';

let proxyWSClient = null;

function connectToProxy() {
    proxyWSClient = new ProxyWebSocketClient('ws://127.0.0.1:8889');
    
    // 注册处理器
    proxyWSClient.on('proxy-request', async (message) => {
        await handleProxyRequest(message.data);
    });
    
    // 连接
    await proxyWSClient.connect();
}

// 定期发送心跳
setInterval(() => {
    if (proxyWSClient && proxyWSClient.isConnected()) {
        proxyWSClient.ping();
    }
}, 30000);
```

## 调试技巧

1. **查看连接状态**
   ```javascript
   console.log('连接状态:', client.isConnected());
   ```

2. **启用详细日志**
   客户端会自动输出详细的连接和消息日志。

3. **监控消息流量**
   使用 `on()` 方法注册所有消息类型的处理器来监控流量。

4. **测试连接**
   ```bash
   # 先启动服务器
   npm run proxy-server
   
   # 再启动客户端测试
   npm run ws-client-test
   ```

## 常见问题

### Q: 连接失败怎么办？
A: 
1. 确保 WebSocket服务器已启动：`npm run proxy-server`
2. 检查端口 8889 是否被占用
3. 确认防火墙允许本地连接

### Q: 如何更改连接的端口？
A: 
```javascript
const client = new ProxyWebSocketClient('ws://127.0.0.1:9999');
```

或在命令行中指定：
```bash
node test-ws-client.js ws://localhost:9999
```

### Q: 如何停止自动重连？
A: 
调用 `disconnect()` 方法会清除重连定时器：
```javascript
client.disconnect();
```

### Q: 可以连接多个服务器吗？
A: 
可以创建多个客户端实例：
```javascript
const client1 = new ProxyWebSocketClient('ws://127.0.0.1:8889');
const client2 = new ProxyWebSocketClient('ws://127.0.0.1:8890');
```

## 下一步

- ✅ 实现基本的 WebSocket 连接
- ✅ 支持消息发送和接收
- ✅ 自动重连机制
- ✅ 心跳检测
- ✅ 消息处理器注册
- 🔄 添加消息队列（断线重连时重发重要消息）
- 🔄 添加连接池管理
- 🔄 支持消息压缩
