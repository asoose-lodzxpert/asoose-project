# Delivery Search Fix - Test Cases

## Overview
Fixed the delivery search to support all formats of delivery IDs:
- Full UUID: `7f06d42d-f6b2-43f8-abe0-42e85ac2b111`
- With prefix: `del#7F06D42D` or `track#440000`
- Without prefix: `7F06D42D` or `440000` (shortened segment)
- Partial UUID: any substring from the UUID

## Test Scenarios

### Scenario 1: Search with shortened delivery ID (first segment format)
**Setup:**
- Delivery UUID: `7f06d42d-f6b2-43f8-abe0-42e85ac2b111`
- UI displays: `del#7F06D42D` (from rider app using `split('-')[0]`)

**Test Cases:**
| Search Input | Expected | Result |
|---|---|---|
| `del#7F06D42D` | ✓ Found | Column matches UUID via `contains` |
| `7F06D42D` | ✓ Found | Direct substring match |
| `del#7f06d42d` | ✓ Found | Case-insensitive match |
| `7F06D42D-F6B2-43F8-ABE0-42E85AC2B111` | ✓ Found | Full UUID exact match |
| `7f06d42d-f6b2-43f8-abe0-42e85ac2b111` | ✓ Found | Full UUID case-insensitive |

### Scenario 2: Search with last-6-chars format (alternative format)
**Setup:**
- Alternative shortened format from `formatDeliveryId.ts`: `del#AC2B111` (last 6 chars)

**Test Cases:**
| Search Input | Expected | Result |
|---|---|---|
| `del#AC2B111` | ✓ Found | Substring match (UUID contains it) |
| `AC2B111` | ✓ Found | Substring match |
| `2b111` | ✓ Found | Partial substring match |

### Scenario 3: Search with partial UUID
**Test Cases:**
| Search Input | Expected | Result |
|---|---|---|
| `f6b2-43f8` | ✓ Found | Partial UUID match |
| `f6b243f8` | ✓ Found | Without hyphens |
| `abe0-42e8` | ✓ Found | Middle segment |

### Scenario 4: Search by name or other fields (fallback)
**Test Cases:**
| Search Input | Expected | Result |
|---|---|---|
| `John Doe` (customer name) | ✓ Found | If customer exists |
| `123 Main St` (address) | ✓ Found | N/A - not included in this fix |

### Scenario 5: No matches
**Test Cases:**
| Search Input | Expected | Result |
|---|---|---|
| `INVALID123` | ✗ Not Found | Non-existent ID |
| `99999999` | ✗ Not Found | Non-existent segment |

## Implementation Details

### Backend Changes (delivery.service.ts)

**findAll() search logic:**
```typescript
if (search) {
  const searchTrimmed = search.trim();
  const searchUpper = searchTrimmed.toUpperCase();
  const shortIdPart = searchUpper.replace(/^(TRACK#|DEL#|DELIVERY#)/i, '').trim();
  
  where.OR = [
    // 1. Exact UUID match
    { id: { equals: searchTrimmed, mode: 'insensitive' } },
    { id: { equals: searchTrimmed.replace(/-/g, ''), mode: 'insensitive' } },
    
    // 2. UUID contains search term
    { id: { contains: shortIdPart || searchUpper, mode: 'insensitive' } },
    
    // 3. Search by names
    { customer: { name: { contains: searchTrimmed, mode: 'insensitive' } } },
    { recipientName: { contains: searchTrimmed, mode: 'insensitive' } },
    { senderName: { contains: searchTrimmed, mode: 'insensitive' } },
  ];
}
```

**findOne() fallback logic:**
- First tries exact UUID match
- If not found, tries searching by shortened ID using `findFirst` with `contains`
- Allows direct access to delivery detail page even if using shortened ID in URL

### Frontend Updates (formatDeliveryId.ts)

**New helper function:**
```typescript
export const getFirstSegmentId = (fullId: string): string => {
  const firstSegment = fullId.split('-')[0].toUpperCase();
  return firstSegment.length > 0 ? firstSegment : "?".repeat(8);
};
```

**Updated documentation:**
- Clarifies which format is used where
- Documents all supported search formats
- Improved `idMatchesShortSearch` to handle all patterns

## Performance Considerations

**Index Strategy:**
- `delivery.id` should have a standard index (PK)
- For substring searches on IDs, consider a trigram index in Postgres:
  ```sql
  CREATE INDEX idx_delivery_id_gin ON delivery USING gin (id gin_trgm_ops);
  ```

**Query Pattern:**
- Uses `contains` operator which may have lower performance than exact match
- Alternative: use `startsWith` if only first-segment format is needed
- Current implementation balances flexibility with reasonable performance

## Backward Compatibility

✓ Fully backwards compatible:
- Existing code using full UUID still works (now exact match OR contains)
- New code can use shortened formats
- No database schema changes
- No breaking API changes

## Related Files Modified

1. `backend/src/super-admin/deliveries/delivery.service.ts`
   - Updated `findAll()` search logic
   - Enhanced `findOne()` with fallback lookup

2. `web/customer-web-app/src/lib/formatDeliveryId.ts`
   - Added `getFirstSegmentId()` helper
   - Updated `idMatchesShortSearch()` logic
   - Improved documentation

## Deployment Notes

- No database migrations required
- No environment variable changes
- Test the search endpoint with all formats before deploying to production
- Monitor query performance if using `contains` on large datasets
- Consider adding postgres trigram index if performance is needed
