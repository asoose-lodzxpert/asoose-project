import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ToastConfig, BaseToastProps } from "react-native-toast-message";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";

/**
 * A reusable internal component to keep the toast styles consistent
 */
const CustomToastPill = ({
  text1,
  text2,
  type = "info",
}: BaseToastProps & { type?: "success" | "error" | "info" | "warning" }) => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme as keyof typeof Colors];

  const getStatusConfig = () => {
    switch (type) {
      case "success":
        return { color: colors.statusSuccess, icon: "checkmark.circle.fill" };
      case "error":
        return { color: colors.statusError, icon: "xmark.circle.fill" };
      case "warning":
        return {
          color: colors.statusPending,
          icon: "exclamationmark.triangle.fill",
        };
      default:
        return { color: colors.brandPrimary, icon: "info.circle.fill" };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.toastWrapper,
        {
          backgroundColor: colors.surfaceCard,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: config.color + "15" }]}
      >
        <IconSymbol name={config.icon as any} size={20} color={config.color} />
      </View>

      <View style={styles.contentContainer}>
        {text1 && (
          <ThemedText type="defaultSemiBold" style={styles.text1}>
            {text1}
          </ThemedText>
        )}
        {text2 && (
          <ThemedText style={[styles.text2, { color: colors.textSecondary }]}>
            {text2}
          </ThemedText>
        )}
      </View>
    </View>
  );
};

export const toastConfig: ToastConfig = {
  success: (props) => <CustomToastPill {...props} type="success" />,
  error: (props) => <CustomToastPill {...props} type="error" />,
  info: (props) => <CustomToastPill {...props} type="info" />,
  warning: (props) => <CustomToastPill {...props} type="warning" />,
};

const styles = StyleSheet.create({
  toastWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  text1: {
    fontSize: 14,
    lineHeight: 18,
  },
  text2: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 2,
  },
});
