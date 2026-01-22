# Docker 배포 가이드

Digital Ocean 서버에 Docker를 이용하여 Next.js 프로젝트를 배포하는 방법입니다.

Digital Ocean 서버에 Docker를 이용하여 Next.js 프로젝트를 배포하는 방법입니다.

## 사전 준비

- Digital Ocean 서버 IP: `206.189.41.229`
- SSH 키로 서버 접속 가능해야 함
- 로컬에서 Git Bash 또는 WSL 사용

## 배포 절차

### 1단계: 자동 배포 스크립트 실행

```bash
# Git Bash에서 실행
bash deploy-docker.sh
```

스크립트가 자동으로 다음을 수행합니다:
- ✅ 서버에 Docker & Docker Compose 설치
- ✅ 프로젝트 파일 전송
- ✅ .env 파일 생성 (최초 1회)
- ✅ Docker 이미지 빌드
- ✅ 컨테이너 시작

### 2단계: 환경변수 설정 (최초 1회만)

첫 배포시 .env 파일을 수동으로 설정해야 합니다:

```bash
# 서버 접속
ssh root@206.189.41.229

# 프로젝트 디렉토리 이동
cd /var/www/banner_gangnam01

# 환경변수 파일 편집
nano .env
```

다음 내용을 실제 값으로 채워넣으세요:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key

# Kakao Map API
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=6f4a0b013fa4cd9542bb6af9232b9516
NEXT_PUBLIC_KAKAO_REST_API_KEY=fb649cbf91b24f21ad0d825caecad47a

# App Configuration
APP_PORT=3000
NGINX_PORT=80
NGINX_SSL_PORT=443
```

저장 후 종료: `Ctrl+X` → `Y` → `Enter`

### 3단계: 컨테이너 시작

.env 설정 후 다시 배포 스크립트 실행:

```bash
bash deploy-docker.sh
```

## 배포 확인

```bash
# 서버 접속
ssh root@206.189.41.229

# 컨테이너 상태 확인
cd /var/www/banner_gangnam01
docker-compose ps

# 로그 확인
docker-compose logs -f app
```

브라우저에서 접속:
- **HTTP**: http://206.189.41.229
- **Direct**: http://206.189.41.229:3000

## 주요 Docker 명령어

### 컨테이너 관리

```bash
cd /var/www/banner_gangnam01

# 전체 컨테이너 상태 확인
docker-compose ps

# 앱 로그 실시간 확인
docker-compose logs -f app

# 앱 재시작
docker-compose restart app

# 전체 중지
docker-compose down

# 전체 시작
docker-compose up -d

# 이미지 재빌드 후 시작
docker-compose up -d --build
```

### 개별 컨테이너 관리

```bash
# 앱 컨테이너만 재시작
docker-compose restart app

# Nginx만 재시작
docker-compose restart nginx

# 앱 컨테이너 쉘 접속
docker-compose exec app sh
```

### 디버깅

```bash
# 앱 로그 확인 (최근 100줄)
docker-compose logs --tail=100 app

# Nginx 로그 확인
docker-compose logs --tail=100 nginx

# 모든 컨테이너 로그
docker-compose logs --tail=50

# 컨테이너 내부 확인
docker-compose exec app sh
```

## 아키텍처

배포된 시스템은 다음과 같이 구성됩니다:

```
┌─────────────────────────────────────┐
│  Internet (80, 443)                 │
└──────────────┬──────────────────────┘
               │
     ┌─────────▼─────────┐
     │   Nginx Container │  (Reverse Proxy)
     │   Port: 80, 443   │
     └─────────┬─────────┘
               │
     ┌─────────▼─────────┐
     │  Next.js App      │  (Frontend + API)
     │  Container        │
     │  Port: 3000       │
     └─────────┬─────────┘
               │
     ┌─────────▼─────────┐
     │  Supabase Cloud   │  (Database + Storage)
     │  (External)       │
     └───────────────────┘
```

### 컨테이너 구성

1. **app** (Next.js Application)
   - Frontend + Backend API
   - 포트: 3000
   - 자동 재시작 활성화

2. **nginx** (Reverse Proxy)
   - HTTP/HTTPS 라우팅
   - 포트: 80, 443
   - Rate limiting, Gzip 압축
   - SSL 지원 (Let's Encrypt)

3. **Supabase Cloud** (External)
   - PostgreSQL 데이터베이스
   - Storage (이미지 업로드)

## SSL 인증서 설정 (선택사항)

도메인이 있다면 Let's Encrypt로 무료 SSL 인증서를 발급받을 수 있습니다:

```bash
# Certbot 설치
ssh root@206.189.41.229
apt-get update
apt-get install -y certbot

# SSL 인증서 발급
certbot certonly --standalone -d your-domain.com

# 인증서 복사
cp -r /etc/letsencrypt /var/www/banner_gangnam01/nginx/ssl/

# Nginx 재시작
cd /var/www/banner_gangnam01
docker-compose restart nginx
```

[nginx/nginx.conf](nginx/nginx.conf)에서 도메인 설정 변경 필요

## 트러블슈팅

### 포트가 이미 사용중인 경우

```bash
# 80번 포트 사용 프로세스 확인
sudo lsof -i :80

# 기존 Nginx 중지 (시스템 Nginx)
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### 컨테이너가 시작되지 않는 경우

```bash
# 로그 확인
docker-compose logs app

# .env 파일 확인
cat .env

# 이미지 재빌드
docker-compose build --no-cache
docker-compose up -d
```

### 이미지 업로드 실패

Nginx 설정에서 `client_max_body_size` 확인:

```bash
# nginx.conf 편집
nano nginx/nginx.conf

# 다음 라인 확인
client_max_body_size 20M;  # 필요시 증가

# 재시작
docker-compose restart nginx
```

## 업데이트 배포

코드 변경 후 재배포:

```bash
# 로컬에서 실행
bash deploy-docker.sh
```

또는 서버에서 직접:

```bash
ssh root@206.189.41.229
cd /var/www/banner_gangnam01
git pull  # Git 사용시
docker-compose up -d --build
```

## 백업

중요 데이터는 Supabase Cloud에 저장되므로 별도 백업 불필요.
환경변수 파일(.env)만 백업하세요:

```bash
# 로컬로 다운로드
scp root@206.189.41.229:/var/www/banner_gangnam01/.env .env.backup
```

## 모니터링

```bash
# 시스템 리소스 확인
docker stats

# 디스크 사용량
docker system df

# 사용하지 않는 이미지/컨테이너 정리
docker system prune -a
```

## 참고 링크

- [Docker Documentation](https://docs.docker.com/)
- [Next.js Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
