import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Alert } from "react-native";
import * as Location from "expo-location";
import MapView from "react-native-maps";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { OpenHour } from "@/types/signup";

import { ImageUpload } from "./step3/ImageUpload";
import { LocationBlock } from "./step3/LocationBlock";
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

      <LocationBlock
        mapRef={mapRef}
        primary={primary}
        location={data.location}
        loading={isLocating}
        onUseCurrent={useCurrentLocation}
        onPick={(v) => onChange("location", v)}
        disabled={false}
        // map readiness is handled inside LocationBlock now
      />

      <OpenHoursBlock value={openHours} onChange={updateOpenHours} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
