import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  BaseToast,
  ErrorToast,
  InfoToast,
  SuccessToast,
  ToastConfig,
} from "react-native-toast-message";

/**
 * Custom themed toast component that uses the app's theme colors
 */
export const toastConfig: ToastConfig = {
  success: (props) => {
    const colorScheme = useColorScheme() ?? "light";
    const colors = Colors[colorScheme as keyof typeof Colors];

    return (
      <SuccessToast
        {...props}
        style={[
          styles.toast,
          {
            borderLeftColor: colors.statusSuccess,
            backgroundColor: colors.surfaceCard,
          },
        ]}
        contentContainerStyle={styles.contentContainer}
        text1Style={[
          styles.text1,
          {
            color: colors.textPrimary,
          },
        ]}
        text2Style={[
          styles.text2,
          {
            color: colors.textSecondary,
          },
        ]}
        text1NumberOfLines={2}
        text2NumberOfLines={2}
      />
    );
  },

  error: (props) => {
    const colorScheme = useColorScheme() ?? "light";
    const colors = Colors[colorScheme as keyof typeof Colors];

    return (
      <ErrorToast
        {...props}
        style={[
          styles.toast,
          {
            borderLeftColor: colors.statusError,
            backgroundColor: colors.surfaceCard,
          },
        ]}
        contentContainerStyle={styles.contentContainer}
        text1Style={[
          styles.text1,
          {
            color: colors.textPrimary,
          },
        ]}
        text2Style={[
          styles.text2,
          {
            color: colors.textSecondary,
          },
        ]}
        text1NumberOfLines={2}
        text2NumberOfLines={2}
      />
    );
  },

  info: (props) => {
    const colorScheme = useColorScheme() ?? "light";
    const colors = Colors[colorScheme as keyof typeof Colors];

    return (
      <InfoToast
        {...props}
        style={[
          styles.toast,
          {
            borderLeftColor: colors.brandPrimary,
            backgroundColor: colors.surfaceCard,
          },
        ]}
        contentContainerStyle={styles.contentContainer}
        text1Style={[
          styles.text1,
          {
            color: colors.textPrimary,
          },
        ]}
        text2Style={[
          styles.text2,
          {
            color: colors.textSecondary,
          },
        ]}
        text1NumberOfLines={2}
        text2NumberOfLines={2}
      />
    );
  },

  warning: (props) => {
    const colorScheme = useColorScheme() ?? "light";
    const colors = Colors[colorScheme as keyof typeof Colors];

    return (
      <BaseToast
        {...props}
        style={[
          styles.toast,
          {
            borderLeftColor: colors.statusPending,
            backgroundColor: colors.surfaceCard,
          },
        ]}
        contentContainerStyle={styles.contentContainer}
        text1Style={[
          styles.text1,
          {
            color: colors.textPrimary,
          },
        ]}
        text2Style={[
          styles.text2,
          {
            color: colors.textSecondary,
          },
        ]}
        text1NumberOfLines={2}
        text2NumberOfLines={2}
      />
    );
  },
};

const styles = StyleSheet.create({
  toast: {
    borderLeftWidth: 5,
    borderRadius: 8,
    height: undefined,
    minHeight: 60,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentContainer: {
    paddingHorizontal: 15,
  },
  text1: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  text2: {
    fontSize: 13,
    fontWeight: "400",
  },
});
