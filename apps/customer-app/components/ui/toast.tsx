import { createContext, useContext, useState, ReactNode } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";

export type ToastOptions = {
  title?: string;
  message: string;
  variant?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
};

const ToastContext = createContext<{
  showToast: (options: ToastOptions) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.showToast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const showToast = (options: ToastOptions) => {
    setToast(options);
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        setToast(null);
        options.onClose?.();
      });
    }, options.duration || 2500);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && toast && (
        <Animated.View
          style={[
            styles.toast,
            styles[toast.variant || "info"],
            { opacity: fadeAnim },
          ]}
        >
          {toast.title && <Text style={styles.title}>{toast.title}</Text>}
          <Text style={styles.message}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// Helper for direct import usage
export function toast(options: ToastOptions) {
  // This is a placeholder for direct imperative usage.
  // In your app, use the useToast() hook or context for best results.
  // You can implement a global event emitter or singleton pattern if needed.
  console.warn(
    "[Toast] Direct usage is not implemented. Use <ToastProvider> and useToast()."
  );
}

const { width } = Dimensions.get("window");
const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 60,
    left: width * 0.1,
    width: width * 0.8,
    padding: 16,
    borderRadius: 10,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  title: {
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 2,
    color: "#fff",
  },
  message: {
    color: "#fff",
    fontSize: 13,
  },
  success: {
    backgroundColor: "#22c55e",
  },
  error: {
    backgroundColor: "#ef4444",
  },
  warning: {
    backgroundColor: "#f59e42",
  },
  info: {
    backgroundColor: "#2563eb",
  },
});
