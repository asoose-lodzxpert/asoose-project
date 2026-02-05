import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  title?: string;
}

export const ResetPasswordHeader: React.FC<Props> = () => {
  const router = useRouter();

  const linkColor = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <IconSymbol name="chevron.left" size={24} color={linkColor} />
        <ThemedText type="link">Back to login</ThemedText>
      </Pressable>
      {/* <ThemedText type="title" style={styles.title}>
        Change Password
      </ThemedText> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    marginTop: 8,
  },
});
