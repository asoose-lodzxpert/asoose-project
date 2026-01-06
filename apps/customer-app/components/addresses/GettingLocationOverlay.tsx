import React from "react";
import { View, StyleSheet, Animated } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";

export function GettingLocationOverlay({
  scaleAnim,
}: {
  scaleAnim: Animated.Value;
}) {
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Animated.View
        style={[styles.overlayContent, { transform: [{ scale: scaleAnim }] }]}
      >
        <IconSymbol name="navigation" size={60} color="#1a73e8" />
        <ThemedText style={styles.overlayText}>Getting location...</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  overlayContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlayText: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "600",
    color: "#1a73e8",
  },
});
