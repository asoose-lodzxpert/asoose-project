import React from "react";
import {
  Modal,
  StyleSheet,
  View,
  Pressable,
  FlatList,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface ItemDetail {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface JobItemDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  items?: ItemDetail[];
  packageDetails?: string;
}

export default function JobItemDetailsModal({
  visible,
  onClose,
  items,
  packageDetails,
}: JobItemDetailsModalProps) {
  const { top, bottom } = useSafeAreaInsets();
  const background = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const primary = useThemeColor({}, "brandPrimary");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const renderItem = ({ item }: { item: ItemDetail }) => (
    <View style={[styles.itemRow, { borderBottomColor: border }]}>
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: border }]}>
            <IconSymbol name="shippingbox" size={24} color={textMuted} />
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <ThemedText style={styles.itemName}>{item.name}</ThemedText>
        <ThemedText style={[styles.itemQty, { color: textMuted }]}>
          Quantity: {item.quantity}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: background, paddingTop: top }]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <ThemedText style={styles.headerTitle}>Item Details</ThemedText>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <IconSymbol name="close" size={28} color={textMuted} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {items && items.length > 0 ? (
            <FlatList
              data={items}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol name="shippingbox" size={48} color={textMuted} />
              <ThemedText style={[styles.emptyText, { color: textMuted }]}>
                {packageDetails || "No specific items listed"}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: bottom + 20 }]}>
          <Pressable
            style={[styles.footerCloseBtn, { backgroundColor: primary }]}
            onPress={onClose}
          >
            <ThemedText style={styles.footerCloseText}>Close</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 15,
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  itemQty: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  footerCloseBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerCloseText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
