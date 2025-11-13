# Docker 배포 가이드

Banner Gangnam 프로젝트를 Docker로 배포하는 방법을 설명합니다.

## 사전 요구사항

- Docker 20.10 이상
- Docker Compose 2.0 이상

## 빠른 시작

### 1. 환경 변수 설정

`.env.docker` 파일을 복사하여 환경 변수를 설정합니다:

```bash
cp .env.docker .env
```

`.env` 파일을 열어 다음 값들을 설정합니다:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Kakao Map API
NEXT_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=your_kakao_javascript_key

# PostgreSQL (로컬 DB 사용 시)
POSTGRES_PASSWORD=secure_password_here
```

### 2. Docker 이미지 빌드

```bash
docker-compose --env-file .env.docker -f docker-compose.yml up -d --build

#도커 다운
docker-compose --env-file .env.docker down

#전체 삭제 (볼륨까지):
docker-compose --env-file .env.docker down -v

npm run docker:build
```

또는 직접 명령어:

```bash
docker build -t banner-gangnam:latest .
```

### 3. 컨테이너 실행

전체 스택 (앱 + DB + Nginx) 실행:

```bash
npm run docker:up
```

또는 직접 명령어:

```bash
docker-compose --env-file .env up -d
```

### 4. 로그 확인

```bash
npm run docker:logs
```

또는:

```bash
docker-compose logs -f app
```

### 5. 접속

- **애플리케이션**: http://localhost:3000
- **Nginx 프록시** (활성화 시): http://localhost:80
- **Health Check**: http://localhost:3000/api/health

## Docker 명령어 모음

### 기본 명령어

```bash
# 이미지 빌드
npm run docker:build

# 컨테이너 시작
npm run docker:up

# 컨테이너 중지
npm run docker:down

# 로그 확인
npm run docker:logs

# 앱 재시작
npm run docker:restart

# 재빌드 및 재시작
npm run docker:rebuild
```

### 수동 명령어

```bash
# 개별 서비스 시작
docker-compose up -d app
docker-compose up -d db
docker-compose up -d nginx

# 특정 서비스 로그 확인
docker-compose logs -f app
docker-compose logs -f db

# 컨테이너 상태 확인
docker-compose ps

# 컨테이너 내부 접속
docker-compose exec app sh
docker-compose exec db psql -U postgres

# 볼륨 확인
docker volume ls

# 네트워크 확인
docker network ls
```

## 프로덕션 배포

### 1. 환경 최적화

프로덕션 환경에서는 다음을 확인하세요:

```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 2. SSL/TLS 설정 (Nginx)

`nginx/nginx.conf`에서 HTTPS 설정을 활성화합니다:

```bash
# SSL 인증서 디렉토리 생성
mkdir -p nginx/ssl

# 인증서 파일 복사
cp /path/to/cert.pem nginx/ssl/
cp /path/to/key.pem nginx/ssl/
```

### 3. 보안 강화

- `.env` 파일에 강력한 비밀번호 설정
- Nginx rate limiting 활성화
- 방화벽 설정
- 불필요한 포트 차단

### 4. 리소스 제한

`docker-compose.yml`에 리소스 제한 추가:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                      Nginx (Port 80)                     │
│                   Reverse Proxy + SSL                    │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│              Next.js App (Port 3000)                     │
│              Frontend + Backend API                      │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────┴──────────┐      ┌─────────┴─────────┐
│  PostgreSQL DB   │      │  Supabase Cloud   │
│   (Port 5432)    │      │  (External)       │
│   (Optional)     │      │                   │
└──────────────────┘      └───────────────────┘
```

## 트러블슈팅

### 빌드 실패

```bash
# 캐시 없이 재빌드
docker build --no-cache -t banner-gangnam:latest .
```

### 포트 충돌

```bash
# 사용 중인 포트 확인
netstat -an | grep 3000

# .env에서 포트 변경
APP_PORT=3001
```

### 데이터베이스 연결 실패

```bash
# DB 컨테이너 상태 확인
docker-compose logs db

# DB 컨테이너 재시작
docker-compose restart db
```

### 이미지 크기 최적화

현재 Dockerfile은 multi-stage build를 사용하여 최적화되어 있습니다:
- Dependencies layer caching
- Standalone output 사용
- Alpine Linux 베이스 이미지

## 로컬 개발 vs 프로덕션

### 로컬 개발
```bash
npm run dev
```

### Docker 개발 환경
```bash
docker-compose -f docker-compose.dev.yml up
```

### 프로덕션 배포
```bash
docker-compose --env-file .env.production up -d
```

## 백업 및 복원

### 데이터베이스 백업

```bash
docker-compose exec db pg_dump -U postgres banner_gangnam > backup.sql
```

### 데이터베이스 복원

```bash
docker-compose exec -T db psql -U postgres banner_gangnam < backup.sql
```

### 볼륨 백업

```bash
docker run --rm -v banner_gangnam_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## 모니터링

### 리소스 사용량 확인

```bash
docker stats
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

## 참고사항

- Supabase는 클라우드 서비스를 사용하는 것을 권장합니다
- 로컬 PostgreSQL은 개발/테스트 용도로만 사용하세요
- 프로덕션에서는 Nginx + SSL/TLS 설정을 반드시 활성화하세요
- 정기적으로 데이터베이스 백업을 수행하세요

## 추가 정보

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
