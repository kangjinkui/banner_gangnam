# VM HTTPS 설정 - 빠른 가이드

## DNS 확인 (nslookup 없이)

```bash
# 방법 1: dig 사용
dig +short banner.yourdomain.com

# 방법 2: host 사용
host banner.yourdomain.com

# 방법 3: getent 사용
getent hosts banner.yourdomain.com

# 방법 4: ping 사용
ping -c 1 banner.yourdomain.com

# 공인 IP 확인
curl ifconfig.me
# 또는
curl icanhazip.com
# 또는
wget -qO- ifconfig.me
```

## nslookup 설치 (선택사항)

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install dnsutils -y

# CentOS/RHEL
sudo yum install bind-utils -y
```

---

## HTTPS 설정 전체 명령어 (복사-붙여넣기용)

### 1. DNS 확인 (dig 사용)

```bash
# 도메인의 IP 확인
dig +short YOUR_DOMAIN.com

# 본인 VM의 공인 IP 확인
curl ifconfig.me

# 두 IP가 같아야 합니다!
```

### 2. 방화벽 확인 및 설정

```bash
# GCP 방화벽 규칙 확인
gcloud compute firewall-rules list

# HTTP 포트 열기
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow HTTP"

# HTTPS 포트 열기
gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow HTTPS"
```

### 3. 프로젝트 디렉토리로 이동

```bash
cd ~/banner_gangnam01
# 또는
cd /path/to/your/project
```

### 4. 필수 디렉토리 생성

```bash
mkdir -p nginx/webroot/.well-known/acme-challenge
mkdir -p nginx/ssl
```

### 5. 기존 Nginx 중지

```bash
sudo docker-compose stop nginx
# 또는 전체 중지
# sudo docker-compose down
```

### 6. SSL 인증서 발급 (Let's Encrypt)

**⚠️ 아래 명령어에서 YOUR_DOMAIN.com과 YOUR_EMAIL@example.com을 본인 것으로 변경하세요!**

```bash
sudo docker run -it --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -v $(pwd)/nginx/webroot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --preferred-challenges http \
  -d YOUR_DOMAIN.com \
  --email YOUR_EMAIL@example.com \
  --agree-tos \
  --no-eff-email
```

### 7. 인증서 확인

```bash
sudo ls -la nginx/ssl/live/YOUR_DOMAIN.com/

# 다음 파일들이 보여야 합니다:
# fullchain.pem
# privkey.pem
# cert.pem
# chain.pem
```

### 8. Nginx 설정 파일 수정

```bash
# 백업 생성
cp nginx/nginx.conf nginx/nginx.conf.bak

# 에디터로 열기 (nano 또는 vim)
nano nginx/nginx.conf
```

**수정할 내용:**

1. **67번 줄부터 HTTPS server 블록 주석 해제**
   - 각 줄 앞의 `#` 제거

2. **68번 줄: 도메인 변경**
   ```nginx
   server_name YOUR_DOMAIN.com;
   ```

3. **71-72번 줄: 인증서 경로 수정**
   ```nginx
   ssl_certificate /etc/nginx/ssl/live/YOUR_DOMAIN.com/fullchain.pem;
   ssl_certificate_key /etc/nginx/ssl/live/YOUR_DOMAIN.com/privkey.pem;
   ```

저장: `Ctrl + O` → `Enter` → `Ctrl + X`

### 9. 자동 스크립트 사용 (대안)

위 수동 과정 대신 sed로 자동 변경:

```bash
# YOUR_DOMAIN.com을 본인 도메인으로 변경
DOMAIN="YOUR_DOMAIN.com"

# 도메인 자동 치환
sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf

# HTTPS 서버 블록 주석 해제 (66-128번 줄)
sed -i '66,128s/^    #/    /' nginx/nginx.conf
sed -i '66s/^    # server {/    server {/' nginx/nginx.conf
sed -i '128s/^    # }/    }/' nginx/nginx.conf
```

### 10. Nginx 설정 테스트

```bash
# Nginx 설정 문법 체크
sudo docker run --rm \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  nginx:alpine nginx -t

# "syntax is ok" 가 나와야 합니다
```

### 11. Docker Compose 재시작

```bash
# Nginx만 재시작
sudo docker-compose up -d nginx

# 또는 전체 재시작
# sudo docker-compose up -d

# 로그 확인
sudo docker logs banner_gangnam_nginx
```

### 12. HTTPS 접속 테스트

```bash
# 커맨드라인에서 테스트
curl -I https://YOUR_DOMAIN.com

# 브라우저에서 접속
# https://YOUR_DOMAIN.com
```

