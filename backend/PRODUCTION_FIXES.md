# Backend Production Fixes — Ordered Action List

Issues are ordered: Critical blockers first, then high-risk, then medium.

---

## 🚨 CRITICAL (Fix Before Any Production Traffic)

---

### 1. Wire Zod environment validation to ConfigModule

**Problem:** `AppConfigModule` with Zod schema validation exists in `src/config/config.module.ts` but is never used. `AppModule` calls `ConfigModule.forRoot({ isGlobal: true })` with no `validate` function. All Zod rules — including `JWT_SECRET` minimum length, required `DATABASE_URL`, etc. — are silently ignored. The server starts even with a missing or weak `JWT_SECRET`.

**Fix:** In `src/app.module.ts`, change:

```typescript
// BEFORE
ConfigModule.forRoot({ isGlobal: true }),

// AFTER
import { envSchema } from './config/env.schema';

ConfigModule.forRoot({
  isGlobal: true,
  validate: (env) => envSchema.parse(env),
}),
```

Then delete `src/config/config.module.ts` — it is now dead code.

---

### 2. Remove the hardcoded JWT secret fallback

**Problem:** In `src/auth/auth.module.ts`, the JWT secret has a plaintext fallback:

```typescript
secret:
  configService.get<string>('JWT_SECRET') ||
  'your-secret-key-change-in-production',
```

If `JWT_SECRET` is undefined, tokens are signed with a publicly-known string. Any attacker can forge JWTs.

**Fix:** In `src/auth/auth.module.ts`, change:

```typescript
// BEFORE
secret:
  configService.get<string>('JWT_SECRET') ||
  'your-secret-key-change-in-production',

// AFTER
secret: configService.getOrThrow<string>('JWT_SECRET'),
```

With fix #1 in place, `getOrThrow` is a safety net. The Zod schema's `min(32)` rule enforces strength at startup.

---

### 3. Fix refresh token to use JWT_REFRESH_SECRET

**Problem:** `src/auth/auth.service.ts` `refresh()` verifies the refresh token using the same `jwtService` instance configured with `JWT_SECRET`. `JWT_REFRESH_SECRET` is defined in `.env` and the Zod schema but is never used anywhere. This means:

- A stolen short-lived access token can be submitted as a refresh token
- Both token types are cryptographically indistinguishable

**Fix:** In `src/auth/auth.service.ts`, inject `ConfigService` and verify with the correct secret:

```typescript
// In the constructor, add:
private readonly configService: ConfigService,

// In refresh():

// BEFORE
const payload = this.jwtService.verify(refreshToken);

// AFTER
const payload = this.jwtService.verify(refreshToken, {
  secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
});
```

Also add `ConfigModule` to `AuthModule` imports if not already present (it is).

---

### 4. Install and enable Helmet

**Problem:** `helmet` is not installed. Every HTTP response is sent without security headers: no `X-Content-Type-Options`, no `X-Frame-Options`, no `Strict-Transport-Security`, no `Content-Security-Policy`, no `X-XSS-Protection`. This is an OWASP Top-10 finding.

**Fix:**

```bash
yarn workspace backend add helmet
```

In `src/main.ts`, add after `NestFactory.create(...)`:

```typescript
import helmet from 'helmet';

// Add immediately after app creation, before anything else:
app.use(helmet());
```

---

### 5. Protect the Bull Board admin UI

**Problem:** `/api/v1/system/queues` is mounted via `app.use()` in `main.ts` with zero authentication. The `BullBoardController` also exposes `GET /api/v1/system/queues` without any guard. Any anonymous user on the internet can view, retry, and delete queue jobs — which may contain PII (email addresses, user IDs, payment references).

**Fix — Option A (recommended): IP allowlist in `main.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';

const BULL_BOARD_ALLOWED_IPS = (process.env.BULL_BOARD_ALLOWED_IPS || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

app.use(
  '/api/v1/system/queues',
  (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    if (process.env.NODE_ENV !== 'production') return next(); // allowed in dev
    if (
      BULL_BOARD_ALLOWED_IPS.length === 0 ||
      BULL_BOARD_ALLOWED_IPS.includes(clientIp)
    ) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden' });
  },
);
// Then mount the board router:
app.use('/api/v1/system/queues', serverAdapter.getRouter());
```

