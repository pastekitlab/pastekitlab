#!/bin/bash

# 本地 SSL 证书设置脚本
# 使用 mkcert 为本地开发生成受信任的 SSL 证书

set -e

echo "🔐 设置本地 SSL 证书..."

# 检查是否已安装 mkcert
if ! command -v mkcert &> /dev/null; then
    echo "❌ 未找到 mkcert，正在安装..."
    
    # macOS 安装
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install mkcert
        else
            echo "❌ 请先安装 Homebrew: https://brew.sh/"
            exit 1
        fi
    # Linux 安装
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install libnss3-tools -y
        elif command -v yum &> /dev/null; then
            sudo yum install nss-tools -y
        fi
        # 下载 mkcert
        curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
        chmod +x mkcert-v*-linux-amd64
        sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
    else
        echo "❌ 不支持的操作系统，请手动安装 mkcert"
        echo "访问: https://github.com/FiloSottile/mkcert"
        exit 1
    fi
fi

echo "✅ mkcert 已安装"

# 创建证书目录
CERT_DIR="$(dirname "$0")"
cd "$CERT_DIR"

# 安装本地 CA
echo "🔧 安装本地 CA..."
mkcert -install

# 生成证书（支持多个域名）
echo "📜 生成本地开发证书..."
mkcert -key-file server.key -cert-file server.cert localhost 127.0.0.1 ::1

echo "✅ 证书生成完成！"
echo "🔑 私钥: server.key"
echo "📜 证书: server.cert"
echo ""
echo "💡 浏览器现在应该信任这些证书了"
echo "🚀 重启 HTTPS 服务器以使用新证书"