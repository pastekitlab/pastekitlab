# PasteKit Proxy Plugin System

基于 WebSocket 的代理插件系统，支持 Charles、Fiddler、Whistle 等工具。

## 🏗️ 架构设计

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Charles   │      │  Fiddler     │      │  Whistle    │
│   Plugin    │      │  Extension   │      │  Plugin     │
└──────┬──────┘      └──────┬───────┘      └──────┬──────┘
       │                    │                      │
       └────────────────────┼──────────────────────┘
                            │
                     WebSocket (8899)
                            │
       ┌────────────────────┼──────────────────────┐
       │                    │                      │
┌──────▼──────┐      ┌──────▼───────┐      ┌──────▼──────┐
│  Request    │      │  Response    │      │   Options   │
│  Handler    │      │  Handler     │      │    Page     │
└─────────────┘      └──────────────┘      └─────────────┘
```

## 🚀 快速开始

### 1. 启动 WebSocket 服务器

```bash
npm run proxy-server
```

输出示例：
```
🚀 PasteKit 代理插件服务器
   支持工具：Charles、Fiddler、Whistle

✅ 服务启动成功

📱 连接信息:
   WebSocket 端口：8899
   本地地址：ws://localhost:8899
   局域网地址：ws://<本机 IP>:8899
```

### 2. 配置代理工具

#### Charles 配置（Python 版本 - 推荐）

**优势：**
- ✅ 更强大的功能和灵活性
- ✅ 更好的错误处理
- ✅ 支持多线程和异步操作
- ✅ 易于扩展和定制

**安装步骤：**

1. **安装 Python 依赖**
   ```bash
   cd src/pastekit/proxy/plugins
   pip install -r requirements.txt
   ```

2. **配置 WebSocket 地址**
   - 编辑 `charles-plugin.py`
   - 修改 `Config.WS_URL = 'ws://<本机 IP>:8899'`

3. **在 Charles 中配置 External Process**
   - 打开 Charles → Proxy → External Processes Settings
   - 点击 "Add" 添加新配置
   - **Executable:** `/usr/bin/python3` (或你的 Python 路径)
   - **Arguments:** `/path/to/charles-plugin.py`
   - **Working Directory:** `/path/to/plugins`
   - 勾选 "Enable"

4. **测试连接**
   ```bash
   # 确保 WebSocket 服务器已启动
   npm run proxy-server
   
   # 运行测试脚本
   python test_charles_plugin.py
   ```
   如果显示 "✅ WebSocket 连接成功！" 则配置正确

5. **开始使用**
   - 访问任意网站
   - 在 Charles 日志中看到 `[PasteKit] 拦截请求/响应` 输出
   - 在 Chrome 扩展 Options 页面查看实时数据

**故障排查：**
- 如果连接失败，检查防火墙设置
- 确认端口 8899 未被占用
- 查看 Python 控制台输出

---

#### Charles 配置（JavaScript 版本 - 备选）

1. **打开 Scripting Extension**
   - Charles → Tools → Scripting Extension

2. **添加脚本**
   - 点击 "Add" 添加新脚本
   - 选择 `src/pastekit/proxy/plugins/charles-plugin.js`

3. **配置 WebSocket 地址**
   - 编辑脚本中的 `CONFIG.wsUrl`
   - 设置为你的服务器地址：`ws://<本机 IP>:8899`

4. **启用拦截**
   - 勾选 "Enable JavaScript"
   - 确保 request 和 response 函数被调用

5. **测试**
   - 访问任意网站
   - 在 Chrome 扩展的 Options 页面查看请求

#### Fiddler Classic 配置

1. **打开 Fiddler Script Editor**
   - Rules → Customize Rules (Ctrl+R)

2. **添加代码**
   ```javascript
   // 在 OnBeforeRequest 函数中添加
   PasteKitPlugin.OnBeforeRequest(oS);
   
   // 在 OnBeforeResponse 函数中添加
   PasteKitPlugin.OnBeforeResponse(oS);
   ```

3. **导入插件**
   - 在脚本开头添加：
   ```javascript
   import System;
   import Fiddler;
   ```

4. **配置 WebSocket**
   - 修改 `PasteKitConfig.wsUrl` 为你的服务器地址

5. **注意**
   - Fiddler Script 不支持原生 WebSocket
   - 建议使用 HTTP POST 方式发送数据（待实现）

#### Whistle 配置

1. **安装 whistle**
   ```bash
   npm install -g whistle
   w2 start
   ```

2. **安装 whistle-ws 插件**
   ```bash
   npm install -g whistle-ws
   ```

