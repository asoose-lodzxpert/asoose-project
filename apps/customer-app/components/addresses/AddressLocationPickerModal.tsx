import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Dimensions,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "@/components/themed-view";
import { useAddressSearch } from "@/hooks/useAddressSearch";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface AddressLocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  initialCoords?: { latitude: number; longitude: number };
  labelValue: string;
  onLabelChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function AddressLocationPickerModal({
  visible,
  onClose,
  onSelect,
  initialCoords,
  labelValue,
  onLabelChange,
  onSave,
  saving,
}: AddressLocationPickerModalProps) {
  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const border = useThemeColor({}, "borderDefault");
  const background = useThemeColor({}, "surfaceBackground");

  const [searchQuery, setSearchQuery] = useState("");
  const [step, setStep] = useState<"search" | "label">("search");
  const [mapVisible, setMapVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [reverseAddress, setReverseAddress] = useState("");

  const mapRef = useRef<MapView>(null);
  const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

  const coords = useMemo(() => initialCoords || undefined, [initialCoords]);
  const { results: predictions, loading: searching } = useAddressSearch(
    searchQuery,
    coords,
  );

  // Reset flow when modal opens
  useEffect(() => {
    if (visible) {
      setStep("search");
      setSearchQuery("");
      setMapVisible(false);
    }
  }, [visible]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `${API_URL}/maps/reverse-geocode?lat=${lat}&lng=${lng}`,
      );
      const data = await res.json();
      setReverseAddress(data.address || "Selected Point");
    } catch {
      setReverseAddress("Selected Point");
    }
  }, []);

  const handleMapPress = (e: any) => {
    const { coordinate } = e.nativeEvent;
    setSelectedLocation({ ...coordinate });
    reverseGeocode(coordinate.latitude, coordinate.longitude);
    mapRef.current?.animateToRegion(
      {
        ...coordinate,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      400,
    );
  };

  const handleConfirmLocation = (loc: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    onSelect(loc);
    setStep("label");
    setMapVisible(false);
  };

  const handleSelectPrediction = async (place: any) => {
    try {
      const res = await fetch(`${API_URL}/maps/geocode?placeId=${place.id}`);
      const { lat, lng } = await res.json();
      handleConfirmLocation({
        latitude: lat,
        longitude: lng,
        address: place.subtitle
          ? `${place.title}, ${place.subtitle}`
          : place.title,
      });
    } catch (e) {
      handleConfirmLocation({
        latitude: 0,
        longitude: 0,
        address: place.title,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={step === "label" ? () => setStep("search") : onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Pressable
            onPress={step === "label" ? () => setStep("search") : onClose}
            hitSlop={20}
          >
            <IconSymbol
              name={step === "label" ? "arrow.left" : "xmark"}
              size={22}
              color={primary}
            />
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {step === "search" ? "Add Address" : "Address Label"}
          </ThemedText>
          <View style={{ width: 22 }} />
        </View>

        {step === "search" ? (
          <View style={{ flex: 1 }}>
            {/* Search Input */}
            <View style={[styles.searchBox, { backgroundColor: card }]}>
              <IconSymbol
                name="magnifyingglass"
                size={18}
                color={textSecondary}
              />
              <TextInput
                style={[styles.input, { color: textPrimary }]}
                placeholder="Find a street or building..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={textSecondary}
              />
              {searching && <ActivityIndicator size="small" color={primary} />}
            </View>

            {/* Map Toggle / List */}
            <ScrollView keyboardShouldPersistTaps="handled">
              <Pressable
                style={styles.mapToggle}
                onPress={() => setMapVisible(true)}
              >
                <IconSymbol name="map.fill" size={20} color={primary} />
                <ThemedText style={{ color: primary, fontWeight: "600" }}>
                  Select on Map
                </ThemedText>
              </Pressable>

              {predictions.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.resultItem, { borderBottomColor: border }]}
                  onPress={() => handleSelectPrediction(item)}
                >
                  <IconSymbol
                    name="mappin.circle.fill"
                    size={20}
                    color={textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.itemTitle}>
                      {item.title}
                    </ThemedText>
                    <ThemedText style={{ color: textSecondary, fontSize: 12 }}>
                      {item.subtitle}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : (
          /* Label Step */
          <View style={styles.labelStep}>
            <ThemedText style={styles.labelHint}>
              Give this address a name (e.g. Home, Office, Sis's Place)
            </ThemedText>
            <TextInput
              style={[
                styles.labelInput,
                { backgroundColor: card, color: textPrimary },
              ]}
              value={labelValue}
              onChangeText={onLabelChange}
              placeholder="Address Label"
              placeholderTextColor={textSecondary}
              autoFocus
            />
            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: primary },
                !labelValue && { opacity: 0.5 },
              ]}
              onPress={onSave}
              disabled={saving || !labelValue}
            >
              {saving ? (
                <ActivityIndicator color={textOnPrimary} />
              ) : (
                <ThemedText
                  style={[styles.saveBtnText, { color: textOnPrimary }]}
                >
                  Save Address
                </ThemedText>
              )}
            </Pressable>
          </View>
        )}

        {/* Floating Map View */}
        <Modal
          visible={mapVisible}
          animationType="fade"
          onRequestClose={() => setMapVisible(false)}
        >
          <View style={{ flex: 1 }}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              onPress={handleMapPress}
              initialRegion={{
                latitude: coords?.latitude || 6.5244,
                longitude: coords?.longitude || 3.3792,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {selectedLocation && <Marker coordinate={selectedLocation} />}
            </MapView>

            <Pressable
              style={[styles.mapBack, { backgroundColor: card }]}
              onPress={() => setMapVisible(false)}
            >
              <IconSymbol name="arrow.left" size={20} color={textPrimary} />
            </Pressable>

            {selectedLocation && (
              <View style={[styles.mapConfirmCard, { backgroundColor: card }]}>
                <ThemedText numberOfLines={1} style={styles.mapAddressText}>
                  {reverseAddress}
                </ThemedText>
                <Pressable
                  style={[styles.confirmBtn, { backgroundColor: primary }]}
                  onPress={() =>
                    handleConfirmLocation({
                      ...selectedLocation,
                      address: reverseAddress,
                    })
                  }
                >
                  <ThemedText
                    style={{ color: textOnPrimary, fontWeight: "700" }}
                  >
                    Confirm
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </Modal>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    height: 50,
    borderRadius: 12,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  mapToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  itemTitle: { fontWeight: "600", fontSize: 15 },
  labelStep: { padding: 20 },
  labelHint: { marginBottom: 12, opacity: 0.6 },
  labelInput: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontWeight: "700", fontSize: 16 },
  mapBack: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  mapConfirmCard: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapAddressText: { flex: 1, marginRight: 10, fontWeight: "600" },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
});
