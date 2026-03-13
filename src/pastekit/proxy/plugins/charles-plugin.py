#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Charles Proxy Plugin for PasteKit (Python Version)
使用 Charles 的 External Process 功能

使用方法：
1. 在 Charles 中打开 Proxy → External Processes Settings
2. 添加此脚本为 Python External Process
3. 配置 WebSocket 地址
4. 启用拦截
"""

import json
import sys
import time
import threading
from datetime import datetime
from websocket import WebSocketApp, WebSocketConnectionClosedException
import base64
import uuid

# ==================== 配置区域 ====================
class Config:
    WS_URL = 'ws://localhost:8899'  # 修改为你的服务器地址
    AUTO_RECONNECT = True
    RECONNECT_INTERVAL = 5  # 秒
    LOG_ENABLED = True
    ENABLED = True

# ==================== 全局变量 ====================
websocket_client = None
is_connected = False
request_map = {}
reconnect_timer = None

# ==================== 工具函数 ====================
def log(message):
    """日志输出"""
    if Config.LOG_ENABLED:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] [PasteKit] {message}")
        sys.stdout.flush()

def generate_request_id():
    """生成唯一请求 ID"""
    return f"req_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"

def bytes_to_base64(data):
    """字节转 Base64"""
    try:
        if isinstance(data, str):
            data = data.encode('utf-8')
        return base64.b64encode(data).decode('utf-8')
    except Exception as e:
        log(f"Base64 编码失败：{e}")
        return None

def get_string_from_bytes(data):
    """字节转字符串"""
    try:
        if isinstance(data, bytes):
            return data.decode('utf-8')
        return data
    except Exception:
        return None

# ==================== WebSocket 连接 ====================
def on_open(ws):
    """WebSocket 连接成功回调"""
    global is_connected
    is_connected = True
    log("WebSocket 连接成功")
    
    # 发送握手消息
    send_message({
        'type': 'handshake',
        'plugin': 'charles-python',
        'version': '1.0.0',
        'timestamp': int(time.time() * 1000)
    })

def on_message(ws, message):
    """接收消息回调"""
    try:
        msg = json.loads(message)
        handle_server_message(msg)
    except Exception as e:
        log(f"消息解析失败：{e}")

def on_error(ws, error):
    """WebSocket 错误回调"""
    global is_connected
    log(f"WebSocket 错误：{error}")
    is_connected = False

def on_close(ws, close_status_code, close_msg):
    """WebSocket 关闭回调"""
    global is_connected
    log(f"WebSocket 连接关闭 (状态码：{close_status_code})")
    is_connected = False
    
    if Config.AUTO_RECONNECT:
        log(f"将在 {Config.RECONNECT_INTERVAL} 秒后重连...")
        start_reconnect_timer()

def connect_websocket():
    """建立 WebSocket 连接"""
    global websocket_client
    
    try:
        log(f"连接到 WebSocket 服务器：{Config.WS_URL}")
        
        websocket_client = WebSocketApp(
            Config.WS_URL,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        # 在新线程中运行 WebSocket
        ws_thread = threading.Thread(target=websocket_client.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # 等待连接建立
        time.sleep(1)
        
    except Exception as e:
        log(f"创建 WebSocket 失败：{e}")
        if Config.AUTO_RECONNECT:
            start_reconnect_timer()

def start_reconnect_timer():
    """启动重连定时器"""
    global reconnect_timer
    
    if reconnect_timer:
        reconnect_timer.cancel()
    
    reconnect_timer = threading.Timer(Config.RECONNECT_INTERVAL, connect_websocket)
    reconnect_timer.daemon = True
    reconnect_timer.start()

def send_message(message):
    """发送消息"""
    global websocket_client, is_connected
    
    if websocket_client and is_connected:
        try:
            websocket_client.send(json.dumps(message))
        except WebSocketConnectionClosedException:
            log("WebSocket 已断开，消息发送失败")
            is_connected = False
        except Exception as e:
            log(f"发送消息失败：{e}")
    else:
        log("WebSocket 未连接，消息发送失败")

def handle_server_message(message):
    """处理服务器消息"""
    log(f"收到服务器消息：{message.get('type', 'unknown')}")
    
    msg_type = message.get('type')
    
    if msg_type == 'connected':
        client_id = message.get('clientId')
        log(f"服务器确认连接，客户端 ID: {client_id}")
    elif msg_type == 'pong':
        # 心跳响应，忽略
        pass
    else:
        log(f"未知消息类型：{msg_type}")

# ==================== Charles 拦截函数 ====================
def process_request(request, response, chaint):
    """
    处理请求 - Charles External Process 入口函数
    
    Args:
        request: HTTPRequest 对象
        response: HTTPResponse 对象（请求时为 None）
        chaint: Chain 对象
    
    Returns:
        bool: True 继续处理，False 终止
    """
    if not Config.ENABLED:
        return True
    
    try:
        request_id = generate_request_id()
        
        # 获取请求信息
        url = request.getUrl()
        method = request.getMethod()
        headers_dict = dict(request.getHeaders())
        
        # 获取请求体
        body = None
        body_base64 = None
        
        request_body = request.getBody()
        if request_body:
            body = get_string_from_bytes(request_body)
            body_base64 = bytes_to_base64(request_body)
        
        # 构建请求数据
        request_data = {
            'requestId': request_id,
            'url': url,
            'method': method,
            'headers': headers_dict,
            'body': body,
            'bodyBase64': body_base64,
            'timestamp': int(time.time() * 1000),
            'plugin': 'charles-python'
        }
        
        log(f"拦截请求：{method} {url}")
        
        # 发送到 WebSocket 服务器
        send_message({
            'type': 'request',
            'data': request_data
        })
        
    except Exception as e:
        log(f"处理请求失败：{e}")
    
    # 继续处理请求
    return True

def process_response(request, response, chaint):
    """
    处理响应 - Charles External Process 入口函数
    
    Args:
        request: HTTPRequest 对象
        response: HTTPResponse 对象
        chaint: Chain 对象
    
    Returns:
        bool: True 继续处理，False 终止
    """
    if not Config.ENABLED:
        return True
    
    try:
        # 获取响应信息
        url = request.getUrl()
        status_code = response.getStatus()
        headers_dict = dict(response.getHeaders())
        
        # 获取响应体
        body = None
        body_base64 = None
        
        response_body = response.getBody()
        if response_body:
            body = get_string_from_bytes(response_body)
            body_base64 = bytes_to_base64(response_body)
        
        # 构建响应数据
        response_data = {
            'requestId': None,  # External Process 较难关联 requestId
            'url': url,
            'statusCode': status_code,
            'headers': headers_dict,
            'body': body,
            'bodyBase64': body_base64,
            'timestamp': int(time.time() * 1000),
            'plugin': 'charles-python'
        }
        
        log(f"拦截响应：{status_code} {url}")
        
        # 发送到 WebSocket 服务器
        send_message({
            'type': 'response',
            'data': response_data
        })
        
    except Exception as e:
        log(f"处理响应失败：{e}")
    
    # 继续处理响应
    return True

# ==================== 主程序 ====================
def main():
    """主函数"""
    log("=" * 60)
    log("Charles Proxy Plugin for PasteKit (Python Version)")
    log("=" * 60)
    log(f"WebSocket 地址：{Config.WS_URL}")
    log("插件初始化中...")
    
    # 启动 WebSocket 连接
    connect_websocket()
    
    # 定时发送心跳
    def heartbeat():
        while True:
            time.sleep(30)  # 每 30 秒发送一次心跳
            if is_connected:
                send_message({
                    'type': 'ping',
                    'timestamp': int(time.time() * 1000)
                })
    
    heartbeat_thread = threading.Thread(target=heartbeat)
    heartbeat_thread.daemon = True
    heartbeat_thread.start()
    
    log("插件已就绪，等待 Charles 调用...")
    
    # 保持运行
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log("正在退出...")

if __name__ == '__main__':
    main()
