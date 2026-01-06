import React from "react";
import { View, Pressable, Image, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface Props {
  label: string;
  value?: string;
  circular?: boolean;
  onPick: (uri: string) => void;
}

export const ImageUpload: React.FC<Props> = ({
  label,
  value,
  circular,
  onPick,
}) => {
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      aspect: circular ? [1, 1] : [16, 9],
    });

    if (!result.canceled && result.assets.length > 0) {
      onPick(result.assets[0].uri);
    }
  };

  return (
    <View>
      <ThemedText style={styles.label}>{label}</ThemedText>

      <Pressable
        style={circular ? styles.circle : styles.banner}
        onPress={pickImage}
      >
        {value && (
          <Image
            source={{ uri: value }}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        <View style={styles.overlay}>
          <IconSymbol name="camera.fill" size={24} color="#fff" />
        </View>
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
});
