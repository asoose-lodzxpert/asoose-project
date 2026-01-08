import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import * as Location from "expo-location";
import MapView from "react-native-maps";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { OpenHour, SignupStep3Data } from "@/types/signup";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ImageUpload } from "@/components/signup/step3/ImageUpload";
import { LocationBlock } from "@/components/signup/step3/LocationBlock";
import { OpenHoursBlock } from "@/components/signup/step3/OpenHoursBlock";
import { StoreInfo } from "@/components/signup/step3/StoreInfo";
import { ThemedView } from "@/components/themed-view";

export default function EditStoreDetailsScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const primary = useThemeColor({}, "brandPrimary");

  // Store data state
  const [storeData, setStoreData] = useState<SignupStep3Data>({
    storeName: "Asoose Shop",
    storeDescription: "Best shop in town",
    storeLogo: "",
    storeBanner: "",
    location: { lat: 6.5244, lng: 3.3792 },
    openHours: {},
  });

  // Open hours state
  const [openHours, setOpenHours] = useState<Record<string, OpenHour>>(
    storeData.openHours || {}
  );

  /** Update store data */
  const handleChange = <K extends keyof SignupStep3Data>(
    key: K,
    value: SignupStep3Data[K]
  ) => {
    setStoreData((prev) => ({ ...prev, [key]: value }));
  };

  /** Update open hours */
  const updateOpenHours = (next: Record<string, OpenHour>) => {
    setOpenHours(next);
    handleChange("openHours", next);
  };

  /** Use device current location */
  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const pos = await Location.getCurrentPositionAsync({});
    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

    handleChange("location", coords);

    mapRef.current?.animateToRegion({
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          gap: 20,
          paddingBottom: 32,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= Header ================= */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <IconSymbol name="chevron.left" size={24} color={primary} />
            <ThemedText type="defaultSemiBold" style={{ color: primary }}>
              Back
            </ThemedText>
          </Pressable>
        </View>

        <StoreInfo data={storeData} onChange={handleChange} />

        {/* ================= Images ================= */}
        <ThemedText type="subtitle">Images</ThemedText>
        <ImageUpload
          label="Store Logo"
          value={storeData.storeLogo}
          circular
          onPick={(v) => handleChange("storeLogo", v)}
        />
        <ImageUpload
          label="Store Banner"
          value={storeData.storeBanner}
          onPick={(v) => handleChange("storeBanner", v)}
        />

        {/* ================= Location ================= */}
        <ThemedText type="subtitle">Location</ThemedText>
        <LocationBlock
          mapRef={mapRef}
          primary={primary}
          location={storeData.location}
          onUseCurrent={useCurrentLocation}
          onPick={(v) => handleChange("location", v)}
        />

        {/* ================= Open Hours ================= */}
        <ThemedText type="subtitle">Open Hours</ThemedText>
        <OpenHoursBlock value={openHours} onChange={updateOpenHours} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
