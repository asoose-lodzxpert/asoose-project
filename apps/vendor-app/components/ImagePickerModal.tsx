import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Animated,
  Dimensions,
} from "react-native";
import { IconSymbol } from "./ui/icon-symbol";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: (uri: string) => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onClose,
  onSelectImage,
}) => {
  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const cardBackground = useThemeColor({}, "surfaceCard");
  const textMuted = useThemeColor({}, "textMuted");
  const borderColor = useThemeColor({}, "borderDefault");

  const [panY] = React.useState(new Animated.Value(Dimensions.get("window").height));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(panY, {
        toValue: Dimensions.get("window").height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Denied",
        text2: "Permission to access camera was denied",
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      onSelectImage(result.assets[0].uri);
      onClose();
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      onSelectImage(result.assets[0].uri);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <Animated.View
          style={[
            styles.content,
            { backgroundColor: cardBackground, transform: [{ translateY: panY }] },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: borderColor }]} />

          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Add Photo
            </ThemedText>
            <ThemedText style={{ color: textMuted, fontSize: 14 }}>
              Choose a medium to add your product image
            </ThemedText>
          </View>

          <View style={styles.optionsContainer}>
            <Pressable
              onPress={handleCamera}
              style={({ pressed }) => [
                styles.optionButton,
                { borderColor: borderColor },
                pressed && { backgroundColor: background },
              ]}
            >
              <View style={[styles.iconWrapper, { backgroundColor: primary + "10" }]}>
                <IconSymbol name="camera.fill" size={24} color={primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <ThemedText type="defaultSemiBold">Take a Photo</ThemedText>
                <ThemedText style={{ color: textMuted, fontSize: 12 }}>
                  Use camera to snap a fresh image
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={18} color={textMuted} />
            </Pressable>

            <Pressable
              onPress={handleGallery}
              style={({ pressed }) => [
                styles.optionButton,
                { borderColor: borderColor },
                pressed && { backgroundColor: background },
              ]}
            >
              <View style={[styles.iconWrapper, { backgroundColor: primary + "10" }]}>
                <IconSymbol name="photo" size={24} color={primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <ThemedText type="defaultSemiBold">Choose from Gallery</ThemedText>
                <ThemedText style={{ color: textMuted, fontSize: 12 }}>
                  Pick an existing image from your media
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={18} color={textMuted} />
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            style={[styles.cancelButton, { backgroundColor: background }]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: primary }}>
              Cancel
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  header: {
    width: "100%",
    marginBottom: 24,
  },
  title: {
    fontWeight: "700",
    marginBottom: 4,
  },
  optionsContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  cancelButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
