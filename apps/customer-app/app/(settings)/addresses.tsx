import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from "react-native";
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
import { AddressLocationPickerModal } from "@/components/addresses/AddressLocationPickerModal";

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
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  const debounceRef = React.useRef<any>(null);

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
      userId: "",
      vendorId: null,
      phone: null,
      label: label,
      street: "",
      city: "",
      state: "",
      lat: 0,
      lng: 0,
      isDefault: false,
    });
    setAddressInput("");
    setSuggestions([]);
    setStep("label");
  };

  const handleSave = async () => {
    if (!selectedAddress?.label || !selectedAddress?.street) {
      return Toast.show({
        type: "info",
        text1: "Name required",
        text2: "Please name this location",
      });
    }
    setSaving(true);
    try {
      await saveAddressService(selectedAddress);
      await loadAddresses();
      setStep(null);
      setSelectedAddress(null);
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

  const openLocationPicker = () => {
    setLocationPickerVisible(true);
  };

  const handleLocationPicked = (loc: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setPickedLocation(loc);
    setAddressInput(loc.address);
    setSelectedAddress((prev) =>
      prev
        ? {
            ...prev,
            street: loc.address,
            lat: loc.latitude,
            lng: loc.longitude,
          }
        : prev,
    );
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
          setAddressInput(addr.street);
          setStep("label");
        }}
        onDelete={(id) => {
          deleteAddressService(id).then(loadAddresses);
        }}
        onAddHome={() => openAddFlow("Home")}
        onAddWork={() => openAddFlow("Work")}
        onAddOther={() => openAddFlow("")}
      />

      <AddressLocationPickerModal
        visible={!!selectedAddress}
        onClose={() => {
          setSelectedAddress(null);
          setStep(null);
        }}
        onSelect={handleLocationPicked}
        initialCoords={undefined}
        labelValue={selectedAddress?.label || ""}
        onLabelChange={(v: string) =>
          setSelectedAddress((prev) => ({ ...prev!, label: v }))
        }
        onSave={handleSave}
        saving={saving}
      />
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
