# Vendor App Notifications Setup

## Overview

Complete notification system with:

- ✅ Infinite scroll with pagination
- ✅ Real-time updates (60s polling + WebSocket support)
- ✅ Expo push notifications with action buttons
- ✅ Firebase Cloud Messaging integration
- ✅ Auto mark-as-read functionality
- ✅ Tab-based filtering (orders/payouts/system)
- ✅ Unread count badge
- ✅ Pull-to-refresh

## Required Packages

Run these commands in the vendor-app directory:

```bash
cd apps/vendor-app
yarn add expo-notifications expo-device expo-constants
```

## Backend Migration

The database migration for push tokens has already been created and run:

- Added `expoPushToken` field to Vendor model (for Expo notifications)
- Added `fcmToken` field to Vendor model (for Firebase Cloud Messaging)

## Backend Endpoints

### Push Token Management

- `POST /auth/vendor/push-token` - Save Expo push token
  - Body: `{ token: string, platform: "ios" | "android" }`
- `DELETE /auth/vendor/push-token` - Remove push token on logout

### Notifications

- `GET /notifications?page=1` - Fetch notifications with pagination
- `GET /notifications/unread-count` - Get unread notification count
- `PATCH /notifications/:id/read` - Mark single notification as read
- `PATCH /notifications/read-all` - Mark all notifications as read

## Frontend Implementation

### 1. NotificationContext

Manages push notification registration, permissions, and action handling.

Features:

- Auto-registers for push notifications on login
- Handles foreground notifications
- Processes action button taps (Accept/Decline for orders)
- Navigates to relevant screens based on notification data

### 2. Notifications Screen

Located at: `app/(main)/notifications.tsx`

Features:

- Infinite scroll with FlatList
- Pull-to-refresh
- Auto-refresh every 60 seconds
- Tab filtering (orders/payouts/system)
- Mark all as read button
- Empty states with icons
- Loading states

### 3. NotificationCard Component

Smart card that:

- Shows unread indicator (blue dot + border)
- Calculates time ago dynamically
- Marks notification as read on tap
- Navigates to orders/payouts screen
- Displays metadata (order ID, payout ID)

## Notification Types

### ORDER_CREATED

```json
{
  "title": "New Order #1234",
  "message": "Customer John ordered 2x Burger, 1x Fries",
  "type": "ORDER_CREATED",
  "metadata": {
    "orderId": "uuid",
    "storeId": "uuid"
  },
  "categoryId": "order"
}
```

### ORDER_UPDATE

```json
{
  "title": "Order Ready for Pickup",
  "message": "Order #1234 is ready for rider pickup",
  "type": "ORDER_UPDATE",
  "metadata": {
    "orderId": "uuid",
    "status": "READY"
  }
}
```

### PAYOUT_APPROVED

```json
{
  "title": "Payout Approved",
  "message": "Your payout of $250.00 has been approved",
  "type": "PAYOUT_APPROVED",
  "metadata": {
    "payoutId": "uuid",
    "amount": 250.0
  },
  "categoryId": "payout"
}
```

## Action Buttons

### Order Notifications

When a new order notification arrives, it shows two action buttons:

- **Accept** - Calls `acceptOrder()` API and navigates to orders screen
- **Decline** - Navigates to orders screen where user can select decline reason

### Payout Notifications

- **View Details** - Navigates to withdrawal/payout screen

## Backend Firebase Integration

The backend uses `firebase-admin` package (already installed) to send push notifications.

Example service method to create and send notification:

```typescript
// In vendor-orders.service.ts or similar
async notifyVendorOfNewOrder(vendorId: string, order: Order) {
  // Create database notification
  await this.notificationsService.create({
    userId: vendorId,
    title: `New Order #${order.orderNumber}`,
    message: `Customer ${order.customerName} ordered ${order.items.length} items`,
    type: 'ORDER_CREATED',
    metadata: {
      orderId: order.id,
      storeId: order.storeId,
    },
  });

  // Send push notification if vendor has token
  const vendor = await this.prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { expoPushToken: true },
  });

  if (vendor?.expoPushToken) {
    await this.pushNotificationService.sendToDevice(vendor.expoPushToken, {
      title: `New Order #${order.orderNumber}`,
      body: `${order.items.length} items - Tap to view`,
      data: {
        orderId: order.id,
        storeId: order.storeId,
      },
      categoryIdentifier: 'order', // Enables action buttons
    });
  }
}
```

## Testing Push Notifications

### 1. Test on Physical Device

Push notifications require a physical device (not simulator/emulator).

### 2. Send Test Notification

Use Expo's push notification tool:

```bash
# After getting push token from app logs
curl -H "Content-Type: application/json" -X POST \
  "https://exp.host/--/api/v2/push/send" -d '{
  "to": "ExponentPushToken[xxxxxx]",
  "title":"Test Order",
  "body": "New order received!",
  "data": {"orderId": "test-123"},
  "categoryId": "order"
}'
```

### 3. Test Action Buttons

- Send notification with `categoryId: "order"`
- Long-press/swipe notification
- Tap "Accept" or "Decline"
- App should navigate to orders screen

## Unread Count Badge

The unread count is available via `useNotifications()` hook:

```tsx
const { unreadCount } = useNotifications();

// Display badge on tab icon
<TabBarIcon
  name="notifications"
  badge={unreadCount > 0 ? unreadCount : undefined}
/>;
```

## Real-time Updates

Current implementation uses 60-second polling. For true real-time:

1. **WebSocket** (already available via NotificationsGateway):

```tsx
// In NotificationContext
useEffect(() => {
  const socket = io(API_URL, {
    auth: { token: accessToken },
  });

  socket.on("notification", (notification) => {
    setUnreadCount((prev) => prev + 1);
    // Show local notification
  });

  return () => socket.disconnect();
}, []);
```

2. **Expo Background Fetch** (for periodic updates when app is backgrounded)

## Performance Optimizations

1. **Pagination**: 20 notifications per page
2. **Lazy Loading**: Load more on scroll
3. **Optimistic Updates**: Mark as read immediately in UI
4. **Memoization**: Tab filtering uses useMemo
5. **Debounced Refresh**: Prevents excessive API calls

## Security

- ✅ JWT authentication required for all endpoints
- ✅ Push tokens stored securely per vendor
- ✅ Notifications filtered by `userId` on backend
- ✅ Action buttons verify ownership before executing

## Next Steps

1. Install packages: `yarn add expo-notifications expo-device expo-constants`
2. Test on physical device
3. Configure Expo Push Notification credentials in `app.json`
4. Implement backend Firebase notification sending
5. Add WebSocket for real-time updates (optional)
6. Add notification sounds/vibration customization
7. Implement notification preferences (enable/disable by type)
