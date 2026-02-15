import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SkeletonAddressCard } from "@/components/ui/Skeleton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { AddressList } from "@/components/addresses/AddressList";
import {
  deleteAddress as deleteAddressService,
  fetchAddresses,
  saveAddress as saveAddressService,
} from "@/services/address.service";
import {
  fetchSuggestions as fetchSuggestionsHelper,
  resolveAddressFromCoords,
  selectPlace as selectPlaceHelper,
} from "@/services/helpers/places-helper";
import { Address } from "@/types/address";

export default function AddressesScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");
  const surface = useThemeColor({}, "surfaceBackground");
  const textSecondary = useThemeColor({}, "textSecondary");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"address" | "map" | "label" | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<any>(null);

  const loadAddresses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAddresses();
      setAddresses(data);
    } catch (error) {
      Toast.show({ type: "error", text1: "Could not load addresses" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleSearch = (val: string) => {
    setAddressInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (val.length > 2) {
        setSearchLoading(true);
        const results = await fetchSuggestionsHelper(val);
        setSuggestions(results);
        setSearchLoading(false);
      } else {
        setSuggestions([]);
      }
    }, 400);
  };

  const openAddFlow = (label: string = "") => {
    setSelectedAddress({
      id: "",
      label: label,
      address: "",
      coordinates: { lat: "", lng: "" },
      isDefault: false,
    });
    setAddressInput("");
    setSuggestions([]);
    setStep("address");
  };

  const handleSave = async () => {
    if (!selectedAddress?.label || !selectedAddress?.address) {
      return Toast.show({
        type: "info",
        text1: "Name required",
        text2: "Please name this location",
      });
    }
    setSaving(true);
    try {
      await saveAddressService({
        ...selectedAddress,
        coordinates: {
          lat: parseFloat(selectedAddress.coordinates.lat).toString(),
          lng: parseFloat(selectedAddress.coordinates.lng).toString(),
        },
      });
      await loadAddresses();
      setStep(null);
      Toast.show({
        type: "success",
        text1: "Saved",
        text2: "Address added to your list",
      });
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <IconSymbol name="chevron.left" size={24} color={primary} />
          </Pressable>
          <ThemedText type="subtitle">Addresses</ThemedText>
        </View>
        <View style={{ padding: 20 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonAddressCard key={i} />
          ))}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Saved Addresses
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <AddressList
        addresses={addresses}
        border={border}
        primary={primary}
        onEdit={(addr) => {
          setSelectedAddress(addr);
          setAddressInput(addr.address);
          setStep("address");
        }}
        onDelete={(id) => {
          deleteAddressService(id).then(loadAddresses);
        }}
        onAddHome={() => openAddFlow("Home")}
        onAddWork={() => openAddFlow("Work")}
        onAddOther={() => openAddFlow("")}
      />

      <Modal
        visible={step !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ThemedView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setStep(null)}>
              <ThemedText style={{ color: primary, fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">
              {step === "address"
                ? "Search"
                : step === "map"
                  ? "Confirm Location"
                  : "Name Address"}
            </ThemedText>
            <View style={{ width: 50 }} />
          </View>

          {step === "address" && (
            <View style={styles.modalContent}>
              <ThemedInput
                placeholder="Enter street, building or city..."
                value={addressInput}
                onChangeText={handleSearch}
                autoFocus
                iconRight={
                  searchLoading ? (
                    <ActivityIndicator size="small" color={primary} />
                  ) : null
                }
              />
              <ScrollView
                style={{ marginTop: 10 }}
                keyboardShouldPersistTaps="handled"
              >
                {suggestions.map((s) => (
                  <Pressable
                    key={s.place_id}
                    style={[styles.suggestion, { borderBottomColor: border }]}
                    onPress={async () => {
                      const addr = await selectPlaceHelper(s.place_id);
                      setSelectedAddress((prev) => ({ ...prev!, ...addr }));
                      setStep("map");
                    }}
                  >
                    <IconSymbol
                      name="mappin.circle.fill"
                      size={20}
                      color={textSecondary}
                    />
                    <ThemedText style={{ flex: 1 }}>{s.description}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {step === "map" && selectedAddress && (
            <View style={{ flex: 1 }}>
              <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                initialRegion={{
                  latitude:
                    parseFloat(selectedAddress.coordinates.lat) || 6.5244,
                  longitude:
                    parseFloat(selectedAddress.coordinates.lng) || 3.3792,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                onPress={async (e) => {
                  const coords = e.nativeEvent.coordinate;
                  const res = await resolveAddressFromCoords({
                    lat: coords.latitude,
                    lng: coords.longitude,
                  });
                  setSelectedAddress((prev) => ({
                    ...prev!,
                    address: res?.address || prev?.address || "",
                    coordinates: {
                      lat: coords.latitude.toString(),
                      lng: coords.longitude.toString(),
                    },
                  }));
                }}
              >
                <Marker
                  coordinate={{
                    latitude: parseFloat(selectedAddress.coordinates.lat) || 0,
                    longitude: parseFloat(selectedAddress.coordinates.lng) || 0,
                  }}
                />
              </MapView>
              <View style={[styles.bottomSheet, { backgroundColor: surface }]}>
                <ThemedText style={styles.sheetLabel}>
                  PINNED LOCATION
                </ThemedText>
                <ThemedText
                  type="defaultSemiBold"
                  numberOfLines={2}
                  style={styles.sheetAddress}
                >
                  {selectedAddress.address}
                </ThemedText>
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: primary }]}
                  onPress={() => setStep("label")}
                >
                  <ThemedText style={styles.btnText}>Confirm Pin</ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {step === "label" && selectedAddress && (
            <View style={styles.modalContent}>
              <ThemedText style={styles.inputGuide}>
                How would you like to save this address?
              </ThemedText>
              <ThemedInput
                placeholder="e.g., Mom's House, Gym, Client A"
                value={selectedAddress.label}
                onChangeText={(v) =>
                  setSelectedAddress((prev) => ({ ...prev!, label: v }))
                }
                autoFocus
              />
              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: primary, marginTop: 24 },
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.btnText}>Save Address</ThemedText>
                )}
              </Pressable>
            </View>
          )}
        </ThemedView>
      </Modal>
      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  iconBtn: { padding: 8 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  modalContent: { padding: 20 },
  inputGuide: { marginBottom: 12, opacity: 0.7, fontSize: 15 },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  bottomSheet: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: "absolute",
    bottom: 0,
    width: "100%",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sheetLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sheetAddress: { marginVertical: 10, fontSize: 16, lineHeight: 22 },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
