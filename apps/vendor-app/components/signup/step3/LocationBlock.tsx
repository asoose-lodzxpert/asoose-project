import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  isWithinServiceBounds,
  getServiceAreaNames,
  DEFAULT_MAP_CENTER,
} from "@/constants/service-bounds";
import Toast from "react-native-toast-message";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

const _API = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

interface Props {
  mapRef?: React.RefObject<MapView | null>;
  primary: string;
  location?: { lat: number; lng: number };
  onUseCurrent: () => Promise<void>;
  onPick: (v: { lat: number; lng: number }) => void;
  disabled?: boolean;
  loading?: boolean;
}

export const LocationBlock: React.FC<Props> = ({
  mapRef,
  primary,
  location,
  onUseCurrent,
  onPick,
  disabled,
  loading = false,
}) => {
  const [fullMapVisible, setFullMapVisible] = useState(false);
  const [tempLocation, setTempLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [geocoding, setGeocoding] = useState(false);

  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");

  const safeLat = location?.lat ?? DEFAULT_MAP_CENTER.latitude;
  const safeLng = location?.lng ?? DEFAULT_MAP_CENTER.longitude;

  const region: Region = {
    latitude: safeLat,
    longitude: safeLng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const modalRegion: Region = {
    latitude: tempLocation?.lat ?? safeLat,
    longitude: tempLocation?.lng ?? safeLng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const handleUseCurrent = async () => {
    if (loading || disabled) return;
    await onUseCurrent();
  };

  const openFullMap = () => {
    if (disabled) return;
    setTempLocation(location ?? { lat: safeLat, lng: safeLng });
    setFullMapVisible(true);
  };

  const confirmFullMapLocation = () => {
    if (tempLocation) onPick(tempLocation);
    setFullMapVisible(false);
  };

  // Reverse-geocode whenever the saved coordinates change
  useEffect(() => {
    if (!location?.lat || !location?.lng) {
      setResolvedAddress("");
      return;
    }
    let cancelled = false;
    setGeocoding(true);
    fetch(
      `${_API}/maps/reverse-geocode?lat=${location.lat}&lng=${location.lng}`,
      {
        headers: {},
      },
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setResolvedAddress(data.address ?? "");
      })
      .catch(() => {
        if (!cancelled) setResolvedAddress("");
      })
      .finally(() => {
        if (!cancelled) setGeocoding(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location?.lat, location?.lng]);

  return (
    <View style={styles.container}>
      {/* â”€â”€ Location info card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: card, borderColor: border },
        ]}
      >
        {/* Address row */}
        <View style={styles.infoRow}>
          <IconSymbol name="location.fill" size={16} color={primary} />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.infoLabel, { color: textMuted }]}>
              Address
            </ThemedText>
            {geocoding ? (
              <ActivityIndicator
                size="small"
                color={textSecondary}
                style={{ alignSelf: "flex-start", marginTop: 2 }}
              />
            ) : (
              <ThemedText
                style={[styles.infoValue, { color: textSecondary }]}
                numberOfLines={2}
              >
                {resolvedAddress ||
                  (location ? "Resolving addressâ€¦" : "No location set")}
              </ThemedText>
            )}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: border }]} />

        {/* Coordinates row */}
        <View style={styles.coordsRow}>
          <View style={styles.coordItem}>
            <ThemedText style={[styles.infoLabel, { color: textMuted }]}>
              Latitude
            </ThemedText>
            <ThemedText style={[styles.coordValue, { color: textSecondary }]}>
              {location ? location.lat.toFixed(6) : "â€”"}
            </ThemedText>
          </View>
          <View style={[styles.coordSep, { backgroundColor: border }]} />
          <View style={styles.coordItem}>
            <ThemedText style={[styles.infoLabel, { color: textMuted }]}>
              Longitude
            </ThemedText>
            <ThemedText style={[styles.coordValue, { color: textSecondary }]}>
              {location ? location.lng.toFixed(6) : "â€”"}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* â”€â”€ Action buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.row, (loading || disabled) && styles.disabled]}
          onPress={handleUseCurrent}
          disabled={loading || disabled}
        >
          {loading ? (
            <ActivityIndicator size="small" color={primary} />
          ) : (
            <IconSymbol name="location.fill" size={18} color={primary} />
          )}
          <ThemedText>
            {loading ? "Fetching location..." : "Use current location"}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.row, disabled && styles.disabled]}
          onPress={openFullMap}
          disabled={disabled}
        >
          <IconSymbol name="map.fill" size={18} color={primary} />
          <ThemedText>Pick on map</ThemedText>
        </Pressable>
      </View>

      {/* â”€â”€ Small inline map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!disabled && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onMapReady={() => setMapReady(true)}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            if (!isWithinServiceBounds(latitude, longitude)) {
              Toast.show({
                type: "error",
                text1: "Outside service area",
                text2: `Please pick a location within ${getServiceAreaNames()}`,
                position: "top",
                topOffset: 40,
              });
              return;
            }
            onPick({ lat: latitude, lng: longitude });
          }}
        >
          {location && mapReady && (
            <Marker
              coordinate={{
                latitude: location.lat,
                longitude: location.lng,
              }}
            />
          )}
        </MapView>
      )}

      {/* â”€â”€ Full-screen map modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={fullMapVisible} animationType="slide">
        <View style={styles.fullMapContainer}>
          <MapView
            style={styles.fullMap}
            initialRegion={modalRegion}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              if (!isWithinServiceBounds(latitude, longitude)) {
                Toast.show({
                  type: "error",
                  text1: "Outside service area",
                  text2: `Please pick a location within ${getServiceAreaNames()}`,
                  position: "top",
                  topOffset: 40,
                });
                return;
              }
              setTempLocation({ lat: latitude, lng: longitude });
            }}
          >
            {tempLocation && (
              <Marker
                coordinate={{
                  latitude: tempLocation.lat,
                  longitude: tempLocation.lng,
                }}
              />
            )}
          </MapView>

          <Pressable
            style={[styles.confirmButton, { backgroundColor: brandPrimary }]}
            onPress={confirmFullMapLocation}
          >
            <ThemedText style={[styles.confirmText, { color: textOnPrimary }]}>
              Confirm Location
            </ThemedText>
          </Pressable>

          <Pressable
            style={styles.closeButton}
            onPress={() => setFullMapVisible(false)}
          >
            <IconSymbol name="xmark" size={24} color={textOnPrimary} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  coordItem: {
    flex: 1,
  },
  coordSep: {
    width: 1,
    height: 32,
    marginHorizontal: 12,
  },
  coordValue: {
    fontSize: 13,
  },
  actions: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  map: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginTop: 4,
  },
  fullMapContainer: {
    flex: 1,
  },
  fullMap: {
    flex: 1,
  },
  confirmButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  confirmText: {
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
  },
});
