import React, { useState } from "react";
import { Pressable, ActivityIndicator, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/context/AuthContext";

export const LogoutButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const primary = useThemeColor({}, "brandPrimary");
  const { signOut } = useAuth();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, { backgroundColor: primary }]}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.text}>Logout</ThemedText>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    width: "100%",
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
