#!/bin/bash

SERVER_IP="38.55.192.139"
SERVER_USER="root"
SERVER_PASS="Pf-^lM3Y=G"
REMOTE_DIR="/root/mini-habits"

cd "$(dirname "$0")"

echo "🚀 打包前端文件..."
tar -czf mini-habits.tar.gz index.html lucide.js sprites/

echo "🚚 上传到服务器..."
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no mini-habits.tar.gz $SERVER_USER@$SERVER_IP:/root/

echo "🛠️ 服务器解压..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
mkdir -p $REMOTE_DIR
tar -xzf /root/mini-habits.tar.gz -C $REMOTE_DIR
rm /root/mini-habits.tar.gz
# 重启 nginx 容器加载新文件（不需要重建，挂载会自动同步）
docker exec twitter-hot-frontend-1 nginx -s reload 2>/dev/null || echo 'nginx reload skipped'
"

echo "✨ 清理..."
rm mini-habits.tar.gz

echo "✅ 部署完成！"
echo "🌐 https://ttmouse.com/mini-habits/"
