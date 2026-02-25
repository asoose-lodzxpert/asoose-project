# Customer-App Improvement Plan

> Author: GitHub Copilot  
> Date: 2026-02-24  
> Status: **AWAITING APPROVAL**

---

## Summary of Findings

| #   | Area                                                                | Severity        | Status    |
| --- | ------------------------------------------------------------------- | --------------- | --------- |
| 1   | Product images never show on item cards (store screen)              | 🔴 Bug          | Not fixed |
| 2   | Product images may not resolve on detail page (S3 keys)             | 🟡 Bug          | Not fixed |
| 3   | Modifier modal NOT wired on product detail page                     | 🔴 Bug          | Not fixed |
| 4   | `ProductDetails` type field mismatch (`minSelection` ≠ `minSelect`) | 🔴 Bug          | Not fixed |
| 5   | Modifiers never sent to backend at order creation                   | 🔴 Contract gap | Not fixed |
| 6   | No `expo-image` — no caching / blurhash / fade transition           | 🟡 UX           | Not fixed |
| 7   | No build-time local asset compression                               | 🟡 Perf         | Not fixed |
| 8   | 5 MapView instances have no custom map styling                      | 🟡 UX           | Not fixed |

---

## Section 1 — Fix Product Images on Item Cards (Store Screen)

### Root Cause

The backend method `getStoreBySlug` (in `marketplace.service.ts`) filters each product's images and returns a **single** field named `image` (singular):

```typescript
// backend — what is actually returned
image: p.images.find((url) => url?.startsWith('http')) ?? null,
```

But the frontend `Product` type in `store-types.ts` declares:

```typescript
images: string[];   // plural array
```

And `ProductList.tsx` reads:

```tsx
const imageUri = item.images?.[0] ?? "https://via.placeholder.com/150";
```

`item.images` is always `undefined` (the field is `image`, not `images`), so the placeholder is always shown and no real product photo is ever displayed.

### Fix Plan

**Backend (`marketplace.service.ts` — `getStoreBySlug`):**

- Change the mapping to return `images` (plural array) filtered to valid http URLs, so it matches the frontend type:

```typescript
images: p.images.filter((url) => url?.startsWith('http')),
```

This keeps zero-length array gracefully handled by the frontend fallback.

**No type change needed** — `store-types.ts` `Product.images: string[]` is already correct.

**Backend (`marketplace.service.ts` — `getProductById`):**

- Currently returns raw DB `images[]` without calling `resolveImage()`.
- S3 object keys (non-HTTPS strings) could be in the array if product was uploaded via vendor-app without a CDN step.
- Fix: pipe every entry in `images[]` through `resolveImage()` before returning, filtering out nulls:

```typescript
images: (await Promise.all(product.images.map(k => this.resolveImage(k)))).filter(Boolean),
```

---

## Section 2 — Wire Modifier Modal on Product Detail Page

### Root Cause

The `ModifierSelectionModal` component already exists and is fully built (bottom-sheet style, enforces `minSelect`, shows required `*`, calculates live total price). It is correctly used in `store-screen.tsx`. **It is completely absent from `[id].tsx`** (the product detail page).

`[id].tsx`'s `handleAddToCart` does:

```typescript
await addItem({ id: product.id, name: product.name, price: product.price, ... });
// ↑ No modifier check — bypasses the modal entirely
```

Additionally, the `ProductDetails` frontend type in `marketplace.service.ts` declares:

```typescript
minSelection: number; // ❌ wrong — backend returns minSelect
maxSelection: number; // ❌ wrong — backend returns maxSelect
```

The backend `getProductById` actually returns `minSelect`/`maxSelect`. This means the modal's `group.minSelect` would be `undefined` on the detail page, breaking required-field enforcement.

### Fix Plan

**Step 2a — Fix `ProductDetails` type** (`services/marketplace.service.ts`):

```typescript
// Change:
minSelection: number;
maxSelection: number;
// To:
minSelect: number;
maxSelect: number;
```

**Step 2b — Wire modal in `[id].tsx`**:

1. Import `ModifierSelectionModal` and its types.
2. Add state:
   ```typescript
   const [showModifierModal, setShowModifierModal] = useState(false);
   ```
3. Replace `handleAddToCart` logic:
   - If `product.modifierGroups?.length > 0` → call `setShowModifierModal(true)` instead of adding immediately.
   - Preserve the `quantity` state so the modal can show the correct total.
