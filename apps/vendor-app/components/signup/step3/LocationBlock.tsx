import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  mapRef: React.RefObject<MapView | null>;
  primary: string;
  location?: { lat: number; lng: number };
  onUseCurrent: () => Promise<void>;
  onPick: (v: { lat: number; lng: number }) => void;
}

export const LocationBlock: React.FC<Props> = ({
  mapRef,
  primary,
  location,
  onUseCurrent,
  onPick,
}) => {
  const [loading, setLoading] = useState(false);
  const [fullMapVisible, setFullMapVisible] = useState(false);
  const [tempLocation, setTempLocation] = useState(location);
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const brandPrimary = useThemeColor({}, "brandPrimary");

  const handleUseCurrent = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await onUseCurrent();
    } finally {
      setLoading(false);
    }
  };

  const openFullMap = () => {
    setTempLocation(location); // start at current location
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
        style={[styles.row, loading && styles.disabled]}
        onPress={handleUseCurrent}
        disabled={loading}
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

      <Pressable style={styles.row} onPress={openFullMap}>
        <IconSymbol name="map.fill" size={18} color={primary} />
        <ThemedText>View full map</ThemedText>
      </Pressable>

      {/* Small map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.lat ?? 37.78825,
          longitude: location?.lng ?? -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={(e) =>
          onPick({
            lat: e.nativeEvent.coordinate.latitude,
            lng: e.nativeEvent.coordinate.longitude,
          })
        }
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.lat,
              longitude: location.lng,
            }}
          />
        )}
      </MapView>

      {/* Full-screen map modal */}
      <Modal visible={fullMapVisible} animationType="slide">
        <View style={styles.fullMapContainer}>
          <MapView
            style={styles.fullMap}
            initialRegion={{
              latitude: tempLocation?.lat ?? 37.78825,
              longitude: tempLocation?.lng ?? -122.4324,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
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

          {/* Confirm button */}
          <Pressable
            style={[styles.confirmButton, { backgroundColor: brandPrimary }]}
            onPress={confirmFullMapLocation}
          >
            <ThemedText style={[styles.confirmText, { color: textOnPrimary }]}>
              Confirm Location
            </ThemedText>
          </Pressable>

          {/* Close button */}
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

const { width, height } = Dimensions.get("window");

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
    width,
    height,
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
