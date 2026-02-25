/**
 * PM2 Ecosystem Configuration — Production Cluster Mode
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload ecosystem.config.js   # zero-downtime reload
 *   pm2 stop  ecosystem.config.js
 *
 * env vars that control behaviour:
 *   INSTANCES   — number of workers (default: 'max' = one per CPU core)
 *   NODE_ENV    — set to 'production' in production deployments
 *   PORT        — HTTP port (default: 3000)
 */

module.exports = {
  apps: [
    {
      name: 'asoose-backend',
      script: 'dist/main.js',

      // ── Cluster mode ─────────────────────────────────────────────────────
      // Spawns one worker per CPU core, doubling throughput on multi-core hosts
      // and giving PM2 the ability to do zero-downtime restarts.
      exec_mode: 'cluster',
      instances: process.env.INSTANCES || 'max',

      // ── Restart policy ───────────────────────────────────────────────────
      watch: false,
      max_memory_restart: '512M',
      // Back-off restarts: wait 3 s, then 5 s, then 10 s between crash loops
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,

      // ── Env overrides (applied on top of the OS environment) ─────────────
      env: {
        NODE_ENV: 'production',
      },

      // ── Logging ──────────────────────────────────────────────────────────
      // PM2 captures stdout/stderr; Winston still writes to stdout so all logs
      // flow through PM2's log rotation.  Disable pm2 timestamps to avoid
      // doubling — Winston already stamps every line.
      merge_logs: true,
      log_date_format: '',

      // ── Graceful shutdown ─────────────────────────────────────────────────
      // Allow 10 s for in-flight requests to complete before killing the worker.
      kill_timeout: 10000,
      listen_timeout: 8000,
    },
  ],
};