4. Add `handleModifierConfirm(selectedGroups)`:
   - Same pattern already used in `store-screen.tsx`: build `ModifierGroupSelection[]` from the selection map.
   - Call `addItem({ ..., modifierGroups })`.
   - Show success Toast, close modal.
5. Render `<ModifierSelectionModal>` at the bottom of JSX with:
   - `visible={showModifierModal}`
   - `modifierGroups={product.modifierGroups}` (now correctly typed with `minSelect`/`maxSelect`)
   - `basePrice={product.price}`
   - `quantity={quantity}`
   - `productName={product.name}`
   - `onConfirm={handleModifierConfirm}`
   - `onCancel={() => setShowModifierModal(false)}`

---

## Section 3 — Backend Contract Alignment for Modifiers

### Root Cause

Modifiers are validated and priced server-side via `POST /cart/add` (takes `{ productId, quantity, modifierIds: string[] }`), but **this endpoint is never called by the frontend**. The frontend only uses `POST /cart/summary` (stateless, no modifier validation) and `POST /users/orders` (no modifier field).

The `CreateOrderPayload` type:

```typescript
items: {
  id: string;
  quantity: number;
}
[];
// ↑ no modifierIds — backend will price the order at base price ignoring all addons
```

This means a user who selects "Extra Cheese +₦500" will be charged base price at checkout.

### Fix Plan

**Step 3a — Audit backend order creation DTO:**

- Check `backend/src/users/orders` (or `backend/src/cart/dto/add-to-cart.dto.ts`) to confirm whether the order-creation endpoint already accepts `modifierIds` per item.
- If not: add `modifierIds?: string[]` to the backend `CreateOrderItemDto` and add server-side validation (same logic as `CartService.addToCart`).

**Step 3b — Update frontend `CreateOrderPayload`** (`services/order.service.ts`):

```typescript
items: {
  id: string;
  quantity: number;
  modifierIds?: string[];  // ← add this
}[];
```

**Step 3c — Pass modifiers at checkout:**

- In `checkout.tsx` (or wherever `createOrder` is called): read `CartItem.modifierGroups` from cart context and flatten to `modifierIds: group.selectedModifiers.map(m => m.id)` for each item before sending.

---

## Section 4 — Replace `<Image>` with `expo-image`

### Root Cause

`ProductList.tsx` and `[id].tsx` use React Native's bare `<Image>` component. It has no:

- Disk or memory caching (every scroll causes re-fetch)
- Blurhash / low-quality placeholder while loading
- Animated fade-in transition
- Automatic format selection (WebP on supported devices)

`expo-image` provides all of the above and is already compatible with this Expo SDK version.

### Fix Plan

1. Install `expo-image` (already included in most Expo SDK 50+ projects — confirm in `package.json`).
2. Replace `import { Image } from 'react-native'` → `import { Image } from 'expo-image'` in:
   - `components/store/ProductList.tsx`
   - `app/(store)/product/[id].tsx`
   - Any other files using `<Image>` for product/store/user photos.
3. Add props:
   ```tsx
   <Image
     source={{ uri: imageUri }}
     style={styles.menuImage}
     contentFit="cover"
     transition={200}
     placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }} // generic warm placeholder
   />
   ```
4. Keep a per-product `blurhash` field: if backend starts returning `blurhash` on product records (can be precomputed during vendor upload), pass it. For now, use a static warm-toned fallback.

---

## Section 5 — Build-Time Local Asset Optimization

### Root Cause

Local assets (icons, onboarding banners, promo images) in `assets/` are uncompressed raw PNGs/JPGs. They inflate the JS bundle and slow first-paint on slower devices.

### Fix Plan

**Step 5a — `metro.config.js` image transformer:**
Expo's metro config supports a `transformer.assetPlugins` path. Add the `expo-asset` pipeline:

```javascript
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.transformer.minifierConfig = { compress: { drop_console: true } };
module.exports = config;
```

**Step 5b — Pre-process script (one-time / CI step):**
Add `scripts/optimize-assets.js` using `sharp`:

```javascript
// Compresses all PNGs in assets/ to 80% quality, resizes banners to ≤ 1200px wide
```

Add to `package.json`:

```json
"scripts": {
  "optimize-assets": "node scripts/optimize-assets.js"
}
```

Run before `eas build` in CI.

**Step 5c — Remote images (CDN):**

- Backend should set proper `Cache-Control: public, max-age=31536000` headers on S3 presigned or CDN URLs.
- This is a backend config item — flagged for follow-up.

---

