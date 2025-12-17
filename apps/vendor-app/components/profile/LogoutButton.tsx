import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export const LogoutButton: React.FC = () => {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
  };

  return (
    <Pressable style={styles.button} onPress={handleLogout}>
      <ThemedText style={styles.text}>Logout</ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#ef4444",
    fontWeight: "600",
  },
});
