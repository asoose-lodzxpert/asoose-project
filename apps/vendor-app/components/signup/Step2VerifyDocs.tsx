import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
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
  const [uploadState, setUploadState] = useState<UploadState>({});

  const pickFile = async (key: keyof SignupStep2Data) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      if (file.size && file.size > MAX_SIZE) {
        Toast.show({
          type: "error",
          text1: "File too large",
          text2: "Maximum file size is 5MB",
        });
        return;
      }

      // Set uploading state
      setUploadState((prev) => ({
        ...prev,
        [key]: { uploading: true, progress: 0 },
      }));

      // Upload file to backend
      const url = await uploadFile(
        {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        },
        (progress: UploadProgress) => {
          setUploadState((prev) => ({
            ...prev,
            [key]: { uploading: true, progress: progress.percentage },
          }));
        }
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
        text2: error instanceof Error ? error.message : "Failed to upload file",
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
                  <View style={styles.progressBarContainer}>
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
                    color={uploaded ? "#22C55E" : "#9CA3AF"}
                  />

                  <ThemedText style={styles.uploadText}>
                    {uploaded
                      ? "File uploaded successfully"
                      : "Tap to upload or drag & drop"}
                  </ThemedText>

                  <ThemedText style={styles.hintText}>
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
    borderColor: "#D1D5DB",
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
    color: "#9CA3AF",
  },
  removeButton: {
    marginTop: 6,
  },
  progressBarContainer: {
    width: "80%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
});
