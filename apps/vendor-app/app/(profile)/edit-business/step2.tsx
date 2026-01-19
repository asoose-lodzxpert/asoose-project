import Toast from "react-native-toast-message";
import { getBusinessDetails } from "@/services/business-details.service";
import { updateBusinessDocuments } from "@/services/business.service";
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { uploadFile, UploadProgress } from "@/services/storage.service";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { SignupStep2Data } from "@/types/signup";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

type UploadState = {
  [K in keyof SignupStep2Data]?: {
    uploading: boolean;
    progress: number;
  };
};

export default function EditBusinessDocumentsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");

  const [data, setData] = useState<SignupStep2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const details = await getBusinessDetails();
        if (mounted && details?.step2) {
          setData({
            businessRegCert: details.step2.businessRegCert || "",
            taxIdDoc: details.step2.taxIdDoc || "",
            proofOfAddress: details.step2.proofOfAddress || "",
          });
        }
      } catch (err) {
        Toast.show({ type: "error", text1: "Failed to load documents" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** Handle file pick */
  const pickFile = async (key: keyof SignupStep2Data) => {
    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Toast.show({
          type: "error",
          text1: "Permission required",
          text2: "Please allow access to your photo library",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;

      const image = result.assets[0];

      // Check file size using expo-file-system
      try {
        const file = new FileSystem.File(image.uri);
        const fileInfo = await file.info();

        if (fileInfo.exists && fileInfo.size) {
          if (fileInfo.size > MAX_SIZE) {
            Toast.show({
              type: "error",
              text1: "File too large",
              text2: `Maximum file size is 5MB. Your file is ${(
                fileInfo.size /
                1024 /
                1024
              ).toFixed(2)}MB`,
            });
            return;
          }
        }
      } catch (sizeError) {
        // Continue anyway if we can't check size
      }

      // Set uploading state
      setUploadState((prev) => ({
        ...prev,
        [key]: { uploading: true, progress: 0 },
      }));

      // Upload image to backend
      const url = await uploadFile(
        {
          uri: image.uri,
          name: `document-${Date.now()}.jpg`,
          type: "image/jpeg",
        },
        (progress: UploadProgress) => {
          setUploadState((prev) => ({
            ...prev,
            [key]: { uploading: true, progress: progress.percentage },
          }));
        }
      );

      setData((prev) => (prev ? { ...prev, [key]: url } : prev));

      setUploadState((prev) => ({
        ...prev,
        [key]: { uploading: false, progress: 100 },
      }));
    } catch (error) {
      setUploadState((prev) => ({
        ...prev,
        [key]: { uploading: false, progress: 0 },
      }));

      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2:
          error instanceof Error ? error.message : "Failed to upload image",
      });
    }
  };

  /** Remove uploaded file */
  const removeFile = (key: keyof SignupStep2Data) => {
    setData((prev) => (prev ? { ...prev, [key]: "" } : prev));
  };
  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await updateBusinessDocuments({
        businessRegCert: data.businessRegCert,
        taxIdDoc: data.taxIdDoc,
        proofOfAddress: data.proofOfAddress,
      });
      Toast.show({ type: "success", text1: "Documents updated" });
      router.back();
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to update documents" });
    } finally {
      setSaving(false);
    }
  };

  /** Render single document card */
  const renderDocCard = (
    key: keyof SignupStep2Data,
    label: string,
    optional?: boolean
  ) => {
    const value = data?.[key];
    const uploaded = Boolean(value);
    const state = uploadState[key];
    const isUploading = state?.uploading || false;

    return (
      <View style={[styles.card, { backgroundColor: surface }]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <ThemedText type="defaultSemiBold">
            {label} {optional && "(Optional)"}
          </ThemedText>

          {uploaded && !isUploading && (
            <Pressable onPress={() => removeFile(key)}>
              <ThemedText type="link">Remove</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Upload area */}
        <Pressable
          onPress={() => !isUploading && pickFile(key)}
          style={[
            styles.uploadBox,
            {
              borderColor: uploaded ? primary : border,
              borderStyle: uploaded ? "solid" : "dashed",
            },
          ]}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size="large" color={primary} />
              <ThemedText style={styles.uploadText}>
                Uploading... {state?.progress || 0}%
              </ThemedText>
            </>
          ) : (
            <>
              <IconSymbol
                size={32}
                name={uploaded ? "check" : "cloud.upload"}
                color={uploaded ? "#22C55E" : "#9CA3AF"}
              />

              <ThemedText style={styles.uploadText}>
                {uploaded ? "Image uploaded" : "Tap to upload image"}
              </ThemedText>

              <ThemedText style={styles.hintText}>
                {uploaded ? "Tap to change image" : "JPG or PNG (recommended)"}
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  if (loading || !data) {
    return (
      <ThemedView style={{ flex: 1 }}>
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: border,
                opacity: 0.3,
              }}
            />
            <View
              style={{
                width: 60,
                height: 20,
                borderRadius: 4,
                backgroundColor: border,
                opacity: 0.3,
              }}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Skeleton */}
          <View
            style={{
              width: 250,
              height: 24,
              borderRadius: 4,
              backgroundColor: border,
              opacity: 0.3,
            }}
          />

          {/* Document Cards Skeleton */}
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.card,
                {
                  backgroundColor: surface,
                  borderWidth: 1,
                  borderColor: border,
                },
              ]}
            >
              {/* Card Header */}
              <View
                style={{
                  width: 200,
                  height: 18,
                  borderRadius: 4,
                  backgroundColor: border,
                  opacity: 0.3,
                }}
              />

              {/* Upload Box */}
              <View
                style={{
                  height: 140,
                  borderRadius: 12,
                  backgroundColor: border,
                  opacity: 0.3,
                }}
              />
            </View>
          ))}

          {/* Save Button Skeleton */}
          <View
            style={{
              marginTop: 24,
              height: 50,
              borderRadius: 14,
              backgroundColor: border,
              opacity: 0.3,
            }}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* ================= Header ================= */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText type="defaultSemiBold" style={{ color: primary }}>
            Back
          </ThemedText>
        </Pressable>
      </View>

      {/* ================= Content ================= */}
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="subtitle">
          Manage your verification documents
        </ThemedText>

        {renderDocCard("businessRegCert", "Business Registration Certificate")}

        {renderDocCard("taxIdDoc", "Tax Identification Document")}

        {renderDocCard("proofOfAddress", "Proof of Address", true)}

        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: primary,
              marginTop: 24,
              opacity: saving ? 0.7 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{ color: "#fff", textAlign: "center" }}
          >
            {saving ? "Saving..." : "Save changes"}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

/* ============================================================
   Styles
   ============================================================ */

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  container: {
    padding: 16,
    gap: 20,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  uploadBox: {
    height: 140,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadText: {
    fontSize: 15,
    textAlign: "center",
  },
  hintText: {
    fontSize: 12,
    textAlign: "center",
    color: "#9CA3AF",
  },
});
