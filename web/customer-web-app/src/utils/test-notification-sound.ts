/**
 * Notification Sound Test Utility
 * 
 * This utility helps developers test notification sounds during development
 * without needing to send actual push notifications.
 * 
 * Usage in browser console:
 * 
 * 1. Import in your dev component:
 *    import { testNotificationSound } from '@/utils/test-notification-sound';
 * 
 * 2. Or add a dev button in your UI that calls testNotificationSound()
 * 
 * 3. Or run in browser console (after importing the sound functions):
 *    testNotificationSound()
 */

import { 
  playNotificationSound, 
  preloadNotificationSound,
  canPlayNotificationSound 
} from '@/lib/notification-sound';

/**
 * Test the notification sound playback
 */
export async function testNotificationSound(): Promise<void> {
  console.log('🔊 Testing notification sound...');
  
  // Check if sound can be played
  const canPlay = await canPlayNotificationSound();
  console.log('Can play audio:', canPlay);
  
  if (!canPlay) {
    console.error('❌ Browser does not support audio playback');
    return;
  }
  
  // Preload the sound
  preloadNotificationSound();
  console.log('✅ Sound preloaded');
  
  // Try to play
  try {
    await playNotificationSound();
    console.log('✅ Sound played successfully!');
  } catch (error) {
    console.error('❌ Failed to play sound:', error);
    console.log('💡 Tip: Click anywhere on the page first to unlock audio');
  }
}

/**
 * Test notification sound multiple times with delay
 */
export async function testNotificationSoundLoop(
  times: number = 3, 
  delayMs: number = 2000
): Promise<void> {
  console.log(`🔊 Testing notification sound ${times} times with ${delayMs}ms delay...`);
  
  for (let i = 0; i < times; i++) {
    console.log(`Playing sound ${i + 1}/${times}`);
    await playNotificationSound();
    
    if (i < times - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log('✅ Test completed');
}

/**
 * Simulate a notification with sound and toast
 * (useful for testing the full notification flow)
 */
export async function simulateNotification(
  title: string = 'Test Notification',
  body: string = 'This is a test notification with sound'
): Promise<void> {
  console.log('🔔 Simulating notification...');
  
  // Play sound
  await playNotificationSound();
  
  // Show browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
    });
    console.log('✅ Native notification shown');
  } else {
    console.log('⚠️ Notification permission not granted');
    console.log('Title:', title);
    console.log('Body:', body);
  }
}

// Make functions available in browser console for quick testing
if (typeof window !== 'undefined') {
  (window as any).__testNotificationSound = testNotificationSound;
  (window as any).__testNotificationSoundLoop = testNotificationSoundLoop;
  (window as any).__simulateNotification = simulateNotification;
  
  console.log('🔧 Notification test utilities loaded!');
  console.log('Available commands:');
  console.log('  __testNotificationSound() - Test sound once');
  console.log('  __testNotificationSoundLoop(times, delayMs) - Test sound multiple times');
  console.log('  __simulateNotification(title, body) - Simulate full notification');
}
