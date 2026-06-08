module.exports = {
  apps: [
    {
      name: 'anystats',
      script: 'start.sh',
      interpreter: 'bash',
      cwd: '/var/www/anystats',

      // Geef Chrome 10 seconden om netjes af te sluiten (graceful shutdown)
      kill_timeout: 10000,

      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'anystats-db',
      script: 'db-viewer.js',
      cwd: '/var/www/anystats',

      // Nooit automatisch herstarten bij deploy — aparte service
      autorestart: true,
      watch: false,

      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
