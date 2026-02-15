# Push Notifications Production Setup Guide

This guide provides comprehensive instructions for setting up push notifications in production for the ASOOSE platform across all three mobile apps (Vendor, Rider, and Customer).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Expo Push Notification Service Setup](#expo-push-notification-service-setup)
5. [Firebase Cloud Messaging (FCM) Setup](#firebase-cloud-messaging-fcm-setup)
6. [Apple Push Notification Service (APNs) Setup](#apple-push-notification-service-apns-setup)
7. [Backend Integration](#backend-integration)
8. [Environment Configuration](#environment-configuration)
9. [Testing Push Notifications](#testing-push-notifications)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Overview

The ASOOSE platform uses **Expo's Push Notification Service** as the primary notification delivery mechanism. This service acts as a unified interface that handles both iOS (APNs) and Android (FCM) push notifications, simplifying the developer experience.

### What's Been Implemented

All three apps now have:

- ✅ **Themed Toast Notifications** - Consistent UI for in-app notifications
- ✅ **Push Notification Context** - Manages notification state and permissions
- ✅ **Notification Preferences** - User-configurable notification settings
- ✅ **Push Token Management** - Automatic registration and token sync with backend
- ✅ **Notification Categories** - Action buttons for different notification types
- ✅ **Deep Linking** - Navigate to specific screens when tapping notifications

---

## Architecture

```
┌─────────────┐
│   Backend   │ (NestJS)
│   Server    │
└──────┬──────┘
       │
       │ 1. Send notification request
       ▼
┌─────────────────────┐
│  Expo Push API      │
│  (expo.dev)         │
└──────┬──────────────┘
       │
       │ 2. Route to platform service
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│   FCM   │    │  APNs   │    │  Other  │
│(Android)│    │  (iOS)  │    │         │
└────┬────┘    └────┬────┘    └─────────┘
     │              │
     │ 3. Deliver  │
     ▼              ▼
┌──────────────────────────┐
│   User's Device          │
│   (Vendor/Rider/Customer)│
└──────────────────────────┘
```

### Flow

1. **Backend** sends notification via Expo Push API
2. **Expo** routes to appropriate service (FCM for Android, APNs for iOS)
3. **Platform Service** delivers to user's device
4. **App** handles notification display and routing

---

## Prerequisites

Before setting up production push notifications, ensure you have:

- [ ] An Expo account (https://expo.dev)
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Google Cloud Platform account (for FCM)
- [ ] Apple Developer account (for APNs) - $99/year
- [ ] Access to the project's backend codebase
- [ ] Admin access to manage API keys

---

## Expo Push Notification Service Setup

### 1. Create/Link Expo Project

```bash
# Login to Expo
eas login

# Navigate to each app directory
cd apps/vendor-app
eas build:configure

cd ../rider-app
eas build:configure

cd ../customer-app
eas build:configure
```

### 2. Verify Project IDs

Each app should have an `app.json` or `app.config.js` with the Expo project ID:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-expo-project-id-here"
      }
    }
  }
}
```

### 3. Get Push Notification Credentials

Expo automatically manages push credentials when you build with EAS:

```bash
# For each app
cd apps/vendor-app
eas credentials

# Select:
# - Platform (iOS or Android)
# - "Push Notifications"
# - View your credentials
```

---

## Firebase Cloud Messaging (FCM) Setup

FCM is required for Android push notifications.

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Name it (e.g., "ASOOSE Platform")
4. Disable Google Analytics (optional)
5. Click "Create Project"

### 2. Add Android Apps

For **each app** (vendor, rider, customer):

1. Click "Add app" → Android icon
2. Enter Android package name:
   - Vendor: `com.asoose.vendor.app`
   - Rider: `com.asoose.rider.app`
   - Customer: `com.asoose.customer.app`
3. Download `google-services.json`
4. Place in respective app directory: `apps/{app-name}/`
5. Skip the SDK setup (EAS handles this)

### 3. Get FCM Server Key

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Under "Cloud Messaging API (Legacy)", enable it if disabled
3. Copy the **Server Key**
4. Save this for backend configuration

### 4. Upload to Expo

```bash
cd apps/vendor-app
eas credentials

# Select Android → Push Notifications
# Upload google-services.json or paste Server Key
```

Repeat for rider-app and customer-app.

---

## Apple Push Notification Service (APNs) Setup

APNs is required for iOS push notifications.

### 1. Create App IDs

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
3. Click **+** to create new App ID for each app:
   - Vendor: `com.asoose.vendor.app`
   - Rider: `com.asoose.rider.app`
   - Customer: `com.asoose.customer.app`
4. Enable **Push Notifications** capability
5. Click **Continue** and **Register**

### 2. Create APNs Keys (Recommended)

**Option A: APNs Key (Recommended - works for all apps)**

1. In Apple Developer → **Keys**, click **+**
2. Name it "ASOOSE Push Notifications"
3. Check **Apple Push Notifications service (APNs)**
4. Click **Continue** → **Register**
5. Download the `.p8` key file
6. Note the **Key ID** and **Team ID**

**Option B: APNs Certificates (Per-app)**

1. Generate CSR on your Mac (Keychain Access)
2. In Apple Developer → **Certificates**, click **+**
3. Select "Apple Push Notification service SSL"
4. Select App ID, upload CSR
5. Download certificate, install in Keychain
6. Export as `.p12`

### 3. Upload to Expo

```bash
cd apps/vendor-app
eas credentials

# Select iOS → Push Notifications
# Choose "Upload" and provide:
# - .p8 key file (or .p12)
# - Key ID
# - Team ID
```

Repeat for rider-app and customer-app.

---

## Backend Integration

### 1. Install Expo Server SDK

In your NestJS backend:

```bash
cd backend
npm install expo-server-sdk
```

### 2. Create Notification Service

Create `backend/src/notifications/expo-push.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class ExpoPushService {
  private expo: Expo;
  private readonly logger = new Logger(ExpoPushService.name);

  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN, // Optional, for rate limits
    });
  }

  async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: any,
  ): Promise<ExpoPushTicket> {
    // Validate token
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error(\`Invalid Expo push token: \${pushToken}\`);
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: data?.channelId || 'default',
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      this.logger.log(\`Sent notification to \${pushToken}\`);
      return tickets[0];
    } catch (error) {
      this.logger.error(\`Failed to send notification: \${error.message}\`);
      throw error;
    }
  }

  async sendBatchNotifications(
    messages: ExpoPushMessage[],
  ): Promise<ExpoPushTicket[]> {
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        this.logger.error(\`Batch send failed: \${error.message}\`);
      }
    }

    return tickets;
  }
}
```

### 3. Implement Token Storage

Add endpoints to store/retrieve push tokens:

```typescript
// POST /auth/vendor/push-token
// POST /auth/rider/push-token
// POST /users/push-token (customer)

async savePushToken(userId: string, token: string, platform: string) {
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      pushToken: token,
      pushTokenPlatform: platform,
      pushTokenUpdatedAt: new Date(),
    },
  });
}
```

### 4. Send Notifications on Events

Example: New order notification

```typescript
async notifyVendorNewOrder(vendorId: string, orderId: string) {
  const vendor = await this.prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { user: true },
  });

  if (!vendor?.user?.pushToken) {
    return;
  }

  await this.expoPushService.sendPushNotification(
    vendor.user.pushToken,
    'New Order Received',
    'You have a new order waiting for confirmation',
    {
      type: 'ORDER',
      orderId,
      channelId: 'orders',
      categoryId: 'order', // For action buttons
    },
  );
}
```

---

## Environment Configuration

### Backend (.env)

```env
# Optional: Expo access token for higher rate limits
EXPO_ACCESS_TOKEN=your-expo-access-token

# Firebase Server Key (for direct FCM if needed)
FCM_SERVER_KEY=your-fcm-server-key

# APNs .p8 credentials (if using direct APNs)
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXX.p8
```

### Mobile Apps

Each app already has the configuration in `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "bundleIdentifier": "com.asoose.vendor.app"
    }
  }
}
```

---

## Testing Push Notifications

### 1. Development/Expo Go

Push notifications **DO NOT work in Expo Go**. You must use a development build:

```bash
cd apps/vendor-app
eas build --profile development --platform android
eas build --profile development --platform ios
```

### 2. Test with Expo Push Tool

Use the [Expo Push Notification Tool](https://expo.dev/notifications):

1. Get a test push token from your app (check logs after login)
2. Paste token in the tool
3. Enter title and message
4. Click "Send a Notification"

### 3. Test from Backend

Create a test endpoint:

```typescript
@Get('test-notification/:userId')
async testNotification(@Param('userId') userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.pushToken) {
    return { error: 'No push token found' };
  }

  await this.expoPushService.sendPushNotification(
    user.pushToken,
    'Test Notification',
    'This is a test from the backend',
    { test: true },
  );

  return { success: true };
}
```

### 4. Check Logs

Monitor logs in both app and backend:

```bash
# App logs
npx react-native log-android
npx react-native log-ios

# Backend logs
# Check your server console
```

---

## Production Deployment

### 1. Build Production Apps

```bash
# Vendor App
cd apps/vendor-app
eas build --platform android --profile production
eas build --platform ios --profile production

# Rider App
cd apps/rider-app
eas build --platform android --profile production
eas build --platform ios --profile production

# Customer App
cd apps/customer-app
eas build --platform android --profile production
eas build --platform ios --profile production
```

### 2. Submit to Stores

```bash
# Android (Google Play)
eas submit --platform android

# iOS (App Store)
eas submit --platform ios
```

### 3. Backend Deployment

Ensure environment variables are set in production:

```bash
# Example for Railway/Heroku
railway variables set EXPO_ACCESS_TOKEN=your-token

# Docker
docker run -e EXPO_ACCESS_TOKEN=your-token your-image
```

### 4. Monitor Production

- Set up error tracking (Sentry, Bugsnag)
- Monitor Expo Push receipt API for delivery status
- Track notification open rates
- Monitor backend logs for failed sends

---

## Troubleshooting

### Issue: "Not a valid Expo push token"

**Solution:**

- Verify the token starts with `ExponentPushToken[...]`
- Ensure the app is using the correct Expo project ID
- Rebuild the app with latest credentials

### Issue: Notifications not received on Android

**Checklist:**

- [ ] FCM Server Key configured in Expo
- [ ] `google-services.json` in app directory
- [ ] Android channel created (check logs)
- [ ] App has notification permissions
- [ ] Device has internet connection
- [ ] Background restrictions disabled for app

### Issue: Notifications not received on iOS

**Checklist:**

- [ ] APNs key/certificate uploaded to Expo
- [ ] Correct Bundle Identifier in Apple Developer
- [ ] Push Notifications capability enabled
- [ ] App has notification permissions
- [ ] Testing on physical device (not simulator)
- [ ] Production APNs environment for production builds

### Issue: Notifications work in dev, not production

**Solution:**

- iOS: Ensure production APNs certificate/key is used
- Android: Verify FCM credentials match production app
- Check if using correct push token endpoint (sandbox vs production)

### Issue: High notification delivery failure rate

**Possible Causes:**

- Expired push tokens (users uninstalled/reinstalled app)
- Invalid tokens in database
- Rate limiting by Expo/FCM/APNs
- Network issues

**Solution:**

- Implement push receipt checking and token cleanup
- Handle errors gracefully, remove invalid tokens
- Use batch sending for large volumes

---

## Best Practices

### 1. Token Management

✅ **DO:**

- Store tokens with timestamps
- Update tokens on app launch
- Remove tokens on logout
- Validate tokens before sending

❌ **DON'T:**

- Send to expired tokens
- Store tokens without user association
- Forget to handle token refresh

### 2. Notification Content

✅ **DO:**

- Keep titles under 50 characters
- Keep bodies under 200 characters
- Use clear, actionable language
- Include relevant data for deep linking

❌ **DON'T:**

- Send sensitive information (passwords, tokens)
- Use ALL CAPS or excessive emojis
- Send generic "You have a notification" messages

### 3. User Experience

✅ **DO:**

- Request permissions at appropriate time (after showing value)
- Respect user notification preferences
- Implement quiet hours
- Group related notifications

❌ **DON'T:**

- Spam users with notifications
- Send notifications for every minor event
- Ignore user's timezone

### 4. Performance

✅ **DO:**

- Batch send when possible (up to 100 at once)
- Use background jobs for large sends
- Implement retry logic with exponential backoff
- Monitor delivery rates

❌ **DON'T:**

- Send one-by-one in loops
- Block API requests waiting for notification sends
- Ignore failed deliveries

### 5. Security

✅ **DO:**

- Use environment variables for credentials
- Rotate API keys regularly
- Validate all notification data
- Sanitize user input in notifications

❌ **DON'T:**

- Commit credentials to git
- Send tokens in API responses
- Trust notification data without validation

---

## Additional Resources

- [Expo Push Notifications Documentation](https://docs.expo.dev/push-notifications/overview/)
- [Expo Server SDK](https://github.com/expo/expo-server-sdk-node)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)
- [Expo Push Notification Tool](https://expo.dev/notifications)

---

## Support

For issues or questions:

1. Check the [Expo Forums](https://forums.expo.dev/)
2. Review app logs for error details
3. Test with Expo Push Notification Tool
4. Contact the development team

---

## Changelog

**Version 1.0** - Initial implementation

- ✅ Toast notifications across all apps
- ✅ Push notification contexts
- ✅ Notification preferences
- ✅ Action buttons and deep linking
- ✅ Production setup guide

---

**Last Updated:** February 14, 2026
