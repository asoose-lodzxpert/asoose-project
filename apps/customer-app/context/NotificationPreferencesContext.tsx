import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  fetchNotificationConfig,
  saveNotificationConfig,
} from "@/services/notification-config.service";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/config/notification-settings";
import type { NotificationConfig } from "@/types/notification-config";

interface NotificationPreferencesContextType {
  preferences: Record<string, boolean>;
  loading: boolean;
  updatePreferences: (prefs: Record<string, boolean>) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationPreferencesContext = createContext<
  NotificationPreferencesContextType | undefined
>(undefined);

export const NotificationPreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [loading, setLoading] = useState(true);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const result: NotificationConfig = await fetchNotificationConfig();
      if (result && typeof result === "object") {
        setPreferences({ ...DEFAULT_NOTIFICATION_SETTINGS, ...result });
      } else {
        setPreferences(DEFAULT_NOTIFICATION_SETTINGS);
      }
    } catch (e) {
      setPreferences(DEFAULT_NOTIFICATION_SETTINGS);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const updatePreferences = async (prefs: Record<string, boolean>) => {
    setLoading(true);
    try {
      await saveNotificationConfig(prefs as NotificationConfig);
      setPreferences(prefs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NotificationPreferencesContext.Provider
      value={{
        preferences,
        loading,
        updatePreferences,
        refresh: fetchPreferences,
      }}
    >
      {children}
    </NotificationPreferencesContext.Provider>
  );
};

export const useNotificationPreferences = () => {
  const ctx = useContext(NotificationPreferencesContext);
  if (!ctx)
    throw new Error(
      "useNotificationPreferences must be used within NotificationPreferencesProvider",
    );
  return ctx;
};
