/**
 * Notification Sound Utility
 * 
 * Provides cross-browser support for playing notification sounds.
 * Handles various browser policies and fallbacks.
 */

// Singleton audio instance for reuse
let audioInstance: HTMLAudioElement | null = null;

/**
 * Preload the notification sound to ensure quick playback
 */
export function preloadNotificationSound(): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (!audioInstance) {
      audioInstance = new Audio('/sounds/notification.mp3');
      audioInstance.preload = 'auto';
      
      // Set volume to a reasonable level (0.0 to 1.0)
      audioInstance.volume = 0.7;
    }
  } catch (error) {
    console.warn('[NotificationSound] Failed to preload sound:', error);
  }
}

/**
 * Play the notification sound
 * 
 * Returns a promise that resolves when playback starts or fails gracefully.
 * Handles autoplay policies and permissions across different browsers.
 */
export async function playNotificationSound(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // Try to play from preloaded instance
    if (audioInstance) {
      // Reset to start if already playing
      audioInstance.currentTime = 0;
      
      const playPromise = audioInstance.play();
      
      if (playPromise !== undefined) {
        await playPromise;
      }
    } else {
      // Fallback: create new instance if preload failed
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.7;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
      }
    }
  } catch (error) {
    // Silently handle autoplay policy errors
    // This is expected if user hasn't interacted with the page yet
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
        console.debug('[NotificationSound] Autoplay prevented by browser policy');
      } else {
        console.warn('[NotificationSound] Failed to play sound:', error);
      }
    }
  }
}

/**
 * Test if notification sound can be played (useful for permission checks)
 */
export async function canPlayNotificationSound(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    const audio = new Audio();
    // Check if audio is supported
    return audio.canPlayType('audio/mpeg') !== '';
  } catch {
    return false;
  }
}

/**
 * Initialize sound on user interaction to unlock autoplay
 * Call this on first user click/touch to enable sounds
 */
export function unlockNotificationSound(): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (!audioInstance) {
      preloadNotificationSound();
    }
    
    // Play and immediately pause to unlock audio context
    if (audioInstance) {
      audioInstance.play()?.then(() => {
        audioInstance?.pause();
        if (audioInstance) {
          audioInstance.currentTime = 0;
        }
      }).catch(() => {
        // Ignore errors during unlock
      });
    }
  } catch {
    // Ignore errors
  }
}
