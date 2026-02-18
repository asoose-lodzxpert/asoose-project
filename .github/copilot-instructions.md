# ASOOSE Platform - AI Agent Instructions

## Project Architecture

**Monorepo Structure** (Yarn workspaces + Turbo):

- `apps/` - 3 Expo mobile apps (customer, vendor, rider)
- `web/` - 2 Next.js web apps (customer-web, customer-care admin)
- `backend/` - NestJS API with Prisma ORM (PostgreSQL)
- `packages/` - Shared configs (eslint, typescript, ui)

**Tech Stack**:

- Mobile: React Native (Expo) with Expo Router for file-based navigation
- Web: Next.js 14+ with App Router
- Backend: NestJS + Prisma + PostgreSQL + Redis (Bull queues)
- Real-time: Socket.io for live updates
- Auth: JWT with refresh tokens stored in SecureStore (mobile) or HttpOnly cookies (web)

## Critical Patterns & Conventions

### Mobile App Architecture (All 3 Apps Follow Same Pattern)

**File Structure**:

```
app/               # Expo Router - file-based routing
  (auth)/          # Auth group (login, signup)
  (main)/          # Main app group (requires auth)
  (tabs)/          # Bottom tabs navigation
  index.tsx        # Root redirect handler (checks auth & onboarding)
  _layout.tsx      # Root provider wrapper
components/
  ui/              # Reusable UI (IconSymbol, ThemedText, ThemedView)
  themed-*.tsx     # Theme-aware components
context/           # React Context providers
  AuthContext.tsx  # MUST wrap entire app, handles token refresh
  NotificationContext.tsx
  NotificationPreferencesContext.tsx
services/          # API calls & data fetching
  auth.ts          # Login/logout/token management
  *.service.ts     # Domain-specific API calls
constants/
  theme.ts         # Colors & fonts - brand color #E5A503
hooks/
  use-theme-color.ts   # Theme hook pattern
  use-color-scheme.ts
```

**Theming System** - ALL components MUST use:

```typescript
// Import themed colors
import { useThemeColor } from "@/hooks/use-theme-color";

// In component
const primary = useThemeColor({}, "brandPrimary");
const textColor = useThemeColor({}, "textPrimary");

// Use in styles
<View style={{ backgroundColor: primary }} />
```

**Theme Colors** (from `constants/theme.ts`):

