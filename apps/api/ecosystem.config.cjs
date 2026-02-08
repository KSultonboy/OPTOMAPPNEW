module.exports = {
  apps: [
    {
      name: "optom-api",
      cwd: "./apps/api",
      script: "dist/index.js",
      env_file: ".env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 8081,
        HOST: "0.0.0.0",
        BODY_LIMIT: "50mb"
      }
    }
  ]
};
