import React, { useCallback } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

import Toast, { BaseToastProps } from "react-native-toast-message";
import { useThemeColor } from "@/hooks/use-theme-color";

export const useToast = () =>
  useCallback(
    ({
      message,
      variant = "info",
    }: {
      message: string;
      variant?: "success" | "error" | "info";
    }) => {
      Toast.show({
        type: variant,
        text1: message,
        position: "bottom",
        visibilityTime: 3000,
      });
    },
    [],
  );

type CustomToastProps = BaseToastProps & {
  toastType: "success" | "error" | "info";
};

function CustomToast({ text1, toastType }: CustomToastProps) {
  const background = useThemeColor(
    {},
    toastType === "success"
      ? "surfaceCard"
      : toastType === "error"
        ? "surfaceSubtle"
        : "surfaceBackground",
  );
  const color = useThemeColor({}, "textPrimary");
  return (
    <View style={[styles.toast, { backgroundColor: background }]}>
      <Text style={[styles.text, { color }]}>{text1}</Text>
    </View>
  );
}

export function toastConfig() {
  return {
    success: (props: BaseToastProps) => (
      <CustomToast {...props} toastType="success" />
    ),
    error: (props: BaseToastProps) => (
      <CustomToast {...props} toastType="error" />
    ),
    info: (props: BaseToastProps) => (
      <CustomToast {...props} toastType="info" />
    ),
  };
}

const styles = StyleSheet.create({
  toast: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default function ThemedToastProvider() {
  return <Toast config={toastConfig()} position="bottom" bottomOffset={60} />;
}
