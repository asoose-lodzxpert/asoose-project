import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { useThemeColor } from "@/hooks/use-theme-color";
import { OpenHour } from "@/types/signup";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import MapView from "react-native-maps";

import { ImageUpload } from "./step3/ImageUpload";
import { OpenHoursBlock } from "./step3/OpenHoursBlock";
import { StoreInfo } from "./step3/StoreInfo";
import { Step3Props } from "./step3/types";

export const Step3StoreSetup: React.FC<Step3Props> = ({ data, onChange }) => {
  const mapRef = useRef<MapView | null>(null);
  const isMountedRef = useRef(true);

  const primary = useThemeColor({}, "brandPrimary");

  const [openHours, setOpenHours] = useState<Record<string, OpenHour>>(
    data.openHours || {},
  );
  const [isLocating, setIsLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateOpenHours = (next: Record<string, OpenHour>) => {
    setOpenHours(next);
    onChange("openHours", next);
  };

  const useCurrentLocation = async () => {
    if (isLocating) return;

    try {
      setIsLocating(true);

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert("Location disabled", "Please enable location services.");
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Location access is needed to set your store location.",
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };

      if (!isMountedRef.current) return;

      onChange("location", coords);

      if (mapReady && mapRef.current) {
        requestAnimationFrame(() => {
          mapRef.current?.animateToRegion({
            latitude: coords.lat,
            longitude: coords.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        });
      }
    } catch (err) {
      console.warn("Location error:", err);
      Alert.alert("Location error", "Unable to get your current location.");
    } finally {
      if (isMountedRef.current) setIsLocating(false);
    }
  };

  // Manual location input state
  const [manualLat, setManualLat] = useState(
    data.location?.lat?.toString() || "6.5244",
  );
  const [manualLng, setManualLng] = useState(
    data.location?.lng?.toString() || "3.3792",
  );

  // Update parent when manual input changes
  useEffect(() => {
    onChange("location", {
      lat: parseFloat(manualLat),
      lng: parseFloat(manualLng),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualLat, manualLng]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ gap: 20, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText type="title">Set up your store</ThemedText>
      <ThemedText type="subtitle">
        Customers will see this information
      </ThemedText>

      <StoreInfo data={data} onChange={onChange} />

      <ImageUpload
        label="Store Logo"
        value={data.storeLogo}
        circular
        onPick={(v) => onChange("storeLogo", v)}
      />

      <ImageUpload
        label="Store Banner"
        value={data.storeBanner}
        onPick={(v) => onChange("storeBanner", v)}
      />

      {/* Manual Location Input */}
      <View style={{ gap: 8 }}>
        <ThemedText type="subtitle">Store Location (manual entry)</ThemedText>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ marginBottom: 4 }}>Latitude</ThemedText>
            <ThemedInput
              value={manualLat}
              onChangeText={setManualLat}
              keyboardType="numeric"
              placeholder="Latitude"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ marginBottom: 4 }}>Longitude</ThemedText>
            <ThemedInput
              value={manualLng}
              onChangeText={setManualLng}
              keyboardType="numeric"
              placeholder="Longitude"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        <View style={{ marginTop: 8 }}>
          <Pressable
            style={{
              backgroundColor: primary,
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              opacity: isLocating ? 0.7 : 1,
            }}
            onPress={useCurrentLocation}
            disabled={isLocating}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
              {isLocating ? "Locating..." : "Use Current Location"}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <OpenHoursBlock value={openHours} onChange={updateOpenHours} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  // input: removed, now using ThemedInput
});
