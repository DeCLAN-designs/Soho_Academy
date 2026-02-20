module.exports = {
  apps: [
    {
      name: "soho-backend",
      cwd: "/var/www/soho/backend",
      script: "server.js",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        DB_HOST: "127.0.0.1",
        DB_USER: "soho_user",
        DB_PASSWORD: "change_me",
        DB_NAME: "soho_transport",
        JWT_SECRET: "change_me",
        JWT_EXPIRES_IN: "15m",
        JWT_REFRESH_SECRET: "change_me_too",
        JWT_REFRESH_EXPIRES_IN: "7d",
        FRONTEND_ORIGIN: "https://soho.example.com"
      }
    }
  ]
};
