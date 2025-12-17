import React from "react";
import { View, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SignupStep2Data } from "@/types/signup";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Step2Props {
  data: SignupStep2Data;
  onChange: <K extends keyof SignupStep2Data>(key: K, value: string) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;

export const Step2VerifyDocs: React.FC<Step2Props> = ({ data, onChange }) => {
  const primary = useThemeColor({}, "brandPrimary");

  const pickFile = async (key: keyof SignupStep2Data) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];

    if (file.size && file.size > MAX_SIZE) {
      Alert.alert("File too large", "Maximum file size is 5MB");
      return;
    }

    onChange(key, file.uri);
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

        return (
          <View key={key} style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              {label}
            </ThemedText>

            <Pressable
              disabled={uploaded}
              onPress={() => pickFile(key as keyof SignupStep2Data)}
              style={[
                styles.uploadCard,
                uploaded && {
                  borderColor: primary,
                  borderStyle: "solid",
                  opacity: 0.9,
                },
              ]}
            >
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
                {uploaded ? value?.split("/").pop() : "PDF, JPG, PNG (max 5MB)"}
              </ThemedText>

              {uploaded && (
                <Pressable
                  onPress={() => removeFile(key as keyof SignupStep2Data)}
                  style={styles.removeButton}
                >
                  <ThemedText type="link">Remove</ThemedText>
                </Pressable>
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
});
