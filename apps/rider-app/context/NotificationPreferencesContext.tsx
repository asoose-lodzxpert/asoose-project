import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/services/notification-settings.service";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/config/notification-settings";
import type {
  NotificationSettings,
  UpdateNotificationSettingsDto,
} from "@/types/notification-settings";

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
      const result: NotificationSettings = await getNotificationSettings();
      if (result && typeof result === "object") {
        // Extract only boolean settings
        const booleanSettings: Record<string, boolean> = {};
        Object.keys(DEFAULT_NOTIFICATION_SETTINGS).forEach((key) => {
          if (typeof result[key as keyof NotificationSettings] === "boolean") {
            booleanSettings[key] = result[
              key as keyof NotificationSettings
            ] as boolean;
          }
        });
        setPreferences({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...booleanSettings,
        });
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
      await updateNotificationSettings(prefs as UpdateNotificationSettingsDto);
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
