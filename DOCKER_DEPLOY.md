# Docker 배포 가이드

로컬에서 이미지를 빌드해 DigitalOcean Container Registry(DOCR)에 올리고,
서버는 웹콘솔에서 받아 교체하는 방식이다.

## 왜 이 방식인가

| 문제 | 해결 |
|---|---|
| 드롭릿이 1vCPU / 512MB 라서 서버에서 `npm run build` 가 버겁다 | 빌드는 로컬에서, 서버는 이미지만 받는다 |
| 일부 회선에서 아웃바운드 22번(SSH)이 막힌다 | 푸시/풀 모두 HTTPS(443). SSH 불필요 |
| 서버 빌드 캐시가 디스크를 잠식한다 (1.1GB 까지 쌓였던 이력) | 서버에서 빌드하지 않으므로 캐시가 생기지 않는다 |

## 환경

- **드롭릿**: `206.189.41.229` (1vCPU / 512MB / 10GB, sgp1)
- **도메인**: https://hbc.ai.kr (nginx + Let's Encrypt)
- **서버 경로**: `/var/www/banner_gangnam01`
- **레지스트리**: `registry.digitalocean.com/banner-gangnam` (sgp1, Starter 무료 500MB)
- **이미지 크기**: 약 283MB (압축 66MB) — 무료 한도 내

이미지 이름이 로컬과 서버에서 다르다. compose 가 `{디렉터리명}-{서비스명}` 으로 이미지를 만들기 때문이다.

| 위치 | 디렉터리 | 이미지 이름 |
|---|---|---|
| 로컬 | `banner_gangnam` | `banner_gangnam-app:latest` |
| 서버 | `banner_gangnam01` | `banner_gangnam01-app:latest` |

서버에서 받은 이미지에 `banner_gangnam01-app:latest` 태그를 붙여주는 이유가 이것이다.
그러면 `docker-compose.yml` 을 수정하지 않아도 compose 가 이미 빌드된 이미지로 인식한다.

## 사전 준비 (최초 1회)

### 로컬

```bash
winget install --id DigitalOcean.Doctl -e
doctl auth init   # DO API 토큰 (Read + Write) 입력
```

`doctl` 이 PATH 에 안 잡히면 새 터미널을 열거나 전체 경로를 쓴다.
`deploy-registry.sh` 는 winget 설치 경로를 자동으로 찾는다.

### 서버 (DO 웹콘솔 → Droplets → Console)

레지스트리 로그인. **한 줄씩 따로** 실행해야 한다.
여러 줄을 한 번에 붙여넣으면 `read` 가 다음 줄을 입력으로 삼켜 실패한다.

```bash
read -rsp "DO 토큰: " TOK; echo
```

```bash
echo "$TOK" | docker login registry.digitalocean.com -u "$TOK" --password-stdin && unset TOK
```

`Login Succeeded` 가 나오면 된다. 서버용으로는 읽기 전용 토큰을 별도 발급하는 편이 안전하다.

## 배포

### 1. 로컬 — 빌드 + 푸시

```bash
bash deploy-registry.sh
```

`SKIP_BUILD=1 bash deploy-registry.sh` 로 하면 기존 이미지를 그대로 푸시한다.
스크립트가 `latest` 와 날짜 태그(`YYYYMMDD`)를 함께 올리고,
마지막에 서버에 붙여넣을 명령을 출력한다.

### 2. 서버 — 교체 (DO 웹콘솔)

```bash
cd /var/www/banner_gangnam01

# 롤백 지점 확보
docker tag banner_gangnam01-app:latest banner_gangnam01-app:rollback

# 새 이미지 받아서 compose 가 기대하는 이름으로 태그
docker pull registry.digitalocean.com/banner-gangnam/banner_gangnam:latest
docker tag registry.digitalocean.com/banner-gangnam/banner_gangnam:latest banner_gangnam01-app:latest

# 교체 (수 초 다운타임)
docker compose up -d --no-build
```

`--no-build` 는 안전장치다. 이미지가 없을 때 512MB 서버에서 빌드를 시작하는 대신 에러를 낸다.

### 3. 검증

```bash
sleep 20
docker compose ps
curl -s localhost:3000/api/health; echo
```

- `docker compose ps` 에 `banner_gangnam_app` 과 `banner_gangnam_nginx` 가 모두 보여야 한다
- `uptime` 이 작은 값이면 새 컨테이너로 교체된 것이다
- 상태가 `health: starting` 이어도 정상이다. compose 헬스체크 `start_period` 가 40초다

외부 확인:

```bash
curl -s https://hbc.ai.kr/api/health
curl -s -o /dev/null -w "%{http_code}\n" https://hbc.ai.kr/
```

## 롤백

```bash
docker tag banner_gangnam01-app:rollback banner_gangnam01-app:latest
docker rm -f banner_gangnam_app && docker compose up -d --no-build
```

## 환경변수

`NEXT_PUBLIC_*` 는 **빌드 시점에** 클라이언트 번들로 인라인되므로 로컬 `.env` 값이 이미지에 박힌다.
그 외(`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`)는 **런타임에** 읽히므로
서버 `/var/www/banner_gangnam01/.env` 값이 쓰인다. 이 키만 바꿀 때는 재빌드가 필요 없다.

```bash
# 서버 .env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # 관리자 API 에 필요
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=<kakao js key>
NEXT_PUBLIC_KAKAO_REST_API_KEY=<kakao rest key>
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
APP_PORT=3000
```

