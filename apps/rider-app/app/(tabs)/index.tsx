import React, { useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import BottomOverlay from "@/components/delivery/BottomOverlay";
import FloatingHeader from "@/components/delivery/FloatingHeader";
import MapCanvas, { MapCanvasHandle } from "@/components/delivery/MapCanvas";
import { ConnectionStatusIndicator } from "@/components/ConnectionStatusIndicator";
import { useConfirm } from "@/hooks/use-confirm";

export default function HomeScreen() {
  const background = useThemeColor({}, "surfaceBackground");
  const mapRef = useRef<MapCanvasHandle>(null);
  const { ConfirmModal } = useConfirm();

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

      {/* Connection Status Indicator */}
      <View style={styles.statusIndicator}>
        <ConnectionStatusIndicator />
      </View>

      {/* Floating header */}
      <FloatingHeader />

      {/* Bottom overlay pinned to bottom */}
      <View style={styles.bottomOverlay}>
        <BottomOverlay
          onAnimateToPickup={() => mapRef.current?.animateToPickup()}
          onAnimateToDropoff={() => mapRef.current?.animateToDropoff()}
        />
      </View>
      <ConfirmModal />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
