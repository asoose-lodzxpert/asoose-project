import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (avoid duplicate app error in dev hot-reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Returns the Messaging instance. Must be called only in browser context.
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === "undefined") return null;
  try {
    return getMessaging(app);
  } catch {
    return null;
  }
}

export { getToken, onMessage };
