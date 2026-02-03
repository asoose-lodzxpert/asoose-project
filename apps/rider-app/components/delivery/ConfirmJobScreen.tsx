import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as ImagePicker from "expo-image-picker";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

export default function ConfirmJobScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const { activeJob, completeJob } = useJobs();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");

  // Lock portrait for this screen
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  if (!activeJob) return null;
  const isRide = activeJob.jobType === "ride";

  // Only require photo for delivery
  const handleComplete = async () => {
    if (!isRide && !photoUri) return;
    await completeJob(!isRide ? { photoUri } : undefined);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.back,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: surface }]}>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <ThemedText type="title" style={{ color: primary }}>
          {isRide ? "COMPLETE RIDE" : "CONFIRM DELIVERY"}
        </ThemedText>

        {/* Customer info */}
        <View style={styles.customerCard}>
          <View style={[styles.avatar, { backgroundColor: primary }]}>
            <ThemedText style={styles.avatarText}>
              {activeJob.customerName
                ? activeJob.customerName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                : ""}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">
              {activeJob.customerName || ""}
            </ThemedText>
            <ThemedText style={{ color: "#666" }}>
              {activeJob.dropoffAddress?.address ||
                activeJob.dropoffAddress ||
                ""}
            </ThemedText>
          </View>
        </View>

        {/* Photo required for delivery only */}
        {!isRide && (
          <Pressable
            style={[
              styles.photoCard,
              { borderColor: primary },
              photoUri ? { borderStyle: "solid" } : {},
            ]}
            onPress={takePhoto}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri as string }}
                style={styles.photoPreview}
              />
            ) : (
              <>
                <IconSymbol name="camera.fill" size={52} color={primary} />
                <ThemedText style={{ color: primary, marginTop: 8 }}>
                  Take delivery photo *
                </ThemedText>
              </>
            )}
          </Pressable>
        )}

        {/* Complete button */}
        <Pressable
          style={[
            styles.completeBtn,
            !isRide && !photoUri ? { opacity: 0.5 } : {},
          ]}
          disabled={!isRide && !photoUri}
          onPress={handleComplete}
        >
          <IconSymbol name="checkmark" size={20} color="#fff" />
          <ThemedText style={styles.completeText}>
            {isRide ? "COMPLETE RIDE" : "COMPLETE DELIVERY"}
          </ThemedText>
        </Pressable>

        {!isRide && (
          <ThemedText style={styles.hint}>
            Photo at delivery location is required
          </ThemedText>
        )}
      </View>
    </View>
  );
}

/* ───────────────── styles ───────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },

  card: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    gap: 20,
  },

  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },

  photoCard: {
    height: 180,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  photoPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },

  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 18,
  },

  completeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  hint: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
});
