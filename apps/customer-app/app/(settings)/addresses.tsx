import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Keyboard,
  Animated,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { ThemedInput } from "@/components/ThemedInput";
import { useToast } from "@/components/ui/toast";
import { SkeletonAddressCard } from "@/components/ui/Skeleton";

import { Address } from "@/types/address";
import {
  fetchAddresses,
  saveAddress as saveAddressService,
  deleteAddress as deleteAddressService,
} from "@/services/address.service";
import {
  fetchSuggestions as fetchSuggestionsHelper,
  selectPlace as selectPlaceHelper,
  resolveAddressFromCoords,
} from "@/services/helpers/places-helper";
import { AddressList } from "@/components/addresses/AddressList";
import { GettingLocationOverlay } from "@/components/addresses/GettingLocationOverlay";
import { MapCurrentLocationBtn } from "@/components/addresses/MapCurrentLocationBtn";

export default function Addresses() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");
  const toast = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [addressInput, setAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [step, setStep] = useState<"address" | "map" | "label" | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------- Load Addresses ----------------
  useEffect(() => {
    fetchAddresses().then((data) => {
      setAddresses(data);
      setLoading(false);
    });
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
      // Use Google Maps Places API to resolve full address
      const addr = await selectPlaceHelper(placeId);
      if (!addr || !selectedAddress) return;

      setSelectedAddress({
        ...selectedAddress,
        address: addr.address, // full address
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
          500
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
      console.log("scrrrrrr");

      return;
    }
    setSaving(true);
    try {
      await saveAddressService(selectedAddress);
      setAddresses((prev) => [
        ...prev.filter((a) => a.id !== selectedAddress.id),
        selectedAddress,
      ]);
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
        title: "Cannot delete default address",
        message: "Home and Work cannot be deleted",
        variant: "warning",
      });
      return;
    }

    await deleteAddressService(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Deleted", message: "Address deleted", variant: "success" });
  };

  // ---------------- Current Location ----------------
  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast({
          title: "Permission denied",
          message: "Location permission denied",
          variant: "error",
        });
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      if (!selectedAddress) {
        setLocating(false);
        return;
      }

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
          : prev
      );

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      }

      // Automatically go to label if address is empty
      setStep("label");
    } catch {
      toast({
        title: "Location Error",
        message: "Could not get current location",
        variant: "error",
      });
    } finally {
      setLocating(false);
    }
  };

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
          : prev
      );

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      }
    } catch (e) {
      console.warn("Failed to get current location");
    }
  };

  // ---------------- Animation ----------------
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
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [locating]);

  useEffect(() => {
    if (step === "map" && selectedAddress) {
      // If no coordinates yet → jump to current location
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
          setSuggestions([]);
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
          setSuggestions([]);
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
          setSuggestions([]);
        }}
      />

      {/* Address Modal Flow */}
      <Modal visible={step !== null} animationType="slide">
        <View style={{ flex: 1, padding: 16 }}>
          {locating && <GettingLocationOverlay scaleAnim={scaleAnim} />}
          {saving && (
            <View style={styles.savingOverlay} pointerEvents="auto">
              <Animated.View style={styles.savingContent}>
                <ActivityIndicator size="large" color={primary} />
                <ThemedText style={styles.savingText}>
                  Saving address...
                </ThemedText>
              </Animated.View>
            </View>
          )}

          {/* ---------------- Address Step ---------------- */}
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
              {suggestions.length > 0 && (
                <View style={{ maxHeight: 200, marginTop: 8 }}>
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
              )}
            </>
          )}

          {/* ---------------- Map Step ---------------- */}
          {step === "map" && selectedAddress && (
            <>
              <MapView
                ref={mapRef}
                style={{ flex: 1, minHeight: 300 }}
                initialRegion={{
                  latitude: selectedAddress.coordinates.lat
                    ? parseFloat(selectedAddress.coordinates.lat)
                    : 37.78825,
                  longitude: selectedAddress.coordinates.lng
                    ? parseFloat(selectedAddress.coordinates.lng)
                    : -122.4324,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={async (e) => {
                  const coords = e.nativeEvent.coordinate;
                  try {
                    // Use Google Maps Places API to resolve full address from coordinates
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
                        : null
                    );
                  } catch {
                    setSelectedAddress((prev) =>
                      prev
                        ? {
                            ...prev,
                            coordinates: {
                              lat: coords.latitude.toString(),
                              lng: coords.longitude.toString(),
                            },
                          }
                        : null
                    );
                    toast({
                      title: "Error",
                      message: "Could not resolve address from map",
                      variant: "error",
                    });
                  }
                }}
              >
                {selectedAddress.coordinates.lat &&
                  selectedAddress.coordinates.lng && (
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
                  style={[
                    styles.useAddressBtn,
                    styles.cancelBtn,
                    {
                      borderColor: border,
                      flex: 1,
                      backgroundColor: "transparent",
                      margin: 0,
                    },
                  ]}
                  onPress={() => {
                    setSelectedAddress(null);
                    setStep(null);
                  }}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.useAddressBtn,
                    { backgroundColor: primary, flex: 1, margin: 0 },
                  ]}
                  onPress={() => setStep("label")}
                >
                  <ThemedText style={{ color: "#fff" }}>
                    Use this address
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}

          {/* ---------------- Label Step ---------------- */}
          {step === "label" && selectedAddress && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Pressable
                  onPress={() => setStep("address")}
                  style={{ marginRight: 8 }}
                >
                  <IconSymbol name="chevron.left" size={22} color={primary} />
                </Pressable>
                <ThemedText style={{ fontWeight: "600" }}>Label</ThemedText>
              </View>
              <ThemedInput
                value={selectedAddress.label}
                placeholder="Home / Work / Other"
                onChangeText={(val) =>
                  setSelectedAddress((prev) =>
                    prev ? { ...prev, label: val } : prev
                  )
                }
                autoFocus
              />
              <View style={{ flexDirection: "row", marginTop: 16 }}>
                <Pressable
                  style={[
                    styles.cancelBtn,
                    { borderColor: border, flex: 1, marginRight: 8 },
                  ]}
                  onPress={() => {
                    setSelectedAddress(null);
                    setStep(null);
                  }}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.saveBtn,
                    { backgroundColor: primary, flex: 1 },
                  ]}
                  onPress={saveAddress}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={{ color: "#fff" }}>Save</ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
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
  suggestionRow: { padding: 12, borderBottomWidth: 1, borderColor: "#eee" },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
    alignItems: "center",
  },
  useAddressBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  savingContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  savingText: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "600",
    color: "#1a73e8",
  },
});
