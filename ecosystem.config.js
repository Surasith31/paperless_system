//ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "paperless_system",
      script: "server-custom.js",
      cwd: "/home/amr/project/paperless_system",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_file: "/home/amr/project/paperless_system/.env.local",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
    }
  ]
}