`SUPABASE_SERVICE_ROLE_KEY` 가 없으면 `src/lib/database/supabase.ts` 의 `supabaseAdmin` 이
생성되지 않아 `/api/admin/users` 계열이 동작하지 않는다.

## 아키텍처

```
┌─────────────────────────────────────┐
│  Internet (80, 443)                 │
└──────────────┬──────────────────────┘
               │
     ┌─────────▼─────────┐
     │   Nginx Container │  (Reverse Proxy, SSL)
     │   Port: 80, 443   │
     └─────────┬─────────┘
               │
     ┌─────────▼─────────┐
     │  Next.js App      │  (Frontend + API, standalone)
     │  Container        │
     │  Port: 3000       │
     └─────────┬─────────┘
               │
     ┌─────────▼─────────┐
     │  Supabase Cloud   │  (DB + Storage)
     └───────────────────┘
```

- **app** — `banner_gangnam_app`. Next.js standalone 출력. `restart: unless-stopped`
- **nginx** — `banner_gangnam_nginx`. `nginx/nginx.conf`, 인증서는 `nginx/ssl` 볼륨 마운트

배포 시 nginx 는 건드리지 않는다. `docker-compose.server.yml` 에는 nginx 서비스가 없으므로
서버의 `docker-compose.yml` 을 그 파일로 덮어쓰면 안 된다.

## 로컬에서 도커로 띄우기

`nginx` 서비스는 `nginx/ssl` 인증서 디렉터리를 마운트하는데 로컬에는 없으므로 `app` 만 띄운다.

```bash
docker compose up -d --build app
# http://localhost:3000
docker compose logs -f app
docker compose down
```

## 운영 명령어

```bash
cd /var/www/banner_gangnam01

docker compose ps                    # 상태
docker compose logs -f app           # 실시간 로그
docker compose logs --tail=100 app   # 최근 100줄
docker compose restart app           # 재시작
docker compose exec app sh           # 컨테이너 쉘

docker stats                         # 리소스
docker system df                     # 디스크 사용량
```

## 디스크 관리

10GB 밖에 없으므로 주기적으로 확인한다.

```bash
df -h /
docker system df

docker builder prune -af    # 빌드 캐시
docker image prune -af      # 미사용 이미지 (실행 중 컨테이너의 이미지는 보존)
journalctl --vacuum-size=100M
apt-get clean
```

`docker image prune -af` 는 `:rollback` 태그가 붙은 이미지도 지우므로,
롤백 지점을 유지하려면 `docker image prune -f` (dangling 만) 를 쓴다.

### 컨테이너 로그 로테이션

설정하지 않으면 로그가 무한정 쌓인다. 실제로 `/var/log` 가 1GB 까지 커진 적이 있다.

```bash
cat > /etc/docker/daemon.json << 'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl restart docker
```

`systemctl restart docker` 는 컨테이너를 재시작시킨다. 새로 만들어지는 컨테이너부터 적용된다.

## 트러블슈팅

### `docker compose ps` 에 app 이 안 보이는데 앱은 돌고 있다

컨테이너가 compose 프로젝트 라벨 없이 떠 있는 상태다.
compose 가 "컨테이너 없음" 으로 판단해 새로 만들려다 이름 충돌로 실패한다.

```
Conflict. The container name "/banner_gangnam_app" is already in use
```

한 번 강제로 제거하고 compose 가 직접 만들게 하면 이후로는 정상 관리된다.

```bash
docker rm -f banner_gangnam_app
docker compose up -d --no-build
```

### `read` 로 토큰 입력이 안 된다

`username is empty` 가 나오면 여러 줄을 한꺼번에 붙여넣어 `read` 가 다음 줄을 삼킨 것이다.
`read` 줄만 따로 실행하고, 프롬프트가 뜬 뒤에 토큰을 붙여넣는다.

### `doctl registry login` 이 Access denied

Windows 에서 `~/.docker/config.json` rename 이 실패하는 경우가 있다.
`credsStore: desktop` 설정이면 자격증명은 Windows 자격증명 관리자에 저장되므로
경고가 나도 푸시가 되는지 확인한다. `deploy-registry.sh` 는 이 경고를 치명적으로 다루지 않는다.

### 컨테이너가 시작되지 않는다

```bash
docker compose logs app
cat .env                  # 키 누락 확인
free -h                   # 메모리/스왑
```

### 이미지 업로드가 실패한다

`nginx/nginx.conf` 의 `client_max_body_size` 를 확인한다.

```bash
docker compose restart nginx
```

## 이전 방식 (권장하지 않음)

| 스크립트 | 방식 | 문제 |
|---|---|---|
| `deploy.sh` | 서버에서 git pull + `docker compose build` | 512MB 서버에서 빌드. 캐시가 디스크 잠식 |
| `deploy-local-build.sh` | 로컬 빌드 → `docker save` → scp → `docker load` | SSH 필요. `docker-compose.server.yml` 로 덮어써 nginx 가 빠진다 |
| `deploy-to-do.sh` | rsync + PM2 | 도커를 쓰지 않는 구세대 방식 |

## 백업

데이터는 Supabase Cloud 에 있으므로 별도 백업은 불필요하다. `.env` 만 보관한다.

## 참고

- [DigitalOcean Container Registry](https://docs.digitalocean.com/products/container-registry/)
- [Next.js Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
