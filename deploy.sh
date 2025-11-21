#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print with color
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    print_error "docker not found. Please install docker."
    exit 1
fi

# Check if docker compose plugin is available
if ! docker compose version &> /dev/null; then
    print_error "docker compose not found. Please install docker compose plugin."
    exit 1
fi

print_info "Starting deployment process..."

# Step 1: Stop and remove containers
print_info "Stopping Docker containers..."
docker compose down || print_warn "No containers to stop"

# Step 2: Git pull (preserving local changes)
print_info "Pulling latest changes from Git..."
git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_info "Current branch: $CURRENT_BRANCH"

# Check for local changes
if ! git diff-index --quiet HEAD --; then
    print_warn "Local changes detected (will be preserved)"
    git stash push -m "Auto-stash before deploy $(date '+%Y-%m-%d %H:%M:%S')"
    git pull origin $CURRENT_BRANCH
    print_info "Restoring local changes..."
    git stash pop
else
    git pull origin $CURRENT_BRANCH
fi

# Step 3: Build and start containers
print_info "Building and starting Docker containers..."
docker compose build --no-cache
docker compose up -d

# Step 4: Wait for containers to start
print_info "Waiting for containers to start (40 seconds)..."
sleep 40

# Step 5: Health check
print_info "Performing health check..."
MAX_RETRIES=10
RETRY_COUNT=0
HEALTH_CHECK_PASSED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    print_info "Health check attempt $((RETRY_COUNT + 1))/$MAX_RETRIES..."

    # Check app container health
    APP_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' banner_gangnam_app 2>/dev/null || echo "unknown")

    if [ "$APP_HEALTH" = "healthy" ]; then
        print_info "App container is healthy"
        HEALTH_CHECK_PASSED=true
        break
    elif [ "$APP_HEALTH" = "unhealthy" ]; then
        print_error "App container is unhealthy"
        docker logs --tail=50 banner_gangnam_app
        exit 1
    else
        print_warn "App container health status: $APP_HEALTH (waiting...)"
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 10
done

if [ "$HEALTH_CHECK_PASSED" = false ]; then
    print_error "Health check failed after $MAX_RETRIES attempts"
    print_info "Container logs:"
    docker logs --tail=50 banner_gangnam_app
    exit 1
fi

# Step 6: Final status check
print_info "Checking container status..."
docker compose ps

# Step 7: Show recent logs
print_info "Recent application logs:"
docker logs --tail=20 banner_gangnam_app

print_info "====================================="
print_info "Deployment completed successfully! ✓"
print_info "====================================="
print_info "Application is running at: http://localhost:3000"
print_info "To view logs: docker logs -f banner_gangnam_app"
print_info "To stop: docker compose down"
