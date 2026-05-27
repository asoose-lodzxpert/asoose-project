import React, { useRef } from "react";
import { ActivityIndicator, StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import BottomOverlay from "@/components/delivery/BottomOverlay";
import FloatingHeader from "@/components/delivery/FloatingHeader";
import MapCanvas, { MapCanvasHandle } from "@/components/delivery/MapCanvas";

export default function HomeScreen() {
  const background = useThemeColor({}, "surfaceBackground");
  const mapRef = useRef<MapCanvasHandle>(null);

  const loading = false;

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: background }]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: background }]}>
      {/* Map */}
      <MapCanvas ref={mapRef} />

      {/* Floating header */}
      <FloatingHeader />

      {/* Bottom overlay pinned to bottom */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.bottomOverlay}
        pointerEvents="box-none"
      >
        <BottomOverlay
          onAnimateToPickup={() => mapRef.current?.animateToPickup()}
          onAnimateToDropoff={() => mapRef.current?.animateToDropoff()}
        />
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
