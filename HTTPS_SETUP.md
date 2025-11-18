# VM에서 HTTPS 설정 가이드

이 가이드는 Google Cloud VM (또는 다른 VM)에서 Let's Encrypt를 사용하여 무료 SSL 인증서를 설치하는 방법을 안내합니다.

## 사전 요구사항

1. **도메인 이름**: 소유한 도메인이 VM의 공인 IP 주소를 가리켜야 합니다
   - 예: `banner.yourdomain.com` → `34.64.123.456`
2. **방화벽 설정**: 포트 80, 443이 열려있어야 합니다
3. **VM 접속**: SSH로 VM에 접속 가능해야 합니다

---

## 방법 1: Certbot + Docker (권장)

### 1단계: 방화벽 규칙 확인

```bash
# GCP 방화벽 규칙 확인
gcloud compute firewall-rules list

# 포트 80, 443이 없으면 추가
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow HTTP traffic"

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow HTTPS traffic"
```

### 2단계: 도메인 DNS 설정

도메인 제공업체(Cloudflare, Namecheap 등)에서:

1. A 레코드 추가: `banner.yourdomain.com` → `VM_공인_IP`
2. DNS 전파 확인 (최대 48시간, 보통 몇 분):

```bash
# DNS 확인
nslookup banner.yourdomain.com
# 또는
dig banner.yourdomain.com
```

### 3단계: Docker Compose 수정

```bash
cd /path/to/banner_gangnam01
```

**docker-compose.yml 수정**:
- Certbot 서비스 추가
- Nginx 볼륨 추가

### 4단계: Certbot으로 SSL 인증서 발급

```bash
# 1. Nginx를 HTTP만으로 먼저 시작 (Certbot 검증용)
sudo docker-compose up -d nginx

# 2. Certbot으로 인증서 발급 (standalone 모드)
sudo docker run -it --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  --preferred-challenges http \
  -d banner.yourdomain.com \
  --email your-email@example.com \
  --agree-tos

# 또는 webroot 모드 (Nginx가 실행 중일 때)
sudo docker run -it --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -v $(pwd)/nginx/webroot:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d banner.yourdomain.com \
  --email your-email@example.com \
  --agree-tos
```

### 5단계: SSL 인증서 파일 확인

```bash
# 인증서가 생성된 위치 확인
sudo ls -la nginx/ssl/live/banner.yourdomain.com/

# 다음 파일들이 있어야 함:
# - fullchain.pem (인증서 + 체인)
# - privkey.pem (개인키)
```

### 6단계: Nginx SSL 설정 적용

```bash
# nginx.conf가 이미 업데이트되어 있으므로 재시작
sudo docker-compose restart nginx

# 또는 전체 재시작
sudo docker-compose down
sudo docker-compose up -d
```

### 7단계: HTTPS 접속 확인

브라우저에서 `https://banner.yourdomain.com`으로 접속하여 확인

### 8단계: 자동 갱신 설정 (인증서는 90일 유효)

```bash
# Crontab 설정
sudo crontab -e

# 매월 1일 새벽 3시에 인증서 갱신 시도
0 3 1 * * docker run --rm -v /path/to/nginx/ssl:/etc/letsencrypt certbot/certbot renew && docker-compose -f /path/to/docker-compose.yml restart nginx
```

---

## 방법 2: VM에 직접 Certbot 설치

### Ubuntu/Debian

```bash
# 1. Certbot 설치
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# 2. SSL 인증서 발급
sudo certbot --nginx -d banner.yourdomain.com

# 3. 자동 갱신 확인
sudo certbot renew --dry-run
```

### CentOS/RHEL

```bash
# 1. EPEL 저장소 추가
sudo yum install epel-release -y

# 2. Certbot 설치
sudo yum install certbot python3-certbot-nginx -y

# 3. SSL 인증서 발급
sudo certbot --nginx -d banner.yourdomain.com
```

---

## 방법 3: 자체 서명 인증서 (개발/테스트용)

**주의**: 자체 서명 인증서는 브라우저에서 경고가 표시되며, **프로덕션에는 사용 불가**합니다.

```bash
# SSL 디렉토리 생성
mkdir -p nginx/ssl

# 자체 서명 인증서 생성 (10년 유효)
openssl req -x509 -nodes -days 3650 \
  -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=KR/ST=Seoul/L=Gangnam/O=Banner/CN=localhost"

# 권한 설정
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

---

## 문제 해결

### 1. Certbot 검증 실패
```bash
# 포트 80이 열려있는지 확인
sudo netstat -tuln | grep :80

# 방화벽 확인
sudo ufw status
sudo firewall-cmd --list-all
```

### 2. DNS가 전파되지 않음
```bash
# DNS 전파 확인
nslookup banner.yourdomain.com
ping banner.yourdomain.com

# DNS 캐시 클리어 (로컬)
# Windows: ipconfig /flushdns
# Mac: sudo dscacheutil -flushcache
# Linux: sudo systemd-resolve --flush-caches
```

### 3. 인증서 파일을 찾을 수 없음
```bash
# Let's Encrypt 인증서 위치
ls -la /etc/letsencrypt/live/your-domain.com/

# Docker 볼륨 확인
docker volume ls
docker volume inspect banner_gangnam01_certbot_data
```

### 4. Nginx 시작 실패
```bash
# Nginx 로그 확인
sudo docker logs banner_gangnam_nginx

# 설정 파일 테스트
sudo docker exec banner_gangnam_nginx nginx -t
```

---

## 모바일 테스트

HTTPS 설정 후:

1. 모바일 브라우저에서 `https://banner.yourdomain.com` 접속
2. 위치 권한 허용
3. "현재 위치 가져오기" 버튼 테스트
4. 현수막 등록 테스트

---

## 보안 강화 (선택사항)

### HTTP → HTTPS 자동 리디렉션

nginx.conf에서 이미 설정되어 있음 (아래 참조)

### HSTS (HTTP Strict Transport Security)

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### SSL Labs 테스트

https://www.ssllabs.com/ssltest/ 에서 SSL 설정 품질 확인

---

## 참고 자료

- Let's Encrypt: https://letsencrypt.org/
- Certbot 문서: https://certbot.eff.org/
- Nginx SSL 설정: https://nginx.org/en/docs/http/configuring_https_servers.html