Add `BULL_BOARD_ALLOWED_IPS=your.office.ip.address` to production `.env`.

**Fix — Option B:** Add `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.SUPER_ADMIN)` to `BullBoardController`.

---

### 6. Enforce banned/suspended status for riders and vendors in JWT validation

**Problem:** In `src/auth/jwt-strategy.ts`, the status checks for RIDER and VENDOR are commented out:

```typescript
// if (rider.status === 'BANNED' || rider.status === 'SUSPENDED') {
//   throw new UnauthorizedException('Invalid credentials');
// }
```

A banned rider/vendor with a non-expired JWT can call any authenticated endpoint. The comment "the frontend will inform the rider" is a server-trust violation — the server must enforce this itself.

**Fix:** In `src/auth/jwt-strategy.ts`, uncomment both blocks:

```typescript
// For rider:
if (rider.status === 'BANNED' || rider.status === 'SUSPENDED') {
  throw new UnauthorizedException('Account has been suspended or banned');
}

// For vendor:
if (vendor.status === 'BANNED' || vendor.status === 'SUSPENDED') {
  throw new UnauthorizedException('Account has been suspended or banned');
}
```

---

## ⚠️ HIGH RISK (Fix Within First Week)

---

### 7. Add graceful shutdown hooks

**Problem:** `app.enableShutdownHooks()` is not called in `main.ts`. When Railway sends SIGTERM (deploy, restart, scale-down), NestJS immediately closes despite `dumb-init` correctly forwarding the signal. In-flight HTTP requests, active BullMQ jobs, and open database queries are killed mid-execution. This can corrupt data for financial transactions (payments, wallet debits).

**Fix:** In `src/main.ts`, add before `app.listen()`:

```typescript
app.enableShutdownHooks();
```

NestJS will then call `OnModuleDestroy` on each module (including `PrismaService.$disconnect()`) and wait for active requests to drain before exiting.

---

### 8. Add response compression

**Problem:** `compression` middleware is not installed. All API responses — especially paginated product lists, order histories, user notifications — are sent as uncompressed JSON. For mobile clients on 3G/4G networks (the primary target market), this degrades performance and increases data costs.

**Fix:**

```bash
yarn workspace backend add compression
yarn workspace backend add -D @types/compression
```

In `src/main.ts`, add after Helmet:

```typescript
import * as compression from 'compression';

app.use(compression());
```

---

### 9. Authenticate the fare calculation endpoints

**Problem:** `POST /api/v1/fare/ride` and `POST /api/v1/fare/delivery` in `src/fare/fare.controller.ts` have no `@UseGuards`. They call Google Maps geocoding APIs internally. Any anonymous script can hammer these endpoints, driving up Google Maps billing with no rate limit specific to fare routes.

**Fix:** In `src/fare/fare.controller.ts`:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Post('ride')
rideFare(@Body() dto: RideFareDto) { ... }

@UseGuards(JwtAuthGuard)
@Post('delivery')
deliveryFare(@Body() dto: DeliveryFareDto) { ... }
```

Also add a `@Throttle` decorator per the existing auth pattern:

```typescript
@Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
```

---

### 10. Add process-level unhandled rejection and uncaught exception handlers

**Problem:** If any `Promise` rejects without a `catch`, or if any synchronous code throws outside a try-catch, Node.js logs a warning but the process continues in an undefined state. In production this leads to silent data corruption and zombie processes.

**Fix:** In `src/main.ts`, add before `bootstrap()`:

```typescript
process.on('unhandledRejection', (reason, promise) => {
  appLogger.error('Unhandled Promise Rejection', { reason, promise });
  // Do NOT exit here — NestJS exception filters handle HTTP rejections.
  // Exit only for truly unexpected fatal errors:
});

