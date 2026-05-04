import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { ContactActionModalProps } from "./ContactActionModal.types";

// Android — small slide-up card listing the same actions
export default function ContactActionModal({
  visible,
  contact,
  onClose,
  onEdit,
  onDelete,
}: ContactActionModalProps) {
  if (!contact) return null;

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

        {/* Contact identity */}
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactPhone}>{contact.phone}</Text>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.action} onPress={onEdit}>
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={styles.actionText}>Edit details</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={onDelete}>
          <Text style={styles.actionIcon}>🗑️</Text>
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.action} onPress={onClose}>
          <Text style={styles.actionIcon}>✕</Text>
          <Text style={styles.actionText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
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
    paddingHorizontal: 24,
    paddingBottom: 32,
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
  contactName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  contactPhone: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  actionIcon: { fontSize: 18, width: 24 },
  actionText: { fontSize: 15, color: "#111827", fontWeight: "500" },
  deleteText: { color: "#EF4444" },
});
