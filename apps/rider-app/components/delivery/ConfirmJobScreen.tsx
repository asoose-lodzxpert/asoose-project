import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import CancelJobModal from "@/components/delivery/CancelJobModal";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

export default function ConfirmJobScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cancelVisible, setCancelVisible] = useState(false);
  const { activeJob, completeJob, cancelJob } = useJobs();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "statusError");

  if (!activeJob) return null;
  const isRide = activeJob.jobType === "ride";
  const dropoff = resolveAddress(activeJob.dropoffAddress);

  const handleComplete = async () => {
    if (!isRide && !photoUri) return;
    await completeJob(!isRide ? { photoUri } : undefined);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.back, quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
  };

  return (
    <>
      <View style={[styles.sheet, { backgroundColor: surface }]}>
        {/* Title */}
        <ThemedText style={[styles.title, { color: textPrimary }]}>
          {isRide ? "Complete ride" : "Confirm delivery"}
        </ThemedText>

        {/* Customer row */}
        <View style={[styles.customerCard, { backgroundColor: subtle }]}>
          <View style={[styles.avatar, { backgroundColor: primary }]}>
            <ThemedText style={styles.avatarText}>
              {activeJob.customerName?.split(" ").map((n: string) => n[0]).join("")}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.customerName, { color: textPrimary }]}>
              {activeJob.customerName}
            </ThemedText>
            {dropoff ? (
              <ThemedText style={[styles.dropoffText, { color: textMuted }]} numberOfLines={1}>
                {dropoff}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Photo (delivery only) */}
        {!isRide && (
          <Pressable
            style={[styles.photoCard, { borderColor: primary }]}
            onPress={takePhoto}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <>
                <IconSymbol name="camera.fill" size={28} color={primary} />
                <ThemedText style={[styles.photoHint, { color: primary }]}>
                  Take delivery photo
                </ThemedText>
              </>
            )}
          </Pressable>
        )}

        {/* Complete button */}
        <Pressable
          style={[
            styles.completeBtn,
            { backgroundColor: "#10B981", opacity: !isRide && !photoUri ? 0.4 : 1 },
          ]}
          disabled={!isRide && !photoUri}
          onPress={handleComplete}
        >
          <IconSymbol name="checkmark" size={18} color="#fff" />
          <ThemedText style={styles.completeBtnText}>
            {isRide ? "Complete ride" : "Complete delivery"}
          </ThemedText>
        </Pressable>

        {/* Cancel */}
        <Pressable style={styles.cancelLink} onPress={() => setCancelVisible(true)}>
          <ThemedText style={[styles.cancelText, { color: textMuted }]}>Cancel job</ThemedText>
        </Pressable>

        {!isRide && !photoUri && (
          <ThemedText style={[styles.hint, { color: textMuted }]}>
            Photo required to complete delivery
          </ThemedText>
        )}
      </View>

      <CancelJobModal
        visible={cancelVisible}
        onClose={() => setCancelVisible(false)}
        onConfirm={async (reason) => {
          await cancelJob(activeJob.id, activeJob.jobType, reason);
          setCancelVisible(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 36, gap: 12,
  },
  title: { fontSize: 15, fontWeight: "700" },
  customerCard: {
    flexDirection: "row", alignItems: "center",
    gap: 12, padding: 14, borderRadius: 14,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  customerName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  dropoffText: { fontSize: 13 },
  photoCard: {
    height: 130, borderWidth: 1.5, borderStyle: "dashed",
    borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 6,
  },
  photoPreview: { width: "100%", height: "100%", borderRadius: 12 },
  photoHint: { fontSize: 13 },
  completeBtn: {
    height: 50, borderRadius: 14, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  completeBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  cancelLink: { alignItems: "center", paddingVertical: 4 },
  cancelText: { fontSize: 13, fontWeight: "500" },
  hint: { fontSize: 12, textAlign: "center" },
});
