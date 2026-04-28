# Delivery ID Format Reference

## Overview
This document clarifies how delivery IDs are formatted and displayed across the application.

## Format Variations

### 1. Full UUID (Internal/System)
**Format:** `7f06d42d-f6b2-43f8-abe0-42e85ac2b111`  
**Length:** 36 characters (8-4-4-4-12)  
**Usage:** Database storage, API responses, exact lookups  
**Scope:** Internal system, not shown to users typically

### 2. First Segment (Rider App, User-Facing)
**Format:** `7F06D42D` or `del#7F06D42D`  
**Source:** UUID portion before first dash: `split('-')[0]`  
**Length:** 8 characters (or 12 with prefix)  
**Usage:** Rider app displays, delivery tracking, user reports  
**Apps Using:**
- `apps/rider-app/components/delivery/AtPickupScreen.tsx`
- `apps/rider-app/components/delivery/EnRouteToPickup.tsx`
- `apps/rider-app/components/delivery/EnRouteToDropoff.tsx`
- `apps/rider-app/components/delivery/IncomingOrderSheet.tsx`

**Example:**
```javascript
const deliveryId = activeJob.id.split("-")[0].toUpperCase(); // "7F06D42D"
// Display: "RIDE #7F06D42D" or "del#7F06D42D"
```

### 3. Last 6 Characters (Alternative Format)
**Format:** `AC2B111` or `track#AC2B111`  
**Source:** Last 6 characters after removing hyphens  
**Length:** 6 characters (or 12 with prefix)  
**Usage:** Web utility (formatDeliveryId.ts), not widely used in current UI  
**Reference:**
```javascript
export const getShortTrackingId = (fullId: string, length = 6) => {
  const cleanId = fullId.replace(/-/g, "").toUpperCase();
  return cleanId.slice(-6); // Last 6
};
```

## Search Support Matrix

| Format | Example | findAll() | findOne() | Notes |
|--------|---------|-----------|-----------|-------|
| Full UUID | `7f06d42d-f6b2-43f8-abe0-42e85ac2b111` | ✓ | ✓ | Exact match, fastest |
| Full UUID (uppercase) | `7F06D42D-F6B2-43F8-ABE0-42E85AC2B111` | ✓ | ✓ | Case-insensitive |
| First Segment + prefix | `del#7F06D42D` | ✓ | ✓ | Most common user input |
| First Segment | `7F06D42D` | ✓ | ✓ | Without prefix |
| First Segment (lowercase) | `7f06d42d` | ✓ | ✓ | Case-insensitive |
| Last 6 + prefix | `track#AC2B111` | ✓ | ✓ | Alternative format |
| Last 6 | `AC2B111` | ✓ | ✓ | Without prefix |
| Partial UUID | `f6b2-43f8` | ✓ | ✓ | Any substring |
| Customer Name | `John Doe` | ✓ | ✗ | Falls back to name search |

## Consistency Issues & Resolution

### Issue: Format Inconsistency
- **Rider app shows:** First segment (e.g., `7F06D42D`)
- **formatDeliveryId.ts uses:** Last 6 chars (e.g., `AC2B111`)
- **Web app card shows:** Full UUID

### Resolution
- ✓ Search now supports **all formats** via flexible `contains` matching
- ✓ Users can search with any format they see
- ✓ No breaking changes to existing code
- → Consider standardizing display format in future refactor

## Display Best Practices

### For Rider-Facing UX
```javascript
// ✓ GOOD - Matches what riders see
const shortId = delivery.id.split("-")[0].toUpperCase();
display: `#${shortId}` or `del#${shortId}`
```

### For Web Super-Admin
```javascript
// Current: Shows full UUID
display: {delivery.id}

// Recommended enhancement:
import { getFirstSegmentId } from "@/lib/formatDeliveryId";
const shortId = getFirstSegmentId(delivery.id);
display: `#${shortId}` (main) + full UUID in tooltip
```

### For Tracking & Reports
```javascript
// Include both for clarity
display: `Delivery #${shortId} (${fullId})`
// or
display: `Delivery del#${shortId} - Full ID: ${fullId}`
```

## Search Implementation Details

### Backend URL Endpoints

**Search endpoint (POST with query params):**
```
GET /super-admin/deliveries?search=del%237F06D42D&status=All&page=1&limit=20
```

**Direct access endpoint:**
```
GET /super-admin/deliveries/7f06d42d-f6b2-43f8-abe0-42e85ac2b111
// Also now supports:
GET /super-admin/deliveries/7F06D42D
GET /super-admin/deliveries/del%237F06D42D
```

### Frontend Search Implementation

**In super-admin deliveries page:**
```typescript
const [searchTerm, setSearchTerm] = useState("");
// User can enter: "del#7F06D42D", "7F06D42D", or full UUID
// All formats are sent as-is to backend
params.append("search", debouncedSearch);
```

## Future Enhancements

1. **Standardize Display Format**
   - Consistent use of first-segment format across all UIs
   - Add tooltip showing full UUID

2. **Optimize Search Performance**
   - Add trigram index for substring searches
   - Consider switch to `startsWith` if only first-segment format is standardized

3. **UI Improvements**
   - Show both shortened and full ID in results
   - Copy-to-clipboard for full UUID
   - QR code with full UUID for scanning

4. **Documentation**
   - Add search format examples in user guide
   - Include search tips in help section
   - Example: "Search with any format: del#7F06D42D, 7F06D42D, or full UUID"
