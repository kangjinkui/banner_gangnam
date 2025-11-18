#!/bin/bash

# SSL 인증서 갱신 스크립트
# Cron으로 실행: 0 3 1 * * /path/to/renew-ssl.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== SSL 인증서 갱신 시작 ===${NC}"

# Navigate to project directory
cd "$(dirname "$0")/.."

# Renew certificates
docker run --rm \
    -v $(pwd)/nginx/ssl:/etc/letsencrypt \
    -v $(pwd)/nginx/webroot:/var/www/certbot \
    certbot/certbot renew

# Reload nginx if renewal was successful
if [ $? -eq 0 ]; then
    echo -e "${YELLOW}Nginx 재로드 중...${NC}"
    docker-compose exec nginx nginx -s reload
    echo -e "${GREEN}=== 인증서 갱신 완료 ===${NC}"
else
    echo -e "${RED}=== 인증서 갱신 실패 ===${NC}"
    exit 1
fi
