import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

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

  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const brandPrimary = useThemeColor({}, "brandPrimary");

  const safeLat = location?.lat ?? 37.78825;
  const safeLng = location?.lng ?? -122.4324;

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

  return (
    <View>
      <ThemedText>Store Location</ThemedText>

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
        <ThemedText>View full map</ThemedText>
      </Pressable>

      {/* Small inline map */}
      {!disabled && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onMapReady={() => setMapReady(true)}
          onPress={(e) =>
            onPick({
              lat: e.nativeEvent.coordinate.latitude,
              lng: e.nativeEvent.coordinate.longitude,
            })
          }
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

      {/* Full screen map modal */}
      <Modal visible={fullMapVisible} animationType="slide">
        <View style={styles.fullMapContainer}>
          <MapView
            style={styles.fullMap}
            initialRegion={modalRegion}
            onPress={(e) =>
              setTempLocation({
                lat: e.nativeEvent.coordinate.latitude,
                lng: e.nativeEvent.coordinate.longitude,
              })
            }
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
    marginTop: 8,
  },
  fullMapContainer: {
    flex: 1,
  },
  fullMap: {
    flex: 1, // safer than Dimensions
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
