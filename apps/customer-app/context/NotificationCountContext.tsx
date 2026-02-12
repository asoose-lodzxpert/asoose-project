import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { fetchUnreadCount } from "../services/user-notifications.service";

const NotificationCountContext = createContext<number>(0);

export function NotificationCountProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const result = await fetchUnreadCount();
        if (mounted && typeof result === "number") setCount(result);
        else if (mounted && result?.count != null) setCount(result.count);
      } catch {}
    }
    load();
    // Optionally poll every 30s
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <NotificationCountContext.Provider value={count}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useNotificationCount() {
  return useContext(NotificationCountContext);
}
