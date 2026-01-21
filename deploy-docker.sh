#!/bin/bash

# 도커를 이용한 Digital Ocean 서버 배포 스크립트
SERVER_IP="206.189.41.229"
SERVER_USER="root"
PROJECT_DIR="/var/www/banner_gangnam01"
REPO_NAME="banner_gangnam01"

echo "🚀 Starting Docker deployment to Digital Ocean..."

# 1. 서버에 Docker 및 Docker Compose 설치 확인
echo "📦 Checking Docker installation on server..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Docker Compose 설치 확인
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 프로젝트 디렉토리 생성
mkdir -p /var/www/banner_gangnam01/nginx/ssl

echo "✅ Docker installation complete"
ENDSSH

# 2. 프로젝트 파일 서버로 전송
echo "📤 Transferring files to server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next' \
  --exclude '.env*.local' \
  --exclude 'nginx/ssl' \
  ./ ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/

# 3. .env 파일 생성 안내
echo "⚙️  Setting up environment variables..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${PROJECT_DIR}

# .env 파일이 없으면 생성 안내
if [ ! -f .env ]; then
  echo "⚠️  Creating .env file..."
  cat > .env << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Kakao Map API
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=your_kakao_javascript_key
NEXT_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key

# Database (if using local PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@db:5432/banner_gangnam

# App Configuration
APP_PORT=3000
NGINX_PORT=80
NGINX_SSL_PORT=443
EOF
  echo "⚠️  Please edit .env file with your actual values!"
  echo "Run: ssh ${SERVER_USER}@${SERVER_IP}"
  echo "Then: nano ${PROJECT_DIR}/.env"
  exit 1
fi
ENDSSH

# 환경변수 파일 확인 실패 시 종료
if [ $? -ne 0 ]; then
  echo "❌ Please set up .env file first!"
  exit 1
fi

# 4. Docker 컨테이너 빌드 및 실행
echo "🐳 Building and starting Docker containers..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
cd ${PROJECT_DIR}

# 기존 컨테이너 중지 및 제거
docker-compose down

# 이미지 빌드 및 컨테이너 시작
docker-compose build --no-cache
docker-compose up -d

# 로그 확인
echo "📋 Container logs:"
docker-compose ps
docker-compose logs --tail=50 app

echo "✅ Deployment completed!"
ENDSSH

echo ""
echo "🎉 Deployment finished!"
echo "🌐 Your app should be running at:"
echo "   - HTTP: http://206.189.41.229"
echo "   - Direct: http://206.189.41.229:3000"
echo ""
echo "📊 Useful commands:"
echo "   ssh ${SERVER_USER}@${SERVER_IP}"
echo "   cd ${PROJECT_DIR}"
echo "   docker-compose logs -f app          # View logs"
echo "   docker-compose ps                    # Check status"
echo "   docker-compose restart app           # Restart app"
echo "   docker-compose down                  # Stop all"
echo "   docker-compose up -d                 # Start all"
