import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SkeletonAddressCard } from "@/components/ui/Skeleton";
import Toast from "react-native-toast-message";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

import { AddressList } from "@/components/addresses/AddressList";
import { GettingLocationOverlay } from "@/components/addresses/GettingLocationOverlay";
import { MapCurrentLocationBtn } from "@/components/addresses/MapCurrentLocationBtn";
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

export default function Addresses() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = React.useRef<number | null>(null);

  const [addressInput, setAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [step, setStep] = useState<"address" | "map" | "label" | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<number | null>(null);

  // Helper to format full address string from API fields
  const formatFullAddress = (addr: any) => {
    return [addr.street, addr.city, addr.state].filter(Boolean).join(", ");
  };

  // ---------------- Load Addresses with Auto-Retry ----------------
  const loadAddresses = useCallback(
    async (attempt = 0) => {
      try {
        const data = await fetchAddresses();
        const mappedData = data.map((item: any) => ({
          ...item,
          address: item.address || formatFullAddress(item),
          coordinates: {
            lat: item.lat?.toString(),
            lng: item.lng?.toString(),
          },
        }));

        setAddresses(mappedData);
        setLoading(false);
        setRetryCount(0);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "Failed to load";
        const isNetworkError =
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("fetch") ||
          errorMessage.toLowerCase().includes("connection");

        const maxRetries = isNetworkError ? 3 : 1;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          setRetryCount(attempt + 1);

          retryTimeoutRef.current = setTimeout(() => {
            loadAddresses(attempt + 1);
          }, delay);
        } else {
          // Only stop loading after all retries fail
          setLoading(false);
          setRetryCount(0);
        }
      }
    },
    [formatFullAddress],
  );

  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // ---------------- Suggestions ----------------
  const fetchSuggestions = async (input: string) => {
    setSearchLoading(true);
    try {
      const results = await fetchSuggestionsHelper(input);
      setSuggestions(results);
    } catch (err) {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSuggestion = async (placeId: string) => {
    try {
      const addr = await selectPlaceHelper(placeId);
      if (!addr || !selectedAddress) return;

      setSelectedAddress({
        ...selectedAddress,
        address: addr.address,
        coordinates: addr.coordinates,
      });

      if (mapRef.current && addr.coordinates.lat && addr.coordinates.lng) {
        mapRef.current.animateToRegion(
          {
            latitude: parseFloat(addr.coordinates.lat),
            longitude: parseFloat(addr.coordinates.lng),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500,
        );
      }

      setSuggestions([]);
      setAddressInput("");
      setStep("label");
      Keyboard.dismiss();
    } catch {
      toast({
        title: "Error",
        message: "Could not select address",
        variant: "error",
      });
    }
  };

  // ---------------- CRUD ----------------
  const saveAddress = async () => {
    if (
      !selectedAddress ||
      !selectedAddress.label ||
      !selectedAddress.address
    ) {
      toast({
        title: "Missing info",
        message: "Please enter label and address",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      // Prepare payload to match your API backend structure
      const payload = {
        ...selectedAddress,
        street: selectedAddress.address, // mapping UI 'address' to API 'street'
        lat: parseFloat(selectedAddress.coordinates.lat),
        lng: parseFloat(selectedAddress.coordinates.lng),
      };

      await saveAddressService(payload);

      // Refresh list
      const updatedData = await fetchAddresses();
      setAddresses(
        updatedData.map((item: any) => ({
          ...item,
          address: item.address || formatFullAddress(item),
          coordinates: { lat: item.lat?.toString(), lng: item.lng?.toString() },
        })),
      );

      toast({
        title: "Success",
        message: "Address saved!",
        variant: "success",
      });
      setSelectedAddress(null);
      setStep(null);
    } catch (err) {
      toast({
        title: "Error",
        message: "Failed to save address",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAddressHandler = async (id: string) => {
    const addr = addresses.find((a) => a.id === id);
    if (!addr) return;

    if (addr.label === "Home" || addr.label === "Work") {
      toast({
        title: "Default Address",
        message: "Home and Work cannot be deleted",
        variant: "warning",
      });
      return;
    }

    await deleteAddressService(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Deleted", message: "Address deleted", variant: "success" });
  };

  // ---------------- Location Helpers ----------------
  const moveMapToCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const coords = {
        lat: loc.coords.latitude.toString(),
        lng: loc.coords.longitude.toString(),
      };

      let resolved = null;
      try {
        resolved = await resolveAddressFromCoords({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch {}

      setSelectedAddress((prev) =>
        prev
          ? {
              ...prev,
              coordinates: coords,
              address: resolved?.address || prev.address || "",
            }
          : prev,
      );

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500,
        );
      }
    } catch (e) {
      console.warn("Failed to get current location");
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    await moveMapToCurrentLocation();
    setStep("label");
    setLocating(false);
  };

  // ---------------- Animation & Lifecycle ----------------
  useEffect(() => {
    if (locating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [locating]);

  useEffect(() => {
    if (step === "map" && selectedAddress) {
      if (
        !selectedAddress.coordinates.lat ||
        !selectedAddress.coordinates.lng
      ) {
        moveMapToCurrentLocation();
      }
    }
  }, [step]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Header title="Saved Addresses" onBack={() => router.back()} />
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonAddressCard key={i} />
          ))}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Header title="Saved Addresses" onBack={() => router.back()} />
      <AddressList
        addresses={addresses}
        border={border}
        primary={primary}
        onEdit={(address) => {
          setSelectedAddress(address);
          setStep("address");
          setAddressInput(address.address || "");
          setSuggestions([]);
        }}
        onDelete={deleteAddressHandler}
        onAddHome={() => {
          setSelectedAddress({
            id: "",
            label: "Home",
            address: "",
            coordinates: { lat: "", lng: "" },
            isDefault: true,
          });
          setStep("address");
          setAddressInput("");
        }}
        onAddWork={() => {
          setSelectedAddress({
            id: "",
            label: "Work",
            address: "",
            coordinates: { lat: "", lng: "" },
            isDefault: false,
          });
          setStep("address");
          setAddressInput("");
        }}
        onAddOther={() => {
          setSelectedAddress({
            id: "",
            label: "Other",
            address: "",
            coordinates: { lat: "", lng: "" },
            isDefault: false,
          });
          setStep("address");
          setAddressInput("");
        }}
      />

      <Modal visible={step !== null} animationType="slide">
        <ThemedView style={{ flex: 1, padding: 16 }}>
          {locating && <GettingLocationOverlay scaleAnim={scaleAnim} />}
          {saving && (
            <View style={styles.savingOverlay}>
              <ActivityIndicator size="large" color={primary} />
              <ThemedText style={styles.savingText}>
                Saving address...
              </ThemedText>
            </View>
          )}

          {/* Address Step */}
          {step === "address" && selectedAddress && (
            <>
              <View style={styles.modalHeaderRow}>
                <Pressable onPress={() => setStep(null)}>
                  <IconSymbol name="chevron.left" size={22} color={primary} />
                </Pressable>
                <Pressable onPress={() => setStep("map")}>
                  <IconSymbol name="map" size={22} color={primary} />
                </Pressable>
              </View>
              <ThemedInput
                value={addressInput}
                placeholder="Type address..."
                onChangeText={(val) => {
                  setAddressInput(val);
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  debounceRef.current = setTimeout(() => {
                    if (val.length > 2) fetchSuggestions(val);
                    else setSuggestions([]);
                  }, 300);
                }}
                autoFocus
              />
              {searchLoading && (
                <ActivityIndicator
                  size="small"
                  color={primary}
                  style={{ marginTop: 8 }}
                />
              )}
              <View style={{ maxHeight: 300, marginTop: 8 }}>
                {suggestions.map((s) => (
                  <Pressable
                    key={s.place_id}
                    style={styles.suggestionRow}
                    onPress={() => handleSelectSuggestion(s.place_id)}
                  >
                    <ThemedText>{s.description}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Map Step */}
          {step === "map" && selectedAddress && (
            <ThemedView style={{ flex: 1 }}>
              <MapView
                ref={mapRef}
                style={{ flex: 1, minHeight: 300, borderRadius: 12 }}
                initialRegion={{
                  latitude: selectedAddress.coordinates.lat
                    ? parseFloat(selectedAddress.coordinates.lat)
                    : 11.83,
                  longitude: selectedAddress.coordinates.lng
                    ? parseFloat(selectedAddress.coordinates.lng)
                    : 13.15,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={async (e) => {
                  const coords = e.nativeEvent.coordinate;
                  const resolved = await resolveAddressFromCoords({
                    lat: coords.latitude,
                    lng: coords.longitude,
                  });
                  setSelectedAddress((prev) =>
                    prev
                      ? {
                          ...prev,
                          coordinates: {
                            lat: coords.latitude.toString(),
                            lng: coords.longitude.toString(),
                          },
                          address: resolved?.address || prev.address || "",
                        }
                      : null,
                  );
                }}
              >
                {selectedAddress.coordinates.lat && (
                  <Marker
                    coordinate={{
                      latitude: parseFloat(selectedAddress.coordinates.lat),
                      longitude: parseFloat(selectedAddress.coordinates.lng),
                    }}
                  />
                )}
              </MapView>
              <MapCurrentLocationBtn
                onPress={useCurrentLocation}
                locating={locating}
              />
              <View style={{ flexDirection: "row", marginTop: 16, gap: 8 }}>
                <Pressable
                  style={[styles.cancelBtn, { borderColor: border }]}
                  onPress={() => setStep(null)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.useAddressBtn,
                    { backgroundColor: primary, flex: 1 },
                  ]}
                  onPress={() => setStep("label")}
                >
                  <ThemedText style={{ color: "#fff" }}>
                    Use this address
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          )}

          {/* Label Step */}
          {step === "label" && selectedAddress && (
            <>
              <View style={styles.labelHeader}>
                <Pressable onPress={() => setStep("address")}>
                  <IconSymbol name="chevron.left" size={22} color={primary} />
                </Pressable>
                <ThemedText style={{ fontWeight: "600", marginLeft: 8 }}>
                  Label Address
                </ThemedText>
              </View>
              <ThemedInput
                value={selectedAddress.label}
                placeholder="e.g. Home, Office, Gym"
                onChangeText={(val) =>
                  setSelectedAddress((prev) =>
                    prev ? { ...prev, label: val } : prev,
                  )
                }
                autoFocus
              />
              <View style={{ flexDirection: "row", marginTop: 16, gap: 8 }}>
                <Pressable
                  style={[styles.cancelBtn, { borderColor: border }]}
                  onPress={() => setStep(null)}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, { backgroundColor: primary }]}
                  onPress={saveAddress}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={{ color: "#fff" }}>
                      Save Address
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const primary = useThemeColor({}, "brandPrimary");
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <IconSymbol name="chevron.left" size={22} color={primary} />
      </Pressable>
      <ThemedText type="title" style={styles.headerTitle}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 16 },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  suggestionRow: { padding: 15, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  labelHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  useAddressBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  savingText: { marginTop: 18, fontSize: 16, fontWeight: "600", color: "#333" },
});
