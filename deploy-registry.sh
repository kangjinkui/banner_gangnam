#!/bin/bash
set -e

# ────────────────────────────────────────────
# 로컬 빌드 → DigitalOcean Container Registry 푸시
#
# 서버는 이 이미지를 웹콘솔에서 pull 하기만 하면 된다.
# SSH 를 쓰지 않으므로 아웃바운드 22번이 막힌 회선에서도 동작한다.
#
# 사용법:
#   bash deploy-registry.sh              # 빌드 + 푸시
#   SKIP_BUILD=1 bash deploy-registry.sh # 기존 이미지 그대로 푸시
# ────────────────────────────────────────────

REGISTRY="registry.digitalocean.com"
REGISTRY_NAME="banner-gangnam"
IMAGE_NAME="banner_gangnam"

# 로컬 compose 가 만드는 이미지 이름 (프로젝트 디렉터리명 기준)
LOCAL_IMAGE="banner_gangnam-app:latest"

# 서버 compose 가 기대하는 이미지 이름 (서버 디렉터리는 banner_gangnam01)
SERVER_IMAGE="banner_gangnam01-app:latest"

REMOTE="${REGISTRY}/${REGISTRY_NAME}/${IMAGE_NAME}"
DATE_TAG="$(date +%Y%m%d)"

SKIP_BUILD="${SKIP_BUILD:-0}"

# ── doctl 확인 ──────────────────────────────
# winget 설치 직후에는 PATH 에 반영되지 않아 전체 경로로 잡는다.
if command -v doctl &> /dev/null; then
  DOCTL="doctl"
elif [ -x "${LOCALAPPDATA}/Microsoft/WinGet/Packages/DigitalOcean.Doctl_Microsoft.Winget.Source_8wekyb3d8bbwe/doctl.exe" ]; then
  DOCTL="${LOCALAPPDATA}/Microsoft/WinGet/Packages/DigitalOcean.Doctl_Microsoft.Winget.Source_8wekyb3d8bbwe/doctl.exe"
else
  echo "❌ doctl 을 찾을 수 없습니다."
  echo "   설치: winget install --id DigitalOcean.Doctl -e"
  echo "   인증: doctl auth init"
  exit 1
fi

if ! "$DOCTL" account get &> /dev/null; then
  echo "❌ doctl 인증이 안 되어 있습니다. 별도 터미널에서 실행하세요:"
  echo "   doctl auth init"
  exit 1
fi

# ── .env 확인 ──────────────────────────────
# compose 가 빌드 인자로 직접 읽으므로 export 는 필요 없다. 존재만 확인한다.
if [ ! -f .env ]; then
  echo "❌ .env 파일이 없습니다. .env.example 을 복사해 채우세요."
  exit 1
fi

echo ""
if [ "$SKIP_BUILD" = "1" ]; then
  echo "⏭️  Step 1/4: 빌드 건너뜀 (SKIP_BUILD=1)"
  if ! docker image inspect "$LOCAL_IMAGE" &> /dev/null; then
    echo "❌ ${LOCAL_IMAGE} 이미지가 없습니다. SKIP_BUILD 없이 다시 실행하세요."
    exit 1
  fi
else
  echo "🔨 Step 1/4: 로컬에서 이미지 빌드..."
  # compose 가 .env 를 읽어 NEXT_PUBLIC_* 를 빌드 인자로 넣는다.
  docker compose build app
fi

echo ""
echo "🏷️  Step 2/4: 태그 부여 (latest, ${DATE_TAG})..."
docker tag "$LOCAL_IMAGE" "${REMOTE}:latest"
docker tag "$LOCAL_IMAGE" "${REMOTE}:${DATE_TAG}"

echo ""
echo "🔑 Step 3/4: 레지스트리 로그인..."
# Windows 에서 config.json rename 이 실패해도 자격증명은 credsStore 에 저장되므로
# 로그인 실패를 치명적으로 다루지 않고 푸시 결과로 판단한다.
"$DOCTL" registry login || echo "   ⚠️  로그인 경고 발생 — 푸시로 실제 인증 여부를 확인합니다."

echo ""
echo "📤 Step 4/4: 푸시..."
docker push "${REMOTE}:latest"
docker push "${REMOTE}:${DATE_TAG}"

# RepoDigests 에는 로컬 태그 항목도 섞여 있어 sha 부분만 추출한다.
DIGEST=$(docker image inspect "${REMOTE}:latest" --format '{{index .RepoDigests 0}}' 2>/dev/null | sed 's/.*@//' || echo "확인 불가")

echo ""
echo "🎉 푸시 완료!"
echo "   이미지: ${REMOTE}:latest"
echo "   태그  : latest, ${DATE_TAG}"
echo "   digest: ${DIGEST}"
echo ""
echo "────────────────────────────────────────────"
echo " 서버 배포 — DO 웹콘솔(Droplet Console)에 붙여넣기"
echo "────────────────────────────────────────────"
cat <<EOF

cd /var/www/banner_gangnam01

# 롤백 지점 확보
docker tag ${SERVER_IMAGE} banner_gangnam01-app:rollback

# 새 이미지 받아서 compose 가 기대하는 이름으로 태그
docker pull ${REMOTE}:latest
docker tag ${REMOTE}:latest ${SERVER_IMAGE}

# 교체 (수 초 다운타임)
docker compose up -d --no-build

# 검증
sleep 20
docker compose ps
curl -s localhost:3000/api/health; echo

EOF
echo "최초 1회만 서버에서 레지스트리 로그인이 필요합니다 (한 줄씩 따로 실행):"
echo ""
echo "  read -rsp \"DO 토큰: \" TOK; echo"
echo "  echo \"\$TOK\" | docker login ${REGISTRY} -u \"\$TOK\" --password-stdin && unset TOK"
echo ""
echo "롤백이 필요하면:"
echo ""
echo "  docker tag banner_gangnam01-app:rollback ${SERVER_IMAGE}"
echo "  docker rm -f banner_gangnam_app && docker compose up -d --no-build"
echo ""
