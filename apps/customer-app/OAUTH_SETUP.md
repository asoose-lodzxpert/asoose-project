# OAuth Setup Guide

This guide explains how to configure Google and Apple OAuth for the customer app.

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

### 2. Create OAuth Credentials

#### For iOS:

1. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: iOS
3. Bundle ID: `com.iamwyteshadow.asoosecustomerapp`
4. Copy the Client ID

#### For Android:

1. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: Android
3. Package name: `com.iamwyteshadow.asoosecustomerapp`
4. Get your SHA-1 fingerprint:

   ```bash
   # For development (debug keystore)
   cd android/app
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # For production (upload keystore)
   keytool -list -v -keystore your-upload-keystore.jks -alias your-key-alias
   ```

5. Paste SHA-1 fingerprint
6. Copy the Client ID

#### For Web (required for Expo):

1. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: Web application
3. Add authorized redirect URIs:
   - `https://auth.expo.io/@your-username/asoose-customer-app`
   - `exp://localhost:8081`
4. Copy the Client ID

### 3. Configure Environment Variables

Create a `.env` file in `apps/customer-app/` with:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com
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

### 4. No Additional Environment Variables Needed

Apple Sign-In uses your app's bundle identifier and doesn't require OAuth client IDs.

## Backend Configuration

The backend already has the routes configured:

- Google: `POST /api/v1/auth/user/oauth/google`
- Apple: `POST /api/v1/auth/user/oauth/apple`

Make sure to run the Prisma migration to add the `appleId` field:

```bash
cd backend
npx prisma migrate dev --name add_apple_oauth
```

## Testing

### Google Sign-In

- **iOS Simulator**: Works with web OAuth flow
- **Android Emulator**: Works with web OAuth flow
- **Physical Device**: Requires proper SHA-1 configuration

### Apple Sign-In

- **iOS Simulator**: Works (iOS 13+)
- **Physical iOS Device**: Works
- **Android**: Not available (button won't show)

## Troubleshooting

### Google OAuth Issues

1. **"Error 401: invalid_client"**
   - Verify Client IDs match your Google Cloud Console
   - Check bundle ID / package name matches
2. **"Network request failed"**
   - Check API URL in `.env`
   - Verify backend is running

### Apple Sign-In Issues

1. **"Apple Sign-In unavailable"**
   - iOS 13+ required
   - Check if capability is enabled in Xcode
2. **"Invalid credentials"**
   - Verify bundle ID matches App ID in Apple Developer Portal
   - Ensure "Sign in with Apple" capability is enabled

## Security Notes

- Never commit `.env` file with real credentials
- Use different OAuth clients for development and production
- Rotate credentials regularly
- Monitor OAuth usage in respective consoles
