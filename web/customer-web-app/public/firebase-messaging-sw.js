// Firebase Messaging Service Worker
// Handles background push notifications delivered via FCM.
// This file must remain at the root (/firebase-messaging-sw.js) so the browser
// can register it with the correct scope.

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

// Config is injected at runtime by the registration call in usePushNotifications.
// We read it from the service-worker's own script URL query string.
const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

// Background message handler — shows a native browser notification when the
// tab is not in focus or is closed.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  const data = payload.data ?? {};

  self.registration.showNotification(title || "Asoose", {
    body: body || "",
    icon: "/logo.png",
    badge: "/logo.png",
    data,
  });
});

// Handle notification click — focus the app or open it.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) =>
          c.url.includes(self.location.origin),
        );
        if (existing) {
          existing.focus();
          existing.navigate(targetUrl);
        } else {
          clients.openWindow(targetUrl);
        }
      }),
  );
});
