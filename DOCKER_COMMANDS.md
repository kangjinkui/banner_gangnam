# Docker Compose 명령어 가이드

## 기본 명령어

```bash
# 특정 docker-compose 파일 지정하여 빌드
docker-compose -f docker-compose.yml build

# 특정 docker-compose 파일 지정하여 실행
docker-compose -f docker-compose.yml up -d

# 빌드 + 실행 한번에 (권장: env 파일 사용)
docker-compose --env-file .env.docker -f docker-compose.yml up -d --build
```

## 개별 서비스 빌드/실행

```bash
# 특정 서비스만 빌드
docker-compose -f docker-compose.yml build app

# 특정 서비스만 실행
docker-compose -f docker-compose.yml up -d app

# 여러 서비스 동시 실행
docker-compose -f docker-compose.yml up -d db app
```

## 유용한 옵션들

```bash
# 캐시 없이 재빌드
docker-compose -f docker-compose.yml build --no-cache

# 강제 재생성 (기존 컨테이너 삭제 후 재생성)
docker-compose -f docker-compose.yml up -d --force-recreate

# 이미지 pull 후 빌드
docker-compose -f docker-compose.yml build --pull

# 병렬 빌드 (속도 향상)
docker-compose -f docker-compose.yml build --parallel
```

## 중지 및 삭제

```bash
# 컨테이너 중지
docker-compose -f docker-compose.yml stop

# 컨테이너 중지 및 삭제
docker-compose -f docker-compose.yml down

# 볼륨까지 삭제
docker-compose -f docker-compose.yml down -v

# 이미지까지 삭제
docker-compose -f docker-compose.yml down --rmi all
```

## 로그 및 모니터링

```bash
# 전체 로그 확인
docker-compose -f docker-compose.yml logs -f

# 특정 서비스 로그만 확인
docker-compose -f docker-compose.yml logs -f app

# 최근 100줄만 확인
docker-compose -f docker-compose.yml logs --tail=100 -f

# 컨테이너 상태 확인
docker-compose -f docker-compose.yml ps

# 리소스 사용량 확인
docker-compose -f docker-compose.yml top
```

## 컨테이너 관리

```bash
# 특정 서비스 재시작
docker-compose -f docker-compose.yml restart app

# 특정 서비스 중지
docker-compose -f docker-compose.yml stop app

# 특정 서비스 시작
docker-compose -f docker-compose.yml start app

# 컨테이너 내부 접속
docker-compose -f docker-compose.yml exec app sh
docker-compose -f docker-compose.yml exec db psql -U postgres

# 명령어 실행
docker-compose -f docker-compose.yml exec app npm run build
```

## package.json 스크립트 설정

```json
"scripts": {
  "docker:build": "docker-compose -f docker-compose.yml build",
  "docker:up": "docker-compose -f docker-compose.yml --env-file .env.docker up -d",
  "docker:build-up": "docker-compose -f docker-compose.yml --env-file .env.docker up -d --build",
  "docker:down": "docker-compose -f docker-compose.yml down",
  "docker:logs": "docker-compose -f docker-compose.yml logs -f",
  "docker:restart": "docker-compose -f docker-compose.yml restart",
  "docker:ps": "docker-compose -f docker-compose.yml ps",
  "docker:exec": "docker-compose -f docker-compose.yml exec app sh"
}
```

## NPM 스크립트 실행

```bash
# 빌드만
npm run docker:build

# 실행만
npm run docker:up

# 빌드 + 실행
npm run docker:build-up

# 중지
npm run docker:down

# 로그 확인
npm run docker:logs

# 재시작
npm run docker:restart

# 상태 확인
npm run docker:ps

# 컨테이너 접속
npm run docker:exec
```

## 실전 사용 예시

### 처음 실행할 때 (권장 방법)
```bash
# 반드시 env 파일을 먼저 source하고 실행
source .env.docker && docker-compose --env-file .env.docker -f docker-compose.yml up -d --build

# 또는 간단하게 (Windows에서는 source 명령 불필요)
docker-compose --env-file .env.docker -f docker-compose.yml up -d --build
```

### 코드 수정 후 재배포
```bash
docker-compose -f docker-compose.yml build app
docker-compose -f docker-compose.yml up -d --force-recreate app
```

### 전체 재시작 (볼륨 유지)
```bash
docker-compose --env-file .env.docker -f docker-compose.yml down
docker-compose --env-file .env.docker -f docker-compose.yml up -d --build
```

### 전체 초기화 (볼륨 삭제)
```bash
docker-compose --env-file .env.docker -f docker-compose.yml down -v
docker-compose --env-file .env.docker -f docker-compose.yml up -d --build
```

## 여러 Compose 파일 사용

```bash
# 개발 환경
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 프로덕션 환경
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 환경별 env 파일 지정
docker-compose -f docker-compose.yml --env-file .env.production up -d
```
