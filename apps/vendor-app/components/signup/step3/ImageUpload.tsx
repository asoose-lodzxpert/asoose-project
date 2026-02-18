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
}

export const ImageUpload: React.FC<Props> = ({
  label,
  value,
  circular,
  onPick,
}) => {
  const primary = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const textMuted = useThemeColor({}, "textMuted");
  const errorColor = useThemeColor({}, "statusError");

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
      allowsEditing: true,
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
    <View style={{ gap: 8 }}>
      <ThemedText style={styles.label}>{label}</ThemedText>

      <Pressable
        onPress={pickImage}
        style={[
          styles.imageCard,
          value && { borderColor: primary, borderWidth: 2 },
        ]}
      >
        {value ? (
          <View style={{ flex: 1, width: "100%" }}>
            <Image
              source={{ uri: value }}
              style={[styles.image, circular && { borderRadius: 100 }]}
            />
            <View style={styles.imageOverlay}>
              <IconSymbol
                name="checkmark.circle.fill"
                size={32}
                color={successColor}
              />
              <ThemedText style={{ color: "#fff", marginTop: 8 }}>
                Selected
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <IconSymbol name="photo" size={40} color={textMuted} />
            <ThemedText style={{ marginTop: 8, color: textMuted }}>
              Tap to select {label}
            </ThemedText>
          </View>
        )}
      </Pressable>

      {value && (
        <Pressable
          onPress={removeImage}
          style={[styles.removeButton, { borderColor: errorColor }]}
        >
          <IconSymbol name="trash" size={18} color={errorColor} />
          <ThemedText style={{ color: errorColor, fontSize: 12 }}>
            Remove
          </ThemedText>
        </Pressable>
      )}

      <ThemedText style={{ fontSize: 12, color: textMuted }}>
        Will be uploaded when you complete the signup
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  imageCard: {
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e5e5",
    borderStyle: "dashed",
    overflow: "hidden",
    backgroundColor: "#f9f9f9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
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
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
