import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  Alert,
} from "react-native";
import { AddContactModalProps } from "./AddContactModal.types";
import { RideContactService } from "@/services/ride-contact.service";

// iOS — native pageSheet (also used for editing when `contact` prop is provided)
export default function AddContactModal({
  visible,
  contact,
  onClose,
  onConfirm,
}: AddContactModalProps) {
  const isEditMode = !!contact;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [save, setSave] = useState(true);
  const [loading, setLoading] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setLabel(contact.label ?? "");
    } else {
      setName("");
      setPhone("");
      setLabel("");
      setSave(true);
    }
  }, [contact, visible]);

  const handleConfirm = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Missing info", "Please enter a name and phone number.");
      return;
    }

    try {
      setLoading(true);
      let contactId: string | undefined;

      if (isEditMode && contact) {
        // Update existing
        const updated = await RideContactService.update(contact.id, {
          name: name.trim(),
          phone: phone.trim(),
          label: label.trim() || undefined,
        });
        contactId = updated.id;
      } else if (save) {
        // Create new saved contact
        const created = await RideContactService.create({
          name: name.trim(),
          phone: phone.trim(),
          label: label.trim() || undefined,
        });
        contactId = created.id;
      }

      onConfirm(name.trim(), phone.trim(), contactId);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save contact.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.handle} />

        <Text style={styles.title}>{isEditMode ? "Edit Contact" : "New Contact"}</Text>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+2348012345678"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Label (optional)</Text>
        <TextInput
          style={styles.input}
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Mum, Office, Friend"
          placeholderTextColor="#9CA3AF"
          returnKeyType="done"
        />

        {!isEditMode && (
          <View style={styles.saveRow}>
            <Text style={styles.saveText}>Save for future rides</Text>
            <Switch
              value={save}
              onValueChange={setSave}
              trackColor={{ true: "#6366F1" }}
              thumbColor="#fff"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.cta, loading && styles.ctaDisabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          <Text style={styles.ctaText}>
            {loading ? "Saving…" : isEditMode ? "Update Contact" : "Use this Contact"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FAFAFA",
    marginBottom: 16,
  },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 4,
  },
  saveText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  cta: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelText: { fontSize: 14, color: "#6B7280" },
});
