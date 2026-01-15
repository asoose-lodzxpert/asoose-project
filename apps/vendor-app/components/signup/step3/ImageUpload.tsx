import React, { useState } from "react";
import {
  View,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { uploadFile } from "@/services/storage.service";

interface Props {
  label: string;
  value?: string;
  circular?: boolean;
  onPick: (url: string) => void;
}

export const ImageUpload: React.FC<Props> = ({
  label,
  value,
  circular,
  onPick,
}) => {
  const [uploading, setUploading] = useState(false);

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

      // Extract filename and determine mime type
      const uriParts = asset.uri.split("/");
      const filename = uriParts[uriParts.length - 1];
      const fileType =
        asset.type === "image"
          ? `image/${filename.split(".").pop()}`
          : "image/jpeg";

      setUploading(true);

      try {
        const uploadedUrl = await uploadFile(
          {
            uri: asset.uri,
            name: filename,
            type: fileType,
          },
          (progress) => {
            // console.log(`Upload progress: ${progress.percentage}%`);
          }
        );

        onPick(uploadedUrl);

        Toast.show({
          type: "success",
          text1: "Upload successful",
          text2: "Image uploaded successfully.",
        });
      } catch (error) {
        console.error("Upload error:", error);
        Toast.show({
          type: "error",
          text1: "Upload failed",
          text2:
            error instanceof Error ? error.message : "Failed to upload image",
        });
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <View>
      <ThemedText style={styles.label}>{label}</ThemedText>

      <Pressable
        style={circular ? styles.circle : styles.banner}
        onPress={pickImage}
        disabled={uploading}
      >
        {value && (
          <Image
            source={{ uri: value }}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        {uploading ? (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <ThemedText style={styles.uploadingText}>Uploading...</ThemedText>
          </View>
        ) : (
          <View style={styles.overlay}>
            <IconSymbol name="camera.fill" size={24} color="#fff" />
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },

  label: {
    marginBottom: 8,
  },

  banner: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },

  overlay: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  uploadingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
