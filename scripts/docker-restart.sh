#!/bin/bash

echo "🐳 Docker 컨테이너 재시작 중..."

# 기존 컨테이너 중지
echo "📦 기존 컨테이너 중지..."
docker-compose down

# 이미지 재빌드
echo "🔨 이미지 재빌드 중..."
docker-compose build

# 컨테이너 시작
echo "🚀 컨테이너 시작 중..."
docker-compose up -d

# 상태 확인
echo ""
echo "✅ 컨테이너 상태:"
docker-compose ps

echo ""
echo "📋 App 로그 (Ctrl+C로 종료):"
docker-compose logs -f app