process.on('uncaughtException', (err) => {
  appLogger.error('Uncaught Exception — process will exit', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
```

---

### 11. Increase global throttle limit

**Problem:** `ThrottlerModule` in `app.module.ts` is configured at `limit: 20, ttl: 60000` (20 requests per minute globally). Mobile apps polling order status, loading product listings, and fetching notifications will routinely hit this, returning HTTP 429 to legitimate users.

**Fix:** In `src/app.module.ts`:

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60_000,
    limit: 300, // 300 req/min globally; sensitive endpoints use @Throttle() overrides
  },
]),
```

Keep the stricter `@Throttle` overrides on login (10/min) and register (5/hour) exactly as is.

---

### 12. Replace `console.log/warn/error` calls with Winston logger

**Problem:** Four locations use `console.*` which bypasses Winston and produces unstructured output that log aggregators (Railway, Datadog, CloudWatch) cannot parse or filter.

**Files:**

- `src/app.module.ts` lines 65 and 71 — MongoDB connection events
- `src/system/bullboard.controller.ts` lines 62, 76, 90 — error handler
- `src/riders/order/order.service.ts` — unknown rider role

**Fix pattern:** Replace each with `this.logger.warn(...)` or `this.logger.error(...)` using the existing `private readonly logger = new Logger(ClassName.name)` pattern already present in those files. For `app.module.ts` (no class context), use the `appLogger` exported from `src/libs/logger/logger.ts`:

```typescript
import { appLogger } from '../libs/logger/logger';

// Replace:
console.warn('[MongoDB] Connection error:', err.message);
// With:
appLogger.warn('[MongoDB] Connection error (non-fatal): ' + err.message, {
  context: 'MongoDB',
});
```

---

### 13. Configure Prisma connection pool

**Problem:** No `connection_limit` is set in `DATABASE_URL`. Prisma defaults to 5–10 connections. With BullMQ workers, Socket.io gateways, and HTTP request handlers all sharing one pool, pool exhaustion causes timeouts under moderate load. This is the most common production failure mode for NestJS + Prisma apps.

**Fix:** In your Railway (or `.env`) `DATABASE_URL`, append connection parameters:

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10&connect_timeout=10"
```

Set `connection_limit` to `(number_of_cpu_cores * 2) + 2`. For Railway's default 1 vCPU, use 10–15. If you add cluster mode later, divide by worker count.

---

### 14. Fix FareModule dynamic require anti-pattern

**Problem:** In `src/app.module.ts`:

```typescript
require('./fare/fare.module').FareModule,
```

This bypasses TypeScript's static module resolution, breaks circular dependency analysis tools, and produces no compile-time error if the module path is wrong.

**Fix:** Add the static import at the top of `app.module.ts`:

```typescript
import { FareModule } from './fare/fare.module';
```

And add `FareModule` to the `imports` array like every other module.

---

### 15. Validate JWT audience and issuer claims

**Problem:** `JwtPayload` interface declares `aud: string` and `iss: string`, meaning tokens minted by this server include these claims. But `JwtStrategy` does not pass `audience` or `issuer` validation options. These claims are minted but never verified — tokens from other systems could theoretically be accepted.

**Fix:** In `src/auth/auth.module.ts`, add to `JwtModule.registerAsync`:

```typescript
signOptions: {
  expiresIn: '7d',
  audience: 'asoose-app',
  issuer: 'asoose-api',
},
```

In `src/auth/jwt-strategy.ts`, add to the `super()` call:

```typescript
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: jwtSecret,
  audience: 'asoose-app',
  issuer: 'asoose-api',
});
```

**Note:** Do this only after rotating all existing tokens — current tokens lack these claims and will be immediately invalidated.

---

## ⚠️ MEDIUM RISK (Fix Within First Month)

---

### 16. Remove devDependencies from Docker runtime image

**Problem:** The Dockerfile does `yarn install --frozen-lockfile` (all deps) in the builder, then copies the full `node_modules` to the runtime image. The runtime image contains Jest, ESLint, TypeScript, Prettier, `ts-morph`, all `@types/*` packages etc. This bloats the image and increases the attack surface.

**Fix:** In the Dockerfile runtime stage, install only production dependencies instead of copying from builder:

```dockerfile
# AFTER copying package.json and yarn.lock:
RUN yarn install --production --frozen-lockfile --ignore-scripts
```

Or in a monorepo context:

```dockerfile
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/backend/package.json ./backend/
RUN yarn workspaces focus --production backend
```

---

### 17. Move `prisma migrate deploy` out of container startup

**Problem:** The Dockerfile CMD runs migrations then starts the server on every container start. In a rolling deployment (two instances starting simultaneously), both attempt to acquire Prisma's migration advisory lock and one will fail or block, delaying startup.

**Fix:** Run migrations as a separate pre-deploy step in your CI/CD pipeline:

```yaml
# GitHub Actions or Railway deploy hook
- name: Deploy migrations
  run: yarn workspace backend prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Deploy container
  # ... deploy the new image after migrations succeed
```

Change the Dockerfile CMD to:

```dockerfile
CMD ["node", "dist/src/main.js"]
```

---

### 18. Separate liveness and readiness health checks

**Problem:** The single `/api/v1/health` endpoint returns an error if the database is unreachable. Docker and Kubernetes health checks use this to decide whether to _restart_ the container (liveness). A transient DB hiccup should only remove the instance from the load balancer (readiness), not restart it — which would make the outage worse.

**Fix:** Add two routes to `app.controller.ts`:

```typescript
@Public()
@Get('health/live')
liveness() {
  return { status: 'ok' }; // Always 200 if the process is alive
}

@Public()
@Get('health/ready')
async readiness() {
  // Current health logic (DB + Redis check)
  // Return 503 if either is down
}
```

Update the Dockerfile `HEALTHCHECK` to use `/api/v1/health/live`.

---

### 19. Enable TypeScript strict mode

**Problem:** `tsconfig.json` has `"noImplicitAny": false` and `"strictBindCallApply": false`. With `noImplicitAny` off, untyped function parameters become `any` silently. In a financial backend processing payments and wallet transactions, this hides type errors that can cause runtime failures.

**Fix:** In `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictBindCallApply": true
  }
}
```

After enabling, run `yarn workspace backend build` and fix the resulting type errors one module at a time. Start with `payment/`, `auth/`, and `riders/` as the highest-risk modules.

---

### 20. Remove the duplicate bcrypt package

**Problem:** Both `bcrypt` (^6.0.0) and `bcryptjs` (^3.0.3) are in `package.json` as production dependencies. The codebase uses `bcryptjs`. Keeping both adds unnecessary bundle weight and is a supply-chain risk (two packages to audit for vulnerabilities).

**Fix:**

```bash
yarn workspace backend remove bcrypt
yarn workspace backend remove @types/bcrypt
```

Verify no file imports from `'bcrypt'` (without `js`):

```bash
grep -r "from 'bcrypt'" backend/src
```

---

### 21. Add E2E test database isolation

**Problem:** `test/security-idor.e2e-spec.ts` creates real `rider` records in whatever database `DATABASE_URL` points to. There is no teardown, no transaction rollback, and no separate test database configured. Test runs in CI accumulate records in the development database.

**Fix:** In `test/jest-e2e.json` add a `globalSetup`/`globalTeardown` script, or wrap each test in a transaction:

```typescript
beforeEach(async () => {
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  await prisma.$executeRaw`ROLLBACK`;
});
```

Or set `DATABASE_URL` in `jest-e2e.json` to a dedicated test database:

```json
{
  "testEnvironment": "node",
  "globalSetup": "<rootDir>/test/setup.ts"
}
```

---

### 22. Enable Swagger with production guard

**Problem:** `@nestjs/swagger` v11.2.3 is installed but never initialized. No `DocumentBuilder` or `SwaggerModule.setup()` call exists in `main.ts`. The dependency is dead weight and no API documentation is generated. Without docs, frontend/mobile teams rely on reading source code.

**Fix:** In `src/main.ts`:

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// Inside bootstrap(), before app.listen():
if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('Asoose API')
    .setDescription('Asoose platform API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);
}
```

Then add `@ApiProperty()` decorators to DTOs progressively, starting with `auth/dto/`, `payment/dto/`, and `riders/dto/`.

---

### 23. Fix Winston production log level

**Problem:** `src/libs/logger/logger.ts` uses `level: isProd ? 'error' : 'debug'`. At `error`-only level in production, warnings (queue retries, slow queries, non-fatal MongoDB disconnects) are completely invisible. You cannot debug production issues with only error-level logs.

**Fix:** In `src/libs/logger/logger.ts`:

```typescript
level: isProd ? 'warn' : 'debug',
```

This retains all `warn` and `error` events in production while suppressing `info` and `debug` noise.

---

### 24. Expand `.dockerignore`

**Problem:** `.dockerignore` only excludes `node_modules`, `dist`, and `.env`. The Docker build context includes the entire monorepo root — all Expo apps, Next.js web app, all markdown docs, and git history — even though only `backend/` is needed. This slows `docker build` significantly.

**Fix:** Replace `backend/.dockerignore` contents with:

```
node_modules
dist
.env
.env.*
coverage
*.log

# Monorepo siblings not needed in backend image
../apps
../web
../packages
../.git
../*.md
../.github
```

---

### 25. Remove `ngrok-skip-browser-warning` from production CORS allowed headers

**Problem:** In `main.ts`, the production CORS `allowedHeaders` array includes `'ngrok-skip-browser-warning'`. This is a development tunnel header that has no place in production configuration. It doesn't cause direct harm but signals the production config is copied from dev without review.

**Fix:** In `src/main.ts`, remove from the production CORS block only:

```typescript
// Remove this line from the production enableCors() block:
'ngrok-skip-browser-warning',
```

Keep it in the development block (`isDevelopment` branch) since it's needed for ngrok tunnels.

---

## Summary Checklist

| #   | Issue                                                 | Priority    |
| --- | ----------------------------------------------------- | ----------- |
| 1   | Wire Zod env validation to ConfigModule               | 🚨 Critical |
| 2   | Remove hardcoded JWT secret fallback                  | 🚨 Critical |
| 3   | Fix refresh token to use JWT_REFRESH_SECRET           | 🚨 Critical |
| 4   | Install and enable Helmet                             | 🚨 Critical |
| 5   | Protect Bull Board admin UI                           | 🚨 Critical |
| 6   | Enforce banned/suspended status in JWT validation     | 🚨 Critical |
| 7   | Add graceful shutdown hooks                           | ⚠️ High     |
| 8   | Add response compression                              | ⚠️ High     |
| 9   | Authenticate fare endpoints                           | ⚠️ High     |
| 10  | Add unhandled rejection / uncaught exception handlers | ⚠️ High     |
| 11  | Increase global throttle limit                        | ⚠️ High     |
| 12  | Replace console.\* with Winston logger                | ⚠️ High     |
| 13  | Configure Prisma connection pool                      | ⚠️ High     |
| 14  | Fix FareModule dynamic require anti-pattern           | ⚠️ High     |
| 15  | Validate JWT audience and issuer claims               | ⚠️ High     |
| 16  | Remove devDependencies from Docker runtime image      | ⚠️ Medium   |
| 17  | Move prisma migrate deploy out of container startup   | ⚠️ Medium   |
| 18  | Separate liveness and readiness health checks         | ⚠️ Medium   |
| 19  | Enable TypeScript strict mode                         | ⚠️ Medium   |
| 20  | Remove duplicate bcrypt package                       | ⚠️ Medium   |
| 21  | Add E2E test database isolation                       | ⚠️ Medium   |
| 22  | Enable Swagger with production guard                  | ⚠️ Medium   |
| 23  | Fix Winston production log level                      | ⚠️ Medium   |
| 24  | Expand .dockerignore                                  | ⚠️ Medium   |
| 25  | Remove ngrok header from production CORS              | ⚠️ Medium   |
