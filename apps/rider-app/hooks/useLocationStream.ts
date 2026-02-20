import { useEffect, useRef, useState } from "react";
import {
  locationStreamService,
  setRoleGetter,
} from "@/services/location-stream.service";
import { AppState, AppStateStatus } from "react-native";

interface UseLocationStreamOptions {
  enabled: boolean; // Whether the rider is active/online
  role?: string; // 'RIDER' or 'DRIVER' — included in every location update
}

export function useLocationStream({ enabled, role }: UseLocationStreamOptions) {
  const [status, setStatus] = useState({
    isActive: false,
    isConnected: false,
    queueSize: 0,
  });

  // Keep a ref so the getter closure always reads the latest role without re-registering
  const roleRef = useRef(role ?? "RIDER");
  useEffect(() => {
    roleRef.current = role ?? "RIDER";
  }, [role]);

  // Register the getter once — it reads roleRef.current at call time
  useEffect(() => {
    setRoleGetter(() => roleRef.current);
  }, []);

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