3. **配置规则**
   - 打开 whistle 界面：http://127.0.0.1:8899
   - 在 Rules 中添加：
   ```
   ws://localhost:8899/plugin pasteKitProxy
   http://*.* pasteKitProxy
   https://*.* pasteKitProxy
   ```

4. **使用插件**
   - 将 `src/pastekit/proxy/plugins/whistle-plugin.js` 复制到 whistle 插件目录

5. **重启 whistle**
   ```bash
   w2 restart
   ```

### 3. 查看监控数据

1. **打开 Chrome 扩展 Options 页面**
   - 右键扩展图标 → Options
   - 或访问：`chrome-extension://<扩展 ID>/options.html`

2. **查看实时流量**
   - 请求列表：显示所有拦截的请求
   - 响应列表：显示所有拦截的响应
   - 详情面板：查看完整的 Headers 和 Body

3. **功能按钮**
   - 🔍 过滤：根据 URL 或方法筛选
   - ⏸️ 暂停/继续：临时停止接收数据
   - 🗑️ 清空：清除所有数据
   - 📥 导出：导出为 JSON 文件

## 📊 数据格式

### 请求数据结构

```json
{
  "requestId": "req_1234567890_abc123",
  "url": "https://api.example.com/users",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer xxx"
  },
  "body": "{\"name\":\"test\"}",
  "bodyBase64": "eyJuYW1lIjoidGVzdCJ9",
  "timestamp": 1234567890,
  "plugin": "charles"
}
```

### 响应数据结构

```json
{
  "requestId": "req_1234567890_abc123",
  "url": "https://api.example.com/users",
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"id\":1,\"name\":\"test\"}",
  "bodyBase64": "eyJpZCI6MSwibmFtZSI6InRlc3QifQ==",
  "timestamp": 1234567890,
  "plugin": "charles"
}
```

## 🔧 高级配置

### 修改 WebSocket 端口

编辑 `src/pastekit/proxy/start-plugin-server.js`:

```javascript
const WS_PORT = process.env.WS_PORT || 8899; // 修改默认端口
```

或使用环境变量：

```bash
WS_PORT=9999 npm run proxy-server
```

### 启用/禁用日志

在各个插件脚本中修改：

```javascript
const CONFIG = {
    logEnabled: true, // 设为 false 禁用日志
    // ...
};
```

### 自动重连配置

```javascript
const CONFIG = {
    autoReconnect: true,
    reconnectInterval: 5000, // 毫秒
    // ...
};
```

## 🔐 解密功能

目前解密功能需要集成具体的解密算法。可以在以下位置添加：

1. **WebSocket 服务器解密处理**
   - 文件：`src/pastekit/proxy/ws-server.js`
   - 方法：`handleDecrypt()`

2. **自定义解密逻辑**
   ```javascript
   async handleDecrypt(data, ws) {
       // 添加你的解密算法
       const decrypted = await yourDecryptFunction(data.body);
       
       ws.send(JSON.stringify({
           type: 'decrypt-result',
           requestId: data.requestId,
           success: true,
           decryptedData: decrypted
       }));
   }
   ```

## 📝 故障排查

### WebSocket 连接失败

1. 检查服务器是否启动：`netstat -an | grep 8899`
2. 检查防火墙设置
3. 确认 WebSocket 地址正确

### 插件不工作

1. 检查插件是否正确加载
2. 查看控制台日志
3. 确认拦截规则已启用

### 数据不显示

1. 检查 WebSocket 连接状态
2. 确认没有被暂停
3. 检查过滤器设置

## 🛠️ 开发自己的插件

### WebSocket 消息格式

**发送到服务器：**
```javascript
{
    type: 'request' | 'response' | 'decrypt' | 'ping',
    data: { /* 请求或响应数据 */ }
}
```

**从服务器接收：**
```javascript
{
    type: 'connected' | 'proxy-request' | 'proxy-response' | 'decrypt-result' | 'pong',
    data: { /* 相关数据 */ }
}
```

### 最小插件示例

```javascript
const CONFIG = {
    wsUrl: 'ws://localhost:8899'
};

let websocket = null;

function connect() {
    websocket = new WebSocket(CONFIG.wsUrl);
    
    websocket.onopen = () => {
        console.log('Connected');
    };
    
    websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Message:', message);
    };
}

function sendRequest(requestData) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            type: 'request',
            data: requestData
        }));
    }
}

// 初始化
connect();
```

## 📚 相关资源

- [Charles Scripting](https://www.charlesproxy.com/documentation/add-ons/scripting/)
- [Fiddler Scripting](https://www.telerik.com/fiddler/fiddlerscript)
- [Whistle Plugins](https://wproxy.org/whistle/plugin.html)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
