import { Modal, Pressable, StyleSheet, View } from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

import { useLocation } from "@/context/LocationContext";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "../themed-view";

export function LocationPickerModal() {
  const { pickerVisible, closePicker, setFromMap, useCurrentLocation } =
    useLocation();

  const primary = useThemeColor({}, "brandPrimary");

  const mapRef = useRef<MapView>(null);
  const [marker, setMarker] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  /* ---------------------------------- */
  /* Center map on current location     */
  /* ---------------------------------- */
  useEffect(() => {
    if (!pickerVisible) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setMarker(coords);

      // Smoothly move map
      mapRef.current?.animateToRegion(
        {
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    })();
  }, [pickerVisible]);

  function onMapPress(e: MapPressEvent) {
    setMarker(e.nativeEvent.coordinate);
  }

  return (
    <Modal visible={pickerVisible} animationType="slide">
      <ThemedView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={closePicker}>
            <IconSymbol name="chevron.left" size={22} color={primary} />
          </Pressable>
          <ThemedText type="subtitle">Select Location</ThemedText>
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          showsUserLocation
          onPress={onMapPress}
          initialRegion={{
            latitude: 6.5244,
            longitude: 3.3792,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {marker && <Marker coordinate={marker} />}
        </MapView>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: primary }]}
            disabled={!marker}
            onPress={() =>
              marker &&
              setFromMap({
                latitude: marker.latitude,
                longitude: marker.longitude,
                accuracy: 0,
                altitude: 0,
                altitudeAccuracy: 0,
                heading: 0,
                speed: 0,
              })
            }
          >
            <ThemedText style={styles.primaryText}>
              Use Selected Location
            </ThemedText>
          </Pressable>

          <Pressable style={styles.secondary} onPress={useCurrentLocation}>
            <IconSymbol name="navigation" size={18} color={primary} />
            <ThemedText style={{ color: primary }}>
              Use Current Location
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontWeight: "700",
    color: "#000",
  },
  secondary: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
