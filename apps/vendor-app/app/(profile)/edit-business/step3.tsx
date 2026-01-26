import { getBusinessDetails } from "@/services/business-details.service";
import { updateStoreDetails } from "@/services/business.service";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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
import { useThemeColor } from "@/hooks/use-theme-color";
import { OpenHour, SignupStep3Data } from "@/types/signup";

export default function EditStoreDetailsScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const isMountedRef = useRef(true);

  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const primary = useThemeColor({}, "brandPrimary");
  const borderColor = useThemeColor({}, "borderDefault");

  const [storeData, setStoreData] = useState<SignupStep3Data | null>(null);
  const [openHours, setOpenHours] = useState<Record<string, OpenHour>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      try {
        const details = await getBusinessDetails();
        if (isMountedRef.current && details?.step3) {
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
      } catch {
        Toast.show({ type: "error", text1: "Failed to load store details" });
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /** Update store data */
  const handleChange = <K extends keyof SignupStep3Data>(
    key: K,
    value: SignupStep3Data[K],
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
    } catch {
      Toast.show({ type: "error", text1: "Failed to update store details" });
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const useCurrentLocation = async () => {
    if (locating) return;

    try {
      setLocating(true);

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Toast.show({ type: "error", text1: "Location services are disabled" });
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show({ type: "error", text1: "Location permission denied" });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      if (!isMountedRef.current) return;

      handleChange("location", coords);

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
    } catch {
      Toast.show({ type: "error", text1: "Unable to get location" });
    } finally {
      if (isMountedRef.current) setLocating(false);
    }
  };

  if (loading || !storeData) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
            <View
              style={{
                width: 60,
                height: 20,
                borderRadius: 4,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
          </View>

          <View
            style={{
              width: 140,
              height: 24,
              borderRadius: 4,
              backgroundColor: borderColor,
              opacity: 0.3,
            }}
          />

          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            gap: 20,
            paddingBottom: 32,
            paddingHorizontal: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Store Info Skeleton */}
          <View
            style={{
              borderRadius: 14,
              padding: 16,
              gap: 12,
              backgroundColor: "transparent",
            }}
          >
            <View
              style={{
                width: 180,
                height: 20,
                borderRadius: 4,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
            <View style={{ gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ gap: 6 }}>
                  <View
                    style={{
                      width: 120,
                      height: 12,
                      borderRadius: 4,
                      backgroundColor: borderColor,
                      opacity: 0.3,
                    }}
                  />
                  <View
                    style={{
                      width: "80%",
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: borderColor,
                      opacity: 0.3,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Images skeleton */}
          <View style={{ gap: 8 }}>
            <View
              style={{
                width: "100%",
                height: 110,
                borderRadius: 12,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
            <View
              style={{
                width: "100%",
                height: 110,
                borderRadius: 12,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
          </View>

          {/* Location skeleton (map) */}
          <View>
            <View
              style={{
                width: "100%",
                height: 200,
                borderRadius: 12,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
          </View>

          {/* Open hours skeleton */}
          <View style={{ gap: 8 }}>
            <View
              style={{
                width: 140,
                height: 18,
                borderRadius: 4,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
            {["Mon", "Tue", "Wed"].map((d) => (
              <View
                key={d}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    width: "30%",
                    height: 14,
                    borderRadius: 4,
                    backgroundColor: borderColor,
                    opacity: 0.3,
                  }}
                />
                <View
                  style={{
                    width: "50%",
                    height: 14,
                    borderRadius: 4,
                    backgroundColor: borderColor,
                    opacity: 0.3,
                  }}
                />
              </View>
            ))}
          </View>

          {/* Save button skeleton */}
          <View
            style={{
              marginTop: 12,
              height: 50,
              borderRadius: 14,
              backgroundColor: borderColor,
              opacity: 0.3,
            }}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            gap: 20,
            paddingBottom: 100,
            paddingHorizontal: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            loading={locating}
            onUseCurrent={useCurrentLocation}
            onPick={(v) => handleChange("location", v)}
            // 👇 this is new
            // LocationBlock uses this to avoid marker/map race
            // and parent avoids animating until ready
            // (you added mapReady inside LocationBlock earlier)
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
      </KeyboardAvoidingView>
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
