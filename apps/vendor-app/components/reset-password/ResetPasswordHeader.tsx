import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

interface Props {
  title?: string;
}

export const ResetPasswordHeader: React.FC<Props> = ({
  title = "Reset Password",
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.backButton}
        onPress={() => router.push("/(auth)/login")}
      >
        <IconSymbol name="chevron.left" size={24} color="#000" />
        <ThemedText type="defaultSemiBold">Back to Login</ThemedText>
      </Pressable>
      {/* <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
