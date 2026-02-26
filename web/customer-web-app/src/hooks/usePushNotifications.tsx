"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getFirebaseMessaging, getToken, onMessage } from "@/lib/firebase";
import { toast } from "react-toastify";
import { 
  playNotificationSound, 
  preloadNotificationSound,
  unlockNotificationSound 
} from "@/lib/notification-sound";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

/**
 * Builds the service-worker URL with Firebase config embedded as query params
 * so the SW can initialize Firebase without needing a build step.
 */
function buildSwUrl(): string {
  const params = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

/**
 * Registers the FCM token with the backend.
 */
async function registerToken(
  token: string,
  accessToken: string,
): Promise<void> {
  await fetch(`${API_URL}/auth/user/push-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token, platform: "web" }),
  });
}

/**
 * Removes the FCM token from the backend (on sign-out / session end).
 */
async function unregisterToken(accessToken: string): Promise<void> {
  await fetch(`${API_URL}/auth/user/push-token`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * usePushNotifications
 *
 * - Requests notification permission when the user is authenticated.
 * - Registers the FCM token with the backend.
 * - Listens for foreground messages and shows them as toasts.
 * - Cleans up on sign-out.
 */
export function usePushNotifications() {
  const { data: session, status } = useSession();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const registeredTokenRef = useRef<string | null>(null);

  // Listen for service worker messages (e.g., play sound for background notifications)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
        playNotificationSound().catch((err) => {
          console.debug('[Push] Background sound playback skipped:', err);
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Use the primitive accessToken string, NOT the session object reference,
  // to avoid re-running push setup on every session refetch.
  const accessToken = (session as any)?.accessToken as string | undefined;

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.warn(
        "[Push] Firebase env vars not configured — skipping push setup.",
      );
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        // Preload notification sound
        preloadNotificationSound();
        
        // Unlock audio on first user interaction (required by browser autoplay policies)
        const unlockOnInteraction = () => {
          unlockNotificationSound();
          // Remove listeners after first interaction
          window.removeEventListener('click', unlockOnInteraction);
          window.removeEventListener('touchstart', unlockOnInteraction);
        };
        window.addEventListener('click', unlockOnInteraction, { once: true });
        window.addEventListener('touchstart', unlockOnInteraction, { once: true });

        // 1. Request permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // 2. Register service worker with config embedded in SW URL
        const swReg = await navigator.serviceWorker.register(buildSwUrl(), {
          scope: "/",
        });

        if (cancelled) return;

        // 3. Get FCM token
        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        const fcmToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (!fcmToken || cancelled) return;

        // 4. Register with backend (only if token changed)
        if (fcmToken !== registeredTokenRef.current) {
          await registerToken(fcmToken, accessToken);
          registeredTokenRef.current = fcmToken;
        }

        // 5. Handle foreground messages as toasts
        unsubscribeRef.current = onMessage(messaging, (payload) => {
          const { title, body } = payload.notification ?? {};
          const isDark = document.documentElement.classList.contains("dark");

          // Play notification sound
          playNotificationSound().catch((err) => {
            console.debug('[Push] Sound playback skipped:', err);
          });

          toast.info(
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm">{title}</span>
              {body && <span className="text-xs opacity-90">{body}</span>}
            </div>,
            {
              icon: <span>🔔</span>,
              position: "bottom-right",
              theme: isDark ? "dark" : "light",
            },
          );
        });
      } catch (err) {
        console.error("[Push] Setup error:", err);
      }
    };

    setup();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [status, accessToken]);

  // Clean up token on sign-out
  useEffect(() => {
    if (status === "unauthenticated" && registeredTokenRef.current) {
      // Best-effort — no access token available after sign-out
      registeredTokenRef.current = null;
    }
  }, [status]);
}
