import React, { useState, useCallback, useRef, useMemo } from "react";
import { API_BASE as API_URL } from "@/constants/static-config";
import {
  isWithinServiceBounds,
  getServiceAreaNames,
  DEFAULT_MAP_CENTER,
} from "@/constants/service-bounds";
import Toast from "react-native-toast-message";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useMapStyle } from "@/hooks/useMapStyle";
import { useLocation } from "@/context/LocationContext";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "../themed-view";

export function LocationPickerModal() {
  const {
    pickerVisible,
    closePicker,
    setFromMap,
    useCurrentLocation,
    location,
  } = useLocation();
  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");
  const success = useThemeColor({}, "statusSuccess");
  const [searchQuery, setSearchQuery] = useState("");

  const coords = useMemo(() => {
    if (location?.coords) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    }
    return undefined;
  }, [location?.coords?.latitude, location?.coords?.longitude]);

  const { results: predictions, loading: searching } = useAddressSearch(
    searchQuery,
    coords,
  );
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [reverseAddress, setReverseAddress] = useState("");
  const [confirming, setConfirming] = useState(false);
  const mapRef = useRef<MapView>(null);
  const mapStyle = useMapStyle();
  // Removed manual search logic, now using useAddressSearch

  // Reverse geocode for map modal
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `${API_URL}/maps/reverse-geocode?lat=${lat}&lng=${lng}`,
      );
      const { address } = await res.json();
      setReverseAddress(address || "Selected point");
    } catch {
      setReverseAddress("Selected point");
    }
  }, []); // API_URL is a constant, safe to omit

  const handleMapPress = useCallback(
    (e: any) => {
      Keyboard.dismiss();
      const { coordinate } = e.nativeEvent;
      if (!isWithinServiceBounds(coordinate.latitude, coordinate.longitude)) {
        Toast.show({
          type: "error",
          text1: "Outside service area",
          text2: `Please pick a location within ${getServiceAreaNames()}`,
          position: "top",
          topOffset: 40,
        });
        return;
      }
      setSelectedLocation({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: "Fetching...",
      });
      reverseGeocode(coordinate.latitude, coordinate.longitude);
      mapRef.current?.animateToRegion(
        { ...coordinate, latitudeDelta: 0.009, longitudeDelta: 0.009 },
        350,
      );
    },
    [reverseGeocode],
  );

  const confirmLocation = useCallback(
    (loc: any) => {
      setFromMap({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: 0,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      });
      closePicker();
    },
    [setFromMap, closePicker],
  );

  const handleConfirmFromMap = () => {
    if (!selectedLocation) return;
    setConfirming(true);
    confirmLocation({
      ...selectedLocation,
      address: reverseAddress || selectedLocation.address,
    });
  };

  const handleSelectPrediction = useCallback(
    async (place: any) => {
      try {
        const res = await fetch(`${API_URL}/maps/geocode?placeId=${place.id}`);
        if (!res.ok) throw new Error();
        const { lat, lng } = await res.json();
        confirmLocation({
          latitude: lat,
          longitude: lng,
          address: place.subtitle
            ? `${place.title}, ${place.subtitle}`
            : place.title,
        });
      } catch {
        Toast.show({
          type: "error",
          text1: "Location not found",
          text2:
            "Could not get coordinates for this place. Please try another.",
          position: "top",
          topOffset: 40,
        });
      }
    },
    [confirmLocation],
  );

  // Show current location row
  const showCurrent = !searchQuery && !!location?.coords;
  // No saved addresses in this modal, but you can add if needed
  const showEmpty = searchQuery && !searching && predictions.length === 0;

  return (
    <Modal
      visible={pickerVisible}
      animationType="slide"
      onRequestClose={closePicker}
    >
      <ThemedView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={closePicker}>
            <IconSymbol name="chevron.left" size={22} color={primary} />
          </Pressable>
          <ThemedText type="subtitle">Select Location</ThemedText>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: card }]}>
          <IconSymbol name="magnifyingglass" size={20} color={textSecondary} />
          <TextInput
            style={[styles.input, { color: textPrimary }]}
            placeholder="Search for a place..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={primary} />}
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Location */}
          {showCurrent && (
            <Pressable
              style={[styles.locationItem, { backgroundColor: card }]}
              onPress={() =>
                confirmLocation({
                  latitude: location.coords?.latitude ?? 0,
                  longitude: location.coords?.longitude ?? 0,
                  address: location.address || "Current Location",
                })
              }
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${success}22` },
                ]}
              >
                <IconSymbol name="location.fill" size={22} color={success} />
              </View>
              <View style={styles.locationInfo}>
                <ThemedText style={styles.itemTitle}>
                  Use Current Location
                </ThemedText>
                <ThemedText
                  style={[styles.itemSubtitle, { color: textSecondary }]}
                  numberOfLines={1}
                >
                  {location.address || "GPS Location"}
                </ThemedText>
              </View>
              <IconSymbol
                name="chevron.right"
                size={18}
                color={textSecondary}
              />
            </Pressable>
          )}

          {/* Search Results */}
          {predictions.map((place) => (
            <Pressable
              key={place.id}
              style={[styles.locationItem, { backgroundColor: card }]}
              onPress={() => handleSelectPrediction(place)}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${primary}22` },
                ]}
              >
                <IconSymbol
                  name="mappin.and.ellipse"
                  size={22}
                  color={primary}
                />
              </View>
              <View style={styles.locationInfo}>
                <ThemedText style={styles.itemTitle}>{place.title}</ThemedText>
                <ThemedText
                  style={[styles.itemSubtitle, { color: textSecondary }]}
                  numberOfLines={1}
                >
                  {place.subtitle || ""}
                </ThemedText>
              </View>
              <IconSymbol
                name="chevron.right"
                size={18}
                color={textSecondary}
              />
            </Pressable>
          ))}

          {showEmpty && (
            <View style={styles.empty}>
              <ThemedText style={{ color: textSecondary }}>
                No results for "{searchQuery.trim()}"
              </ThemedText>
            </View>
          )}

          {/* Open Map Button */}
          <View style={styles.mapTriggerSection}>
            <ThemedText
              style={[
                styles.sectionTitle,
                { color: textSecondary, marginBottom: 12 },
              ]}
            >
              Need more precision?
            </ThemedText>
            <Pressable
              style={[styles.mapTriggerButton, { backgroundColor: card }]}
              onPress={() => setMapModalVisible(true)}
            >
              <IconSymbol name="map" size={22} color={primary} />
              <ThemedText style={[styles.mapTriggerText, { color: primary }]}>
                Choose on map
              </ThemedText>
            </Pressable>
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Map Modal */}
        <Modal
          visible={mapModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setMapModalVisible(false)}
        >
          <ThemedView style={{ flex: 1 }}>
            <View style={styles.header}>
              <Pressable onPress={() => setMapModalVisible(false)}>
                <IconSymbol name="chevron.left" size={22} color={primary} />
              </Pressable>
              <ThemedText type="subtitle">Pick location on map</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFill}
                customMapStyle={mapStyle}
                initialRegion={{
                  latitude:
                    location?.coords?.latitude ?? DEFAULT_MAP_CENTER.latitude,
                  longitude:
                    location?.coords?.longitude ?? DEFAULT_MAP_CENTER.longitude,
                  latitudeDelta: DEFAULT_MAP_CENTER.latitudeDelta,
                  longitudeDelta: DEFAULT_MAP_CENTER.longitudeDelta,
                }}
                onPress={handleMapPress}
                showsUserLocation
                showsMyLocationButton
              >
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    pinColor={primary}
                  />
                )}
              </MapView>
              {selectedLocation && (
                <View
                  style={[styles.confirmOverlay, { backgroundColor: card }]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={[styles.overlayLabel, { color: textMuted }]}
                    >
                      SELECTED LOCATION
                    </ThemedText>
                    <ThemedText style={styles.overlayAddress} numberOfLines={2}>
                      {reverseAddress || "Loading..."}
                    </ThemedText>
                  </View>
                  <Pressable
                    style={[styles.confirmBtn, { backgroundColor: primary }]}
                    onPress={handleConfirmFromMap}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <ThemedText style={styles.confirmText}>
                        Confirm
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          </ThemedView>
        </Modal>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  locationInfo: { flex: 1, marginLeft: 14 },
  itemTitle: { fontSize: 16, fontWeight: "600" },
  itemSubtitle: { fontSize: 13.5, marginTop: 1 },
  empty: { alignItems: "center", marginTop: 50, paddingHorizontal: 30 },
  mapTriggerSection: { marginTop: 32, marginBottom: 24 },
  mapTriggerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  mapTriggerText: { fontSize: 16, fontWeight: "600" },
  confirmOverlay: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  overlayLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  overlayAddress: { fontSize: 15.5, fontWeight: "600", marginTop: 4 },
  confirmBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginLeft: 16,
  },
  confirmText: { color: "white", fontWeight: "700", fontSize: 15 },
});
