# WebSocket 客户端使用指南

## 🎯 功能概述

已成功为 PasteKit 项目添加完整的 WebSocket 客户端功能，用于连接 `ws://127.0.0.1:8889` 代理服务器。

---

## 📁 新增文件清单

### 核心实现
- ✅ `src/pastekit/proxy/ws-client.js` - WebSocket 客户端类（可复用组件）
- ✅ `src/pastekit/background/background.js` - 已更新集成新客户端

### 测试工具
- ✅ `src/pastekit/proxy/ws-client-example.js` - 代码示例
- ✅ `src/pastekit/proxy/ws-client-test.html` - 浏览器测试页面（可视化界面）
- ✅ `src/pastekit/proxy/test-ws-client.js` - Node.js 测试脚本（完整测试）
- ✅ `src/pastekit/proxy/quick-start.js` - 快速启动脚本（简单演示）

### 文档
- ✅ `src/pastekit/proxy/WEBSOCKET_CLIENT_README.md` - 详细文档
- ✅ `src/pastekit/proxy/README_WebSocket_Client.md` - 快速参考
- ✅ `src/pastekit/proxy/如何使用 WebSocket 客户端.md` - 本文件

---

## ⚡️ 三步快速使用

### 步骤 1: 启动WebSocket服务器
```bash
npm run proxy-server
```

### 步骤 2: 选择一种方式运行客户端

#### 方式 A: 命令行快速测试（最简单）
```bash
npm run ws-quick-start
```

#### 方式 B: 完整功能测试
```bash
npm run ws-client-test
```

#### 方式 C: 浏览器可视化测试
```bash
# 在浏览器中打开
open src/pastekit/proxy/ws-client-test.html
```

#### 方式 D: 在代码中使用
```javascript
import { ProxyWebSocketClient } from './src/pastekit/proxy/ws-client.js';

const client = new ProxyWebSocketClient('ws://127.0.0.1:8889');
await client.connect();

// 发送请求
client.sendRequest({
  url: 'https://api.example.com/data',
  method: 'POST',
   body: JSON.stringify({ test: 'data' })
});

// 断开连接
client.disconnect();
```

### 步骤 3: 查看输出
所有客户端都会显示详细的连接和消息日志。

---

## 💻 NPM Scripts

新增了三个命令：

| 命令 | 说明 | 适用场景 |
|------|------|----------|
| `npm run proxy-server` | 启动WebSocket服务器 | 必须先运行 |
| `npm run ws-quick-start` | 快速启动客户端 | 简单测试 |
| `npm run ws-client-test` | 完整测试客户端 | 功能验证 |

---

## 📊 消息格式示例

### 发送 HTTP 请求
```json
{
  "type": "request",
  "data": {
    "url": "https://api.github.com/users/octocat",
    "method": "GET",
    "headers": {
      "Accept": "application/json"
    },
    "timestamp": 1678888888888
  }
}
```

### 发送 HTTP 响应
```json
{
  "type": "response",
  "data": {
    "url": "https://api.github.com/users/octocat",
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"login\":\"octocat\",\"id\":1}",
    "timestamp": 1678888888888
  }
}
```

### 发送心跳
```json
{
  "type": "ping",
  "timestamp": 1678888888888
}
```

---

## 🔧 主要功能

### 1. 自动重连
- 连接断开后 5 秒自动重连
- 可配置重连间隔

### 2. 心跳检测
- 手动调用 `ping()` 方法
- Background 服务每 30 秒自动发送

### 3. 消息处理器
```javascript
// 注册处理器
client.on('connected', (msg) => {
    console.log('已连接:', msg.clientId);
});

client.on('proxy-request', (msg) => {
    console.log('收到请求:', msg.data?.url);
});

// 取消注册
const unregister = client.on('message-type', handler);
unregister(); // 移除处理器
```

### 4. 状态检查
```javascript
if (client.isConnected()) {
    console.log('客户端已连接');
}
```

---

## 🎨 使用场景

