# Backend Production Fixes

## 🚨 Critical

1. **In-memory ThrottlerModule** — rate limits not shared across instances/restarts. Wire `ThrottlerStorageRedisService` (already in `dependencies`) in `app.module.ts`.
2. **`/storage/upload-public` is unauthenticated** — any anonymous user can upload to S3. Remove the endpoint; use presigned S3 URLs instead. (`storage.controller.ts`)
3. **File type validation uses `mimetype` only** — client-supplied, fully spoofable. Add `file-type` package for magic byte inspection. (`storage.controller.ts`)
4. **Redis default port is `6389` (typo)** — should be `6379`. If `REDIS_PORT` env var is absent, connection silently fails. (`redis.module.ts`, line 22)
5. **`CorrelationMiddleware` and `HttpLoggingInterceptor` are never registered** — dead code. No correlation IDs in logs, no HTTP request/response logging in production. Register both in `main.ts`.
6. **Only 11 unit spec files** — `AuthService`, `PaymentService`, `WithdrawalService`, `RidesService` have zero isolated unit tests. Write them.
7. **`LOG_LEVEL` env var is ignored** — Winston logger hardcodes `'warn'` in prod regardless. Use `process.env.LOG_LEVEL` as the level. (`libs/logger/logger.ts`)
8. **No Prometheus `/metrics` endpoint** — zero visibility into request rates, error rates, or latency. Add `prom-client` or `@willsoto/nestjs-prometheus`.
9. **`noImplicitAny: false` + 344 `as any` usages** — TypeScript safety is disabled. Enable `strict: true` in `tsconfig.json` and eliminate `any` usages incrementally.

---

## ⚠️ Risky

10. **`BullModule.forRoot()` reads `process.env` directly** — bypasses Zod validation. Convert to `BullModule.forRootAsync()` with injected `ConfigService`. (`app.module.ts`)
11. **`MongooseModule.forRootAsync()` reads `process.env` directly** — same issue as above. Inject `ConfigService`. (`app.module.ts`)
12. **`RedisModule` calls `dotenv.config()` and reads `process.env` directly** — layering violation. Use `ConfigService`. (`redis.module.ts`)
13. **`StorageService` constructor reads `process.env` directly** — use `ConfigService`. (`storage.service.ts`)
14. **`AWS_S3_PUBLIC_URL` not in Zod `envSchema`** — never validated; a typo silently produces broken URLs. Add `AWS_S3_PUBLIC_URL: z.string().url().optional()` to `env.schema.ts`.
15. **`QUEUE_HOST/PORT/PASSWORD` in `envSchema` are dead** — `BullModule` uses `REDIS_*` vars instead. Remove dead schema keys or align them.
16. **No individual refresh token invalidation on logout** — refresh tokens remain valid for 30 days after logout. Store JTI in Redis; delete on logout.
17. **bcrypt salt rounds = 10** — OWASP recommends 12+. Increase to 12; plan a migration path for existing hashes. (`auth.service.ts`, `rider-auth.service.ts`)
18. **No Socket.io Redis adapter** — multi-container deploys will drop WebSocket clients. Add `@socket.io/redis-adapter` before horizontal scaling.
19. **`useStaticAssets` with local `uploads/` dir** — uploads don't persist across deploys in ephemeral containers. Ensure all file uploads go to S3; remove the local static asset route. (`main.ts`)
20. **No cluster mode** — `start:prod` runs a single Node.js process. Add a PM2 `ecosystem.config.js` with `exec_mode: 'cluster'` and `instances: 'max'`.
21. **`docker-compose.yml` healthcheck uses `/api/v1/health`** (checks DB + Redis) for Docker restart logic — should use `/api/v1/health/live` so DB outages don't restart healthy containers.
22. **E2E tests use no isolated test database** — test data pollutes staging. Add `.env.test` with a dedicated `DATABASE_URL`.
23. **`MONGODB_URI` not in `envSchema`** — falls back to `localhost` silently in production. Add to schema or remove the fallback. (`app.module.ts`)
24. **No `prebuild: rimraf dist` script** — stale compiled files can shadow new ones. Add `"prebuild": "rimraf dist"` to `package.json`.
25. **No Winston remote transport** — logs only go to stdout. Add Sentry, Datadog, or Logtail transport for production alerting.
26. **No machine-readable error codes** — error responses use only message strings. Add a `code` field (e.g. `ERR_INSUFFICIENT_BALANCE`) for reliable client parsing.
27. **Swagger enabled/disabled by `NODE_ENV`** — staging engineers have no docs. Replace with `SWAGGER_ENABLED=true` env var.
28. **`@ApiResponse` decorators missing** on most endpoints — Swagger shows no 4xx/5xx schemas. Add error response docs.
29. **No API v2 deprecation strategy** — no `Sunset` header plan, no versioned DTO folder structure. Define a plan before introducing breaking changes.
30. **`"version": "0.0.1"` in `package.json`** — not semantically versioned. Tie to release process.
