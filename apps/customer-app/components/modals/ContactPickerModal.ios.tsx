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

// iOS — native pageSheet
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
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Choose a Passenger</Text>
          <View style={{ width: 32 }} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#6366F1" />
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
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
      <TouchableOpacity onPress={onMenu} hitSlop={12} style={styles.menuBtn}>
        <Text style={styles.menuDots}>⋮</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 18, color: "#6B7280" },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#6366F1" },
  rowName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  rowLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "400" },
  rowPhone: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  menuBtn: { paddingHorizontal: 8 },
  menuDots: { fontSize: 22, color: "#9CA3AF" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6366F1",
  },
});
