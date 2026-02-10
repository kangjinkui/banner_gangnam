#!/bin/bash

# 디지털 오션 배포 스크립트
SERVER_IP="206.189.41.229"
SERVER_USER="root"
PROJECT_DIR="/var/www/banner_gangnam01"

echo "🚀 Starting deployment to Digital Ocean..."

# 1. 프로젝트 빌드
echo "📦 Building project..."
npm run build

# 2. 서버로 파일 전송 (rsync 사용)
echo "📤 Transferring files to server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next' \
  --exclude '.env.local' \
  ./ ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/

# 3. 서버에서 명령 실행
echo "🔧 Installing dependencies and starting application..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /var/www/banner_gangnam01

# 환경변수 파일 확인
if [ ! -f .env.production ]; then
  echo "⚠️  Warning: .env.production not found!"
  echo "Please create .env.production with your environment variables"
fi

# 의존성 설치
npm install --production=false

# 프로젝트 빌드
npm run build

# PM2로 앱 재시작
pm2 delete banner-gangnam01 2>/dev/null || true
pm2 start npm --name "banner-gangnam01" -- start
pm2 save
pm2 startup

ENDSSH

echo "✅ Deployment completed!"
echo "🌐 Your app should be running at http://206.189.41.229:3000"
