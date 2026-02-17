# OAuth Setup Guide - Native Google Sign-In

> **Updated**: This guide covers the **Native Google Sign-In** implementation (no browser window opens)

This guide explains how to configure **Native Google Sign-In** (no browser) and Apple OAuth for the customer app.

## Overview

This implementation uses:

- **Google Sign-In**: Native SDKs (Google Play Services on Android, Google Sign-In framework on iOS) - **No browser window opens**
- **Apple Sign-In**: Native framework (iOS only)

### Benefits of Native Google Sign-In

✅ No browser window opens  
✅ Seamless user experience  
✅ Works offline with cached credentials  
✅ Better security with native SDKs  
✅ Faster authentication  
✅ Access to additional user data (profile picture, etc.)

## Installation

The required package is already configured:

```bash
npm install @react-native-google-signin/google-signin
```

For Expo projects, you may need to use EAS build:

```bash
eas build --platform android
eas build --platform ios
```

## Google Sign-In Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

### 2. Create OAuth Credentials

#### For Android:

1. Get your SHA-1 fingerprint:

   ```bash
   # For development (debug keystore)
   cd android/app
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # For production (upload keystore)
   keytool -list -v -keystore your-upload-keystore.jks -alias your-key-alias
   ```

2. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
3. Application type: **Android**
4. Package name: `com.iamwyteshadow.asoosecustomerapp`
5. Paste your **SHA-1 fingerprint**
6. Copy the **Client ID** (not needed for native Android, but for configuration)

#### For iOS:

1. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **iOS**
3. Bundle ID: `com.iamwyteshadow.asoosecustomerapp`
4. Copy the **Client ID**

#### For Web (Required for Google Sign-In SDK):

1. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Web application**
3. No need to add redirect URIs for native apps
4. Copy the **Client ID** (this is the only one required in .env)

### 3. Configure Environment Variables

Create or update a `.env` file in `apps/customer-app/` with:

```env
# Only the web client ID is needed for native Google Sign-In
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com

# Optional: For iOS if you have a separate iOS client ID
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
```

## Apple Sign-In Setup

### 1. Apple Developer Account

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Sign in with your Apple Developer account

### 2. Configure App ID

1. Go to Certificates, Identifiers & Profiles
2. Select your App ID or create a new one
3. Bundle ID: `com.iamwyteshadow.asoosecustomerapp`
4. Enable "Sign in with Apple" capability
5. Save

### 3. Configure Xcode Project (for iOS builds)

1. Open `ios/` folder in Xcode
2. Select your target
3. Go to Signing & Capabilities
4. Add "Sign in with Apple" capability

## Backend Configuration

The backend already has the routes configured:

- Google: `POST /api/v1/auth/user/oauth/google`
- Apple: `POST /api/v1/auth/user/oauth/apple`

### Google Backend Updates

The backend should verify the `idToken` sent from the app for security:

```typescript
// Backend example (pseudo-code)
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(GOOGLE_CLIENT_ID_WEB);

// Verify the idToken
const ticket = await client.verifyIdToken({
  idToken: request.body.idToken,
  audience: GOOGLE_CLIENT_ID_WEB,
});

const payload = ticket.getPayload();
// Use payload.email, payload.sub (googleId), etc.
```

Make sure to run the Prisma migration to add the required fields:

```bash
cd backend
npx prisma migrate dev --name add_oauth_fields
```

## Testing

### Google Sign-In

- **iOS Simulator**: ✅ Works with native Google Sign-In
- **Android Emulator**: ✅ Works with native Google Sign-In (requires Google Play Services)
- **Physical Device**: ✅ Works (requires proper SHA-1 configuration)

### Apple Sign-In

- **iOS Simulator**: ✅ Works (iOS 13+)
- **Physical iOS Device**: ✅ Works
- **Android**: ❌ Not available (button won't show)

## Troubleshooting

### Google Sign-In Issues

1. **"Google Play Services not available"**
   - Android: Ensure Google Play Services is installed on the device
   - Use a physical device or emulator with Google Play Services

2. **"Sign in was cancelled"**
   - Normal user cancellation - handle gracefully

3. **"Invalid credentials"**
   - Verify Client IDs match your Google Cloud Console
   - Check bundle ID / package name matches exactly
   - Ensure SHA-1 fingerprint is correct for Android

4. **"Network request failed"**
   - Check API URL in `.env`
   - Verify backend is running
   - Check internet connection

5. **"Play Service error 10"**
   - Google Play Services outdated
   - Update Google Play Services on the device

### Apple Sign-In Issues

1. **"Apple Sign-In unavailable"**
   - iOS 13+ required
   - Check if capability is enabled in Xcode

2. **"Invalid credentials"**
   - Verify bundle ID matches App ID in Apple Developer Portal
   - Ensure "Sign in with Apple" capability is enabled

## Security Notes

- ✅ Native SDKs provide the most secure authentication method
- ✅ idToken verification on backend ensures token authenticity
- ✅ Never commit `.env` file with real credentials
- ✅ Use different OAuth clients for development and production
- ✅ Rotate credentials regularly
- ✅ Monitor OAuth usage in respective consoles
- ✅ Token validation prevents unauthorized access

## Comparison: Native vs Web OAuth

| Feature                | Native (Current) | Web Browser |
| ---------------------- | ---------------- | ----------- |
| Browser Opens          | ❌ No            | ✅ Yes      |
| Offline Support        | ✅ Yes           | ❌ No       |
| User Experience        | 🚀 Fast          | Slower      |
| Native Security        | ✅ Best          | Good        |
| Development Complexity | Medium           | High        |
| Setup Time             | Fast             | Moderate    |

The native approach is recommended for all production mobile apps.

## Implementation Code

### Installation in package.json

```bash
# For managed Expo projects
expo install @react-native-google-signin/google-signin

# For bare React Native
npm install @react-native-google-signin/google-signin
```

### Usage in Your App

The OAuth service already handles initialization:

```typescript
// In login.tsx
import {
  initializeGoogleSignIn,
  authenticateWithGoogle,
} from "@/services/oauth.service";

// Initialize once at app startup (done automatically in login screen)
await initializeGoogleSignIn();

// Handle Google Sign-In button press
const handleGoogleSignIn = async () => {
  try {
    await authenticateWithGoogle();
    // User is logged in
  } catch (error) {
    // Handle error (user canceled, network issue, etc.)
  }
};
```

No additional setup needed - the service handles everything!