---

## HTTP → HTTPS 자동 리디렉션 설정

### nginx.conf 추가 수정

```bash
nano nginx/nginx.conf
```

**130-135번 줄 주석 해제:**
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name YOUR_DOMAIN.com;
    return 301 https://$server_name$request_uri;
}
```

**그리고 13-61번 줄 (기존 HTTP 서버 블록) 주석 처리 또는 삭제**

```bash
# Nginx 재시작
sudo docker-compose restart nginx
```

---

## 자동 갱신 설정 (Let's Encrypt 인증서는 90일 유효)

### 방법 1: Crontab 설정

```bash
# Crontab 편집
sudo crontab -e

# 다음 줄 추가 (매월 1일 새벽 3시 갱신)
0 3 1 * * cd /home/$(whoami)/banner_gangnam01 && docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt certbot/certbot renew && docker-compose restart nginx
```

### 방법 2: 갱신 테스트

```bash
# 갱신 테스트 (실제로 갱신하지 않고 테스트만)
sudo docker run --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  certbot/certbot renew --dry-run
```

### 방법 3: Docker Compose Certbot 서비스 활성화

```bash
# docker-compose.yml 수정
nano docker-compose.yml

# 99-111번 줄의 certbot 섹션 주석 해제
```

수정 후:
```bash
sudo docker-compose up -d certbot
```

---

## 전체 과정 한 번에 실행 (스크립트)

```bash
#!/bin/bash

# 사용자 입력
read -p "도메인 입력 (예: banner.example.com): " DOMAIN
read -p "이메일 입력 (예: admin@example.com): " EMAIL

# 디렉토리 생성
mkdir -p nginx/webroot/.well-known/acme-challenge
mkdir -p nginx/ssl

# Nginx 중지
sudo docker-compose stop nginx

# SSL 인증서 발급
sudo docker run -it --rm \
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

# 인증서 확인
if [ ! -f "nginx/ssl/live/$DOMAIN/fullchain.pem" ]; then
    echo "❌ 인증서 발급 실패!"
    exit 1
fi

# Nginx 설정 업데이트
cp nginx/nginx.conf nginx/nginx.conf.bak
sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf
sed -i '66,128s/^    #/    /' nginx/nginx.conf

# Nginx 재시작
sudo docker-compose up -d nginx

echo "✅ HTTPS 설정 완료!"
echo "브라우저에서 https://$DOMAIN 으로 접속하세요."
```

위 스크립트를 `setup-ssl-simple.sh`로 저장하고:

```bash
chmod +x setup-ssl-simple.sh
./setup-ssl-simple.sh
```

---

## 문제 해결

### 1. "Failed to connect to ... port 80"

```bash
# 방화벽 확인
sudo ufw status
gcloud compute firewall-rules list

# 포트 80이 이미 사용 중인지 확인
sudo netstat -tuln | grep :80
sudo lsof -i :80

# Docker 컨테이너 확인
docker ps
```

### 2. "DNS problem: NXDOMAIN"

```bash
# DNS 전파 확인
dig +short $DOMAIN
host $DOMAIN
ping -c 1 $DOMAIN

# DNS가 VM IP를 가리키는지 확인
```

### 3. "Certificate not found"

```bash
# 인증서 위치 확인
sudo find nginx/ssl -name "fullchain.pem"

# 권한 확인
sudo ls -lah nginx/ssl/live/
```

### 4. Nginx 설정 오류

```bash
# Nginx 설정 테스트
sudo docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t

# 로그 확인
sudo docker logs banner_gangnam_nginx
```

---

## 완료 체크리스트

- [ ] DNS A 레코드 설정 완료 (도메인 → VM IP)
- [ ] 방화벽 포트 80, 443 오픈
- [ ] SSL 인증서 발급 성공
- [ ] nginx.conf 수정 완료 (도메인, 인증서 경로)
- [ ] Nginx 재시작 성공
- [ ] HTTPS 접속 확인 (https://your-domain.com)
- [ ] 모바일에서 위치 권한 테스트
- [ ] HTTP → HTTPS 리디렉션 설정 (선택)
- [ ] 자동 갱신 cron 설정 (선택)

---

## 모바일 테스트

HTTPS 설정 후 모바일에서:

1. `https://YOUR_DOMAIN.com` 접속
2. 로그인 테스트
3. 현수막 등록 페이지로 이동
4. "현재 위치 가져오기" 버튼 클릭
5. 위치 권한 허용
6. 주소가 자동으로 입력되는지 확인
7. 현수막 등록 테스트

모든 기능이 정상 작동해야 합니다! 🎉
