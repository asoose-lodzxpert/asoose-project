/**
 * Notification Sound Utility
 * 
 * Uses the Web Audio API to synthesise a distinctive three-tone rising alarm
 * (A5 → C6 → E6) directly in the browser — no audio file dependency, no
 * codec / MIME issues, zero network requests.
 *
 * Falls back to an <Audio> element playing /sounds/notification.mp3 if the
 * Web Audio API is unavailable.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesise and play a short alarm tone via the Web Audio API.
 * Three beeps: A5 (880 Hz) → C6 (1047 Hz) → E6 (1319 Hz), 180 ms each.
 */
async function playWebAudioAlarm(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) throw new Error('Web Audio API not available');

  // Resume suspended context (required after first user gesture)
  if (ctx.state === 'suspended') await ctx.resume();

  const beeps: Array<{ freq: number; start: number }> = [
    { freq: 880,  start: 0 },
    { freq: 1047, start: 0.26 },
    { freq: 1319, start: 0.52 },
  ];

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.75;
  masterGain.connect(ctx.destination);

  for (const { freq, start } of beeps) {
    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(envGain);
    envGain.connect(masterGain);

    const t0 = ctx.currentTime + start;
    const dur = 0.18;

    // Smooth fade-in (5 ms) and fade-out (25 ms) to remove clicks
    envGain.gain.setValueAtTime(0, t0);
    envGain.gain.linearRampToValueAtTime(1, t0 + 0.005);
    envGain.gain.setValueAtTime(1, t0 + dur - 0.025);
    envGain.gain.linearRampToValueAtTime(0, t0 + dur);

    osc.start(t0);
    osc.stop(t0 + dur);
  }
}

// Fallback: singleton <audio> element
let audioFallback: HTMLAudioElement | null = null;

function getAudioFallback(): HTMLAudioElement {
  if (!audioFallback) {
    audioFallback = new Audio('/sounds/notification.mp3');
    audioFallback.preload = 'auto';
    audioFallback.volume = 0.8;
  }
  return audioFallback;
}

/**
 * Preload the fallback notification sound.
 * Safe to call during mount — triggers no sound.
 */
export function preloadNotificationSound(): void {
  if (typeof window === 'undefined') return;
  // Prime the Web Audio context so it's ready (avoids first-play latency)
  getAudioContext();
  // Also preload the mp3 fallback
  try { getAudioFallback(); } catch { /* ignore */ }
}

/**
 * Play the distinctive alarm sound.
 *
 * Tries the Web Audio API first (synthesised alarm, always distinctive).
 * Falls back to the /sounds/notification.mp3 file if Web Audio is blocked.
 */
export async function playNotificationSound(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await playWebAudioAlarm();
  } catch {
    // Web Audio failed (likely still suspended) — try the file fallback
    try {
      const audio = getAudioFallback();
      audio.currentTime = 0;
      await audio.play();
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        console.debug('[NotificationSound] Autoplay blocked; sound will play after first user gesture.');
      } else {
        console.warn('[NotificationSound] Failed to play sound:', err);
      }
    }
  }
}

/**
 * Test if notification sound can be played.
 */
export async function canPlayNotificationSound(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  } catch {
    return false;
  }
}

/**
 * Unlock audio on the first user interaction.
 *
 * Call this inside a click/touchstart handler to resume the AudioContext
 * so that subsequent programmatic play() calls succeed without a gesture.
 */
export function unlockNotificationSound(): void {
  if (typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => { /* ignore */ });
