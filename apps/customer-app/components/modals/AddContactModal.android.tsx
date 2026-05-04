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
  Pressable,
  Alert,
} from "react-native";
import { AddContactModalProps } from "./AddContactModal.types";
import { RideContactService } from "@/services/ride-contact.service";

// Android — slide-up transparent sheet (same logic, different presentation)
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
        const updated = await RideContactService.update(contact.id, {
          name: name.trim(),
          phone: phone.trim(),
          label: label.trim() || undefined,
        });
        contactId = updated.id;
      } else if (save) {
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
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isEditMode ? "Edit Contact" : "New Contact"}</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+2348012345678"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Label (optional)</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Mum, Office"
            placeholderTextColor="#9CA3AF"
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
        </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 5 },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FAFAFA",
    marginBottom: 14,
  },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  saveText: { fontSize: 14, color: "#374151" },
  cta: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
