# Deployment Helper v2 - 환경변수 기반 배포 도구

## 개요

이 도구는 GCP VM 인스턴스 배포 시 VM별 설정 정보를 환경변수(.env)로 관리하여, 여러 VM 환경에서 재사용 가능한 배포 명령어를 제공합니다.

## 주요 개선사항

### v1 (기존)
- VM 정보가 commands.json에 하드코딩됨
- 다른 VM 사용 시 commands.json 직접 수정 필요
- 실수로 잘못된 VM에 명령어 실행 위험

### v2 (새 버전)
- VM 정보를 .env 파일로 분리
- .env 파일만 교체하면 다른 VM 환경에서 동일한 commands.json 사용 가능
- 환경변수 참조 방식으로 유연성 증대

## 설치 및 설정

### 1. .env 파일 생성

```bash
cd deployment-helper/v2
cp .env.example .env
```

### 2. .env 파일 편집

`.env` 파일을 열어 본인의 VM 정보로 수정:

```bash
# GCP VM Configuration
VM_INSTANCE_NAME=instance-20251020-140632
VM_ZONE=asia-northeast3-a
VM_USER=haeryongdoryong
VM_EXTERNAL_IP=34.158.217.123

# GCP Project Configuration
GCP_PROJECT_ID=your-gcp-project-id

# Path Configuration
LOCAL_PROJECT_PATH=d:\Coding\gangubuy-restaurant
VM_PROJECT_PATH=/opt/gangubuy-restaurant

# Database Configuration
POSTGRES_USER=gangubuy-restaurant_user
POSTGRES_DB=gangubuy-restaurant_db
```

### 3. 환경변수 설정 방법

#### Windows (PowerShell)

```powershell
# .env 파일에서 환경변수 로드
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.+)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        Write-Host "Set $name = $value"
    }
}
```

또는 PowerShell 스크립트 사용:

```powershell
# load-env.ps1 스크립트 실행
.\load-env.ps1
```

#### Linux/Mac (Bash)

```bash
# .env 파일에서 환경변수 로드
export $(cat .env | grep -v '^#' | xargs)
```

## 사용 방법

### 1. 환경변수 로드 후 명령어 실행

```powershell
# PowerShell에서
.\load-env.ps1

# 이제 commands.json의 명령어들이 올바른 환경변수를 참조합니다
gcloud compute ssh ${VM_USER}@${VM_INSTANCE_NAME} --zone=${VM_ZONE}
```

### 2. 여러 VM 환경 관리

각 VM 환경별로 별도의 .env 파일 생성:

```
deployment-helper/v2/
├── .env.example          # 템플릿
├── .env.dev             # 개발 서버
├── .env.staging         # 스테이징 서버
├── .env.production      # 프로덕션 서버
└── commands.json        # 공통 명령어 파일
```

사용 시:

```powershell
# 개발 환경
cp .env.dev .env
.\load-env.ps1

# 스테이징 환경으로 변경
cp .env.staging .env
.\load-env.ps1
```

## 환경변수 목록

### GCP VM Configuration
| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VM_INSTANCE_NAME` | VM 인스턴스 이름 | `instance-20251020-140632` |
| `VM_ZONE` | VM이 위치한 Zone | `asia-northeast3-a` |
| `VM_USER` | SSH 접속 사용자명 | `haeryongdoryong` |
| `VM_EXTERNAL_IP` | VM 외부 IP 주소 | `34.158.217.123` |

### GCP Project Configuration
| 변수명 | 설명 | 예시 |
|--------|------|------|
| `GCP_PROJECT_ID` | GCP 프로젝트 ID | `my-project-123` |

### Path Configuration
| 변수명 | 설명 | 예시 |
|--------|------|------|
| `LOCAL_PROJECT_PATH` | 로컬 프로젝트 경로 | `d:\Coding\gangubuy-restaurant` |
| `VM_PROJECT_PATH` | VM 내부 프로젝트 경로 | `/opt/gangubuy-restaurant` |

### Database Configuration
| 변수명 | 설명 | 예시 |
|--------|------|------|
| `POSTGRES_USER` | PostgreSQL 사용자명 | `gangubuy-restaurant_user` |
| `POSTGRES_DB` | PostgreSQL 데이터베이스명 | `gangubuy-restaurant_db` |

## PowerShell 환경변수 로드 스크립트

`load-env.ps1` 파일 생성:

```powershell
# load-env.ps1
$envFile = ".env"