### 场景 1: Chrome Extension Background
已在 `background.js` 中集成：
- 连接到代理服务器
- 接收请求/响应数据
- 进行解密处理
- 转发到 Options 页面

### 场景 2: 独立测试工具
使用 `test-ws-client.js` 测试 WebSocket服务器功能

### 场景 3: 浏览器调试
使用 `ws-client-test.html` 进行可视化调试

### 场景 4: 自定义集成
在你的代码中导入并使用 `ProxyWebSocketClient` 类

---

## 🐛 常见问题

### Q1: 连接失败
**解决步骤：**
```bash
# 1. 确保服务器已启动
npm run proxy-server

# 2. 检查端口是否被占用
lsof -i :8889

# 3. 查看服务器日志
```

### Q2: 消息发送失败
**检查项：**
- 连接状态：`client.isConnected()`
- 消息格式是否正确
- 查看控制台错误日志

### Q3: 如何更改连接的地址？
```javascript
const client = new ProxyWebSocketClient('ws://127.0.0.1:9999');
```

或在命令行中指定：
```bash
node src/pastekit/proxy/test-ws-client.js ws://localhost:9999
```

---

## 📖 API 速查

### 构造函数
```javascript
const client = new ProxyWebSocketClient(url?: string)
// 默认地址：ws://127.0.0.1:8889
```

### 连接方法
```javascript
await client.connect()        // 连接到服务器
client.disconnect()           // 断开连接
client.isConnected()          // 检查连接状态
```

### 发送消息
```javascript
client.send(type, data)       // 发送自定义消息
client.sendRequest(data)      // 发送请求
client.sendResponse(data)     // 发送响应
client.ping()                 // 发送心跳
```

### 事件处理
```javascript
client.on(type, handler)      // 注册消息处理器
```

---

## 📝 代码示例

### 完整示例
```javascript
import { ProxyWebSocketClient } from './ws-client.js';

// 创建客户端
const client = new ProxyWebSocketClient('ws://127.0.0.1:8889');

// 注册事件处理器
client.on('connected', (message) => {
    console.log('✅ 连接成功，客户端 ID:', message.clientId);
    
    // 连接成功后发送数据
    setTimeout(() => {
        client.sendRequest({
          url: 'https://api.example.com/users',
         method: 'GET'
        });
    }, 1000);
});

client.on('proxy-request', (message) => {
    console.log('📨 收到代理请求:', message.data?.url);
});

client.on('proxy-response', (message) => {
    console.log('📨 收到代理响应');
});

client.on('pong', (message) => {
    console.log('💓 心跳响应:', new Date(message.timestamp));
});

// 连接
try {
    await client.connect();
    console.log('连接过程启动');
} catch (error) {
    console.error('连接失败:', error);
}

// 定期发送心跳（可选）
setInterval(() => {
    if (client.isConnected()) {
        client.ping();
    }
}, 30000);

// 优雅地断开连接（在退出时）
// client.disconnect();
```

---

## 🎯 下一步

计划添加的功能：
- [ ] 消息队列（断线重连时重发重要消息）
- [ ] 连接池管理（支持多个服务器）
- [ ] 消息压缩（减少带宽使用）
- [ ] 认证机制（安全性）
- [ ] 二进制数据支持

---

## 📞 获取帮助

- **快速参考**: `README_WebSocket_Client.md`
- **详细文档**: `WEBSOCKET_CLIENT_README.md`
- **示例代码**: `ws-client-example.js`
- **可视化测试**: `ws-client-test.html`

---

## ✅ 总结

你现在拥有：
1. ✅ 一个可复用的 WebSocket 客户端类
2. ✅ 三种测试方式（命令行、浏览器、代码）
3. ✅ 完整的文档和示例
4. ✅ 已集成到 Background Service
5. ✅ 自动重连和心跳检测
6. ✅ 灵活的消息处理机制

开始使用吧！🚀

```bash
# 最简单的使用方式
npm run proxy-server      # 先启动服务器
npm run ws-quick-start    # 再启动客户端
```
