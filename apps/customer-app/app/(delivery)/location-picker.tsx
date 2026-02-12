import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { AddressResultsList } from "@/components/location/AddressResultsList";
import { AddressSearchInput } from "@/components/location/AddressSearchInput";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useToast } from "@/components/ui/toast";
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

  const mapRef = useRef<MapView>(null);

  const toast = useToast();

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
        return;
      }

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
          accuracy: null,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        });

        setResolvedAddress(resolved?.address ?? null);
      } catch {
        setResolvedAddress(null);
      } finally {
        setResolvingAddress(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [coords]);

  /* ---------------------------------- */
  /* Confirm map selection */
  /* ---------------------------------- */
  function confirmMapLocation() {
    if (!coords || !resolvedAddress || !type) return;

    const payload = {
      address: {
        id: "map-selected",
        label: type === "pickup" ? "Pickup location" : "Delivery location",
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
  function selectAutocomplete(placeId: string) {
    (async () => {
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
            label: result.address,
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
      } catch {
        setSelectingLocation(false);
        toast({
          variant: "error",
          message: "Failed to select location. Please try again.",
        });
      }
    })();
  }

  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Pressable onPress={router.back}>
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
            <View style={{ padding: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color={primary} />
              <ThemedText style={{ marginTop: 8, color: muted }}>
                Resolving address...
              </ThemedText>
            </View>
          )}

          <AddressResultsList results={results} onSelect={selectAutocomplete} />
        </>
      ) : (
        <>
          {loadingMap || !coords ? (
            <ActivityIndicator
              style={{ flex: 1 }}
              size="large"
              color={primary}
            />
          ) : (
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
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

          {/* Footer */}
          <View style={{ paddingVertical: 12, gap: 6 }}>
            {/* Resolving state */}
            {resolvingAddress && (
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <ActivityIndicator size="small" color={primary} />
                <ThemedText style={{ color: textSecondary }}>
                  Resolving address…
                </ThemedText>
              </View>
            )}

            {!resolvingAddress && resolvedAddress && (
              <ThemedText numberOfLines={2} style={{ color: textSecondary }}>
                {resolvedAddress}
              </ThemedText>
            )}

            <Pressable
              onPress={confirmMapLocation}
              disabled={!resolvedAddress || resolvingAddress}
              style={{
                backgroundColor: primary,
                padding: 14,
                borderRadius: 14,
                alignItems: "center",
                opacity: !resolvedAddress || resolvingAddress ? 0.5 : 1,
              }}
            >
              {resolvingAddress ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <ThemedText style={{ color: "#FFF", fontWeight: "700" }}>
                  Use this location
                </ThemedText>
              )}
            </Pressable>
          </View>
        </>
      )}
    </ThemedView>
  );
}
