module.exports = {
  apps: [
    {
      name: 'anystats',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/anystats',

      // Geef Chrome 10 seconden om netjes af te sluiten (graceful shutdown)
      kill_timeout: 10000,

      // Omgevingsvariabelen worden geladen uit .env — niet hier hardcoden
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
