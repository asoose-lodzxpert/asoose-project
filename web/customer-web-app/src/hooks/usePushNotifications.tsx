"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getFirebaseMessaging, getToken, onMessage } from "@/lib/firebase";
import { toast } from "react-toastify";

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

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.warn(
        "[Push] Firebase env vars not configured — skipping push setup.",
      );
      return;
    }

    const accessToken = (session as any).accessToken as string;
    let cancelled = false;

    const setup = async () => {
      try {
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
  }, [status, session]);

  // Clean up token on sign-out
  useEffect(() => {
    if (status === "unauthenticated" && registeredTokenRef.current) {
      // Best-effort — no access token available after sign-out
      registeredTokenRef.current = null;
    }
  }, [status]);
}
