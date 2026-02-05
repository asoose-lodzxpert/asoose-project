import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Address } from "@/types/address";
import { request } from "@/lib/authFetch";

interface AddressSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: Address) => void;
  selectedAddressId?: string;
}

export function AddressSelectionModal({
  visible,
  onClose,
  onSelect,
  selectedAddressId,
}: AddressSelectionModalProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  const accent = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderDefault");

  useEffect(() => {
    if (visible) {
      loadAddresses();
    }
  }, [visible]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const response = await request("users/addresses", { method: "GET" });
      setAddresses(response || []);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.modalContent, { backgroundColor: surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle">Select Delivery Address</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={textPrimary} />
            </Pressable>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accent} />
            </View>
          ) : addresses.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="location" size={48} color={borderColor} />
              <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
                No saved addresses
              </ThemedText>
              <Pressable
                style={[styles.addButton, { backgroundColor: accent }]}
                onPress={() => {
                  onClose();
                  // Navigate to add address screen
                }}
              >
                <IconSymbol name="plus" size={20} color="#fff" />
                <ThemedText style={styles.addButtonText}>
                  Add New Address
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={styles.addressList}>
              {addresses.map((address) => (
                <Pressable
                  key={address.id}
                  style={[
                    styles.addressItem,
                    { backgroundColor: surfaceCard, borderColor },
                    selectedAddressId === address.id && {
                      borderColor: accent,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => onSelect(address)}
                >
                  <View style={styles.addressContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor:
                            selectedAddressId === address.id
                              ? accent
                              : surfaceSubtle,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="location.fill"
                        size={20}
                        color={
                          selectedAddressId === address.id ? "#fff" : accent
                        }
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.labelRow}>
                        <ThemedText style={styles.addressLabel}>
                          {address.label}
                        </ThemedText>
                        {address.isDefault && (
                          <View
                            style={[
                              styles.defaultBadge,
                              { backgroundColor: surfaceSubtle },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.defaultText,
                                { color: textSecondary },
                              ]}
                            >
                              Default
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText
                        style={[styles.addressText, { color: textSecondary }]}
                        numberOfLines={2}
                      >
                        {address.address}
                      </ThemedText>
                    </View>

                    {selectedAddressId === address.id && (
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={24}
                        color={accent}
                      />
                    )}
                  </View>
                </Pressable>
              ))}

              <Pressable
                style={[
                  styles.addAddressButton,
                  { backgroundColor: surfaceCard, borderColor },
                ]}
                onPress={() => {
                  onClose();
                  // Navigate to add address screen
                }}
              >
                <IconSymbol name="plus.circle.fill" size={20} color={accent} />
                <ThemedText style={[styles.addAddressText, { color: accent }]}>
                  Add New Address
                </ThemedText>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },

  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  emptyState: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },

  emptyText: {
    fontSize: 15,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },

  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  addressList: {
    paddingHorizontal: 20,
  },

  addressItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  addressContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  addressLabel: {
    fontSize: 16,
    fontWeight: "700",
  },

  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  defaultText: {
    fontSize: 11,
    fontWeight: "600",
  },

  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },

  addAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 8,
  },

  addAddressText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
