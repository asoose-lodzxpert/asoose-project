// LocationPickerScreen for Delivery (location-picker.tsx)
// This is a copy of the ride location picker, adapted for delivery context.

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useSendPackage } from "@/context/SendPackageContext";
import type { Address, LocationPoint } from "@/types/delivery";
import { useLocation } from "@/context/LocationContext";
import { getAccessToken } from "@/services/auth.service";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const MODAL_MAP_HEIGHT = SCREEN_HEIGHT * 0.78;

interface PlacePrediction {
  id: string;
  title: string;
  subtitle: string;
}

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface SavedAddress {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

function LocationRow({
  title,
  subtitle,
  icon,
  onPress,
  color,
  bg,
  textSec,
}: {
  title: string;
  subtitle: string;
  icon: IconSymbolName;
  onPress: () => void;
  color: string;
  bg: string;
  textSec: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.locationItem,
        pressed && { opacity: 0.75 },
        { backgroundColor: bg },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}22` }]}>
        <IconSymbol name={icon} size={22} color={color} />
      </View>
      <View style={styles.locationInfo}>
        <ThemedText style={styles.itemTitle}>{title}</ThemedText>
        <ThemedText
          style={[styles.itemSubtitle, { color: textSec }]}
          numberOfLines={1}
        >
          {subtitle}
        </ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={18} color={textSec} />
    </Pressable>
  );
}

export default function LocationPickerScreen() {
  const router = useRouter();
  const { type = "pickup" } = useLocalSearchParams<{
    type: "pickup" | "dropoff";
  }>();

  const { setPickup, setDropoff, savedAddresses = [] } = useSendPackage();
  const { location: currentLocation } = useLocation();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const warning = useThemeColor({}, "statusPending");

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [reverseAddress, setReverseAddress] = useState("");
  const [confirming, setConfirming] = useState(false);

  const mapRef = useRef<MapView>(null);
  const searchTimeout = useRef<number | null>(null);

  const searchPlaces = useCallback(
    async (query: string) => {
      if (query.trim().length < 3) {
        setPredictions([]);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({ query: query.trim() });
        if (currentLocation?.coords) {
          params.append(
            "location",
            `${currentLocation.coords.latitude},${currentLocation.coords.longitude}`,
          );
        }
        const token = await getAccessToken().catch(() => null);
        const res = await fetch(
          `${API_URL}/maps/places-autocomplete?${params}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPredictions(Array.isArray(data) ? data : []);
      } catch {
        setPredictions([]);
      } finally {
        setSearching(false);
      }
    },
    [currentLocation],
  );

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlaces(searchQuery), 450);
    return () => clearTimeout(searchTimeout.current!);
  }, [searchQuery, searchPlaces]);

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
  }, []);

  const handleMapPress = useCallback(
    (e: any) => {
      Keyboard.dismiss();
      const { coordinate } = e.nativeEvent;
      const loc = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        address: "Fetching...",
      };
      setSelectedLocation(loc);
      reverseGeocode(coordinate.latitude, coordinate.longitude);
      mapRef.current?.animateToRegion(
        { ...coordinate, latitudeDelta: 0.009, longitudeDelta: 0.009 },
        350,
      );
    },
    [reverseGeocode],
  );

  // Convert Location to Address and wrap in LocationPoint
  const confirmLocation = useCallback(
    (loc: Location) => {
      const address: Address = {
        id: "",
        label: "",
        fullAddress: loc.address,
        coords: { latitude: loc.latitude, longitude: loc.longitude },
      };
      const payload: LocationPoint = { address };
      if (type === "pickup") setPickup(payload);
      else setDropoff(payload);
      router.back();
    },
    [type, setPickup, setDropoff, router],
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
    async (place: PlacePrediction) => {
      setSearching(true);
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
        confirmLocation({ latitude: 0, longitude: 0, address: place.title });
      } finally {
        setSearching(false);
      }
    },
    [confirmLocation],
  );

  const handleSelectSaved = (addr: any) => {
    // addr is Address type from context
    const payload: LocationPoint = { address: addr };
    if (type === "pickup") setPickup(payload);
    else setDropoff(payload);
    router.back();
  };

  const openMapModal = () => {
    setMapModalVisible(true);
    setSelectedLocation(null);
    setReverseAddress("");
  };

  const closeMapModal = () => {
    setMapModalVisible(false);
  };

  const showCurrent = !searchQuery && !!currentLocation?.coords;
  const showSaved = !searchQuery && savedAddresses.length > 0;
  const showEmpty = searchQuery && !searching && predictions.length === 0;

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surface }]}>
        <View style={styles.navRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: card }]}
          >
            <IconSymbol name="chevron.left" size={24} color={textPrimary} />
          </Pressable>
          <ThemedText style={styles.title}>
            {type === "pickup" ? "Set Pickup" : "Set Drop-off"}
          </ThemedText>
          <View style={{ width: 44 }} />
        </View>
        <View style={[styles.searchBar, { backgroundColor: card }]}>
          <IconSymbol name="magnifyingglass" size={20} color={textSecondary} />
          <TextInput
            style={[styles.input, { color: textPrimary }]}
            placeholder="Search or select saved..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {(searching || confirming) && (
            <ActivityIndicator size="small" color={primary} />
          )}
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current */}
        {showCurrent && (
          <>
            <ThemedText style={[styles.sectionTitle, { color: textSecondary }]}>
              Current Location
            </ThemedText>
            <LocationRow
              title="Use Current Location"
              subtitle={currentLocation.address || "GPS Location"}
              icon="location.fill"
              color={success}
              bg={card}
              textSec={textSecondary}
              onPress={() =>
                confirmLocation({
                  latitude: currentLocation.coords?.latitude ?? 0,
                  longitude: currentLocation.coords?.longitude ?? 0,
                  address: currentLocation.address || "Current Location",
                })
              }
            />
          </>
        )}
        {/* Saved */}
        {showSaved && (
          <>
            <ThemedText style={[styles.sectionTitle, { color: textSecondary }]}>
              Saved Addresses
            </ThemedText>
            {savedAddresses.map((addr) => (
              <LocationRow
                key={addr.id}
                title={addr.label}
                subtitle={addr.fullAddress}
                icon="star.fill"
                color={warning}
                bg={card}
                textSec={textSecondary}
                onPress={() => handleSelectSaved(addr)}
              />
            ))}
          </>
        )}
        {/* Search results or suggested */}
        <ThemedText style={[styles.sectionTitle, { color: textSecondary }]}>
          {searchQuery ? "Search Results" : "Suggested Places"}
        </ThemedText>
        {predictions.map((place) => (
          <LocationRow
            key={place.id}
            title={place.title}
            subtitle={place.subtitle || ""}
            icon="mappin.and.ellipse"
            color={primary}
            bg={card}
            textSec={textSecondary}
            onPress={() => handleSelectPrediction(place)}
          />
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
            onPress={openMapModal}
          >
            <IconSymbol name="map" size={22} color={primary} />
            <ThemedText style={[styles.mapTriggerText, { color: primary }]}>
              Choose on map
            </ThemedText>
          </Pressable>
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
      {/* ─── MAP MODAL ──────────────────────────────────────────────── */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeMapModal}
      >
        <ThemedView
          style={[styles.modalContainer, { backgroundColor: surface }]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Pressable
              onPress={closeMapModal}
              style={[styles.closeBtn, { backgroundColor: card }]}
            >
              <IconSymbol name="chevron.down" size={28} color={textPrimary} />
            </Pressable>
            <ThemedText style={styles.modalTitle}>
              Pick location on map
            </ThemedText>
            <View style={{ width: 44 }} />
          </View>
          {/* Map */}
          <View style={styles.modalMapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: currentLocation?.coords?.latitude ?? 6.5244,
                longitude: currentLocation?.coords?.longitude ?? 3.3792,
                latitudeDelta: 0.07,
                longitudeDelta: 0.07,
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
              <View style={[styles.confirmOverlay, { backgroundColor: card }]}>
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
                    <ActivityIndicator color={textOnPrimary} size="small" />
                  ) : (
                    <ThemedText
                      style={[styles.confirmText, { color: textOnPrimary }]}
                    >
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  title: { fontSize: 19, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
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

  // Map Trigger
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

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 54 : 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  modalMapContainer: { flex: 1, position: "relative" },
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
  confirmText: { fontWeight: "700", fontSize: 15 },
});
