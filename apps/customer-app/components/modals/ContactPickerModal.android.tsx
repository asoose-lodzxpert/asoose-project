import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { ContactPickerModalProps } from "./ContactPickerModal.types";
import { RideContact } from "@/services/ride-contact.service";

// Android — transparent slide-up sheet
export default function ContactPickerModal({
  visible,
  contacts,
  loading,
  onClose,
  onSelect,
  onAddNew,
  onMenuPress,
}: ContactPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Choose a Passenger</Text>
          <View style={{ width: 32 }} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color="#6366F1" />
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(c) => c.id}
            style={{ maxHeight: 380 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            renderItem={({ item }) => (
              <ContactRow
                contact={item}
                onSelect={() => onSelect(item)}
                onMenu={() => onMenuPress(item)}
              />
            )}
            ListFooterComponent={
              <TouchableOpacity style={styles.addBtn} onPress={onAddNew}>
                <Text style={styles.addBtnText}>＋ Add new contact</Text>
              </TouchableOpacity>
            }
          />
        )}
      </View>
    </Modal>
  );
}

function ContactRow({
  contact,
  onSelect,
  onMenu,
}: {
  contact: RideContact;
  onSelect: () => void;
  onMenu: () => void;
}) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowMain} onPress={onSelect}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{contact.name[0]?.toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.rowName}>
            {contact.name}
            {contact.label ? <Text style={styles.rowLabel}>  {contact.label}</Text> : null}
          </Text>
          <Text style={styles.rowPhone}>{contact.phone}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onMenu} hitSlop={12}>
        <Text style={styles.menuDots}>⋮</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backText: { fontSize: 18, color: "#6B7280" },
  title: { fontSize: 17, fontWeight: "700", color: "#111827" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700", color: "#6366F1" },
  rowName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  rowLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "400" },
  rowPhone: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  menuDots: { fontSize: 22, color: "#9CA3AF", paddingHorizontal: 6 },
  addBtn: {
    paddingVertical: 14,
  },
  addBtnText: { fontSize: 14, fontWeight: "600", color: "#6366F1" },
});
