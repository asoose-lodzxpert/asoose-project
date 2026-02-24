# Super-Admin Section — Comprehensive Audit Report

> **Scope:** `web/customer-web-app/src/app/super-admin/` (all routes) + `backend/src/super-admin/` (all controllers)
> **Date:** 2025
> **Auditor:** GitHub Copilot
> **Method:** Full static code review, no modifications made.

---

## Table of Contents

1. [Auth & Layout](#1-auth--layout)
2. [Dashboard](#2-dashboard)
3. [Activity Logs](#3-activity-logs)
4. [Banners](#4-banners)
5. [Disputes](#5-disputes)
6. [Orders](#6-orders)
7. [Rides](#7-rides)
8. [Deliveries](#8-deliveries)
9. [Payouts](#9-payouts)
10. [Verification](#10-verification)
11. [Transactions](#11-transactions)
12. [Reports](#12-reports)
13. [Notifications](#13-notifications)
14. [Settings](#14-settings)
15. [Maps](#15-maps)
16. [Profile](#16-profile)
17. [Search](#17-search)
18. [Users — Customers](#18-users--customers)
19. [Users — Vendors](#19-users--vendors)
20. [Users — Riders](#20-users--riders)
21. [Users — Drivers](#21-users--drivers)
22. [Summary Table](#22-summary-table)

---

## 1. Auth & Layout

### Files
- `utils/admin-check.ts`
- `src/app/super-admin/layout.tsx`
- `src/app/super-admin/page.tsx`
- `src/app/super-admin/AdminLayoutClient.tsx`
- `src/app/super-admin/hooks/useSuperAdminFetch.ts`

### Purpose
Server-side auth gate, sidebar shell, authenticated SWR fetcher, root redirect.

### Frontend–Backend Alignment
The backend accepts roles: `SUPER_ADMIN`, `ADMIN`, `ADMIN_MANAGER`, `ADMIN_SUPPORT`, `ADMIN_FINANCE`.
`requireAdmin()` in `utils/admin-check.ts` only allows: `SUPER_ADMIN`, `ADMIN_MANAGER`, `ADMIN_SUPPORT`, `ADMIN_FINANCE`.

> **[ISSUE-001] CRITICAL — `ADMIN` role locked out of frontend.**
> The `ADMIN` role is used extensively in backend `@Roles()` decorators (dashboard, notifications, settings read, etc.) but is **absent** from the `ADMIN_ROLES` array in `utils/admin-check.ts`. Any user with role `ADMIN` is redirected to `/store` by `layout.tsx`. The entire super-admin section is inaccessible to this role.

### UI/UX
Sidebar is clean and role-filtered. Dark theme (`#0F172A` / `#1E293B`) is consistent. Unread badge polls every 30 seconds.

### Data Integrity
SWR fetcher (`useSuperAdminFetch.ts`) is well-implemented: 30s timeout, 2 retries with exponential backoff, 429 handling, 401 redirect to sign-in. Base URL is `NEXT_PUBLIC_API_URL` with fallback `http://localhost:3000/api/v1`.

### Error Handling
`requireAdmin()` returns `null` on failure but does not redirect — the redirect logic is in `layout.tsx` which checks for `null` and redirects to `/store`. Solid pattern.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-001 | **CRITICAL** | `ADMIN` role absent from `ADMIN_ROLES` in `admin-check.ts` — users with role `ADMIN` cannot access /super-admin at all |
| ISSUE-002 | **HIGH** | `AdminLayoutClient` sidebar: Dashboard link has no `allowed` filter (shown to all roles), but backend dashboard endpoint only permits `SUPER_ADMIN` and `ADMIN` — `ADMIN_MANAGER`, `ADMIN_SUPPORT`, `ADMIN_FINANCE` can navigate there but will receive 403 |
| ISSUE-003 | **HIGH** | Notification bell/unread count is polled for all admin roles, but backend `GET /super-admin/notifications/unread-count` only permits `SUPER_ADMIN` and `ADMIN` — 403 errors will fire every 30 seconds for all other roles |
| ISSUE-004 | **MEDIUM** | Maps sidebar link is shown to `ADMIN_FINANCE`, but backend maps controller only allows `SUPER_ADMIN`, `ADMIN_MANAGER`, `ADMIN_SUPPORT` — `ADMIN_FINANCE` gets 403 on load |

### MVP Verdict: ❌ NOT MVP-READY
ISSUE-001 is a blocking authentication bug. ISSUE-002/003/004 are role mismatches causing 403 storms.

---

## 2. Dashboard

### Route
`/super-admin/dashboard`

### Files
`src/app/super-admin/dashboard/page.tsx` (659 lines)

### Purpose
Platform overview: key stats, recent activity feed, system health indicators, pending alerts.

### Frontend–Backend Alignment
- `GET /super-admin/dashboard/stats` → ✅ exists (`SUPER_ADMIN`, `ADMIN`)
- `GET /super-admin/dashboard/recent-activities` → ✅ exists
- `GET /super-admin/dashboard/alerts` → ✅ exists
- `POST /super-admin/dashboard/alerts/:id/resolve` → ✅ exists

All routes match.

### UI/UX
Comprehensive dashboard with stats cards, recent activity table, alerts DataTable, and action buttons. Dark theme consistent. Skeleton loaders present. CSV export for activity is wired.

### Data Integrity

> **[ISSUE-005] HIGH — Stale closure in alertColumns useMemo.**
> `useMemo(() => createAlertColumns({ onResolve: handleResolveAlert }), [])` — the dependency array is empty `[]`, but `handleResolveAlert` is a callback defined in the component. After any state update (e.g., after an alert is resolved and `mutateAlerts()` refetches), `handleResolveAlert` is a new function reference but `alertColumns` still holds the old closure. Result: resolve action may silently fail or call a stale handler that references stale state.

> **[ISSUE-006] LOW — Status badges are hardcoded strings.**
> "API Status: Operational" and "Payment Gateway: Operational" are hardcoded — these do not reflect actual system health. There is no backend endpoint for system health. This is misleading to operators.

### Error Handling
SWR `error` objects are used to show fallback UI. Resolve alert action catches errors and shows toast. Solid.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-005 | **HIGH** | `alertColumns` `useMemo` missing `handleResolveAlert` in dependency array — stale closure |
| ISSUE-006 | **LOW** | System health badges hardcoded to "Operational" — not backed by real endpoint |

### MVP Verdict: ⚠️ CONDITIONAL
Functional for MVP if ISSUE-005 is fixed and ISSUE-001 is resolved (so the `ADMIN` role can actually see this page).

---

## 3. Activity Logs

### Route
`/super-admin/activity-logs`

### Files
`src/app/super-admin/activity-logs/page.tsx` (223 lines)

### Purpose
Audit trail of all admin actions across the platform.

### Frontend–Backend Alignment
- `GET /super-admin/activity-logs` with query params `?page&limit&adminId&action&from&to` — aligns with frontend SWR key construction.

### UI/UX
Table-based view with search/filter bar, detail modal on row click. Responsive mobile card layout present.

### Data Integrity

> **[ISSUE-007] MEDIUM — No pagination controls rendered.**
> The frontend builds `?page=N&limit=25` in the SWR key, and the state variables `page`/`setPage` exist, but there is **no pagination UI** — no "Next/Previous" buttons are rendered. The page is frozen at page 1. High-volume environments will see only the first 25 logs.

### Error Handling

> **[ISSUE-008] LOW — No error state UI.**
> When SWR returns an `error`, the component only renders the loading skeleton or the success table. There is no fallback message or retry button for the error case.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-007 | **MEDIUM** | Pagination state exists but no pagination UI — locked to first page |
| ISSUE-008 | **LOW** | Error state from SWR not rendered to user |

### MVP Verdict: ⚠️ CONDITIONAL
Usable for MVP with small data sets but ISSUE-007 is a data visibility problem.

---

## 4. Banners

### Route
`/super-admin/banners`

### Files
`src/app/super-admin/banners/page.tsx` (442 lines)

### Purpose
Create, edit, toggle, and delete promotional banners shown in the customer app.

### Frontend–Backend Alignment
- `GET /super-admin/banners` → ✅
- `POST /super-admin/banners` → ✅ (via `useSWRMutation`)
- `PATCH /super-admin/banners/:id` → ✅
- `DELETE /super-admin/banners/:id` → uses raw inline `fetch` with `getSession()` — functionally correct but inconsistent with the shared `fetcher`

### UI/UX
Clean modal-based CRUD. Image upload component present. Toggle active/inactive state inline. Form validation with zod.

### Data Integrity

> **[ISSUE-009] LOW — DELETE uses inline `fetch` bypassing shared retry/timeout logic.**
> The delete handler calls `getSession()` then raw `fetch()` directly instead of using `fetcher`. This means no retry on failure, no timeout handling, and the error message surface differs from other operations.

> **[ISSUE-010] LOW — `BUCKET_NAME` hardcoded fallback.**
> `process.env.NEXT_PUBLIC_BUCKET_NAME ?? "marketplace_assets"` — if the env var is missing in production, images upload to an unintended bucket.

### Error Handling
Create/edit use `useSWRMutation` error handling with toast. Delete shows `alert()` on failure — inconsistent with the rest of the UI which uses toast notifications.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-009 | **LOW** | DELETE bypasses shared fetcher — no retry/timeout |
| ISSUE-010 | **LOW** | Hardcoded `BUCKET_NAME` fallback in env |

### MVP Verdict: ✅ MVP-READY (minor issues only)

---

## 5. Disputes

### Route
`/super-admin/disputes` and `/super-admin/disputes/[id]`

### Files
- `src/app/super-admin/disputes/page.tsx` (300 lines)
- `src/app/super-admin/disputes/[id]/page.tsx` (316 lines)

### Purpose
Dispute list with filtering and stats; individual dispute resolution with refund workflow (full, partial, no refund, reject).

### Frontend–Backend Alignment

**List page:**
- `GET /super-admin/disputes` with `?page&limit&status` → ✅
- `GET /super-admin/disputes/stats` → ✅

**Detail page:**
- `POST /super-admin/disputes/:id/resolve` → ✅
- `POST /super-admin/disputes/:id/reject` → ✅
- `POST /super-admin/disputes/:id/messages` → ✅
- `PATCH /super-admin/disputes/:id/priority` → ✅

> **[ISSUE-011] MEDIUM — Category filter is client-side only.**
> The list page has a `categoryFilter` dropdown (FOOD, GROCERY, PHARMACY, RIDE). This filter is **not sent as a query param to the backend** — the full page (up to `limit=20` per page) is fetched and then filtered in the browser. On page 2+, items from the unfiltered page 1 that match the category but are on higher pages are invisible.

> **[ISSUE-012] HIGH — Inconsistent fallback API URL in dispute detail.**
> `disputes/[id]/page.tsx` defines `const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1")`. The fallback port is **3000**, whereas the standard `useSuperAdminFetch.ts` also uses port 3000 — consistent, but the detail page uses raw `fetch` with this URL instead of the shared `fetcher`, bypassing retry logic.

> **[ISSUE-013] LOW — `params` is unwrapped in `useEffect` (Next.js canary pattern).**
> The dispute detail page does `React.use(params)` or unwraps `params` via useEffect — this is the Next.js 15 async params pattern. If the project targets Next.js 14, this pattern is unstable/canary and will fail.

### Error Handling
Detail page: individual action handlers catch errors and show toast. Resolution modal has loading states. Solid.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-011 | **MEDIUM** | Category filter applied client-side after fetch — incorrect pagination behavior |
| ISSUE-012 | **MEDIUM** | Detail page uses raw `fetch` instead of shared `fetcher` — no retry/timeout |
| ISSUE-013 | **LOW** | Async `params` unwrapping pattern may not be stable in Next.js 14 |

### MVP Verdict: ⚠️ CONDITIONAL
Resolution workflow is correct. ISSUE-011 must be fixed before production with real data volume.

---

## 6. Orders

### Route
`/super-admin/orders` and `/super-admin/orders/[id]`

### Files
- `src/app/super-admin/orders/page.tsx` (324 lines)
- `src/app/super-admin/orders/[id]/page.tsx` (542 lines)

### Purpose
Order management list with debounced search/filter; detail view with status stepper, assign-rider, and status override.

### Frontend–Backend Alignment
- `GET /super-admin/orders` with `?page&limit&search&status&type` → ✅
- `GET /super-admin/orders/:id` → ✅
- `DELETE /super-admin/orders/:id` → ✅
- `PATCH /super-admin/orders/:id/override` → ✅ (backend restricts to `SUPER_ADMIN` only — frontend does not enforce this in the UI)

> **[ISSUE-014] HIGH — Export CSV button is non-functional.**
> In `orders/page.tsx`, the Export CSV `<button>` element has no `onClick` handler. There is no CSV export logic. The button renders with "Export CSV" text but clicking it does nothing.

> **[ISSUE-015] MEDIUM — `typeFilter` enum values may mismatch backend.**
> Dropdown options are "Food", "Grocery", "Pharmacy". The backend `?type=` param expects actual `OrderType` enum values from Prisma. If the backend enum is `FOOD`, `GROCERY`, `PHARMACY` (uppercase), the filter silently returns no results.

> **[ISSUE-016] LOW — Override status action shown to all admin roles.**
> Backend restricts `PATCH :id/override` to `SUPER_ADMIN` only. The detail page renders the override UI for any logged-in admin. Non-SUPER_ADMIN admins will see the button but get 403.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-014 | **HIGH** | Export CSV button has no onClick — dead UI element |
| ISSUE-015 | **MEDIUM** | typeFilter values may be case-mismatched with backend enum |
| ISSUE-016 | **LOW** | Status override UI shown to all roles; backend 403s for non-SUPER_ADMIN |

### MVP Verdict: ⚠️ CONDITIONAL
Core order viewing and management works. ISSUE-014 and ISSUE-015 need to be resolved.

---

## 7. Rides

### Route
`/super-admin/rides` and `/super-admin/rides/[id]`

### Files
- `src/app/super-admin/rides/page.tsx` (518 lines)
- `src/app/super-admin/rides/[id]/page.tsx` (690 lines)

### Purpose
Ride-hailing management: list with cancel action; detail with driver assign/unassign, retry matching, force status.

### Frontend–Backend Alignment

**List page cancel:**
- Frontend: `PATCH ${API_URL}/super-admin/rides/${id}/cancel`
- Backend: `PATCH :id/cancel` → ✅ (method matches)

> **[ISSUE-017] HIGH — URL construction bug in `handleCancelRide`.**
> Uses `const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"`. The fallback is port **3001** with **no `/api/v1` path**. So the raw request goes to `http://localhost:3001/super-admin/rides/:id/cancel` instead of `http://localhost:3001/api/v1/super-admin/rides/:id/cancel`. This will 404 in local dev if env is not set.

**Detail page — critical missing endpoints:**
- Frontend calls `POST /super-admin/rides/:id/retry-matching` → **❌ ENDPOINT DOES NOT EXIST** in `ride.controller.ts`
- Frontend calls `PATCH /super-admin/rides/:id/unassign` → **❌ ENDPOINT DOES NOT EXIST** in `ride.controller.ts`

> **[ISSUE-018] CRITICAL — `retry-matching` endpoint missing from backend.**
> The rides detail page has a "Retry Matching" action that POSTs to `/super-admin/rides/:id/retry-matching`. The `RidesController` only defines `GET /`, `GET :id`, `PATCH :id/cancel`, `POST :id/assign`, and `PATCH :id/force-status`. There is no `retry-matching` handler. This action will always return 404.

> **[ISSUE-019] CRITICAL — `unassign` endpoint missing from backend.**
> Similarly, `PATCH :id/unassign` is called from the detail page but does not exist in the controller. 404 every time.

> **[ISSUE-020] HIGH — `assign` method mismatch.**
> Backend: `POST :id/assign`. Frontend detail page — need to verify if it uses POST or PATCH. If it uses PATCH, it will 404 because the backend uses POST for assign. (Backend controller line ~45: `@Post(':id/assign')`).

> **[ISSUE-021] MEDIUM — `assign` role restriction not enforced in frontend.**
> Backend: `POST :id/assign` requires `SUPER_ADMIN` or `ADMIN_MANAGER`. Frontend renders the assign button for any admin role. Non-privileged roles get 403.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-017 | **HIGH** | Cancel URL fallback missing `/api/v1` path — 404 in dev without env set |
| ISSUE-018 | **CRITICAL** | `retry-matching` backend endpoint does not exist — always 404 |
| ISSUE-019 | **CRITICAL** | `unassign` backend endpoint does not exist — always 404 |
| ISSUE-020 | **HIGH** | Verify `assign` HTTP method matches — backend uses POST |
| ISSUE-021 | **MEDIUM** | Assign UI shown to all roles; backend restricts to SUPER_ADMIN/ADMIN_MANAGER |

### MVP Verdict: ❌ NOT MVP-READY
Two critical missing backend endpoints (retry-matching, unassign). The detail page's primary actions are broken.

---

## 8. Deliveries

### Route
`/super-admin/deliveries` and `/super-admin/deliveries/[id]`

### Files
- `src/app/super-admin/deliveries/page.tsx` (~600 lines)
- `src/app/super-admin/deliveries/[id]/page.tsx` (~506 lines)

### Purpose
Delivery order management with list/map toggle and rider assignment.

### Frontend–Backend Alignment
Deliveries-specific backend controller endpoints were not separately visible in the super-admin module; deliveries appear to be served through the orders flow with `type=DELIVERY`. This needs backend verification.

### Data Integrity

> **[ISSUE-022] CRITICAL — `Math.random()` used for "isLate" detection in production code.**
> ```js
> const isLate = (delivery) => Math.random() > 0.8;
> ```
> This produces a random true/false 20% of the time, unrelated to actual delivery timing. This is debug/mock code left in production. The "LATE" badge shown on deliveries is meaningless.

> **[ISSUE-023] HIGH — Map view is a CSS mock, not a real map.**
> The map toggle in the list page renders a static `<div>` with absolutely-positioned circles based on `Math.random()` for marker positions. This is not connected to any real location data. The map view is entirely non-functional.

> **[ISSUE-024] MEDIUM — No debounce on search term.**
> The search input updates `searchTerm` state on every keystroke, which triggers a new SWR key and API call immediately. Other pages (e.g., orders) use `useDebounce`. This causes a request flood on fast typing.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-022 | **CRITICAL** | `Math.random()` used for isLate — mock code in production |
| ISSUE-023 | **HIGH** | Map view is CSS mock with random positions — not real location data |
| ISSUE-024 | **MEDIUM** | Search has no debounce — floods API on keystrokes |

### MVP Verdict: ❌ NOT MVP-READY
ISSUE-022 and ISSUE-023 are mock/placeholder code that must be replaced before launch.

---

## 9. Payouts

### Route
`/super-admin/payouts`

### Files
`src/app/super-admin/payouts/page.tsx` (918 lines)

### Purpose
Approve or reject vendor/rider payout requests with preview modal and rejection reason dialog.

### Frontend–Backend Alignment
- `GET /super-admin/payouts` with `?status&type&from&to` → ✅
- `POST /super-admin/payouts/${p.payoutType}/${p.id}/approve` → Backend: `POST :type/:id/approve` → ✅ (payoutType becomes the URL segment)
- `POST /super-admin/payouts/${rejectTarget.type}/${rejectTarget.id}/reject` → Backend: `POST :type/:id/reject` → ✅

Both approve and reject handlers correctly use the shared `fetcher` (not raw `fetch`). URL patterns match backend. Retry and auth are handled.

Backend role: `SUPER_ADMIN` and `ADMIN_FINANCE`.
Frontend sidebar: Payouts link has `allowed: ['SUPER_ADMIN', 'ADMIN_FINANCE']` — ✅ correctly restricted.

### UI/UX
Excellent implementation: preview modal with full payout detail, rejection dialog requiring a reason, mobile card layout. Loading states per-row using `loadingIds` map. Toast notifications.

### Data Integrity
SWR `mutate()` called after approve/reject to refresh list — correct.
Filter params correctly sent to backend as query strings.

### Error Handling
Try/catch in both `handleApprove` and `handleReject` with toast on error. Solid.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-025 | **LOW** | No confirmation dialog before approve — rejection has a dialog but approval is one-click |

### MVP Verdict: ✅ MVP-READY (best implementation in the section)

---

## 10. Verification

### Route
`/super-admin/verification` and `/super-admin/verification/[id]`

### Files
- `src/app/super-admin/verification/page.tsx`
- `src/app/super-admin/verification/[id]/page.tsx` (~604 lines)

### Purpose
Document verification queue for vendors and riders; approve/reject with commission rate assignment for vendors.

### Frontend–Backend Alignment
- `GET /super-admin/verification` with `?type&status&search&page&limit` → ✅
- `GET /super-admin/verification/:id` → ✅
- `PATCH /super-admin/verification/${entityType}/${id}/decision` → Backend: `PATCH :type/:id/decision` → ✅

### UI/UX
Clean two-tab layout (Vendors/Riders). Detail page shows document viewer, entity info, and decision buttons.

### Data Integrity

> **[ISSUE-026] HIGH — Entity type detection is fragile.**
> In `verification/[id]/page.tsx`, the `entityType` variable is derived as `entity?.store !== undefined ? 'vendor' : 'rider'`. If the backend returns a vendor entity that happens to have no `store` property (e.g., a vendor who hasn't created a store), this will misclassify them as a rider and call the wrong decision endpoint.

> **[ISSUE-027] LOW — `ToastContainer` likely duplicated.**
> `ToastContainer` is rendered inside the verification page component. If it is also rendered in a parent layout, toast notifications will be rendered twice.

### Error Handling
Decision handlers have try/catch with toast. Back navigation after decision. Good.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-026 | **HIGH** | Entity type inferrence based on `store` presence — can misclassify vendor as rider |
| ISSUE-027 | **LOW** | Potential duplicate `ToastContainer` |

### MVP Verdict: ⚠️ CONDITIONAL
ISSUE-026 must be fixed; backend should return an explicit `entityType` field.

---

## 11. Transactions

### Route
`/super-admin/transactions` and `/super-admin/transactions/[id]`

### Files
- `src/app/super-admin/transactions/page.tsx` (~510 lines)
- `src/app/super-admin/transactions/[id]/page.tsx` (269 lines)

### Purpose
Transaction ledger with stats, wallet adjustment modal; individual transaction with receipt download and payment verification.

### Frontend–Backend Alignment
- `GET /super-admin/transactions` → ✅
- `GET /super-admin/transactions/:id` → ✅
- `POST /super-admin/transactions/adjust-wallet` → ✅
- `POST /super-admin/transactions/:id/verify` → ✅ (backend allows `ADMIN_SUPPORT` but page is not accessible to support agents — low risk)

### Data Integrity

> **[ISSUE-028] HIGH — Two different broken fallback URLs in the same detail file.**
> In `transactions/[id]/page.tsx`:
> - Receipt download: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"` (port 3000, includes `/api/v1`)
> - Verify payment: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"` (port 3001, **missing** `/api/v1`)
>
> Both blocks use raw `fetch`. In production with `NEXT_PUBLIC_API_URL` set, they both work (the env var is used). In local dev without the env var, receipt download goes to port 3000 and verify goes to port 3001 with wrong path — both fail differently.

> **[ISSUE-029] MEDIUM — Currency band-aid fix.**
> `formatNairaString` does `str.replace(/\$/g, '₦')` to convert dollar signs to naira. The backend should be returning the correct currency symbol natively. This replacement can corrupt legitimate strings containing `$` characters.

### Error Handling
Both actions use try/catch with toast. Download action creates a temporary `<a>` link — browser-native, acceptable.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-028 | **HIGH** | Two conflicting fallback URLs in same file — receipt=3000/api/v1, verify=3001 (no path) |
| ISSUE-029 | **MEDIUM** | Currency formatting via `$` string replacement — fragile band-aid |

### MVP Verdict: ⚠️ CONDITIONAL
Fix ISSUE-028 (use shared fetcher for both actions).

---

## 12. Reports

### Route
`/super-admin/reports`

### Files
`src/app/super-admin/reports/page.tsx`

### Purpose
Analytics overview with period selector (7/30/90/365 days), charts, and export.

### Frontend–Backend Alignment
- `GET /super-admin/reports/analytics?days=N` → ✅
- `POST /super-admin/reports/export?days=N` → ✅

Both use shared `fetcher`. `keepPreviousData: true` prevents flash on period change — good UX.

### UI/UX
Period selector tabs, stat cards, chart area (chart component assumed to render correctly). Export button wired.

### Error Handling
SWR error captured, toast on export failure.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-030 | **LOW** | No empty-state UI when analytics data returns zero rows |

### MVP Verdict: ✅ MVP-READY

---

## 13. Notifications

### Route
`/super-admin/notifications`

### Files
`src/app/super-admin/notifications/page.tsx`

### Purpose
Real-time admin notification feed with WebSocket + SWR hybrid, mark-read, and tab filtering.

### Frontend–Backend Alignment
- `GET /super-admin/notifications` → ✅
- `GET /super-admin/notifications/unread-count` → ✅
- `PATCH /super-admin/notifications/read-all` → ✅
- `PATCH /super-admin/notifications/:id/read` → ✅
- Socket.io `joinAdminRoom` / `admin_notification` → backend must emit this event (not verified in scope but architecture matches)

> **[ISSUE-031] CRITICAL — Backend restricts all notification endpoints to `SUPER_ADMIN` and `ADMIN` only.**
> The `NotificationsController` uses `@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)` at the class level. But:
> - All sidebar menus show a notification bell to every admin role
> - The `AdminLayoutClient` polls unread-count every 30s for every role
> - `ADMIN_MANAGER`, `ADMIN_SUPPORT`, `ADMIN_FINANCE` all get 403 on every notification request
> - The notifications page itself will fail to load for these roles, but no access guard prevents navigation there in the sidebar

### UI/UX
WebSocket + SWR optimistic update pattern is well-implemented. Tab filtering (All/Unread/System) is clean. Real-time new-notification toast via socket event.

### Error Handling
Socket connection errors are silently caught (`socket.on('connect_error')`). SWR error shown via try/catch toast on actions.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-031 | **CRITICAL** | Backend notifications restricted to SUPER_ADMIN+ADMIN only; notification bell triggers 403 for all other roles every 30 seconds |

### MVP Verdict: ❌ NOT MVP-READY
ISSUE-031 causes continuous 403 errors for non-SUPER_ADMIN/ADMIN roles.

---

## 14. Settings

### Route
`/super-admin/settings` and `/super-admin/settings/zones`

### Files
- `src/app/super-admin/settings/page.tsx` (542 lines)
- `src/app/super-admin/settings/zones/page.tsx` (276 lines)

### Purpose
System settings (commission rate, maintenance mode, etc.) with bulk update; team admin management (CRUD); service zone polygon editor.

### Frontend–Backend Alignment

**Settings page:**
- `GET /super-admin/settings` → Backend: `SUPER_ADMIN` and `ADMIN` only → ✅
- `PATCH /super-admin/settings/bulk` → Backend: `SUPER_ADMIN` **only** — ✅
- `GET /super-admin/admins` → ✅
- `POST /super-admin/admins` → ✅
- `DELETE /super-admin/admins/:id` → ✅

All use shared `fetcher` — ✅

**Zones page:**
- `GET /super-admin/zones` → ✅

> **[ISSUE-032] HIGH — Zone create/delete use raw `fetch` with broken fallback URL.**
> `settings/zones/page.tsx` defines `const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"` — the fallback is port **3001 with no `/api/v1` path**. POST to create zone and DELETE zone both use this raw URL. Same class of bug as ISSUE-017.

> **[ISSUE-033] MEDIUM — Settings read available to `ADMIN` role, but `ADMIN` role cannot enter the super-admin section (ISSUE-001).** A secondary impact of ISSUE-001.

### UI/UX
Settings page: clean toggle/input layout, save button with spinner. Team management: modal with role selection. Zones: MapEditor polygon canvas with draw/clear/save controls.

### Error Handling
`fetcher` on mutations with toast. Zone raw `fetch` uses try/catch with `alert()` — inconsistent UI pattern.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-032 | **HIGH** | Zones create/delete use raw fetch with wrong fallback URL (port 3001, no /api/v1) |
| ISSUE-033 | **MEDIUM** | Blocked by ISSUE-001 — ADMIN role cannot reach settings |

### MVP Verdict: ⚠️ CONDITIONAL
Settings page itself is solid. Zones page ISSUE-032 must be fixed.

---

## 15. Maps

### Route
`/super-admin/maps`

### Files
- `src/app/super-admin/maps/page.tsx` (~423 lines)
- `src/app/super-admin/maps/LiveMapCanvas.tsx` (337 lines)

### Purpose
Live fleet tracking map showing all drivers and riders with real-time position markers.

### Frontend–Backend Alignment
- `GET /super-admin/maps/live` → Backend exists: `MapsController` with `@Get('live')` → ✅
- Frontend polls via SWR with `refreshInterval: 10000` — ✅
- Backend roles: `SUPER_ADMIN`, `ADMIN_MANAGER`, `ADMIN_SUPPORT` (NOT `ADMIN_FINANCE`)
- Sidebar shows Maps to `ADMIN_FINANCE` — ❌ (see ISSUE-004)

### UI/UX
`LiveMapCanvas` is a genuine Google Maps integration via `@react-google-maps/api`. Dark map style matches the admin theme. SVG markers for drivers (blue) and riders (red), with gold ring for active jobs, dimmed appearance for offline. InfoWindow on hover. Fit-to-bounds on initial load. User detail sidebar panel. Professional implementation.

### Data Integrity
`hasFitRef` prevents repeated auto-zoom on data refresh — good pattern. Markers update on every 10s poll.

### Error Handling
`useGoogleMaps()` hook handles Maps API load state. Canvas shows spinner while loading. No error state shown if `GET /live` fails (only stale data is silently kept by SWR `keepPreviousData`).

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-034 | **LOW** | No error state if live endpoint fails — shows stale or empty map silently |
| (ISSUE-004 referenced) | **MEDIUM** | ADMIN_FINANCE sees Maps in sidebar but gets 403 |

### MVP Verdict: ✅ MVP-READY (isolated from ISSUE-004 which is in layout)

---

## 16. Profile

### Route
`/super-admin/profile`

### Files
`src/app/super-admin/profile/page.tsx` (~400 lines)

### Purpose
Admin profile update (name, phone) and password change.

### Frontend–Backend Alignment

> **[ISSUE-035] HIGH — Fetches profile from `/users/profile` not `/super-admin/profile`.**
> The profile page calls `GET /users/profile` and `PATCH /users/profile`. This relies on the user controller handling admin profiles. If the user controller is restricted to `CUSTOMER` role only by `@Roles()`, all admin profile fetches will 403. This is unverified but high-risk.

> **[ISSUE-036] CRITICAL — Password change payload is incorrect.**
> The zod schema for password change includes `{ password, confirmPassword }` and sends this directly. A secure password change flow requires the current password to verify identity. The backend almost certainly expects `{ currentPassword, newPassword }` (standard security pattern). There is **no `currentPassword` field** in the form — meaning:
> (a) If the backend requires it, the request always fails (the user can never change their password).
> (b) If the backend doesn't require it, any admin who gains temporary access can change passwords without knowing the current one — a security vulnerability.

### UI/UX
Two separate forms (profile info, password change) in separate cards. Clean layout. Loading spinner on submit.

### Error Handling
Both forms use try/catch with toast. Password confirm validation in zod. However, the missing `currentPassword` field means the error case is always hit.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-035 | **HIGH** | Profile endpoint uses `/users/profile` — may be wrong role-guard on backend |
| ISSUE-036 | **CRITICAL** | Password change missing `currentPassword` field — security vulnerability and likely 400/422 from backend |

### MVP Verdict: ❌ NOT MVP-READY
ISSUE-036 is a critical security issue and likely breaks the password change flow entirely.

---

## 17. Search

### Route
`/super-admin/search`

### Files
`src/app/super-admin/search/page.tsx` (~331 lines)

### Purpose
Global search across vendors, customers, riders, orders, and rides.

### Frontend–Backend Alignment
Five parallel SWR calls, each only fired when a query `q` param is present:
- `GET /super-admin/users/vendors?search=q` → ✅ (inferred, vendors endpoint accepts search)
- `GET /super-admin/users/customers?search=q` → ✅
- `GET /super-admin/users/riders?search=q` → ✅
- `GET /super-admin/orders?search=q` → ✅
- `GET /super-admin/rides?search=q` → ✅

### UI/UX
Results shown in entity-type sections. No keyboard shortcut or auto-focus on mount. No empty query guard beyond `enabled: !!q`.

### Data Integrity

> **[ISSUE-037] LOW — No debounce on search.**
> Typing in the search bar updates the URL query param (via `router.push`) on every character. Each character triggers 5 simultaneous SWR fetches. A 200ms debounce would reduce server load significantly.

> **[ISSUE-038] LOW — No keyboard search trigger.**
> Pressing Enter does not submit the search. The search fires only when the URL `?q=` param changes (via button click or direct URL). UX expectation is that Enter key in a search input triggers search.

### Error Handling
Individual SWR errors per entity type — no cross-entity error aggregation. If one entity 403s, others still show.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-037 | **LOW** | No debounce — 5 API calls per keystroke |
| ISSUE-038 | **LOW** | Enter key does not trigger search |

### MVP Verdict: ✅ MVP-READY (minor UX polish needed)

---

## 18. Users — Customers

### Route
`/super-admin/users/customers` and `/super-admin/users/customers/[id]`

### Files
- `src/app/super-admin/users/customers/page.tsx` (~521 lines)
- `src/app/super-admin/users/customers/[id]/page.tsx`

### Purpose
Customer list with ban/activate actions, bulk operations; customer detail view.

### Frontend–Backend Alignment
- `GET /super-admin/users/customers` → ✅ (page builds query with `?page&limit&search&status`)
- Status toggle via `fetcher` PATCH call → ✅
- Bulk action handler present

### UI/UX
Stats cards at top. DataTable with pagination. Mobile card view. Bulk selection checkbox system.

### Data Integrity
Uses shared `fetcher` for mutations — correct.

> **[ISSUE-039] MEDIUM — Detail page not read; cannot verify alignment.**
> `users/customers/[id]/page.tsx` was not read during this audit. Cannot confirm its endpoint alignment or error handling.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-039 | **MEDIUM** | Customer detail page not audited — alignment unverified |

### MVP Verdict: ⚠️ CONDITIONAL (pending detail page review)

---

## 19. Users — Vendors

### Route
`/super-admin/users/vendors` and `/super-admin/users/vendors/[id]`

### Files
- `src/app/super-admin/users/vendors/page.tsx` (~737 lines)
- `src/app/super-admin/users/vendors/[id]/page.tsx` (~787 lines)

### Purpose
Vendor management: list, filter, ban/suspend/activate; vendor detail with multi-tab sub-views (orders, products, reviews, payouts, documents, activity).

### Frontend–Backend Alignment
- `GET /super-admin/users/vendors?page&limit&search&status` → ✅

> **[ISSUE-040] HIGH — N+1 over-fetching for stats.**
> The vendors list page makes two SWR calls:
> 1. `GET /super-admin/users/vendors?page=1&limit=20` (paginated list)
> 2. `GET /super-admin/users/vendors?limit=1000` (for counting stats: total, active, suspended)
>
> The second call fetches 1000 vendors into the browser just to count them client-side. If there is a `/stats` endpoint, it should be used. If not, one needs to be created. 1000-vendor payload is a performance and memory issue.

> **[ISSUE-041] MEDIUM — SUSPENDED filter applied client-side.**
> `vendors.filter(v => v.status !== 'SUSPENDED')` is applied after the paginated fetch. This means page 2 may have 20 items on the server but fewer after client-side filtering — inconsistent page sizes and incorrect total counts shown to the user.

> **[ISSUE-042] LOW — `getAuthHeader()` defined per-page.**
> An inline `getAuthHeader` function calls `getSession()` and returns the Bearer header. This duplicates the logic in `useSuperAdminFetch.ts` and does not benefit from retry/timeout.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-040 | **HIGH** | `?limit=1000` call for stats — over-fetching 1000 vendors for client-side count |
| ISSUE-041 | **MEDIUM** | Suspended filter client-side on paginated data — incorrect UX |
| ISSUE-042 | **LOW** | Inline `getAuthHeader` duplicates shared fetcher logic |

### MVP Verdict: ⚠️ CONDITIONAL
Functional but ISSUE-040 is a performance risk at scale.

---

## 20. Users — Riders

### Route
`/super-admin/users/riders` and `/super-admin/users/riders/[id]`

### Files
`src/app/super-admin/users/riders/page.tsx`

### Purpose
Rider list with status management (activate/suspend/ban).

### Frontend–Backend Alignment
- `GET /super-admin/users/riders` → ✅
- Mutations use `BASE_URL` with raw `fetch`

> **[ISSUE-043] HIGH — Mutations use raw `fetch` with `BASE_URL`.**
> `BASE_URL` is defined as `process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"`. The fallback is port **3001 with no `/api/v1` path** — same class of bug as ISSUE-017 and ISSUE-032. Status toggle and other mutations will 404 in local dev without the env configured.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-043 | **HIGH** | Rider mutations use raw fetch with wrong fallback URL — 404 without env set |

### MVP Verdict: ⚠️ CONDITIONAL
Fix ISSUE-043 by migrating to shared `fetcher`.

---

## 21. Users — Drivers

### Route
`/super-admin/users/drivers` and `/super-admin/users/drivers/[id]`

### Files
`src/app/super-admin/users/drivers/page.tsx`

### Purpose
Driver (ride-hailing) management with status actions.

### Frontend–Backend Alignment
Same pattern as riders page.

> **[ISSUE-044] HIGH — Same raw fetch / broken fallback URL as ISSUE-043.**
> Identical problem: `BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"` used for mutations.

> **[ISSUE-045] MEDIUM — No loading skeleton for drivers page.**
> The `isLoading` state from SWR is not used to show a skeleton loader during initial load. The table appears empty until data arrives — no feedback to the user.

### Issues

| # | Severity | Description |
|---|----------|-------------|
| ISSUE-044 | **HIGH** | Driver mutations use raw fetch with wrong fallback URL |
| ISSUE-045 | **MEDIUM** | No loading skeleton — blank table during initial data fetch |

### MVP Verdict: ⚠️ CONDITIONAL

---

## 22. Summary Table

| # | Page / Section | MVP Status | Critical Issues | High Issues | Medium | Low | Key Notes |
|---|----------------|------------|-----------------|-------------|--------|-----|-----------|
| 1 | Auth & Layout | ❌ NOT READY | 1 (ISSUE-001) | 1 | 0 | 0 | `ADMIN` role locked out; notification 403 storm |
| 2 | Dashboard | ⚠️ CONDITIONAL | 0 | 1 | 0 | 1 | Stale closure in useMemo; hardcoded health badges |
| 3 | Activity Logs | ⚠️ CONDITIONAL | 0 | 0 | 1 | 1 | Pagination state with no pagination UI |
| 4 | Banners | ✅ READY | 0 | 0 | 0 | 2 | DELETE uses inline fetch; minor env fallback |
| 5 | Disputes | ⚠️ CONDITIONAL | 0 | 1 | 1 | 1 | Category filter client-side only; raw fetch in detail |
| 6 | Orders | ⚠️ CONDITIONAL | 0 | 1 | 1 | 1 | Export CSV button dead; typeFilter enum mismatch |
| 7 | Rides | ❌ NOT READY | 2 (ISSUE-018/019) | 1 | 1 | 0 | `retry-matching` and `unassign` endpoints DNE |
| 8 | Deliveries | ❌ NOT READY | 1 (ISSUE-022) | 1 | 1 | 0 | `Math.random()` isLate; CSS mock map |
| 9 | Payouts | ✅ READY | 0 | 0 | 0 | 1 | Best page — approve/reject fully aligned |
| 10 | Verification | ⚠️ CONDITIONAL | 0 | 1 | 0 | 1 | Fragile entity type detection |
| 11 | Transactions | ⚠️ CONDITIONAL | 0 | 1 | 1 | 0 | Two broken fallback URLs in same file |
| 12 | Reports | ✅ READY | 0 | 0 | 0 | 1 | Solid; minor empty state missing |
| 13 | Notifications | ❌ NOT READY | 1 (ISSUE-031) | 0 | 0 | 0 | Backend restricts to 2 roles; all others 403 |
| 14 | Settings | ⚠️ CONDITIONAL | 0 | 1 | 1 | 0 | Zones raw fetch with wrong fallback URL |
| 15 | Maps | ✅ READY | 0 | 0 | 0 | 1 | Real Google Maps; minor error state gap |
| 16 | Profile | ❌ NOT READY | 1 (ISSUE-036) | 1 | 0 | 0 | Missing `currentPassword`; wrong profile endpoint |
| 17 | Search | ✅ READY | 0 | 0 | 0 | 2 | No debounce; no Enter key handler |
| 18 | Users: Customers | ⚠️ CONDITIONAL | 0 | 0 | 1 | 0 | Detail page unaudited |
| 19 | Users: Vendors | ⚠️ CONDITIONAL | 0 | 1 | 1 | 1 | `?limit=1000` stats over-fetch |
| 20 | Users: Riders | ⚠️ CONDITIONAL | 0 | 1 | 0 | 0 | Raw fetch with wrong URL fallback |
| 21 | Users: Drivers | ⚠️ CONDITIONAL | 0 | 1 | 1 | 0 | Same URL bug + no loading skeleton |

---

## Consolidated Issue Severity Register

### CRITICAL (5 issues — Production Blockers)

| ID | Location | Description |
|----|----------|-------------|
| ISSUE-001 | `utils/admin-check.ts` | `ADMIN` role not in `ADMIN_ROLES` — all `ADMIN`-role users locked out of super-admin |
| ISSUE-018 | `rides/[id]/page.tsx` | `retry-matching` endpoint does not exist in backend — always 404 |
| ISSUE-019 | `rides/[id]/page.tsx` | `unassign` endpoint does not exist in backend — always 404 |
| ISSUE-022 | `deliveries/page.tsx` | `Math.random()` used for isLate detection — debug code in production |
| ISSUE-036 | `profile/page.tsx` | Password change missing `currentPassword` — security vulnerability + broken functionality |
| ISSUE-031 | `notifications/page.tsx` | Backend restricts notifications to 2 roles; all other admin roles get continuous 403s |

### HIGH (10 issues — Must Fix Before Launch)

| ID | Location | Description |
|----|----------|-------------|
| ISSUE-002 | `AdminLayoutClient.tsx` | Dashboard shown to all roles; backend 403s non-SUPER_ADMIN/ADMIN |
| ISSUE-003 | `AdminLayoutClient.tsx` | Unread-count polled every 30s for all roles; backend 403s non-SUPER_ADMIN/ADMIN |
| ISSUE-005 | `dashboard/page.tsx` | Stale closure in alertColumns useMemo — missing dependency |
| ISSUE-014 | `orders/page.tsx` | Export CSV button has no onClick handler — dead UI |
| ISSUE-017 | `rides/page.tsx` | Cancel ride URL missing `/api/v1` in fallback — 404 without env set |
| ISSUE-023 | `deliveries/page.tsx` | Map view is CSS mock with random positions |
| ISSUE-026 | `verification/[id]/page.tsx` | Entity type detection based on `store` presence — fragile |
| ISSUE-028 | `transactions/[id]/page.tsx` | Two different broken fallback URLs in same file |
| ISSUE-032 | `settings/zones/page.tsx` | Zone CRUD uses wrong fallback URL (port 3001, no /api/v1) |
| ISSUE-035 | `profile/page.tsx` | Profile fetched from `/users/profile` — wrong endpoint, potential 403 |
| ISSUE-040 | `users/vendors/page.tsx` | `?limit=1000` call to count vendors — severe over-fetching |
| ISSUE-043 | `users/riders/page.tsx` | Rider mutations raw fetch with wrong URL fallback |
| ISSUE-044 | `users/drivers/page.tsx` | Driver mutations raw fetch with wrong URL fallback |

### MEDIUM (9 issues — Should Fix Before Launch)

| ID | Location | Description |
|----|----------|-------------|
| ISSUE-004 | `AdminLayoutClient.tsx` | `ADMIN_FINANCE` shown Maps link; backend refuses them |
| ISSUE-011 | `disputes/page.tsx` | Category filter client-side only — incorrect paging behavior |
| ISSUE-015 | `orders/page.tsx` | typeFilter enum values may mismatch backend prisma enum case |
| ISSUE-020 | `rides/[id]/page.tsx` | Assign — verify HTTP method is POST (not PATCH) to match backend |
| ISSUE-024 | `deliveries/page.tsx` | Search has no debounce — floods API on keystrokes |
| ISSUE-029 | `transactions/page.tsx` | Currency formatting via `$` replace — fragile |
| ISSUE-039 | `users/customers/[id]` | Customer detail page not audited |
| ISSUE-041 | `users/vendors/page.tsx` | SUSPENDED filter client-side on paginated data |
| ISSUE-045 | `users/drivers/page.tsx` | No loading skeleton |

### LOW (12 issues — Nice to Fix)

| ID | Location | Description |
|----|----------|-------------|
| ISSUE-006 | `dashboard/page.tsx` | Hardcoded "Operational" health badges |
| ISSUE-007 | `activity-logs/page.tsx` | Pagination UI missing — frozen at page 1 |
| ISSUE-008 | `activity-logs/page.tsx` | No error state UI |
| ISSUE-009 | `banners/page.tsx` | DELETE bypasses shared fetcher |
| ISSUE-010 | `banners/page.tsx` | Hardcoded BUCKET_NAME fallback |
| ISSUE-013 | `disputes/[id]/page.tsx` | Async params pattern may be unstable in Next.js 14 |
| ISSUE-016 | `orders/[id]/page.tsx` | Override UI shown to all roles; 403 for non-SUPER_ADMIN |
| ISSUE-021 | `rides/[id]/page.tsx` | Assign button shown to all roles; backend restricts |
| ISSUE-025 | `payouts/page.tsx` | No confirmation before approve — one-click action |
| ISSUE-027 | `verification/[id]/page.tsx` | Potentially duplicate ToastContainer |
| ISSUE-034 | `maps/page.tsx` | No error state if live endpoint fails |
| ISSUE-037 | `search/page.tsx` | No debounce — 5 calls per keystroke |
| ISSUE-038 | `search/page.tsx` | Enter key does not trigger search |
| ISSUE-042 | `users/vendors/page.tsx` | Inline getAuthHeader duplicates shared fetcher logic |

---

## Prioritised Fix Roadmap

### Sprint 1 — Before Any UAT / QA

1. **ISSUE-001** — Add `"ADMIN"` to `ADMIN_ROLES` array in `utils/admin-check.ts`
2. **ISSUE-018 / ISSUE-019** — Implement `retry-matching` and `unassign` endpoints in `RidesController`
3. **ISSUE-036** — Add `currentPassword` field to profile password change form and zod schema; update backend call payload
4. **ISSUE-022** — Replace `Math.random()` isLate with real timestamp comparison (compare `estimatedDeliveryAt` to `Date.now()`)
5. **ISSUE-031 / ISSUE-002 / ISSUE-003** — Expand backend `@Roles()` on notifications and dashboard controllers to include `ADMIN_MANAGER`, `ADMIN_SUPPORT`, `ADMIN_FINANCE` as appropriate; or restrict sidebar links to matching roles
6. **ISSUE-014** — Implement CSV export for orders list or remove the button

### Sprint 2 — Before Production Launch

7. **ISSUE-017 / ISSUE-032 / ISSUE-043 / ISSUE-044** — Standardise all raw `fetch` calls to use shared `fetcher` (eliminates the fallback URL class of bugs across rides cancel, zones, riders, drivers)
8. **ISSUE-040** — Replace `?limit=1000` vendors call with a dedicated `/stats` endpoint or compute stats server-side
9. **ISSUE-023** — Replace CSS mock map in deliveries list with a real map integration (the `LiveMapCanvas` pattern from Maps page)
10. **ISSUE-005** — Fix `useMemo` dependency array in dashboard alertColumns
11. **ISSUE-026** — Add an explicit `entityType` field to verification detail API response; stop inferring from `store` presence
12. **ISSUE-028** — Use shared fetcher for receipt download and verify payment in transactions detail
13. **ISSUE-035** — Verify backend `/users/profile` endpoint allows admin roles; if not, create `/super-admin/profile` endpoint

### Sprint 3 — Polish

14. **ISSUE-011** — Move category filter to backend query param in disputes list
15. **ISSUE-015** — Verify and align typeFilter enum values with backend Prisma schema
16. **ISSUE-007** — Add pagination UI to activity logs
17. **ISSUE-024** — Add `useDebounce` to deliveries search
18. Remaining LOW issues at team discretion
