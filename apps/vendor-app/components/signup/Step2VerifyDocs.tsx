import React from "react";
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

const DOCS = [
  {
    key: "businessRegCertUri" as const,
    nameKey: "businessRegCertName" as const,
    label: "Business Registration",
    required: true,
  },
  {
    key: "taxIdDocUri" as const,
    nameKey: "taxIdDocName" as const,
    label: "Tax ID Document",
    required: true,
  },
  {
    key: "proofOfAddressUri" as const,
    nameKey: "proofOfAddressName" as const,
    label: "Proof of Address",
    required: false,
  },
];

export const Step2VerifyDocs: React.FC<Step2Props> = ({ data, onChange }) => {
  const primary = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const textMuted = useThemeColor({}, "textMuted");
  const errorColor = useThemeColor({}, "statusError");
  const border = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textSecondary = useThemeColor({}, "textSecondary");

  const pickFile = async (
    key: "businessRegCertUri" | "taxIdDocUri" | "proofOfAddressUri",
    nameKey: "businessRegCertName" | "taxIdDocName" | "proofOfAddressName",
  ) => {
    try {
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

      try {
        const file = new FileSystem.File(image.uri);
        const fileInfo = await file.info();
        if (fileInfo.exists && fileInfo.size && fileInfo.size > MAX_SIZE) {
          Toast.show({
            type: "error",
            text1: "File too large",
            text2: `Max 5MB. Your file is ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB`,
          });
          return;
        }
      } catch {
        // Continue if size check fails
      }

      const fileName = image.uri.split("/").pop() || "document.jpg";
      onChange(key, image.uri);
      onChange(nameKey, fileName);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error selecting file",
        text2:
          error instanceof Error ? error.message : "Failed to select document",
      });
    }
  };

  const removeFile = (
    key: "businessRegCertUri" | "taxIdDocUri" | "proofOfAddressUri",
  ) => {
    onChange(key, "");
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText type="title">Verify Your Business</ThemedText>
      <ThemedText style={[styles.subtitle, { color: textMuted }]}>
        Upload clear photos of your documents.
      </ThemedText>

      {/* Document list */}
      <View style={[styles.list, { borderColor: border }]}>
        {DOCS.map(({ key, nameKey, label, required }, i) => {
          const uri = data[key];
          const selected = !!uri;

          return (
            <Pressable
              key={key}
              style={[
                styles.docRow,
                i < DOCS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: border,
                },
              ]}
              onPress={() => pickFile(key, nameKey)}
            >
              {/* Thumbnail or placeholder */}
              {selected ? (
                <Image source={{ uri }} style={styles.thumb} />
              ) : (
                <View
                  style={[
                    styles.thumbPlaceholder,
                    { backgroundColor: surfaceSubtle },
                  ]}
                >
                  <IconSymbol name="doc.fill" size={18} color={textMuted} />
                </View>
              )}

              {/* Label + status text */}
              <View style={styles.docMid}>
                <View style={styles.docLabelRow}>
                  <ThemedText type="defaultSemiBold" style={styles.docLabel}>
                    {label}
                  </ThemedText>
                  {!required && (
                    <View
                      style={[
                        styles.optionalBadge,
                        { backgroundColor: surfaceSubtle },
                      ]}
                    >
                      <ThemedText
                        style={[styles.optionalText, { color: textMuted }]}
                      >
                        Optional
                      </ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText
                  style={[
                    styles.docSub,
                    { color: selected ? successColor : textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {selected
                    ? data[nameKey] || "Document selected"
                    : "Tap to upload"}
                </ThemedText>
              </View>

              {/* Right action */}
              <View style={styles.docRight}>
                {selected ? (
                  <View style={styles.docActions}>
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={20}
                      color={successColor}
                    />
                    <Pressable hitSlop={8} onPress={() => removeFile(key)}>
                      <IconSymbol name="xmark" size={16} color={errorColor} />
                    </Pressable>
                  </View>
                ) : (
                  <IconSymbol
                    name="chevron.right"
                    size={14}
                    color={textMuted}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Info note */}
      <View style={styles.note}>
        <IconSymbol name="info.circle" size={14} color={primary} />
        <ThemedText style={[styles.noteText, { color: textSecondary }]}>
          Accept JPG or PNG up to 5 MB. Documents upload on final submit.
        </ThemedText>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 20,
    paddingBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  list: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    flexShrink: 0,
  },
  thumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  docMid: {
    flex: 1,
    gap: 3,
  },
  docLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  docLabel: {
    fontSize: 14,
  },
  optionalBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  optionalText: {
    fontSize: 10,
  },
  docSub: {
    fontSize: 12,
  },
  docRight: {
    flexShrink: 0,
  },
  docActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  note: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  noteText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
