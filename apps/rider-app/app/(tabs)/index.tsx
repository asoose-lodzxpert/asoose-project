import React, { useRef } from "react";
import { StyleSheet, ActivityIndicator, View } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import MapCanvas, { MapCanvasHandle } from "@/components/delivery/MapCanvas";
import FloatingHeader from "@/components/delivery/FloatingHeader";
import BottomOverlay from "@/components/delivery/BottomOverlay";

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
      <View style={styles.bottomOverlay}>
        <BottomOverlay
          onAnimateToPickup={() => mapRef.current?.animateToPickup()}
          onAnimateToDropoff={() => mapRef.current?.animateToDropoff()}
        />
      </View>
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

// check this files and make sure there are connected to the data base and instead for polling to receive ride requests and updates, use SSE to receive the updates from the database, and also make sure the ride re-matching after the wait time is implemented and make sure it is production ready
