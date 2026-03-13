/**
 * Fiddler Classic Plugin for PasteKit
 * 
 * 使用方法：
 * 1. 打开 Fiddler Script Editor (Rules > Customize Rules)
 * 2. 在 OnBeforeRequest 函数中添加调用
 * 3. 配置 WebSocket 地址
 */

import System;
import System.Windows.Forms;
import Fiddler;
import System.Text;
import System.IO;

// ==================== 配置区域 ====================
class PasteKitConfig {
    public static var wsUrl: String = "ws://localhost:8899"; // 修改为你的服务器地址
    public static var logEnabled: boolean = true;
    public static var enabled: boolean = true;
}

// ==================== 全局变量 ====================
static var websocket: WebSocket = null;
static var isConnected: boolean = false;
static var requestMap: Dictionary.<String, Object> = new Dictionary.<String, Object>();
static var reconnectTimer: System.Timers.Timer = null;

// ==================== 工具函数 ====================
function Log(message: String) {
    if (PasteKitConfig.logEnabled) {
        System.Diagnostics.Debug.WriteLine("[PasteKit] " + message);
    }
}

function GenerateRequestId(): String {
    return "req_" + DateTime.Now.Ticks.ToString() + "_" + Guid.NewGuid().ToString("N").Substring(0, 8);
}

function BytesToBase64(bytes: byte[]): String {
    try {
        return Convert.ToBase64String(bytes);
    } catch (e: Exception) {
        Log("Base64 编码失败：" + e.Message);
        return null;
    }
}

function Base64ToBytes(base64: String): byte[] {
    try {
        return Convert.FromBase64String(base64);
    } catch (e: Exception) {
        Log("Base64 解码失败：" + e.Message);
        return null;
    }
}

function GetStringFromBytes(bytes: byte[]): String {
    try {
        // 尝试 UTF-8 解码
        var result = Encoding.UTF8.GetString(bytes);
        // 检查是否包含不可打印字符，如果有则返回 null
        if (result.IndexOfAny(System.Char.GetInvalidChars()) >= 0) {
            return null;
        }
        return result;
    } catch (e: Exception) {
        return null;
    }
}

// ==================== WebSocket 连接（简化版）====================
// 注意：Fiddler Script 不支持原生 WebSocket，需要使用 HTTP 轮询或第三方库
// 这里使用简化的 HTTP POST 方式发送数据

function SendData(dataType: String, data: Object) {
    if (!PasteKitConfig.enabled) return;
    
    try {
        // 使用 HTTP POST 发送到 WebSocket 服务器的 HTTP 端点
        // 需要 WebSocket 服务器提供 HTTP 接收端点
        Log(dataType + ": " + data.url);
        
        // TODO: 实现 HTTP POST 发送逻辑
        // 可以使用 Fiddler 的 HTTPClient 类
        
    } catch (e: Exception) {
        Log("发送失败：" + e.Message);
    }
}

// ==================== Fiddler 拦截函数 ====================

/**
 * 请求拦截 - 在请求发送前调用
 */
static function OnBeforeRequest(oS: Session) {
    if (!PasteKitConfig.enabled) return;
    
    // 排除某些域名
    if (oS.HostnameIs("localhost") || oS.HostnameIs("127.0.0.1")) {
        return;
    }
    
    var requestId = GenerateRequestId();
    
    // 保存请求信息
    requestMap[requestId] = oS;
    
    // 获取请求体
    var body: String = null;
    var bodyBase64: String = null;
    
    if (oS.RequestBody != null && oS.RequestBody.Length > 0) {
        body = GetStringFromBytes(oS.RequestBody);
        bodyBase64 = BytesToBase64(oS.RequestBody);
    }
    
    // 构建请求数据
    var requestData = {
        requestId: requestId,
        url: oS.fullUrl,
        method: oS.RequestMethod,
        headers: oS.RequestHeaders,
        body: body,
        bodyBase64: bodyBase64,
        timestamp: DateTime.Now.Ticks / 10000, // 转换为毫秒
        plugin: 'fiddler'
    };
    
    Log("拦截请求：" + oS.RequestMethod + " " + oS.fullUrl);
    
    // 发送数据
    SendData("request", requestData);
}

/**
 * 响应拦截 - 在响应返回给客户端前调用
 */
static function OnBeforeResponse(oS: Session) {
    if (!PasteKitConfig.enabled) return;
    
    // 排除某些域名
    if (oS.HostnameIs("localhost") || oS.HostnameIs("127.0.0.1")) {
        return;
    }
    
    // 获取请求 ID
    var requestId: String = null;
    foreach (var key in requestMap.Keys) {
        if (requestMap[key] == oS) {
            requestId = key;
            requestMap.Remove(key);
            break;
        }
    }
    
    // 获取响应体
    var body: String = null;
    var bodyBase64: String = null;
    
    if (oS.ResponseBody != null && oS.ResponseBody.Length > 0) {
        body = GetStringFromBytes(oS.ResponseBody);
        bodyBase64 = BytesToBase64(oS.ResponseBody);
    }
    
    // 构建响应数据
    var responseData = {
        requestId: requestId,
        url: oS.fullUrl,
        statusCode: oS.responseCode,
        headers: oS.ResponseHeaders,
        body: body,
        bodyBase64: bodyBase64,
        timestamp: DateTime.Now.Ticks / 10000,
        plugin: 'fiddler'
    };
    
    Log("拦截响应：" + oS.responseCode + " " + oS.fullUrl);
    
    // 发送数据
    SendData("response", responseData);
}

/**
 * 扩展菜单 - 添加启用/禁用选项
 */
static function ExtendRules() {
    UIItem menuSeparator = new UIItem("Separator");
    UIItem menuItem = new UIItem("PasteKit Proxy", "TogglePlugin", null, "PasteKit");
    
    FiddlerApplication.UI.lstSessions.Add(menuSeparator);
    FiddlerApplication.UI.lstSessions.Add(menuItem);
}

static function TogglePlugin() {
    PasteKitConfig.enabled = !PasteKitConfig.enabled;
    Log("插件已" + (PasteKitConfig.enabled ? "启用" : "禁用"));
}

// ==================== 初始化 ====================
Log("Fiddler 插件初始化...");
Log("WebSocket 地址：" + PasteKitConfig.wsUrl);

// 注意：Fiddler Script 不支持原生 WebSocket
// 如需完整功能，建议使用 FiddlerScript 2 或开发 Fiddler 扩展
