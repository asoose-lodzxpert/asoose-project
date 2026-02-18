import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import Toast from "react-native-toast-message";

import { AddressResultsList } from "@/components/location/AddressResultsList";
import { AddressSearchInput } from "@/components/location/AddressSearchInput";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSendPackage } from "@/context/SendPackageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { request } from "@/lib/authFetch";
import { resolveAddress } from "@/lib/reverse-address";

export default function LocationPickerScreen() {
  const { type } = useLocalSearchParams<{ type: "pickup" | "delivery" }>();
  const { setPickup, setDropoff } = useSendPackage();

  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const muted = useThemeColor({}, "textMuted");
  const surface = useThemeColor({}, "surfaceBackground");

  const mapRef = useRef<MapView>(null);

  const [query, setQuery] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);

  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState(false);

  const { results, loading } = useAddressSearch(query, coords ?? undefined);

  /* ---------------------------------- */
  /* Load current location when map opens */
  /* ---------------------------------- */
  useEffect(() => {
    if (!showMap) return;

    (async () => {
      setLoadingMap(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLoadingMap(false);
        Toast.show({
          type: "error",
          text1: "Permission Denied",
          text2: "Location permission is required to use the map.",
        });
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({});
        const c = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };

        setCoords(c);
        setLoadingMap(false);

        requestAnimationFrame(() => {
          mapRef.current?.animateCamera({
            center: c,
            zoom: 16,
          });
        });
      } catch (err) {
        setLoadingMap(false);
      }
    })();
  }, [showMap]);

  /* ---------------------------------- */
  /* Resolve address when coords change */
  /* ---------------------------------- */
  useEffect(() => {
    if (!coords) return;

    setResolvedAddress(null);
    setResolvingAddress(true);

    const timeout = setTimeout(async () => {
      try {
        const resolved = await resolveAddress({
          ...coords,
          accuracy: 0,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          speed: 0,
          timestamp: Date.now(),
        } as Location.LocationObjectCoords);

        setResolvedAddress(resolved?.address ?? null);
      } catch (err) {
        setResolvedAddress(null);
      } finally {
        setResolvingAddress(false);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [coords]);

  /* ---------------------------------- */
  /* Confirm map selection */
  /* ---------------------------------- */
  function confirmMapLocation() {
    if (!coords || !resolvedAddress || !type) return;

    const payload = {
      address: {
        id: `map-${Date.now()}`,
        label: resolvedAddress.split(",")[0],
        fullAddress: resolvedAddress,
        coords,
      },
    };

    type === "pickup" ? setPickup(payload) : setDropoff(payload);
    router.back();
  }

  /* ---------------------------------- */
  /* Select autocomplete result */
  /* ---------------------------------- */
  async function selectAutocomplete(placeId: string) {
    try {
      setSelectingLocation(true);
      const result = await request(`maps/geocode?placeId=${placeId}`);

      if (!result) {
        setSelectingLocation(false);
        return;
      }

      const payload = {
        address: {
          id: placeId,
          label: result.address.split(",")[0],
          fullAddress: result.address,
          coords: {
            latitude: result.lat,
            longitude: result.lng,
          },
        },
      };

      type === "pickup" ? setPickup(payload) : setDropoff(payload);
      setSelectingLocation(false);
      router.back();
    } catch (err) {
      setSelectingLocation(false);
      Toast.show({
        type: "error",
        text1: "Selection Failed",
        text2: "Failed to select location. Please try again.",
      });
    }
  }

  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={router.back} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="subtitle">
          {type === "pickup" ? "Pickup location" : "Delivery location"}
        </ThemedText>
      </View>

      {!showMap ? (
        <>
          <AddressSearchInput
            value={query}
            onChange={setQuery}
            loading={loading}
            onMapPress={() => setShowMap(true)}
          />

          {selectingLocation && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={primary} />
              <ThemedText style={{ marginTop: 8, color: muted }}>
                Resolving location...
              </ThemedText>
            </View>
          )}

          <AddressResultsList results={results} onSelect={selectAutocomplete} />
        </>
      ) : (
        <View style={{ flex: 1 }}>
          {loadingMap || !coords ? (
            <ActivityIndicator
              style={{ flex: 1 }}
              size="large"
              color={primary}
            />
          ) : (
            <MapView
              ref={mapRef}
              style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}
              initialRegion={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={(e) => setCoords(e.nativeEvent.coordinate)}
            >
              <Marker
                coordinate={coords}
                draggable
                onDragEnd={(e) => setCoords(e.nativeEvent.coordinate)}
              />
            </MapView>
          )}

          {/* Footer Card */}
          <View style={styles.footer}>
            {resolvingAddress ? (
              <View style={styles.resolveRow}>
                <ActivityIndicator size="small" color={primary} />
                <ThemedText style={{ color: textSecondary }}>
                  Resolving address…
                </ThemedText>
              </View>
            ) : (
              <ThemedText
                numberOfLines={2}
                style={[styles.addressText, { color: textSecondary }]}
              >
                {resolvedAddress || "Select a point on the map"}
              </ThemedText>
            )}

            <Pressable
              onPress={confirmMapLocation}
              disabled={!resolvedAddress || resolvingAddress}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: primary,
                  opacity: !resolvedAddress || resolvingAddress ? 0.5 : 1,
                },
              ]}
            >
              <ThemedText style={styles.btnText}>Use this location</ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setShowMap(false)}
              style={styles.cancelBtn}
            >
              <ThemedText style={{ color: primary }}>
                Go back to search
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}
      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  loadingOverlay: {
    padding: 16,
    alignItems: "center",
  },
  footer: {
    paddingVertical: 16,
    gap: 12,
  },
  resolveRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    height: 40,
  },
  addressText: {
    fontSize: 15,
    height: 40,
    lineHeight: 20,
  },
  confirmBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  btnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    alignItems: "center",
    padding: 8,
  },
});
