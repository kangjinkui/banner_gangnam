#!/bin/bash

# SSL 인증서 발급 스크립트
# 사용법: ./scripts/setup-ssl.sh your-domain.com your-email@example.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -ne 2 ]; then
    echo -e "${RED}사용법: $0 <domain> <email>${NC}"
    echo "예시: $0 banner.example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo -e "${GREEN}=== SSL 인증서 발급 시작 ===${NC}"
echo "도메인: $DOMAIN"
echo "이메일: $EMAIL"
echo ""

# Check if domain resolves to this server
echo -e "${YELLOW}1. DNS 확인 중...${NC}"
PUBLIC_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

echo "서버 공인 IP: $PUBLIC_IP"
echo "도메인 IP: $DOMAIN_IP"

if [ "$PUBLIC_IP" != "$DOMAIN_IP" ]; then
    echo -e "${RED}경고: 도메인이 이 서버의 IP를 가리키지 않습니다!${NC}"
    echo "계속 진행하시겠습니까? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
fi

# Create directories
echo -e "${YELLOW}2. 디렉토리 생성 중...${NC}"
mkdir -p nginx/ssl
mkdir -p nginx/webroot/.well-known/acme-challenge

# Stop nginx if running
echo -e "${YELLOW}3. Nginx 중지 중...${NC}"
docker-compose stop nginx 2>/dev/null || true

# Request certificate using standalone mode
echo -e "${YELLOW}4. SSL 인증서 발급 중...${NC}"
docker run -it --rm \
    -v $(pwd)/nginx/ssl:/etc/letsencrypt \
    -v $(pwd)/nginx/webroot:/var/www/certbot \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email

if [ $? -ne 0 ]; then
    echo -e "${RED}인증서 발급 실패!${NC}"
    exit 1
fi

# Update nginx.conf with domain
echo -e "${YELLOW}5. Nginx 설정 업데이트 중...${NC}"
sed -i.bak "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf

# Uncomment HTTPS server block
sed -i 's/# server {/server {/g' nginx/nginx.conf
sed -i 's/#     /    /g' nginx/nginx.conf

echo -e "${YELLOW}6. Nginx 재시작 중...${NC}"
docker-compose up -d nginx

echo ""
echo -e "${GREEN}=== SSL 인증서 발급 완료! ===${NC}"
echo ""
echo "다음 단계:"
echo "1. https://$DOMAIN 에 접속하여 확인"
echo "2. HTTP → HTTPS 자동 리디렉션을 활성화하려면:"
echo "   nginx/nginx.conf 파일에서 마지막 server 블록의 주석을 해제하세요"
echo "3. 자동 갱신을 활성화하려면:"
echo "   docker-compose.yml 파일에서 certbot 서비스의 주석을 해제하세요"
echo ""
echo "인증서 갱신 테스트:"
echo "docker run --rm -v \$(pwd)/nginx/ssl:/etc/letsencrypt certbot/certbot renew --dry-run"
