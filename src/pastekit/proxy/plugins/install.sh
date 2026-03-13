#!/bin/bash
# Charles Plugin Python 依赖安装脚本

echo "======================================"
echo "Charles Plugin Python 依赖安装"
echo "======================================"
echo ""

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误：未找到 Python 3"
    echo "请先安装 Python 3: https://www.python.org/downloads/"
    exit 1
fi

echo "✅ Python 版本：$(python3 --version)"
echo ""

# 检查 pip 是否安装
if ! command -v pip3 &> /dev/null; then
    echo "❌ 错误：未找到 pip3"
    echo "请安装 pip: https://pip.pypa.io/en/stable/installation/"
    exit 1
fi

echo "✅ pip 版本：$(pip3 --version)"
echo ""

# 安装依赖
echo "正在安装依赖..."
cd "$(dirname "$0")"
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 依赖安装成功！"
    echo ""
    echo "下一步："
    echo "  1. 启动 WebSocket 服务器：npm run proxy-server"
    echo "  2. 测试插件：python test_charles_plugin.py"
    echo "  3. 在 Charles 中配置 External Process"
else
    echo ""
    echo "❌ 依赖安装失败，请检查错误信息"
    exit 1
fi