## Section 6 — Custom Map Styling (All MapView Instances)

### Root Cause

The rider-app `MapCanvas.tsx` has polished `LIGHT_MAP_STYLE` and `DARK_MAP_STYLE` (Google Maps JSON styling arrays) applied via `customMapStyle`. The customer-app has **5 `MapView` instances** with no custom styling (default Google Maps colours, which look inconsistent with the app's brand theme). Only `ride/tracking.tsx` already has `customMapStyle` but uses locally-defined styles (not shared).

### Instances without custom styling:

| File                                                  | Used for                       |
| ----------------------------------------------------- | ------------------------------ |
| `components/home/LocationPickerModal.tsx`             | Home delivery address picker   |
| `components/addresses/AddressLocationPickerModal.tsx` | Saved address location picker  |
| `app/(settings)/addresses.tsx`                        | Settings address map preview   |
| `app/(tabs)/ride/location-picker.tsx`                 | Ride pickup/dropoff picker     |
| `app/(tabs)/delivery/location-picker.tsx`             | Delivery pickup/dropoff picker |

### Fix Plan

**Step 6a — Create `constants/mapStyles.ts`:**
Copy `LIGHT_MAP_STYLE` and `DARK_MAP_STYLE` arrays from rider-app's `MapCanvas.tsx` verbatim. Export them.

**Step 6b — Create `hooks/useMapStyle.ts`:**

```typescript
import { useColorScheme } from "react-native";
import { LIGHT_MAP_STYLE, DARK_MAP_STYLE } from "@/constants/mapStyles";

export function useMapStyle() {
  const colorScheme = useColorScheme();
  return colorScheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
}
```

**Step 6c — Apply to all 5 instances:**

```tsx
const mapStyle = useMapStyle();
// ...
<MapView customMapStyle={mapStyle} ...>
```

**Step 6d — Migrate `ride/tracking.tsx`:**
Replace its locally-inlined style object with the shared `useMapStyle()` hook to avoid drift.

---

## Files to be Changed

### Backend (`backend/`)

| File                                     | Change                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/marketplace/marketplace.service.ts` | `getStoreBySlug` — return `images[]` not `image`; `getProductById` — pipe through `resolveImage` |
| `src/users/orders/` _(to be confirmed)_  | Add `modifierIds` to order item DTO and validate/price them                                      |

### Frontend (`apps/customer-app/`)

| File                                                  | Change                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `services/marketplace.service.ts`                     | Fix `ProductDetails` type: `minSelection/maxSelection` → `minSelect/maxSelect`  |
| `services/order.service.ts`                           | Add `modifierIds?: string[]` to order item type                                 |
| `app/(store)/product/[id].tsx`                        | Wire modifier modal; replace `<Image>` with `expo-image`                        |
| `components/store/ProductList.tsx`                    | Replace `<Image>` with `expo-image`; verify `images[0]` works after backend fix |
| `app/(tabs)/ride/tracking.tsx`                        | Migrate to shared `useMapStyle()` hook                                          |
| `components/home/LocationPickerModal.tsx`             | Add `customMapStyle={mapStyle}`                                                 |
| `components/addresses/AddressLocationPickerModal.tsx` | Add `customMapStyle={mapStyle}`                                                 |
| `app/(settings)/addresses.tsx`                        | Add `customMapStyle={mapStyle}`                                                 |
| `app/(tabs)/ride/location-picker.tsx`                 | Add `customMapStyle={mapStyle}`                                                 |
| `app/(tabs)/delivery/location-picker.tsx`             | Add `customMapStyle={mapStyle}`                                                 |

### New Files

| File                                           | Purpose                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `apps/customer-app/constants/mapStyles.ts`     | Shared LIGHT + DARK Google Maps style arrays   |
| `apps/customer-app/hooks/useMapStyle.ts`       | Color-scheme-aware hook returning map style    |
| `apps/customer-app/scripts/optimize-assets.js` | Build-time local asset compression via `sharp` |

---

## Implementation Order (if approved)

1. **Backend fixes** (image pipeline + order modifier DTO) — unblocks everything else
2. **ProductDetails type fix** — 1-line, prevents silent runtime bug
3. **Product images on item card** — visible to user immediately
4. **Modifier modal on detail page** — core UX flow
5. **Order creation with modifiers** — closes the backend contract gap
6. **expo-image migration** — performance improvement, non-breaking
7. **Map custom styling** — shared constant + 5 instance updates
8. **Asset optimization script** — CI/build-time, no runtime changes
