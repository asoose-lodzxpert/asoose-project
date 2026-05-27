import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";

interface Props {
  label: string;
  value?: string;
  circular?: boolean;
  onPick: (uri: string, name: string) => void;
  required?: boolean;
}

export const ImageUpload: React.FC<Props> = ({
  label,
  value,
  circular,
  onPick,
  required,
}) => {
  const primary = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const textMuted = useThemeColor({}, "textMuted");
  const errorColor = useThemeColor({}, "statusError");
  const border = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission required",
        text2: "Please allow access to photos.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
      aspect: circular ? [1, 1] : [16, 9],
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileName = asset.uri.split("/").pop() || "image.jpg";

      // Just store the URI and filename - will upload on final submit
      onPick(asset.uri, fileName);

      Toast.show({
        type: "success",
        text1: "Image selected",
        text2: "Will be uploaded when you complete signup",
      });
    }
  };

  const removeImage = () => {
    onPick("", "");
  };

  return (
    <View style={{ gap: 6 }}>
      <ThemedText style={styles.label}>
        {label} {required && <ThemedText style={{ color: errorColor }}>*</ThemedText>}
      </ThemedText>

      <Pressable
        onPress={pickImage}
        style={[
          styles.imageCard,
          {
            borderColor: value ? primary : border,
            backgroundColor: surfaceSubtle,
          },
          value && { borderStyle: "solid", borderWidth: 2 },
        ]}
      >
        {value ? (
          <View style={{ flex: 1, width: "100%" }}>
            <Image
              source={{ uri: value }}
              style={[styles.image, circular && { borderRadius: 100 }]}
            />
            <View style={styles.imageOverlay}>
              <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
              <ThemedText style={{ color: "#fff", fontSize: 12, marginTop: 4 }}>
                Tap to change
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <IconSymbol name="photo" size={28} color={textMuted} />
            <ThemedText
              style={{ marginTop: 6, fontSize: 13, color: textMuted }}
            >
              {label}
            </ThemedText>
          </View>
        )}
      </Pressable>

      {value && (
        <Pressable
          onPress={removeImage}
          style={[styles.removeButton, { borderColor: errorColor }]}
        >
          <IconSymbol name="trash" size={14} color={errorColor} />
          <ThemedText style={{ color: errorColor, fontSize: 12 }}>
            Remove
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  imageCard: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});
