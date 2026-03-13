#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Charles Plugin 测试脚本
用于测试 WebSocket 连接是否正常工作
"""

import sys
import time
from charles_plugin import Config, connect_websocket, send_message, is_connected

def test_websocket():
    """测试 WebSocket 连接"""
    print("=" * 60)
    print("Charles Plugin WebSocket 连接测试")
    print("=" * 60)
    
    # 修改配置为测试模式
    Config.LOG_ENABLED = True
    Config.AUTO_RECONNECT = False
    
    print(f"\n尝试连接到：{Config.WS_URL}")
    print("请确保 WebSocket 服务器已启动 (npm run proxy-server)\n")
    
    # 建立连接
    connect_websocket()
    
    # 等待连接
    print("等待连接建立...")
    time.sleep(3)
    
    if is_connected:
        print("\n✅ WebSocket 连接成功！\n")
        
        # 发送测试消息
        test_data = {
            'requestId': 'test_123',
            'url': 'https://example.com/test',
            'method': 'GET',
            'headers': {'User-Agent': 'Test'},
            'body': None,
            'timestamp': int(time.time() * 1000),
            'plugin': 'charles-python-test'
        }
        
        print("发送测试请求数据...")
        send_message({
            'type': 'request',
            'data': test_data
        })
        
        # 等待响应
        time.sleep(2)
        print("\n测试完成！")
        
    else:
        print("\n❌ WebSocket 连接失败！")
        print("\n可能的原因:")
        print("  1. WebSocket 服务器未启动")
        print("  2. 端口被占用")
        print("  3. 防火墙阻止连接")
        print("\n解决方法:")
        print("  1. 运行：npm run proxy-server")
        print("  2. 检查端口 8899 是否可用")
        print("  3. 检查防火墙设置")
    
    # 等待一段时间让消息发送完成
    time.sleep(1)

if __name__ == '__main__':
    try:
        test_websocket()
    except KeyboardInterrupt:
        print("\n\n测试被中断")
        sys.exit(0)
