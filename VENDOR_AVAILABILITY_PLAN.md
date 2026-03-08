# Vendor Availability Enforcement — Design & Implementation Plan

**Date:** March 8, 2026  
**Scope:** Backend (NestJS), Customer Mobile App (Expo/React Native), Customer Web App (Next.js)

---

## 1. Current State: What Is Missing

### 1.1 The Two Availability Signals

The `Store` model already holds both availability signals:

| Field | Location | Meaning |
|---|---|---|
| `isOpen` | `Store.isOpen: Boolean` | Manual toggle — vendor switches themselves online/offline |
| `openHours` | `Store.openHours: Json?` | Weekly schedule (JSON blob from signup) |
| `openingHours` | `Store.openingHours: OpeningHour[]` | Structured relation — `dayOfWeek`, `openTime`, `closeTime` |

### 1.2 Where the Gap Is

| Layer | What Happens Today | What Should Happen |
|---|---|---|
| **Backend — Marketplace listing** | Stores shown if `status=ACTIVE` + `verification=VERIFIED` only. `isOpen` and `openingHours` are never checked. | Filter out closed stores **or** return them with an `isOpen` flag so the UI can grey them out. |
| **Backend — `getVendorDetails`** | Returns the store page regardless of `isOpen` or schedule. Does **not** include `isOpen` in the response. | Include `isOpen` / `isCurrentlyOpen` in the response payload. |
| **Backend — `createOrder` / `prepareOrderContext`** | Fetches products and creates orders with no check on whether the store is open. | **Hard-block**: throw `BadRequestException` if the store is not open at order time. |
| **Backend — `calculateQuote`** | Same — no availability check. | Reject quote if store is closed. |
| **Customer App — Store Screen** | Calls `fetchStoreBySlug`, which maps to `getVendorDetails`. The response never includes `isOpen`. UI never shows closed state. | Show a "Closed" banner; disable "Add to Cart" button. |
| **Customer App — Cart / Checkout** | Places the order without cross-checking store availability. | Re-validate before calling `createOrder`. |
| **Customer Web App — Store Page** | Fetches the same `getVendorDetails` endpoint. `StorePageClient` shows the "+" button unconditionally. | Same — show closed banner, disable add/order button. |
| **Customer Web App — `AddToOrderButton`** | No guard at all. | Blocked when store is closed. |

---

## 2. Data Model (Already Correct — No Migration Needed)

The Prisma schema already has everything needed:

```prisma
model Store {
  isOpen        Boolean       @default(true)   // manual toggle
  openHours     Json?                           // legacy JSON (from signup)
  openingHours  OpeningHour[]                  // structured table
}

model OpeningHour {
  dayOfWeek  Int     // 0=Sun, 1=Mon … 6=Sat
  openTime   String  // "09:00"
  closeTime  String  // "22:00"
}
```