- Brand: `brandPrimary` (#E5A503), `brandPrimaryHover`
- Surface: `surfaceBackground`, `surfaceCard`, `surfaceSubtle`
- Text: `textPrimary`, `textSecondary`, `textMuted`, `textOnPrimary`
- Status: `statusSuccess`, `statusError`, `statusPending`, `statusNeutral`
- Use `ThemedView` and `ThemedText` for automatic theme support

**Component Naming**:

- Themed components: `ThemedView`, `ThemedText`, `ThemedInput`, `ThemedToast`
- UI components: Pascal case in `components/ui/`
- Domain components: Descriptive names in feature folders

### Authentication Flow (Critical Pattern)

**Mobile Auth Service Pattern** (see `services/auth.ts`):

```typescript
// Token storage MUST use SecureStore with AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
await SecureStore.setItemAsync(accessTokenKey(), token, {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
});

// All API calls MUST add dev header for ngrok:
headers: {
  ...(__DEV__ ? { "ngrok-skip-browser-warning": "true" } : {}),
}
```

**Root Layout Provider Order** (from `app/_layout.tsx`):

```typescript
<AuthProvider>           {/* FIRST - handles auth state */}
  <NotificationProvider> {/* Registers push tokens */}
    <NotificationPreferencesProvider>
      <CartProvider>     {/* Domain contexts */}
        {/* App routes */}
      </CartProvider>
    </NotificationPreferencesProvider>
  </NotificationProvider>
</AuthProvider>
```

**Root Redirect Logic** (`app/index.tsx`):

1. Check onboarding status (AsyncStorage: `asoose_{role}_onboarded`)
2. Check auth state from AuthContext
3. For vendors/riders: check user.status (PENDING, ACTIVE, SUSPENDED, BANNED)
4. Route to appropriate screen: `welcome` → `(auth)/login` → `(status)/*` → `(main)`

### Push Notifications (CRITICAL - All 3 Apps)

**Implementation Files** (see `IMPLEMENTATION_SUMMARY.md`):

- Service: `services/push-notifications.service.ts`
- Context: `context/NotificationContext.tsx` (registers token via `registerForPushNotifications()`)
- Preferences: `context/NotificationPreferencesContext.tsx`
- Config: `config/notification-settings.ts`

**Token Registration Pattern**:

```typescript
// On login success in AuthContext
const token = await registerForPushNotifications();
await fetch(`${API}/auth/{role}/push-token`, {
  method: "POST",
  body: JSON.stringify({ token }),
});
```

**Deep Linking** - Notifications MUST include:

```typescript
data: {
  screen: "orders/[id]",  // Expo Router path
  params: { id: "123" }
}
```

### API Service Pattern

**Consistent Fetch Wrapper**:

```typescript
// Always use helper with auto-retry and token refresh
export async function fetchWithAuth(url: string, options?: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(__DEV__ ? { "ngrok-skip-browser-warning": "true" } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    await refreshAccessToken();
    // Retry once
  }

  return res.json();
}
```

### Backend Architecture (NestJS)

**Module Structure**:

```
src/
  auth/           # JWT, guards, strategies
  users/          # Customer endpoints
  vendor/         # Vendor endpoints
  riders/         # Rider endpoints
  cart/           # Shopping cart
  marketplace/    # Products, stores
  payment/        # Paystack integration
  notifications/  # Push & in-app notifications
  queue/          # Bull queues for async tasks
  prisma/         # Prisma service (singleton)
  common/         # Shared guards, decorators, pipes
  config/         # Environment configuration
```

**Guards & Decorators**:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR', 'ADMIN')
@Get('profile')
async getProfile(@CurrentUser() user: User) { }
```

**Prisma Pattern** (see `backend/prisma/schema.prisma`):

- All status enums: ACTIVE, PENDING, SUSPENDED, BANNED
- User roles: CUSTOMER, VENDOR, RIDER, ADMIN, SUPER_ADMIN, etc.
- Order flows: PENDING → CONFIRMED → PREPARING → READY → DISPATCHED → DELIVERED
- Ride flows: PENDING → REQUESTED → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED

## Common Development Tasks

**Running Apps**:

```bash
# Root - run all apps
yarn dev

# Specific app
cd apps/vendor-app && yarn start
cd backend && yarn start:dev

# Build all
yarn build
```

**Mobile Development**:

```bash
# Development build (required for push notifications)
cd apps/vendor-app
npx expo prebuild
npx expo run:android --variant debug

# EAS Build (production)
eas build --platform android --profile production
eas submit --platform android
```

**Backend**:

```bash
cd backend
yarn prisma:generate  # After schema changes
yarn prisma:migrate   # Create migration
yarn prisma:push      # Push to DB (dev only)
yarn seed             # Seed database
```

## Critical Gotchas

1. **Push Notifications DON'T work in Expo Go** - MUST use development build
2. **AsyncStorage keys** are namespaced by role: `asoose_vendor_*`, `asoose_rider_*`, `asoose_customer_*`
3. **Location disclosure** shows on first login (AsyncStorage: `locationDisclosureSeen`)
4. **Environment variables**: `EXPO_PUBLIC_*` for Expo apps, regular env for backend
5. **Root index.tsx** handles ALL navigation logic - don't redirect from other files
6. **Icon names** use SF Symbol-style naming (`"house.fill"`) but map to MaterialIcons internally
7. **Toast position** is always top: `position: 'top', topOffset: 40`
8. **API URL**: Use `process.env.EXPO_PUBLIC_API_URL` (configured in eas.json per profile)

## File Naming Conventions

- Components: PascalCase (`OrderCard.tsx`, `VendorDashboard.tsx`)
- Services: kebab-case with `.service.ts` suffix (`orders.service.ts`)
- Contexts: PascalCase with `Context.tsx` suffix (`AuthContext.tsx`)
- Hooks: kebab-case with `use-` prefix (`use-theme-color.ts`)
- Route groups: `(groupName)` in Expo Router
- Dynamic routes: `[id].tsx` for Expo Router

## Documentation References

- Push notifications setup: `PUSH_NOTIFICATIONS_SETUP.md`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
- OAuth setup (customer app): `apps/customer-app/OAUTH_SETUP_NATIVE.md`
- Routing patterns: `apps/customer-app/ROUTING_FIX_EXPLANATION.md`

## When Making Changes

1. **Always use themed colors** - never hardcode colors
2. **Follow existing service patterns** - use `fetchWithAuth` wrapper
3. **Update TypeScript types** - prefer interfaces over types
4. **Test on both themes** - light and dark mode
5. **Check all 3 mobile apps** - patterns should be consistent
6. **Run error checks** - `yarn lint` and `yarn check-types`
7. **Update context providers order** - AuthProvider MUST be outermost
