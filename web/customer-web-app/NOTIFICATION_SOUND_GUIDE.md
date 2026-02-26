# Push Notification Sound Implementation

This document describes the custom notification sound implementation for the web application.

## Overview

The application now plays a custom notification sound when push notifications are received, both when the app is in focus (foreground) and when it's in the background.

## How It Works

### Foreground Notifications (App is Open & Active)

When the app is in focus and a push notification arrives:
1. Firebase Cloud Messaging (FCM) delivers the message via `onMessage` listener
2. The `usePushNotifications` hook receives the notification
3. Custom sound is played using the Web Audio API
4. A toast notification is displayed with the message content

### Background Notifications (App is Open but Not Active)

When the app is open but not in focus (in background tab):
1. FCM delivers the message to the service worker
2. Service worker shows a native browser notification with sound parameter
3. Service worker sends a postMessage to all open client windows
4. Client windows play the custom sound as a fallback
5. Vibration pattern is triggered on supported devices

### Technical Components

#### 1. Sound Utility (`src/lib/notification-sound.ts`)
- Manages audio playback with cross-browser support
- Preloads sound for instant playback
- Handles autoplay policy restrictions
- Provides unlock mechanism for user interaction requirement

#### 2. Push Notifications Hook (`src/hooks/usePushNotifications.tsx`)
- Integrates sound playback with FCM message handling
- Listens for service worker messages
- Unlocks audio on first user interaction
- Preloads notification sound during setup

#### 3. Service Worker (`public/firebase-messaging-sw.js`)
- Adds sound parameter to background notifications
- Sends messages to client windows for fallback sound playback
- Includes vibration pattern for mobile devices

## Browser Compatibility

### ✅ Fully Supported
- **Chrome/Edge 80+**: Full support for custom sounds
- **Firefox 75+**: Full support for custom sounds  
- **Safari 13.1+**: Full support (requires user interaction first)
- **Opera 67+**: Full support

### ⚠️ Partial Support
- **Safari < 13.1**: Native notification sound only (no custom sound)
- **Mobile Safari iOS 16.4+**: Requires user gesture, uses native sound

### Sound Playback Methods by Browser

| Browser | Foreground | Background | Notes |
|---------|-----------|------------|-------|
| Chrome | Custom Sound | Custom Sound | Full support via notification API |
| Firefox | Custom Sound | Custom Sound | Full support |
| Safari | Custom Sound | Native Sound | Background uses system sound |
| Edge | Custom Sound | Custom Sound | Full support |
| Mobile Chrome | Custom Sound | Vibration + Sound | Limited by mobile policies |
| Mobile Safari | Custom Sound* | Native Sound | *Requires user interaction |

## Autoplay Policies

Modern browsers restrict audio playback to prevent unwanted sounds. Our implementation handles this by:

1. **User Interaction Requirement**: Sound is unlocked on first click/touch
2. **Graceful Degradation**: If autoplay is blocked, notification still shows
3. **Preloading**: Sound file is preloaded after permission is granted
4. **Fallback**: Service worker message ensures sound plays even if primary method fails

## Customizing the Notification Sound

### Replacing the Sound File

1. Prepare your audio file:
   - **Format**: MP3 (best compatibility) or OGG
   - **Duration**: 1-3 seconds recommended
   - **Size**: < 100KB recommended
   - **Sample Rate**: 44.1kHz or 48kHz

2. Replace the file at: `public/sounds/notification.mp3`

3. Supported formats by browser:
   - MP3: All modern browsers
   - OGG: Chrome, Firefox, Opera
   - WAV: All modern browsers (but larger files)

### Adjusting Volume

Edit `src/lib/notification-sound.ts`:

```typescript
// Change volume (0.0 to 1.0)
audioInstance.volume = 0.7; // Default is 0.7 (70%)
```

### Using Multiple Sounds

To use different sounds for different notification types:

1. Add sound files to `public/sounds/`:
   - `public/sounds/ride-update.mp3`
   - `public/sounds/delivery-update.mp3`
   - `public/sounds/order-update.mp3`

2. Modify the notification handler to select sound based on notification data:

```typescript
// In usePushNotifications.tsx
unsubscribeRef.current = onMessage(messaging, (payload) => {
  const { title, body } = payload.notification ?? {};
  const notificationType = payload.data?.type;
  
  // Play different sound based on type
  const soundFile = getSoundForNotificationType(notificationType);
  playCustomNotificationSound(soundFile);
  
  // ... rest of handler
});
```

## Testing

### Testing Foreground Notifications

1. Open the app in your browser
2. Grant notification permission when prompted
3. Ensure you've interacted with the page (click anywhere)
4. Send a test notification from your backend
5. Verify:
   - Sound plays
   - Toast notification appears
   - Console shows no errors

### Testing Background Notifications

1. Open the app in a browser tab
2. Grant notification permission
3. Switch to a different tab or window
4. Send a test notification
5. Verify:
   - Native browser notification appears
   - Sound plays (if supported)
   - Device vibrates (on mobile)

### Testing Autoplay Unlock

1. Open the app in a new incognito/private window
2. Do NOT interact with the page
3. Send a notification
4. Check console for autoplay prevention message
5. Click anywhere on the page
6. Send another notification
7. Verify sound now plays

## Troubleshooting

### Sound Doesn't Play

**Symptoms**: Notification appears but no sound

**Possible Causes**:
1. User hasn't interacted with the page yet (autoplay policy)
   - **Solution**: Ensure user clicks/touches page before notification
   
2. Browser sound settings disabled
   - **Solution**: Check browser notification settings
   
3. System volume muted
   - **Solution**: Check device volume

4. File not found
   - **Solution**: Verify `/sounds/notification.mp3` exists

### Console Shows "NotAllowedError"

**Symptoms**: Error in console about autoplay prevention

**Solution**: This is normal behavior. Sound will play after user interaction.

### Sound Plays Multiple Times

**Symptoms**: Same notification triggers sound repeatedly

**Solution**: Check that you're not calling `playNotificationSound()` multiple times. The service worker postMessage might cause duplication if both foreground and background handlers trigger simultaneously.

### Different Sound on Different Devices

**Symptoms**: Sound works on desktop but not mobile

**Solution**: Mobile browsers have stricter autoplay policies. Ensure:
- User has interacted with the page
- Notification permission is granted
- Volume is not muted
- Browser is up to date

## Performance Considerations

### File Size
- Keep sound file under 100KB for fast loading
- Larger files may delay first notification sound

### Preloading
- Sound is preloaded when notification permission is granted
- Subsequent notifications play instantly

### Memory
- Single audio instance is reused to minimize memory usage
- Audio instance is created once and persisted

## Security

### Content Security Policy (CSP)

If you have CSP headers, ensure they allow:
```
media-src 'self';
```

### HTTPS Requirement

Push notifications and service workers require HTTPS in production.

## Future Enhancements

Possible improvements:
1. User preference to enable/disable sounds
2. Volume control in user settings
3. Multiple sound options for different notification types
4. Sound preview in settings
5. Do Not Disturb mode based on time of day

## Related Files

- `src/lib/notification-sound.ts` - Core sound playback utility
- `src/hooks/usePushNotifications.tsx` - Push notification integration
- `public/firebase-messaging-sw.js` - Service worker notification handler
- `public/sounds/notification.mp3` - Default notification sound file
