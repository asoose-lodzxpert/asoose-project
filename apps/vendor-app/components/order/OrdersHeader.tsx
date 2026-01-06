import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";

export const OrdersHeader = () => {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Orders</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
});
