import { registerRootComponent } from "expo";
import * as Notifications from "expo-notifications";

import App from "./App";

// Register a background notification task handler (Android 12+ safe)
// This is a NO-OP handler that prevents any background service violations
// We ONLY handle notifications when the app is in the foreground
// This prevents BackgroundServiceStartNotAllowedException on Android 12+
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
