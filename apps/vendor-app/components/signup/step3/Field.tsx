import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";

export const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View style={styles.container}>
    <ThemedText>{label}</ThemedText>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
});
