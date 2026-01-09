import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../services/notifications.service";
import { DEFAULT_NOTIFICATION_SETTINGS } from "../config/notification-settings";

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
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [loading, setLoading] = useState(true);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await getNotificationPreferences();
      if (res && typeof res === "object") {
        setPreferences({ ...DEFAULT_NOTIFICATION_SETTINGS, ...res });
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
      await updateNotificationPreferences(prefs);
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
      "useNotificationPreferences must be used within NotificationPreferencesProvider"
    );
  return ctx;
};
