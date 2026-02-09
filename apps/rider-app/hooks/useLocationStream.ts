import { useEffect, useState } from "react";
import { locationStreamService } from "@/services/location-stream.service";
import { AppState, AppStateStatus } from "react-native";

interface UseLocationStreamOptions {
  enabled: boolean; // Whether the rider is active/online
}

export function useLocationStream({ enabled }: UseLocationStreamOptions) {
  const [status, setStatus] = useState({
    isActive: false,
    isConnected: false,
    queueSize: 0,
  });

  useEffect(() => {
    if (enabled) {
      // Start location streaming
      locationStreamService.start();
    } else {
      // Stop location streaming
      locationStreamService.stop();
    }

    // Update status periodically
    const statusInterval = setInterval(() => {
      setStatus(locationStreamService.getStatus());
    }, 2000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [enabled]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active" && enabled) {
          // App came to foreground, resume streaming if enabled
          locationStreamService.start();
        } else if (nextAppState === "background" && !enabled) {
          // App went to background and rider is not active, stop streaming
          locationStreamService.stop();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [enabled]);

  return status;
}
