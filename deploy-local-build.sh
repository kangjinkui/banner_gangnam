#!/bin/bash
set -e

# ────────────────────────────────────────────
# 로컬 빌드 → DigitalOcean 배포 스크립트
# 방식: 로컬에서 Docker 이미지 빌드 → tar로 서버 전송 → 서버에서 실행
# ────────────────────────────────────────────

SERVER_IP="206.189.41.229"
SERVER_USER="root"
PROJECT_DIR="/var/www/banner_gangnam01"
IMAGE_NAME="banner_gangnam"
IMAGE_TAG="latest"
TAR_FILE="/tmp/banner_gangnam_image.tar.gz"

# 일부 회선에서 아웃바운드 22번이 차단되어 대체 포트를 쓴다.
# 22번이 되는 회선(모바일 핫스팟 등)에서는 SSH_PORT=22 로 덮어쓰면 된다.
SSH_PORT="${SSH_PORT:-2222}"
SSH_OPTS="-p ${SSH_PORT}"
SCP_OPTS="-P ${SSH_PORT}"

# 이미 검증된 로컬 이미지를 그대로 보낼 때는 SKIP_BUILD=1 로 재빌드를 건너뛴다.
SKIP_BUILD="${SKIP_BUILD:-0}"

# .env 파일 로드
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
  echo "✅ .env loaded"
else
  echo "❌ .env file not found!"
  exit 1
fi

echo ""
if [ "${SKIP_BUILD}" = "1" ]; then
  echo "⏭️  Step 1: 재빌드 건너뜀 (SKIP_BUILD=1) — 기존 이미지에 태그만 정렬"
  docker tag banner_gangnam-app:${IMAGE_TAG} ${IMAGE_NAME}:${IMAGE_TAG}
else
  echo "🔨 Step 1: 로컬에서 Docker 이미지 빌드..."
  docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    --build-arg NEXT_PUBLIC_KAKAO_REST_API_KEY="${NEXT_PUBLIC_KAKAO_REST_API_KEY}" \
    --build-arg NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY="${NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}" \
    --build-arg SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}" \
    -t ${IMAGE_NAME}:${IMAGE_TAG} \
    .
fi

echo ""
echo "📦 Step 2: 이미지를 tar.gz로 압축..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > ${TAR_FILE}
echo "   파일 크기: $(du -sh ${TAR_FILE} | cut -f1)"

echo ""
echo "📤 Step 3: 서버로 이미지 전송 (scp)..."
scp ${SCP_OPTS} ${TAR_FILE} ${SERVER_USER}@${SERVER_IP}:/tmp/

echo ""
echo "📤 Step 4: docker-compose.server.yml 전송..."
scp ${SCP_OPTS} docker-compose.server.yml ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/docker-compose.yml

echo ""
echo "🐳 Step 5: 서버에서 이미지 로드 및 컨테이너 시작..."
ssh ${SSH_OPTS} ${SERVER_USER}@${SERVER_IP} bash << ENDSSH
set -e

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 프로젝트 디렉토리 생성
mkdir -p ${PROJECT_DIR}

# 이미지 로드
echo "Loading Docker image..."
docker load < /tmp/banner_gangnam_image.tar.gz
rm -f /tmp/banner_gangnam_image.tar.gz

# .env 파일이 없으면 생성
if [ ! -f ${PROJECT_DIR}/.env ]; then
  cat > ${PROJECT_DIR}/.env << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
NEXT_PUBLIC_KAKAO_REST_API_KEY=${NEXT_PUBLIC_KAKAO_REST_API_KEY}
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=${NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
APP_PORT=3000
EOF
fi

# 기존 컨테이너 중지
cd ${PROJECT_DIR}
docker compose down 2>/dev/null || true

# 컨테이너 시작
docker compose up -d

# 상태 확인
sleep 3
echo ""
echo "📊 Container status:"
docker compose ps

echo ""
echo "📋 App logs (last 20 lines):"
docker compose logs --tail=20 app
ENDSSH

echo ""
echo "🎉 배포 완료!"
echo "🌐 앱 주소: http://${SERVER_IP}:3000"
echo ""
echo "📊 유용한 명령어:"
echo "   ssh ${SSH_OPTS} ${SERVER_USER}@${SERVER_IP}"
echo "   cd ${PROJECT_DIR}"
echo "   docker compose logs -f app       # 실시간 로그"
echo "   docker compose ps                 # 상태 확인"
echo "   docker compose restart app        # 재시작"
