import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Toast from "react-native-toast-message";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SignupStep2Data } from "@/types/signup";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Step2Props {
  data: SignupStep2Data;
  onChange: <K extends keyof SignupStep2Data>(key: K, value: any) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;

export const Step2VerifyDocs: React.FC<Step2Props> = ({ data, onChange }) => {
  const primary = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const textMuted = useThemeColor({}, "textMuted");
  const borderDefault = useThemeColor({}, "borderDefault");
  const errorColor = useThemeColor({}, "statusError");

  const pickFile = async (
    key: "businessRegCertUri" | "taxIdDocUri" | "proofOfAddressUri",
    nameKey: "businessRegCertName" | "taxIdDocName" | "proofOfAddressName",
  ) => {
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

      // Store the file URI and name (won't upload until final submit)
      const fileName = image.uri.split("/").pop() || "document.jpg";
      onChange(key, image.uri);
      onChange(nameKey, fileName);

      Toast.show({
        type: "success",
        text1: "Document selected",
        text2: "Will be uploaded when you complete signup",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error selecting file",
        text2:
          error instanceof Error ? error.message : "Failed to select document",
      });
    }
  };

  const removeFile = (key: keyof SignupStep2Data) => {
    onChange(key, "");
  };

  const getDocumentStatus = (uri?: string) => {
    return uri ? { selected: true, uri } : { selected: false };
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
        {
          key: "businessRegCertUri" as const,
          nameKey: "businessRegCertName" as const,
          label: "Business Registration Certificate",
          required: true,
        },
        {
          key: "taxIdDocUri" as const,
          nameKey: "taxIdDocName" as const,
          label: "Tax Identification Document",
          required: true,
        },
        {
          key: "proofOfAddressUri" as const,
          nameKey: "proofOfAddressName" as const,
          label: "Proof of Address",
          required: true,
        },
      ].map(({ key, nameKey, label, required }) => {
        const status = getDocumentStatus(data[key]);

        return (
          <View key={key} style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">
                  {label} {required && <ThemedText style={{ color: errorColor }}>*</ThemedText>}
                </ThemedText>
                {!required && (
                  <ThemedText style={{ color: textMuted, fontSize: 12 }}>
                    Optional
                  </ThemedText>
                )}
              </View>
              {status.selected && (
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={24}
                  color={successColor}
                />
              )}
            </View>

            {status.selected && status.uri && (
              <View style={styles.preview}>
                <Image
                  source={{ uri: status.uri }}
                  style={styles.previewImage}
                />
                <ThemedText
                  numberOfLines={1}
                  style={{ fontSize: 12, color: textMuted, flex: 1 }}
                >
                  {data[nameKey] || "Selected"}
                </ThemedText>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Pressable
                style={[
                  styles.documentButton,
                  { borderColor: primary, flex: 1 },
                ]}
                onPress={() => pickFile(key, nameKey)}
              >
                <IconSymbol name="photo" size={18} color={primary} />
                <ThemedText style={{ color: primary }}>
                  {status.selected ? "Change" : "Select"} Document
                </ThemedText>
              </Pressable>

              {status.selected && (
                <Pressable
                  style={[
                    styles.documentButton,
                    {
                      borderColor: errorColor,
                      backgroundColor: `${errorColor}10`,
                    },
                  ]}
                  onPress={() => removeFile(key)}
                >
                  <IconSymbol name="trash" size={18} color={errorColor} />
                </Pressable>
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.note}>
        <IconSymbol name="info.circle" size={16} color={primary} />
        <ThemedText style={{ flex: 1, fontSize: 12, color: textMuted }}>
          Documents will be uploaded when you complete the signup process
        </ThemedText>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 16,
    paddingBottom: 24,
  },
  documentCard: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  documentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  preview: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  documentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  note: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginTop: 8,
  },
});
