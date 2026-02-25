import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { IconSymbol } from "./ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import Toast from "react-native-toast-message";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

export interface ModifierSelectionModalProps {
  visible: boolean;
  modifierGroups: ModifierGroup[] | undefined;
  basePrice: number;
  quantity: number;
  productName: string;
  onConfirm: (selectedGroups: { [groupId: string]: string[] }) => void;
  onCancel: () => void;
}

export const ModifierSelectionModal: React.FC<ModifierSelectionModalProps> = ({
  visible,
  modifierGroups,
  basePrice,
  quantity,
  productName,
  onConfirm,
  onCancel,
}) => {
  const primary = useThemeColor({}, "brandPrimary");
  const secondary = useThemeColor({}, "surfaceCard");
  const textColor = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const borderColor = useThemeColor({}, "borderDefault");
  const statusError = useThemeColor({}, "statusError");
  const statusSuccess = useThemeColor({}, "statusSuccess");

  const [selectedModifiers, setSelectedModifiers] = useState<{
    [groupId: string]: string[];
  }>({});

  // Reset selections when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setSelectedModifiers({});
    }
  }, [visible]);

  const toggleModifier = useCallback(
    (groupId: string, modifierId: string, maxSelect: number) => {
      setSelectedModifiers((prev) => {
        const currentGroup = prev[groupId] || [];
        const isSelected = currentGroup.includes(modifierId);

        if (isSelected) {
          return {
            ...prev,
            [groupId]: currentGroup.filter((id) => id !== modifierId),
          };
        } else {
          if (maxSelect === 1) {
            return { ...prev, [groupId]: [modifierId] };
          }
          if (currentGroup.length >= maxSelect) {
            return prev;
          }
          return { ...prev, [groupId]: [...currentGroup, modifierId] };
        }
      });
    },
    [],
  );

  const isValid = useMemo(() => {
    if (!modifierGroups || modifierGroups.length === 0) return true;

    return modifierGroups.every((group) => {
      const count = (selectedModifiers[group.id] || []).length;
      return count >= group.minSelect;
    });
  }, [modifierGroups, selectedModifiers]);

  const modifierPrice = useMemo(() => {
    if (!modifierGroups) return 0;

    let total = 0;
    modifierGroups.forEach((group) => {
      const selectedIds = selectedModifiers[group.id] || [];
      const groupModifiers = group.modifiers.filter((m) =>
        selectedIds.includes(m.id),
      );
      total += groupModifiers.reduce((sum, m) => sum + m.price, 0);
    });

    return total;
  }, [modifierGroups, selectedModifiers]);

  const totalPrice = (basePrice + modifierPrice) * quantity;

  const handleConfirm = () => {
    if (!isValid) {
      Toast.show({
        type: "error",
        text1: "Please complete modifier selections",
      });
      return;
    }
    onConfirm(selectedModifiers);
  };

  if (!modifierGroups || modifierGroups.length === 0) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ThemedView style={styles.centeredView}>
        <View
          style={[
            styles.modalView,
            {
              backgroundColor: secondary,
              minHeight: SCREEN_HEIGHT * 0.45,
              maxHeight: SCREEN_HEIGHT * 0.85,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
              {productName}
            </ThemedText>
            <Pressable onPress={onCancel} style={styles.closeBtn}>
              <ThemedText style={{ fontSize: 24 }}>×</ThemedText>
            </Pressable>
          </View>

          {/* Modifiers */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {modifierGroups.map((group, idx) => {
              const selectedCount = (selectedModifiers[group.id] || []).length;
              const isGroupRequired = group.minSelect > 0;
              const isFull = selectedCount >= group.maxSelect;

              return (
                <View key={group.id} style={styles.modifierGroup}>
                  <View style={styles.groupHeader}>
                    <ThemedText type="defaultSemiBold">
                      {group.name}
                      {isGroupRequired && (
                        <ThemedText style={{ color: statusError }}>
                          *
                        </ThemedText>
                      )}
                    </ThemedText>
                    <ThemedText style={{ color: textMuted, fontSize: 12 }}>
                      Select {group.minSelect}-{group.maxSelect}
                    </ThemedText>
                  </View>

                  {group.modifiers.map((modifier) => {
                    const isSelected = selectedModifiers[group.id]?.includes(
                      modifier.id,
                    );
                    const isDisabled =
                      !isSelected && isFull && selectedCount >= group.maxSelect;

                    return (
                      <Pressable
                        key={modifier.id}
                        onPress={() =>
                          !isDisabled &&
                          toggleModifier(group.id, modifier.id, group.maxSelect)
                        }
                        style={[
                          styles.modifierItem,
                          {
                            borderColor,
                            opacity: isDisabled ? 0.5 : 1,
                          },
                        ]}
                        disabled={isDisabled}
                      >
                        <View style={styles.checkbox}>
                          {isSelected && (
                            <IconSymbol
                              name="checkmark.circle.fill"
                              size={24}
                              color={primary}
                            />
                          )}
                          {!isSelected && (
                            <View
                              style={[styles.checkboxEmpty, { borderColor }]}
                            />
                          )}
                        </View>
                        <View style={styles.modifierContent}>
                          <ThemedText style={{ flex: 1 }}>
                            {modifier.name}
                          </ThemedText>
                          {modifier.price > 0 && (
                            <ThemedText style={{ color: primary }}>
                              +₦{modifier.price.toFixed(2)}
                            </ThemedText>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <View>
              <ThemedText style={{ color: textMuted, fontSize: 12 }}>
                Total
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
                ₦{totalPrice.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.cancelBtn]}
                onPress={onCancel}
              >
                <ThemedText style={{ color: primary }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.btn,
                  styles.confirmBtn,
                  {
                    backgroundColor: isValid ? primary : `${primary}99`,
                  },
                ]}
                onPress={handleConfirm}
                disabled={!isValid}
              >
                <ThemedText style={{ color: "white", fontWeight: "600" }}>
                  Add to Cart
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalView: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    // Flex column so the ScrollView fills space between the sticky header and footer
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  closeBtn: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    // flexGrow fills available space; flexShrink allows compression when near maxHeight
    flexGrow: 1,
    flexShrink: 1,
  },
  modifierGroup: {
    marginBottom: 20,
  },
  groupHeader: {
    marginBottom: 12,
  },
  modifierItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxEmpty: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
  },
  modifierContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  confirmBtn: {
    paddingHorizontal: 20,
  },
});
