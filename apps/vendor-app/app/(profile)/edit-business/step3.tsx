import React, { useRef, useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import { getBusinessDetails } from "@/services/business-details.service";
import { updateStoreDetails } from "@/services/business.service";
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
  const [storeData, setStoreData] = useState<SignupStep3Data | null>(null);
  const [openHours, setOpenHours] = useState<Record<string, OpenHour>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const details = await getBusinessDetails();
        if (mounted && details?.step3) {
          setStoreData({
            storeName: details.step3.storeName || "",
            storeDescription: details.step3.storeDescription || "",
            storeLogo: details.step3.storeLogo || "",
            storeBanner: details.step3.storeBanner || "",
            location: details.step3.location || { lat: 6.5244, lng: 3.3792 },
            openHours: details.step3.openHours || {},
          });
          setOpenHours(details.step3.openHours || {});
        }
      } catch (err) {
        Toast.show({ type: "error", text1: "Failed to load store details" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** Update store data */
  const handleChange = <K extends keyof SignupStep3Data>(
    key: K,
    value: SignupStep3Data[K]
  ) => {
    setStoreData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  /** Update open hours */
  const updateOpenHours = (next: Record<string, OpenHour>) => {
    setOpenHours(next);
    handleChange("openHours", next);
  };
  const handleSave = async () => {
    if (!storeData) return;
    setSaving(true);
    try {
      await updateStoreDetails({
        storeName: storeData.storeName,
        storeDescription: storeData.storeDescription,
        storeLogo: storeData.storeLogo,
        storeBanner: storeData.storeBanner,
        location: storeData.location,
        openHours: storeData.openHours,
      });
      Toast.show({ type: "success", text1: "Store details updated" });
      router.back();
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to update store details" });
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={primary} />
        <ThemedText type="subtitle">Loading store details...</ThemedText>
      </View>
    );
  }

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

        <StoreInfo data={storeData!} onChange={handleChange} />

        {/* ================= Images ================= */}
        <ThemedText type="subtitle">Images</ThemedText>
        <ImageUpload
          label="Store Logo"
          value={storeData?.storeLogo || ""}
          circular
          onPick={(v) => handleChange("storeLogo", v)}
        />
        <ImageUpload
          label="Store Banner"
          value={storeData?.storeBanner || ""}
          onPick={(v) => handleChange("storeBanner", v)}
        />

        {/* ================= Location ================= */}
        <ThemedText type="subtitle">Location</ThemedText>
        <LocationBlock
          mapRef={mapRef}
          primary={primary}
          location={storeData?.location || { lat: 6.5244, lng: 3.3792 }}
          onUseCurrent={useCurrentLocation}
          onPick={(v) => handleChange("location", v)}
        />

        {/* ================= Open Hours ================= */}
        <ThemedText type="subtitle">Open Hours</ThemedText>
        <OpenHoursBlock value={openHours} onChange={updateOpenHours} />

        <Pressable
          style={{
            marginTop: 24,
            backgroundColor: primary,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            opacity: saving ? 0.7 : 1,
          }}
          onPress={handleSave}
          disabled={saving}
        >
          <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
            {saving ? "Saving..." : "Save changes"}
          </ThemedText>
        </Pressable>
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
