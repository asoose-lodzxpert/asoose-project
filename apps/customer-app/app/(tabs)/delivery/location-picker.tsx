import { View, Pressable, ActivityIndicator } from "react-native";
import { useEffect, useRef, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AddressSearchInput } from "@/components/location/AddressSearchInput";
import { AddressResultsList } from "@/components/location/AddressResultsList";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { useSendPackage } from "@/context/SendPackageContext";
import { resolveAddress } from "@/lib/reverse-address";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "@/components/themed-view";

export default function LocationPickerScreen() {
  const { type } = useLocalSearchParams<{ type: "pickup" | "delivery" }>();
  const { setPickup, setDropoff } = useSendPackage();

  const primary = useThemeColor({}, "brandPrimary");
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
    // Fetch place details from Google Places API and set the location
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY!;
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry&key=${key}`
        );

        const json = await res.json();
        const result = json.result;

        if (!result) {
          // fallback: just close
          router.back();
          return;
        }

        const coords = result.geometry?.location
          ? {
              latitude: result.geometry.location.lat,
              longitude: result.geometry.location.lng,
            }
          : { latitude: 0, longitude: 0 };

        const payload = {
          address: {
            id: placeId,
            label:
              result.name ?? result.formatted_address ?? "Selected location",
            fullAddress:
              result.formatted_address ?? result.name ?? "Selected location",
            coords,
          },
        };

        try {
          // eslint-disable-next-line no-console
          console.log("[LocationPicker] selectAutocomplete payload", payload);
        } catch {}

        type === "pickup" ? setPickup(payload) : setDropoff(payload);

        router.back();
      } catch (err) {
        try {
          // eslint-disable-next-line no-console
          console.log("[LocationPicker] selectAutocomplete error", err);
        } catch {}
        router.back();
      }
    })();
  }

  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Pressable
          onPress={router.back}
          style={{
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 6,
          }}
        >
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
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
          <View style={{ paddingVertical: 12 }}>
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
