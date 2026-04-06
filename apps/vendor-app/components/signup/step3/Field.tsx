import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedText } from "@/components/themed-text";
import React from "react";
import { View, StyleSheet } from "react-native";

export const Field = ({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) => {
  const errorColor = useThemeColor({}, "statusError");

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold">
        {label} {required && <ThemedText style={{ color: errorColor }}>*</ThemedText>}
      </ThemedText>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
});
