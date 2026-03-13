# WebSocket 客户端实现总结

## 📦 已创建的文件

### 核心文件
1. **`src/pastekit/proxy/ws-client.js`** - WebSocket 客户端类（主要）
2. **`src/pastekit/background/background.js`** - 已更新，集成新的 WebSocket 客户端

### 测试和示例文件
3. **`src/pastekit/proxy/ws-client-example.js`** - 使用示例代码
4. **`src/pastekit/proxy/ws-client-test.html`** - 浏览器测试页面
5. **`src/pastekit/proxy/test-ws-client.js`** - Node.js 测试脚本
6. **`src/pastekit/proxy/quick-start.js`** - 快速启动脚本

### 文档文件
7. **`src/pastekit/proxy/WEBSOCKET_CLIENT_README.md`** - 详细使用文档
8. **`src/pastekit/proxy/README_WebSocket_Client.md`** - 本文件（快速参考）

---

## 🚀 快速开始

### 1. 启动WebSocket服务器
```bash
npm run proxy-server
```

### 2. 使用客户端（三种方式任选其一）

#### 方式 A: 快速启动（推荐）
```bash
npm run ws-quick-start
```

#### 方式 B: 完整测试
```bash
npm run ws-client-test
```

#### 方式 C: 浏览器测试
打开 `src/pastekit/proxy/ws-client-test.html` 到浏览器

---

## 💡 核心代码示例

### 基本使用
```javascript
import { ProxyWebSocketClient } from './ws-client.js';

// 创建客户端
const client = new ProxyWebSocketClient('ws://127.0.0.1:8889');

// 连接
await client.connect();

// 发送消息
client.sendRequest({
   url: 'https://api.example.com/data',
  method: 'GET'
});

// 断开
client.disconnect();
```

### 接收消息
```javascript
// 注册消息处理器
client.on('connected', (msg) => console.log('已连接:', msg.clientId));
client.on('proxy-request', (msg) => console.log('请求:', msg.data?.url));
client.on('proxy-response', (msg) => console.log('响应:', msg.data?.url));
client.on('pong', (msg) => console.log('心跳响应:', msg.timestamp));
```

---

## 📊 消息类型

### 客户端 → 服务器

| 类型 | 方法 | 说明 |
|------|------|------|
| `request` | `sendRequest(data)` | 发送 HTTP 请求数据 |
| `response` | `sendResponse(data)` | 发送 HTTP 响应数据 |
| `ping` | `ping()` | 发送心跳检测 |
| `decrypt` | `send('decrypt', data)` | 发送解密请求 |

### 服务器 → 客户端

| 类型 | 说明 |
|------|------|
| `connected` | 连接成功欢迎消息 |
| `proxy-request` | 转发的代理请求 |
| `proxy-response` | 转发的代理响应 |
| `pong` | 心跳响应 |

---

## 🔧 API 参考

### ProxyWebSocketClient 类

```javascript
class ProxyWebSocketClient {
    // 构造函数
    constructor(url = 'ws://127.0.0.1:8889')
    
    // 连接方法
    connect()                    // Promise
    
    // 断开方法
    disconnect()                 // void
    
    // 发送方法
    send(type, data)            // boolean
    sendRequest(data)           // boolean
    sendResponse(data)          // boolean
    ping()                      // boolean
    
    // 事件处理
    on(type, handler)           // 返回取消注册函数
    handleMessage(message)      // 内部方法
    
    // 状态查询
    isConnected()               // boolean
}
```

---

## 🎯 功能特性

✅ **自动重连**
- 连接断开后 5 秒自动重连
- 可配置重连间隔

✅ **心跳检测**
- 手动调用 `ping()` 发送心跳
- Background 中每 30 秒自动发送

✅ **消息处理器**
- 支持为每种消息类型注册多个处理器
- 可取消注册

✅ **错误处理**
- 完整的错误捕获和日志输出
- 连接失败自动重试

---

## 📝 使用场景

### 1. Chrome Extension Background
已在 `background.js` 中集成，用于：
- 接收代理服务器的请求/响应数据
- 进行解密处理
- 转发到 Options 页面

### 2. 独立测试工具
使用 `test-ws-client.js` 或 `quick-start.js` 测试 WebSocket服务器

### 3. 浏览器调试
使用 `ws-client-test.html` 在浏览器中进行可视化测试

---

## 🐛 故障排查

### 连接失败
```bash
# 1. 检查服务器是否启动
npm run proxy-server

# 2. 检查端口占用
lsof -i :8889

# 3. 查看服务器日志
tail -f logs/proxy-server.log
```

### 消息发送失败
- 检查连接状态：`client.isConnected()`
- 查看控制台日志
- 确认消息格式正确

---

## 📋 下一步计划

- [ ] 添加消息队列（断线重连时重发）
- [ ] 添加连接池管理
- [ ] 支持消息压缩
- [ ] 添加认证机制
- [ ] 支持二进制数据传输

---

## 📞 更多信息

详细文档请查看：`WEBSOCKET_CLIENT_README.md`
