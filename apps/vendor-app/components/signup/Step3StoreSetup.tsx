import { ThemedText } from "@/components/themed-text";
import { useConfirm } from "@/hooks/use-confirm";
import { useThemeColor } from "@/hooks/use-theme-color";
import { OpenHour } from "@/types/signup";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import MapView from "react-native-maps";
import Toast from "react-native-toast-message";

import { ImageUpload } from "./step3/ImageUpload";
import { LocationBlock } from "./step3/LocationBlock";
import { OpenHoursBlock } from "./step3/OpenHoursBlock";
import { StoreInfo } from "./step3/StoreInfo";
import { Step3Props } from "./step3/types";

export const Step3StoreSetup: React.FC<Step3Props> = ({ data, onChange }) => {
  const { confirm, ConfirmModal } = useConfirm();
  const mapRef = useRef<MapView | null>(null);
  const isMountedRef = useRef(true);

  const primary = useThemeColor({}, "brandPrimary");

  const [openHours, setOpenHours] = useState<Record<string, OpenHour>>(
    data.openHours || {},
  );
  const [isLocating, setIsLocating] = useState(false);

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

    const confirmed = await confirm({
      title: "Why We Need Your Location",
      message:
        "ASOOSE Vendor App needs access to your location to help you set your store address. Location is only used when you tap 'Use Current Location' and is not tracked in the background.",
      confirmText: "Continue",
      cancelText: "Cancel",
      type: "info",
    });
    if (!confirmed) return;
    try {
      setIsLocating(true);
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Toast.show({
          type: "error",
          text1: "Location disabled",
          text2: "Please enable location services.",
        });
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission required",
          text2: "Location access is needed to set your store location.",
        });
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
    } catch (err) {
      if (__DEV__) {
        console.warn("Location error:", err);
      }
      Toast.show({
        type: "error",
        text1: "Location error",
        text2: "Unable to get your current location.",
      });
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
        value={data.storeLogoUri}
        circular
        onPick={(uri, name) => {
          onChange("storeLogoUri", uri);
          onChange("storeLogoName", name);
        }}
      />

      <ImageUpload
        label="Store Banner"
        value={data.storeBannerUri}
        onPick={(uri, name) => {
          onChange("storeBannerUri", uri);
          onChange("storeBannerName", name);
        }}
      />

      {/* Location Block */}
      <View style={{ gap: 8 }}>
        <ThemedText type="subtitle">Store Location</ThemedText>
        <LocationBlock
          mapRef={mapRef}
          primary={primary}
          location={data.location}
          onUseCurrent={useCurrentLocation}
          onPick={(location) => onChange("location", location)}
          disabled={false}
          loading={isLocating}
        />
      </View>

      <OpenHoursBlock value={openHours} onChange={updateOpenHours} />

      <ConfirmModal />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
