#!/bin/bash

# HTTPS 测试启动脚本

echo "🚀 启动 PasteKit Lab HTTPS 测试环境"

# 检查是否已经运行 HTTPS 服务器
if lsof -Pi :8443 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  HTTPS 服务器已在端口 8443 运行"
else
    echo "🔧 启动 HTTPS Mock 服务器..."
    npm run https-mock-server &
    HTTPS_PID=$!
    echo "sPid: $HTTPS_PID"
    sleep 3
fi

echo ""
echo "📋 测试清单:"
echo "1. 打开浏览器访问: https://localhost:8443"
echo "2. 浏览器应该显示安全连接（绿色锁图标）"
echo "3. 访问测试页面: https://localhost:8443/test-https.html"
echo "4. 所有测试应该通过"
echo ""
echo "💡 提示:"
echo "- 首次访问时浏览器可能仍会显示警告，点击'高级'->'继续前往'"
echo "- 证书有效期至 2028 年 5 月 26 日"
echo "- 如需重新生成证书，运行: ./scripts/setup-local-ssl.sh"
echo ""
echo "🛑 按 Ctrl+C 停止服务器"

# 等待用户中断
trap "echo '\n正在停止 HTTPS 服务器...'; kill $HTTPS_PID 2>/dev/null; exit 0" INT
while true; do
    sleep 1
done