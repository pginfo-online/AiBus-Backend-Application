module.exports = {
    apps: [
        {
            name: "aibus-backend",
            script: "./dist/server.js",
            cwd: "./",
            instances: "max",
            exec_mode: "cluster",
            watch: false,
            max_memory_restart: "500M",
            error_file: "./logs/err.log",
            out_file: "./logs/out.log",
            log_file: "./logs/combined.log",
            time: true,
            merge_logs: true,
            autorestart: true,
            max_restarts: 10,
            min_uptime: "10s",
            kill_timeout: 10000,
            listen_timeout: 10000,
            env: {
                NODE_ENV: "production",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
    ],
};
