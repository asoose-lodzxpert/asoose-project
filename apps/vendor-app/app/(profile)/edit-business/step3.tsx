import { getBusinessDetails } from "@/services/business-details.service";
import { updateStoreDetails } from "@/services/business.service";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MapView from "react-native-maps";
import Toast from "react-native-toast-message";

import { ImageUpload } from "@/components/signup/step3/ImageUpload";
import { LocationBlock } from "@/components/signup/step3/LocationBlock";
import { OpenHoursBlock } from "@/components/signup/step3/OpenHoursBlock";
import { StoreInfo } from "@/components/signup/step3/StoreInfo";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useConfirm } from "@/hooks/use-confirm"; // Updated to use the hook
import { useThemeColor } from "@/hooks/use-theme-color";
import { OpenHour, SignupStep3Data } from "@/types/signup";

export default function EditStoreDetailsScreen() {
  const router = useRouter();
  const isMountedRef = useRef(true);
  const mapRef = useRef<MapView | null>(null);
  const { confirm, ConfirmModal } = useConfirm();

  const [locating, setLocating] = useState(false);
  const primary = useThemeColor({}, "brandPrimary");
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");

  const [storeData, setStoreData] = useState<SignupStep3Data | null>(null);
  const [openHours, setOpenHours] = useState<Record<string, OpenHour>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    loadStoreDetails();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadStoreDetails = async () => {
    try {
      const details = await getBusinessDetails();
      if (isMountedRef.current && details?.step3) {
        setStoreData({
          storeName: details.step3.storeName || "",
          storeDescription: details.step3.storeDescription || "",
          storeLogoUri: details.step3.storeLogoUri || "",
          storeBannerUri: details.step3.storeBannerUri || "",
          location: details.step3.location || { lat: 6.5244, lng: 3.3792 },
          openHours: details.step3.openHours || {},
        });
        setOpenHours(details.step3.openHours || {});
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to load store details" });
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleChange = <K extends keyof SignupStep3Data>(
    key: K,
    value: SignupStep3Data[K],
  ) => {
    setStoreData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateOpenHours = (next: Record<string, OpenHour>) => {
    setOpenHours(next);
    handleChange("openHours", next);
  };

  const handleSave = async () => {
    if (!storeData) return;
    setSaving(true);
    try {
      await updateStoreDetails(storeData);
      Toast.show({ type: "success", text1: "Store details updated" });
      router.back();
    } catch {
      Toast.show({ type: "error", text1: "Failed to update store details" });
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const useCurrentLocation = async () => {
    if (locating) return;

    const confirmed = await confirm({
      title: "Update Store Location",
      message:
        "Do you want to update your store location to your current location?",
      confirmText: "Update",
      type: "warning",
    });
    if (!confirmed) return;

    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show({ type: "error", text1: "Location permission denied" });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (isMountedRef.current) {
        handleChange("location", coords);
      }
    } catch {
      Toast.show({ type: "error", text1: "Unable to get location" });
    } finally {
      if (isMountedRef.current) setLocating(false);
    }
  };

  /**
   * Generates a Static Map URL.
   * This is the crash-proof alternative to MapView.
   */
  const getStaticMapUrl = (lat: number, lng: number) => {
    // You can replace this with your Google Maps API Key or a free service like Mapbox/Stadia
    // Using a placeholder style for demonstration
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=YOUR_GOOGLE_API_KEY`;
  };

  if (loading || !storeData) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="chevron.left" size={24} color={primary} />
              <ThemedText type="defaultSemiBold" style={{ color: primary }}>
                Back
              </ThemedText>
            </Pressable>
            <ThemedText type="subtitle">Edit Store</ThemedText>
            <View style={{ width: 60 }} />
          </View>

          <StoreInfo data={storeData} onChange={handleChange} />

          {/* Images */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Branding
          </ThemedText>
          <View style={styles.imageGrid}>
            <ImageUpload
              label="Store Logo"
              value={storeData.storeLogoUri}
              circular
              onPick={(v) => handleChange("storeLogoUri", v)}
            />
            <ImageUpload
              label="Store Banner"
              value={storeData.storeBannerUri}
              onPick={(v) => handleChange("storeBannerUri", v)}
            />
          </View>

          {/* Location Block */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Store Location
          </ThemedText>
          {storeData && (
            <LocationBlock
              mapRef={mapRef}
              primary={primary}
              location={storeData.location}
              onUseCurrent={useCurrentLocation}
              onPick={(location) => handleChange("location", location)}
              disabled={saving}
              loading={locating}
            />
          )}

          {/* Open Hours */}
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Operation Hours
          </ThemedText>
          <OpenHoursBlock value={openHours} onChange={updateOpenHours} />

          <Pressable
            style={[
              styles.saveBtn,
              { backgroundColor: primary, opacity: saving ? 0.7 : 1 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={textOnPrimary} />
            ) : (
              <ThemedText style={{ color: textOnPrimary, fontWeight: "700" }}>
                Save Changes
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmModal />
      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
    gap: 16,
  },
  header: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionTitle: {
    marginTop: 10,
  },
  imageGrid: {
    gap: 16,
  },
  locationContainer: {
    gap: 12,
  },
  mapPlaceholder: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  staticMap: {
    width: "100%",
    height: "100%",
  },
  coordinateBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  coordinateText: {
    color: "#fff",
    fontSize: 10,
  },
  locationBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtn: {
    marginTop: 20,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
