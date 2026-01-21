// PM2 설정 파일
module.exports = {
  apps: [{
    name: 'banner-gangnam01',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/banner_gangnam01',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
