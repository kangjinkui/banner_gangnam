# load-env.ps1
# PowerShell script to load environment variables from .env file

$envFile = ".env"

if (-Not (Test-Path $envFile)) {
    Write-Error ".env file not found! Please create it from .env.example"
    Write-Host "Run: cp .env.example .env" -ForegroundColor Yellow
    exit 1
}

Write-Host "Loading environment variables from $envFile..." -ForegroundColor Green
Write-Host ""

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
        Write-Host "  ✓ $name = $value" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "Environment variables loaded successfully!" -ForegroundColor Green
Write-Host "You can now use commands from commands.json" -ForegroundColor Yellow
Write-Host ""
Write-Host "Examples:" -ForegroundColor White
Write-Host "  gcloud compute ssh `$env:VM_USER@`$env:VM_INSTANCE_NAME --zone=`$env:VM_ZONE" -ForegroundColor Gray
Write-Host "  gcloud compute instances list" -ForegroundColor Gray
