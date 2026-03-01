import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Address } from "@/types/address";
import { request } from "@/lib/authFetch";
import { useRouter } from "expo-router";

/** Haversine distance in metres */
function haversineMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface CurrentLocationProp {
  coords: { latitude: number; longitude: number };
  label: string;
  address: string;
}

interface AddressSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: Address) => void;
  selectedAddressId?: string;
  currentLocation?: CurrentLocationProp | null;
}

export function AddressSelectionModal({
  visible,
  onClose,
  onSelect,
  selectedAddressId,
  currentLocation,
}: AddressSelectionModalProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [tentativeId, setTentativeId] = useState<string | undefined>(
    selectedAddressId,
  );

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderDefault");

  const router = useRouter();

  useEffect(() => {
    if (visible) {
      setTentativeId(selectedAddressId);
      loadAddresses();
    }
  }, [visible]);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await request("users/addresses", { method: "GET" });
      if (__DEV__) console.log("Addresses:", JSON.stringify(response, null, 2));
      setAddresses(Array.isArray(response) ? response : []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = (addr: Address) => {
    setTentativeId(addr.id);
    onSelect(addr);
    onClose();
  };

  /** Select the home-screen location: reuse a close existing address, or save a new one */
  const handleSelectCurrentLocation = useCallback(async () => {
    if (!currentLocation) return;
    const { coords, label, address } = currentLocation;

    // Check if any saved address is within 500m
    const nearby = addresses.find(
      (a) =>
        haversineMetres(coords.latitude, coords.longitude, a.lat, a.lng) < 500,
    );
    if (nearby) {
      handleSelect(nearby);
      return;
    }

    // Save a new address for this location
    setSavingLocation(true);
    try {
      const saved: Address = await request("users/addresses", {
        method: "POST",
        body: JSON.stringify({
          label: label || "My Location",
          street: address || label || "My Location",
          lat: coords.latitude,
          lng: coords.longitude,
        }),
      });
      setAddresses((prev) => [saved, ...prev]);
      handleSelect(saved);
    } catch {
      // fall through — user can pick manually
    } finally {
      setSavingLocation(false);
    }
  }, [currentLocation, addresses]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Sheet */}
        <View style={[styles.sheet, { backgroundColor: surface }]}>
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Delivery Address</ThemedText>
              <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
                Where should we send your order?
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: surfaceSubtle }]}
              hitSlop={8}
            >
              <IconSymbol name="xmark" size={14} color={textPrimary} />
            </Pressable>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={primary} />
              <ThemedText
                style={[styles.loadingText, { color: textSecondary }]}
              >
                Loading addresses...
              </ThemedText>
            </View>
          ) : addresses.length === 0 && !currentLocation ? (
            <View style={styles.emptyState}>
              <View
                style={[styles.emptyIcon, { backgroundColor: primary + "12" }]}
              >
                <IconSymbol name="location" size={36} color={primary} />
              </View>
              <ThemedText style={styles.emptyTitle}>
                No saved addresses
              </ThemedText>
              <ThemedText
                style={[styles.emptySubtitle, { color: textSecondary }]}
              >
                Add a delivery address to continue with your order
              </ThemedText>
              <Pressable
                style={[styles.addBtn, { backgroundColor: primary }]}
                onPress={() => {
                  onClose();
                  router.push("/(settings)/addresses");
                }}
              >
                <IconSymbol name="plus" size={18} color="#fff" />
                <ThemedText style={styles.addBtnText}>
                  Add New Address
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {/* ── Current app location at the very top ── */}
                {currentLocation && (
                  <Pressable
                    style={[
                      styles.addressCard,
                      {
                        backgroundColor: primary + "0D",
                        borderColor: primary + "60",
                        borderWidth: 1.5,
                        marginBottom: 10,
                      },
                    ]}
                    onPress={handleSelectCurrentLocation}
                    disabled={savingLocation}
                  >
                    <View
                      style={[styles.addressIcon, { backgroundColor: primary }]}
                    >
                      {savingLocation ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <IconSymbol
                          name="location.fill"
                          size={18}
                          color="#fff"
                        />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <ThemedText
                        style={[styles.addressLabel, { color: primary }]}
                      >
                        {currentLocation.label || "My Location"}
                      </ThemedText>
                      <ThemedText
                        style={[styles.addressStreet, { color: textSecondary }]}
                        numberOfLines={2}
                      >
                        {currentLocation.address}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.defaultBadge,
                        { backgroundColor: primary + "18" },
                      ]}
                    >
                      <ThemedText
                        style={[styles.defaultText, { color: primary }]}
                      >
                        Current
                      </ThemedText>
                    </View>
                  </Pressable>
                )}

                {addresses.map((addr) => {
                  const isSelected = tentativeId === addr.id;
                  return (
                    <Pressable
                      key={addr.id}
                      style={[
                        styles.addressCard,
                        {
                          backgroundColor: isSelected
                            ? primary + "0D"
                            : surfaceCard,
                          borderColor: isSelected ? primary : borderColor,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => handleSelect(addr)}
                    >
                      {/* Icon */}
                      <View
                        style={[
                          styles.addressIcon,
                          {
                            backgroundColor: isSelected
                              ? primary
                              : surfaceSubtle,
                          },
                        ]}
                      >
                        <IconSymbol
                          name="location.fill"
                          size={18}
                          color={isSelected ? "#fff" : primary}
                        />
                      </View>

                      {/* Text */}
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={styles.labelRow}>
                          <ThemedText style={styles.addressLabel}>
                            {addr.label}
                          </ThemedText>
                          {addr.isDefault && (
                            <View
                              style={[
                                styles.defaultBadge,
                                { backgroundColor: primary + "18" },
                              ]}
                            >
                              <ThemedText
                                style={[styles.defaultText, { color: primary }]}
                              >
                                Default
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <ThemedText
                          style={[
                            styles.addressStreet,
                            { color: textSecondary },
                          ]}
                          numberOfLines={2}
                        >
                          {addr.street}
                        </ThemedText>
                      </View>

                      {/* Checkmark */}
                      {isSelected && (
                        <IconSymbol
                          name="checkmark.circle.fill"
                          size={22}
                          color={primary}
                        />
                      )}
                    </Pressable>
                  );
                })}

                {/* Add new address row */}
                <Pressable
                  style={[
                    styles.addAddressRow,
                    { borderColor: primary + "50" },
                  ]}
                  onPress={() => {
                    onClose();
                    router.push("/(settings)/addresses");
                  }}
                >
                  <IconSymbol
                    name="plus.circle.fill"
                    size={20}
                    color={primary}
                  />
                  <ThemedText
                    style={[styles.addAddressText, { color: primary }]}
                  >
                    Add New Address
                  </ThemedText>
                </Pressable>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "82%",
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  center: {
    padding: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 12,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
  },
  addressIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  defaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: "700",
  },
  addressStreet: {
    fontSize: 13,
    lineHeight: 18,
  },
  addAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 4,
    marginBottom: 4,
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  selectedPreview: {
    fontSize: 12,
    textAlign: "center",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
