# Docker Deployment Guide

## Successfully Deployed! ✅

Your Next.js app is now running in Docker with the following setup:

### Access URLs
- **Direct App Access**: http://localhost:3001
- **Via Nginx Proxy**: http://localhost (port 80)
- **Health Check**: http://localhost:3001/api/health or http://localhost/api/health

### Running Containers
```bash
docker ps
```

You should see:
- `banner_gangnam_app` - Next.js application (port 3001 → 3000 internal)
- `banner_gangnam_nginx` - Nginx reverse proxy (ports 80, 443)

### Changes Made

#### 1. TypeScript Configuration
- Excluded `scripts` folder from build to avoid `dotenv` dependency issue
- File: [tsconfig.json](tsconfig.json#L28)

#### 2. Dockerfile Updates
- Added build args for environment variables (`NEXT_PUBLIC_*`)
- These are required during Next.js build time
- File: [Dockerfile](Dockerfile#L24-L34)

#### 3. Docker Compose Configuration
- Removed `version` field (obsolete in modern Docker Compose)
- Commented out local PostgreSQL database (using Supabase cloud)
- Added build args to pass env vars during build
- Changed app port to 3001 (3000 was in use by lowfinder-frontend)
- File: [docker-compose.yml](docker-compose.yml)

#### 4. Environment Configuration
- Updated `.env.docker` with actual Supabase and Kakao API credentials
- Set `APP_PORT=3001` to avoid port conflict
- File: [.env.docker](.env.docker)

### Common Commands

#### Start containers
```bash
docker-compose --env-file .env.docker up -d
```

#### Stop containers
```bash
docker-compose --env-file .env.docker down
```

#### Rebuild and restart
```bash
docker-compose --env-file .env.docker up -d --build
```

#### View logs
```bash
# App logs
docker logs banner_gangnam_app -f

# Nginx logs
docker logs banner_gangnam_nginx -f

# All services
docker-compose --env-file .env.docker logs -f
```

#### Check container status
```bash
docker ps
docker-compose --env-file .env.docker ps
```

### Architecture

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │
    Port 80/443
         │
         ▼
┌─────────────────┐
│ Nginx (Alpine)  │  Reverse Proxy
└────────┬────────┘
         │
    Internal Network
         │
         ▼
┌─────────────────┐
│  Next.js App    │  Port 3001 → 3000
│  (Node 20)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase Cloud  │  Database & Storage
└─────────────────┘
```

### Environment Variables

The app uses these key environment variables (from `.env.docker`):

**Application**
- `APP_PORT=3001` - External port
- `NODE_ENV=production`

**Supabase**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

**Kakao Map API**
- `NEXT_PUBLIC_KAKAO_REST_API_KEY` - Kakao REST API key
- `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` - Kakao JavaScript API key

### Troubleshooting

#### Port already in use
If you get "port is already allocated" error:
1. Check what's using the port: `netstat -ano | findstr :3001`
2. Change `APP_PORT` in `.env.docker` to another port
3. Restart: `docker-compose --env-file .env.docker down && docker-compose --env-file .env.docker up -d`

#### Build fails
1. Check environment variables are set in `.env.docker`
2. Check logs: `docker-compose --env-file .env.docker logs app`
3. Clean rebuild: `docker-compose --env-file .env.docker down -v && docker-compose --env-file .env.docker up -d --build`

#### Health check failing
```bash
# Check if app is responding
curl http://localhost:3001/api/health

# Check app logs
docker logs banner_gangnam_app --tail 100
```

### Next Steps

1. **SSL/HTTPS Setup**: Configure SSL certificates in `nginx/ssl/` folder
2. **Domain Setup**: Update nginx config with your domain name
3. **Production Deployment**: Use a cloud provider (AWS, GCP, Azure) or VPS
4. **Monitoring**: Add logging and monitoring services
5. **CI/CD**: Set up GitHub Actions or similar for automated deployments

### Notes

- The local PostgreSQL database is commented out since you're using Supabase cloud
- If you want to use a local database, uncomment the `db` service in docker-compose.yml
- Nginx is configured to proxy requests to the Next.js app
- The app runs in production mode with standalone output for optimal performance