if (-Not (Test-Path $envFile)) {
    Write-Error ".env file not found! Please create it from .env.example"
    exit 1
}

Write-Host "Loading environment variables from $envFile..." -ForegroundColor Green

Get-Content $envFile | ForEach-Object {
    # 주석과 빈 줄 무시
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') {
        return
    }

    # KEY=VALUE 형식 파싱
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()

        # 현재 프로세스에 환경변수 설정
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        Write-Host "  ✓ $name" -ForegroundColor Cyan
    }
}

Write-Host "`nEnvironment variables loaded successfully!" -ForegroundColor Green
Write-Host "You can now use commands from commands.json" -ForegroundColor Yellow
```

## commands.json 사용 예시

### SSH 접속
```bash
# .env에 설정된 VM으로 SSH 접속
gcloud compute ssh ${VM_USER}@${VM_INSTANCE_NAME} --zone=${VM_ZONE}
```

### 파일 전송
```bash
# 로컬 → VM으로 파일 전송
gcloud compute scp --recurse "${LOCAL_PROJECT_PATH}\backend\src" ${VM_USER}@${VM_INSTANCE_NAME}:${VM_PROJECT_PATH}/backend/ --zone=${VM_ZONE}
```

### Docker 배포
```bash
# VM에서 Docker Compose 실행
cd ${VM_PROJECT_PATH} && sudo docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## 주의사항

1. `.env` 파일은 절대 Git에 커밋하지 마세요 (민감한 정보 포함)
2. `.env.example`은 템플릿이므로 Git에 포함되어야 합니다
3. PowerShell에서 환경변수는 현재 프로세스에만 적용되므로, 새 터미널 창에서는 다시 로드해야 합니다
4. Windows 경로는 백슬래시(`\`)를 사용하고, VM 경로는 슬래시(`/`)를 사용합니다

## 트러블슈팅

### 환경변수가 적용되지 않을 때
```powershell
# 환경변수 확인
$env:VM_INSTANCE_NAME
$env:VM_ZONE

# 재로드
.\load-env.ps1
```

### .env 파일 인코딩 문제
- UTF-8 (BOM 없음) 인코딩으로 저장하세요
- Notepad++, VS Code 등에서 인코딩 확인 가능

### 명령어 실행 오류
```powershell
# 환경변수 직접 확인
Write-Host "VM Instance: $env:VM_INSTANCE_NAME"
Write-Host "VM Zone: $env:VM_ZONE"
Write-Host "VM User: $env:VM_USER"
```

## 기존 v1과의 호환성

기존 [deployment-helper/commands.json](../commands.json)은 그대로 유지되므로, 기존 프로젝트에 영향을 주지 않습니다.

- v1: `deployment-helper/commands.json` (하드코딩된 값)
- v2: `deployment-helper/v2/commands.json` (환경변수 참조)

## Python GUI 도구

v2에는 환경변수를 GUI로 관리할 수 있는 Python 앱이 포함되어 있습니다.

### 설치

```bash
cd deployment-helper/v2
pip install -r requirements.txt
```

### 실행

```bash
python deployment_helper_v2.py
```

### 기능

- **좌측 패널**: 환경변수 편집 및 .env 파일 저장
- **우측 패널**: 환경변수가 자동으로 치환된 명령어 탭
- **클립보드 복사**: 버튼 클릭으로 명령어 복사
- **실시간 치환**: 환경변수 수정 시 즉시 명령어에 반영

## 향후 개선 사항

- [x] Bash 스크립트 추가 (Linux/Mac 지원)
- [ ] 환경변수 유효성 검사 스크립트
- [x] GUI 도구 개발 (환경변수 관리 UI)
- [ ] 다중 프로젝트 지원

## 라이선스

이 프로젝트는 gangubuy-restaurant 프로젝트의 일부입니다.
