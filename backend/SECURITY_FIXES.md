# Backend Security Audit — Fix Checklist

## 🔴 CRITICAL

## 🟠 HIGH — WEEK 1

## 🟠 HIGH — WEEK 2

- [x] **H-06** Resolve duplicate `rider/jobs` controller path conflict
  - Confirmed: `src/riders/jobs/jobs.controller.ts` is the active one (registered in `RidersModule`, has `cancel` + `verify-otp` endpoints used by the rider-app)
  - `src/jobs/jobs.module.ts` (`JobsModule`) was never imported anywhere — completely dead code
  - Deleted entire `src/jobs/` directory; moved shared `job.dto.ts` to `src/riders/jobs/job.dto.ts` and updated all 5 import sites (`queue.constants.ts`, `rider-job-events.listener.ts`, `deliveries.service.ts`, `rides-cleanup.service.ts`, `rides.service.ts`)

## 🟡 MEDIUM — WEEK 2

- `GET /marketplace/stores` now caps `limit` to `Math.min(limit, 50)`
- [ ] **M-06** Create typed DTO for `completeJob` `payload` field
  - Requires defining the payload shape per job type (ride vs delivery) — complex, requires coordination with mobile team
- [ ] **M-07** Create typed DTOs for raw `@Body()` in rider/vendor auth endpoints
  - Scope: `updateNotificationsPreferences`, `updateVehicleDetails`, `updateDocuments`, `updateBusinessInfo`, `updateBusinessDocuments`, `updateStoreDetails`
  - Requires creating 6 new DTOs with class-validator decorators

## 🟢 LOW — WEEK 3

- [x] **L-02** ~~Add request correlation ID middleware to `main.ts`~~ — Already implemented; `CorrelationMiddleware` is wired in `main.ts` (reads `x-correlation-id` header, generates UUID if absent, sets `X-Request-Id` on response)
- [x] **L-03** Add failed-login structured logging in auth services
  - `auth.service.ts` `loginUser`: warn on user-not-found, account-inactive, wrong-password (logs `email` or `userId` + `status`)
  - `rider-auth.service.ts` `loginRider`: added `Logger`; warn on rider-not-found, wrong-password, account-restricted
  - `vendor-auth.service.ts` `loginVendor`: warn on vendor-not-found, wrong-password (via `appLogger`)
- [x] **L-04** BullBoard job payload PII — tightened Redis lifecycle on all email queue jobs
  - **Tier 1** (OTP / reset codes / temporary passwords): `removeOnComplete: { count: 5 }`, `removeOnFail: { age: 3600 }` (1 h) — jobs: `sendPasswordResetOtp`, `sendVendorSignupOtp`, `sendRiderPasswordResetOtp`, `sendVendorPasswordReset`, `sendVendorAccountCreated`
  - **Tier 2** (IP addresses / raw financial data): `removeOnComplete: { count: 20 }`, `removeOnFail: { age: 86400 }` (24 h) — jobs: `sendVendorLoginNotification`, `sendVendorPasswordChanged`, `sendRiderPasswordChanged`, `sendAdminHighValueWithdrawalAlert`
  - **Tier 3** (standard transactional emails): added `removeOnFail: { count: 50 }` to all remaining 14 jobs so failed jobs no longer accumulate in Redis indefinitely

---

## 📌 Pending Items (Deferred)

| ID          | Reason                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------- |
| H-04        | Requires a global `JwtPayload` interface refactor across all controllers                          |
| M-06        | Needs payload schema defined with mobile team                                                     |
| M-07        | Requires 6 new DTO classes across rider/vendor auth                                               |
| H-05 (full) | Add `idempotencyKey String?` to `Delivery` Prisma schema + migration                              |

---

_Last updated: 2026-02-26 (L-02 confirmed done, L-03 + L-04 implemented, H-06 resolved)_
