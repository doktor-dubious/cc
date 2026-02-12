module.exports = {
  apps: [{
    name: 'Compliance-Circle',
    script: 'npm',
    args: 'start',
    cwd: '/home/rune/workspace/projects/compliance-circle/',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
