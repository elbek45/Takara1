module.exports = {
  apps: [{
    name: 'takara-backend',
    script: 'dist/app.js',
    cwd: '/var/www/takara-gold/backend',
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env.production',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/root/.pm2/logs/takara-backend-error.log',
    out_file: '/root/.pm2/logs/takara-backend-out.log',
    merge_logs: true,
    time: true
  }]
};
