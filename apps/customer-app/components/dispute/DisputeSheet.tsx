/**
 * DisputeSheet – reusable bottom-sheet component for filing a new dispute.
 * Supports up to 2 evidence images (minimum 1 required).
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  createDispute,
  uploadDisputeImage,
  Dispute,
} from "@/services/dispute.service";

const ORDER_REASONS = [
  "Missing Item",
  "Wrong Item Delivered",
  "Late Delivery",
  "Item Quality Issue",
  "Damaged Item",
  "Other",
];

const RIDE_REASONS = [
  "Driver Behaviour",
  "Wrong Route",
  "Overcharged",
  "Safety Issue",
  "Late Pickup",
  "Other",
];

const DELIVERY_REASONS = [
  "Package Damaged",
  "Package Not Delivered",
  "Wrong Address",
  "Late Delivery",
  "Item Missing",
  "Other",
];

interface DisputeSheetProps {
  visible: boolean;
  onClose: () => void;
  /** ID shown in the sub-title of the modal */
  entityLabel: string;
  /** Pass exactly one of these */
  orderId?: string;
  rideId?: string;
  deliveryId?: string;
  onDisputeFiled: (dispute: Dispute) => void;
}

export function DisputeSheet({
  visible,
  onClose,
  entityLabel,
  orderId,
  rideId,
  deliveryId,
  onDisputeFiled,
}: DisputeSheetProps) {
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const surface = useThemeColor({}, "surfaceBackground");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textColor = useThemeColor({}, "textPrimary");

  const REASONS = orderId
    ? ORDER_REASONS
    : rideId
      ? RIDE_REASONS
      : DELIVERY_REASONS;

  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setDescription("");
    setImages([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async (slot: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({
        type: "error",
        text1: "Permission required",
        text2: "Please allow access to your photo library.",
      });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets[0]) {
      const newImages = [...images];
      newImages[slot] = res.assets[0].uri;
      setImages(newImages);
    }
  };

  const removeImage = (slot: number) => {
    const newImages = [...images];
    newImages.splice(slot, 1);
    setImages(newImages);
  };

  const handleSubmit = async () => {
    if (!reason) {
      Toast.show({ type: "error", text1: "Select a reason" });
      return;
    }
    if (description.trim().length < 10) {
      Toast.show({
        type: "error",
        text1: "Description too short",
        text2: "Please describe the issue in more detail.",
      });
      return;
    }
    if (images.length === 0 || !images[0]) {
      Toast.show({
        type: "error",
        text1: "Evidence image required",
        text2: "Please add at least 1 evidence image.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const uri of images.filter(Boolean)) {
        const url = await uploadDisputeImage(uri);
        uploadedUrls.push(url);
      }
      const filed = await createDispute({
        reason,
        description: description.trim(),
        orderId,
        rideId,
        deliveryId,
        evidenceImages: uploadedUrls as any,
      });
      Toast.show({
        type: "success",
        text1: "Dispute filed",
        text2: "Our team will review and get back to you shortly.",
      });
      reset();
      onClose();
      onDisputeFiled(filed);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to file dispute",
        text2: err?.message ?? "Please try again or contact support.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: card }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: border }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <ThemedText style={styles.sheetTitle}>File a Dispute</ThemedText>
            <Pressable onPress={handleClose}>
              <IconSymbol name="xmark" size={20} color={textSecondary} />
            </Pressable>
          </View>
          <ThemedText style={[styles.sheetSubtitle, { color: textSecondary }]}>
            {entityLabel}
          </ThemedText>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Reason */}
            <ThemedText style={[styles.label, { color: textSecondary }]}>
              REASON
            </ThemedText>
            <View style={styles.reasonGrid}>
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setReason(r)}
                  style={[
                    styles.chip,
                    {
                      borderColor: reason === r ? brandPrimary : border,
                      backgroundColor:
                        reason === r ? brandPrimary + "18" : "transparent",
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: reason === r ? brandPrimary : textSecondary,
                        fontWeight: reason === r ? "700" : "400",
                      },
                    ]}
                  >
                    {r}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <ThemedText style={[styles.label, { color: textSecondary }]}>
              DESCRIBE THE ISSUE
            </ThemedText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Tell us exactly what went wrong…"
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={[
                styles.textArea,
                {
                  color: textColor,
                  borderColor: border,
                  backgroundColor: surface,
                },
              ]}
            />

            {/* Evidence Images */}
            <ThemedText style={[styles.label, { color: textSecondary }]}>
              EVIDENCE IMAGES (MIN 1, MAX 2)
            </ThemedText>
            <View style={styles.imageRow}>
              {[0, 1].map((slot) => (
                <TouchableOpacity
                  key={slot}
                  onPress={() => pickImage(slot)}
                  style={[
                    styles.imageSlot,
                    {
                      borderColor: images[slot] ? brandPrimary : border,
                      backgroundColor: images[slot] ? "transparent" : subtle,
                    },
                  ]}
                >
                  {images[slot] ? (
                    <>
                      <Image
                        source={{ uri: images[slot] }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => removeImage(slot)}
                      >
                        <IconSymbol name="xmark" size={10} color="#fff" />
                      </Pressable>
                    </>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <IconSymbol
                        name="camera.fill"
                        size={24}
                        color={textSecondary}
                      />
                      <ThemedText
                        style={[styles.imageHint, { color: textSecondary }]}
                      >
                        {slot === 0 ? "Required" : "Optional"}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: brandPrimary,
                  opacity: submitting ? 0.6 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitBtnText}>
                  Submit Dispute
                </ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Small card shown in history detail screens when a dispute already exists */
export function ExistingDisputeCard({
  dispute,
  onPress,
}: {
  dispute: Dispute;
  onPress: () => void;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  const STATUS_COLORS: Record<string, string> = {
    OPEN: "#F59E0B",
    IN_REVIEW: "#3B82F6",
    RESOLVED: "#10B981",
    REJECTED: "#EF4444",
    CLOSED: "#6B7280",
  };
  const color = STATUS_COLORS[dispute.status] ?? "#F59E0B";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.existingCard,
        { backgroundColor: color + "10", borderColor: color + "40" },
      ]}
    >
      <View style={styles.existingRow}>
        <IconSymbol
          name="exclamationmark.circle.fill"
          size={18}
          color={color}
        />
        <ThemedText style={[styles.existingTitle, { color }]}>
          Dispute Filed
        </ThemedText>
        <View style={[styles.badge, { backgroundColor: color + "20" }]}>
          <ThemedText style={[styles.badgeText, { color }]}>
            {dispute.status.replace("_", " ")}
          </ThemedText>
        </View>
      </View>
      <ThemedText
        style={[styles.existingReason, { color: textSecondary }]}
        numberOfLines={2}
      >
        {dispute.reason}
      </ThemedText>
      <View style={styles.existingFooter}>
        <ThemedText style={[styles.viewLink, { color: primary }]}>
          View Dispute
        </ThemedText>
        <IconSymbol name="chevron.right" size={14} color={primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: "92%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 20, fontWeight: "800" },
  sheetSubtitle: { fontSize: 12, fontWeight: "600", marginBottom: 24 },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13 },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 120,
    marginBottom: 24,
  },
  imageRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  imageSlot: {
    width: 110,
    height: 110,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholder: { alignItems: "center", gap: 4 },
  imageHint: { fontSize: 11 },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  submitBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  // Existing dispute card
  existingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  existingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  existingTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  existingReason: { fontSize: 13, lineHeight: 18 },
  existingFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewLink: { fontSize: 13, fontWeight: "600" },
});
