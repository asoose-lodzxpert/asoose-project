import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Toast from "react-native-toast-message";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SignupStep2Data } from "@/types/signup";
import { useThemeColor } from "@/hooks/use-theme-color";
import { uploadFile, UploadProgress } from "@/services/storage.service";

interface Step2Props {
  data: SignupStep2Data;
  onChange: <K extends keyof SignupStep2Data>(key: K, value: string) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;

type UploadState = {
  [K in keyof SignupStep2Data]?: {
    uploading: boolean;
    progress: number;
  };
};

export const Step2VerifyDocs: React.FC<Step2Props> = ({ data, onChange }) => {
  const primary = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const textMuted = useThemeColor({}, "textMuted");
  const borderDefault = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const [uploadState, setUploadState] = useState<UploadState>({});

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
        },
      );

      onChange(key, url);

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

  const removeFile = (key: keyof SignupStep2Data) => {
    onChange(key, "");
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText type="title">Verify Your Business</ThemedText>
      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
        Upload your documents for verification
      </ThemedText>

      {[
        { key: "businessRegCert", label: "Business Registration Certificate" },
        { key: "taxIdDoc", label: "Tax Identification Document" },
        { key: "proofOfAddress", label: "Proof of Address (Optional)" },
      ].map(({ key, label }) => {
        const value = data[key as keyof SignupStep2Data];
        const uploaded = Boolean(value);
        const state = uploadState[key as keyof SignupStep2Data];
        const isUploading = state?.uploading || false;
        const progress = state?.progress || 0;

        return (
          <View key={key} style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              {label}
            </ThemedText>

            <Pressable
              disabled={uploaded || isUploading}
              onPress={() => pickFile(key as keyof SignupStep2Data)}
              style={[
                styles.uploadCard,
                { borderColor: borderDefault },
                uploaded && {
                  borderColor: primary,
                  borderStyle: "solid",
                  opacity: 0.9,
                },
                isUploading && {
                  borderColor: primary,
                  borderStyle: "solid",
                  opacity: 0.7,
                },
              ]}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator size="large" color={primary} />
                  <ThemedText style={styles.uploadText}>
                    Uploading... {progress}%
                  </ThemedText>
                  <View
                    style={[
                      styles.progressBarContainer,
                      { backgroundColor: surfaceSubtle },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${progress}%`, backgroundColor: primary },
                      ]}
                    />
                  </View>
                </>
              ) : (
                <>
                  <IconSymbol
                    size={32}
                    name={uploaded ? "check" : "cloud.upload"}
                    color={uploaded ? successColor : textMuted}
                  />

                  <ThemedText style={styles.uploadText}>
                    {uploaded
                      ? "File uploaded successfully"
                      : "Tap to upload or drag & drop"}
                  </ThemedText>

                  <ThemedText style={[styles.hintText, { color: textMuted }]}>
                    {uploaded
                      ? value?.split("/").pop()
                      : "PDF, JPG, PNG (max 5MB)"}
                  </ThemedText>

                  {uploaded && (
                    <Pressable
                      onPress={() => removeFile(key as keyof SignupStep2Data)}
                      style={styles.removeButton}
                    >
                      <ThemedText type="link">Remove</ThemedText>
                    </Pressable>
                  )}
                </>
              )}
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingBottom: 24,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  uploadCard: {
    height: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  uploadText: {
    fontSize: 15,
    textAlign: "center",
  },
  hintText: {
    fontSize: 12,
    textAlign: "center",
  },
  removeButton: {
    marginTop: 6,
  },
  progressBarContainer: {
    width: "80%",
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
});