**Decision on which field to use:**  
Use `isOpen` as the **primary gate** (vendor can close at will).  
Then check `openingHours` (structured table) as the **schedule gate** — if the current time falls outside the store's hours for today, treat as closed.  
Fall back to `openHours` (JSON) **only** if `openingHours` is empty (legacy stores that haven't completed the setup).

---

## 3. Shared Availability Logic

A single utility function should live in the backend (and be mirrored on the frontend):

```typescript
// Determines whether a store is currently open.
// Priority:  isOpen (manual) → openingHours (structured) → openHours (JSON legacy)
function isStoreCurrentlyOpen(store: {
  isOpen: boolean;
  openingHours: { dayOfWeek: number; openTime: string; closeTime: string }[];
  openHours?: any;
  timezone?: string; // optional — default to Africa/Lagos
}): { open: boolean; reason: 'MANUAL_CLOSE' | 'OUTSIDE_HOURS' | 'NO_SCHEDULE' | 'OPEN' } {
  if (!store.isOpen) return { open: false, reason: 'MANUAL_CLOSE' };

  const tz = store.timezone ?? 'Africa/Lagos';
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const dayOfWeek = now.getDay(); // 0=Sun
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // --- Structured openingHours ---
  if (store.openingHours.length > 0) {
    const todayHours = store.openingHours.find(h => h.dayOfWeek === dayOfWeek);
    if (!todayHours) return { open: false, reason: 'OUTSIDE_HOURS' }; // day not configured = closed
    const [oH, oM] = todayHours.openTime.split(':').map(Number);
    const [cH, cM] = todayHours.closeTime.split(':').map(Number);
    const openMin = oH * 60 + oM;
    const closeMin = cH * 60 + cM;
    if (currentMinutes < openMin || currentMinutes >= closeMin) {
      return { open: false, reason: 'OUTSIDE_HOURS' };
    }
    return { open: true, reason: 'OPEN' };
  }

  // --- Legacy openHours JSON fallback ---
  if (store.openHours) {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayKey = days[dayOfWeek];
    const dayData = (store.openHours as any)?.[dayKey];
    if (!dayData || dayData.closed) return { open: false, reason: 'OUTSIDE_HOURS' };
    if (dayData.is24Hours) return { open: true, reason: 'OPEN' };
    if (dayData.open && dayData.close) {
      const [oH, oM] = dayData.open.split(':').map(Number);
      const [cH, cM] = dayData.close.split(':').map(Number);
      const openMin = oH * 60 + oM;
      const closeMin = cH * 60 + cM;
      if (currentMinutes < openMin || currentMinutes >= closeMin) {
        return { open: false, reason: 'OUTSIDE_HOURS' };
      }
    }
    return { open: true, reason: 'OPEN' };
  }

  // No schedule configured — treat as open (do not block stores that haven't configured hours)
  return { open: true, reason: 'NO_SCHEDULE' };
}
```

---

## 4. Implementation Plan — Backend

### 4.1 New Utility File

**File:** `backend/src/shared/vendor-availability.util.ts`

Export `isStoreCurrentlyOpen()` (the function above). Import it everywhere needed.

---

### 4.2 `MarketplaceService.getVendorDetails()` — Include Availability in Response

**File:** `backend/src/marketplace/marketplace.service.ts`

**Change:** When building the return object from `getVendorDetails`, include `isOpen` in the Prisma select and compute availability:

```typescript
// Add to the Prisma query select:
select: {
  isOpen: true,
  openHours: true,
  openingHours: true,  // include relation
  ...
}

// In the return object, add:
isOpen: store.isOpen,
isCurrentlyOpen: isStoreCurrentlyOpen(store).open,
closedReason: isStoreCurrentlyOpen(store).reason,
```

This means clients know the availability without a second API call.

---

### 4.3 `MarketplaceService.getHomeData()` + `getPaginatedStores()` + `getCategoryData()` + `search()` — Add `isOpen` to Response

For listing endpoints, two options exist:

**Option A (Recommended):** Return all stores but include `isCurrentlyOpen: boolean`. The UI shows a "Closed" label but keeps the store visible. (Good for discovery.)

**Option B:** Filter out closed stores entirely. (Hides stores from browse but prevents confusion.)

**Decision: Option A** — show stores with a closed badge; users can still view the menu but cannot add to cart or order.

Change: Add `isOpen`, `openHours`, `openingHours` to the select in each listing query, then map to `isCurrentlyOpen` in the response.

---

### 4.4 `OrdersService.calculateQuote()` — Block Closed Stores

**File:** `backend/src/users/orders.service.ts`

After fetching the store (around line 120), add:

```typescript
const store = await this.prisma.store.findUnique({
  where: { id: restaurantId },
  select: { lat: true, lng: true, name: true, isOpen: true, openHours: true, openingHours: true },
});

if (!store) throw new NotFoundException('Store not found');

const availability = isStoreCurrentlyOpen(store);
if (!availability.open) {
  throw new BadRequestException(
    availability.reason === 'MANUAL_CLOSE'
      ? `${store.name} is currently closed.`
      : `${store.name} is outside its operating hours.`
  );
}
```

---

### 4.5 `OrdersService.prepareOrderContext()` — Block Closed Stores at Order Creation

**File:** `backend/src/users/orders.service.ts`, around line 1080

After resolving each store in the `storeEntries.map()` loop:

```typescript
const store = firstProduct.store;

// Fetch full availability fields (not included in product.store by default)
const storeWithHours = await this.prisma.store.findUnique({
  where: { id: storeId },
  select: { isOpen: true, openHours: true, openingHours: true, name: true },
});

const availability = isStoreCurrentlyOpen(storeWithHours!);
if (!availability.open) {
  throw new BadRequestException(
    `Store "${store.name}" is currently ${
      availability.reason === 'MANUAL_CLOSE' ? 'closed' : 'outside its operating hours'
    }. Please try again later.`
  );
}
```

This is the **safety net** — even if the frontend fails to check, the order cannot be created for a closed store.

---

### 4.6 `OrdersService.calculateOrderBreakdown()` — Same Guard

**File:** `backend/src/users/orders.service.ts`, around line 197

Same pattern: after fetching each store during the breakdown calculation.

---

## 5. Implementation Plan — Customer Mobile App

### 5.1 Update `StoreData` Type

**File:** `apps/customer-app/types/store-types.ts`

Add:
```typescript
export type StoreData = {
  ...existing fields...
  isOpen: boolean;
  isCurrentlyOpen: boolean;
  closedReason?: 'MANUAL_CLOSE' | 'OUTSIDE_HOURS' | 'NO_SCHEDULE' | 'OPEN';
};
```

---

### 5.2 Store Screen — Show Closed Banner, Disable "Add to Cart"

**File:** `apps/customer-app/app/(store)/store-screen.tsx`

After `storeData` is loaded:

```typescript
const isStoreClosed = storeData ? !storeData.isCurrentlyOpen : false;
```

In `handleAddToCart`:
```typescript
const handleAddToCart = useCallback(async (productId: string) => {
  if (!storeData) return;

  // Guard: store must be open
  if (isStoreClosed) {
    Toast.show({
      type: 'error',
      text1: 'Store is currently closed',
      text2: 'This store is not accepting orders right now.',
    });
    return;
  }
  // ... rest of existing logic
}, [addItem, storeData, isStoreClosed]);
```

In the Store Hero / header area — display a "Closed" pill badge when `isStoreClosed`:
```tsx
{isStoreClosed && (
  <View style={styles.closedBanner}>
    <ThemedText style={styles.closedBannerText}>
      {storeData?.closedReason === 'MANUAL_CLOSE'
        ? '🔴 Currently Closed'
        : '🕐 Outside Opening Hours'}
    </ThemedText>
  </View>
)}
```

Pass `disabled={isStoreClosed}` to the `ProductList` component's "Add" buttons.

---

### 5.3 Checkout Screen — Re-validate Before Placing Order

**File:** `apps/customer-app/app/checkout.tsx`

Before calling `createOrder`, verify stores are still open via a lightweight API call or rely on the backend 400 error and display it:

```typescript
// The backend will throw a 400 if any store is closed.
// Catch and display the error message from the backend:
try {
  const order = await createOrder(payload);
  // ... proceed
} catch (err: any) {
  const msg = err?.message || 'Failed to place order';
  Toast.show({ type: 'error', text1: msg });
  return;
}
```

Optionally, add an explicit pre-flight call to a new endpoint: `GET /marketplace/vendor/:id/availability` before submitting.

---

## 6. Implementation Plan — Customer Web App

### 6.1 Update `StoreDetail` Type

**File:** `web/customer-web-app/src/app/stores/[id]/page.tsx`

Add to `StoreDetail`:
```typescript
isCurrentlyOpen?: boolean;
closedReason?: string;
```

---

### 6.2 Store Page — Show Closed Badge, Pass Flag to Client

**File:** `web/customer-web-app/src/app/stores/[id]/page.tsx`

Pass `isCurrentlyOpen` and `closedReason` down to `<StorePageClient>`.

---

### 6.3 `StorePageClient` — Disable "+" Button When Closed

**File:** `web/customer-web-app/src/app/stores/[id]/StorePageClient.tsx`

```tsx
interface StorePageClientProps {
  storeId: string;
  storeName: string;
  byCategory: Record<string, PublicProduct[]>;
  isCurrentlyOpen?: boolean;   // NEW
  closedReason?: string;       // NEW
}
```

If `!isCurrentlyOpen`:
- Render a prominent "Store Currently Closed" banner at the top.
- Disable all "+" (Add to Cart) buttons with `disabled` + reduced opacity.
- Do not open `ProductModal` on click.

```tsx
{!isCurrentlyOpen && (
  <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
    <span className="text-2xl">🔴</span>
    <div>
      <p className="font-semibold text-red-700">This store is currently closed</p>
      <p className="text-sm text-red-500">
        {closedReason === 'MANUAL_CLOSE'
          ? 'The vendor has temporarily closed.'
          : 'This store is outside its operating hours.'}
      </p>
    </div>
  </div>
)}
```

---

### 6.4 `AddToOrderButton` — Disable When Closed

**File:** `web/customer-web-app/src/app/stores/[id]/product/[productId]/AddToOrderButton.tsx`

Add `isStoreClosed` prop. When `true`, render a disabled button with tooltip.

---

### 6.5 `ProductModal` — Optionally Block Add

**File:** `web/customer-web-app/src/store/ProductModal.tsx`

Accept an `isStoreClosed` prop. If `true`, replace the "Add to Cart" action with a disabled state and "Store Closed" message.

---

## 7. New API Endpoint (Optional but Recommended)

Add a lightweight availability check endpoint:

```
GET /marketplace/vendor/:id/availability
Response: { isOpen: boolean; isCurrentlyOpen: boolean; closedReason: string; nextOpenTime?: string }
```

This lets the mobile and web apps poll for real-time status without re-fetching the full store object. The vendor app already has `GET /vendor/isOnline` for internal use — this would be the public version.

---

## 8. Summary of All Files to Change

### Backend (`backend/src/`)
| File | Change |
|---|---|
| `shared/vendor-availability.util.ts` | **Create** — `isStoreCurrentlyOpen()` helper |
| `marketplace/marketplace.service.ts` | `getVendorDetails` → include `isCurrentlyOpen`; all listing methods → include `isCurrentlyOpen` flag |
| `users/orders.service.ts` | `calculateQuote` → availability guard; `prepareOrderContext` → guard per store; `calculateOrderBreakdown` → same |
| `marketplace/marketplace.controller.ts` | **Optional** — add `GET vendor/:id/availability` endpoint |

### Customer Mobile App (`apps/customer-app/`)
| File | Change |
|---|---|
| `types/store-types.ts` | Add `isCurrentlyOpen`, `closedReason` to `StoreData` |
| `app/(store)/store-screen.tsx` | Closed banner; guard `handleAddToCart` |
| `app/checkout.tsx` | Handle backend 400 gracefully with user-facing message |

### Customer Web App (`web/customer-web-app/`)
| File | Change |
|---|---|
| `app/stores/[id]/page.tsx` | Add fields to `StoreDetail` type; pass to client |
| `app/stores/[id]/StorePageClient.tsx` | Closed banner; disable "+" buttons |
| `app/stores/[id]/product/[productId]/AddToOrderButton.tsx` | Disable when closed |
| `store/ProductModal.tsx` | Accept + respect `isStoreClosed` |

---

## 9. Priority Order

1. **Backend `createOrder` guard** — highest priority, prevents bad orders server-side regardless of client state.
2. **Backend `getVendorDetails` → include `isCurrentlyOpen`** — enables all frontend changes.
3. **Customer App store screen** — shows user the closed state.
4. **Web store page** — same.
5. **Listing endpoints** — add `isCurrentlyOpen` flag so home/browse shows closed badge.
6. **Optional availability endpoint** — for real-time polling.

---

## 10. Edge Cases to Handle

| Case | Handling |
|---|---|
| Store has no `openingHours` and no `openHours` | Treat as open (no schedule = no restriction) |
| `openingHours` row missing for today | Treat as closed for that day |
| Vendor is `MANUAL_CLOSE` but within hours | `isOpen=false` wins — store is closed |
| Timezone | Default to `Africa/Lagos`; add `timezone` field to `Store` model in a future migration if multi-region is needed |
| Cart contains items from a store that closed between add and checkout | Backend guard catches it; frontend shows 400 error message |
| Admin-managed store (`isAdminManaged=true`) | Should still respect `isOpen` — admins can override by toggling `isOpen` manually |
