"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getFirebaseMessaging, getToken, onMessage } from "@/lib/firebase";
import { toast } from "react-toastify";
import {
  playNotificationSound,
  preloadNotificationSound,
  unlockNotificationSound,
} from "@/lib/notification-sound";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

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

async function registerToken(token: string, accessToken: string) {
  try {
    await fetch(`${API_URL}/auth/user/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform: "web" }),
    });
  } catch (err) {
    console.warn("[Push] Failed to register token with backend:", err);
  }
}

/**
 * usePushNotifications
 *
 * Runs on every full page reload:
 *  1. Requests notification permission (browser only prompts when state is "default";
 *     silently proceeds if already "granted").
 *  2. Re-registers the FCM token with the backend every reload so the server
 *     always has a fresh token.
 *  3. Listens for foreground messages.
 */
export function usePushNotifications() {
  const { data: session, status } = useSession();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // Tracks within-session to avoid double-setup on React strict-mode double-invoke
  const setupDoneRef = useRef(false);

  // Forward service-worker "play sound" messages to the audio API
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PLAY_NOTIFICATION_SOUND") {
        playNotificationSound().catch(() => {});
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  const accessToken = (session as any)?.accessToken as string | undefined;

  useEffect(() => {
    // Wait for authentication
    if (status !== "authenticated" || !accessToken) return;
    // Browser must support notifications
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // Firebase must be configured
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.warn("[Push] Firebase env vars not set — skipping.");
      return;
    }
    // Don't double-run within the same page session
    if (setupDoneRef.current) return;
    setupDoneRef.current = true;

    let cancelled = false;

    const setup = async () => {
      try {
        preloadNotificationSound();

        // Helper to perform registration after permission is granted
        const proceedWithRegistration = async (perm: NotificationPermission) => {
          if (perm !== "granted" || cancelled) return;

          // 2. Register service worker
          const swReg = await navigator.serviceWorker.register(buildSwUrl(), {
            scope: "/",
          });
          await navigator.serviceWorker.ready; // wait for SW to be active
          console.log("[Push] Service worker registered");

          if (cancelled) return;

          // 3. Get FCM token — always on every full page reload
          const messaging = getFirebaseMessaging();
          if (!messaging) {
            console.warn("[Push] Firebase messaging not available");
            return;
          }

          const fcmToken = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swReg,
          });

          if (!fcmToken) {
            console.warn("[Push] No FCM token returned");
            return;
          }

          console.log("[Push] FCM token obtained, registering with backend...");

          if (cancelled) return;

          // 4. Always send token to backend on every reload (tokens can rotate)
          await registerToken(fcmToken, accessToken);
          console.log("[Push] Token registered with backend ✓");

          // 5. Foreground message handler
          if (unsubscribeRef.current) unsubscribeRef.current();
          unsubscribeRef.current = onMessage(messaging, (payload) => {
            const { title, body } = payload.notification ?? {};

            playNotificationSound().catch(() => {});

            toast.info(
              <div className="flex flex-col gap-1">
                <span className="font-bold text-sm">
                  {title || "Notification"}
                </span>
                {body && <span className="text-xs opacity-90">{body}</span>}
              </div>,
              {
                icon: <span>🔔</span>,
                position: "bottom-right",
              },
            );
          });
        };

        // 1. Request permission — shows dialog on first visit; silent thereafter
        if (Notification.permission === "granted") {
          await proceedWithRegistration("granted");
        } else if (Notification.permission === "default") {
          console.log("[Push] Permission is default — waiting for user gesture...");
          // Wait for the 'unlock' interaction which we already set up listeners for
        } else {
          console.warn("[Push] Permission denied previously.");
        }

        // Unlock audio AND request permission on first interaction (browser autoplay/push policy)
        const unlock = async () => {
          unlockNotificationSound();
          window.removeEventListener("click", unlock);
          window.removeEventListener("touchstart", unlock);

          if (Notification.permission === "default") {
            try {
              const perm = await Notification.requestPermission();
              console.log("[Push] Notification permission requested:", perm);
              if (perm === "granted") {
                await proceedWithRegistration(perm);
              }
            } catch (err) {
              console.error("[Push] Request permission error:", err);
            }
          }
        };
        window.addEventListener("click", unlock, { once: true });
        window.addEventListener("touchstart", unlock, { once: true });
      } catch (err) {
        console.error("[Push] Setup error:", err);
        // Allow retry on next reload
        setupDoneRef.current = false;
      }
    };

    setup();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [status, accessToken]);
}
