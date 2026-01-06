import React, { useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  email: string;
  onChangeEmail: (v: string) => void;
  onNext: () => Promise<void>;
  loading: boolean;
}

export const ResetPasswordEmail: React.FC<Props> = ({
  email,
  onChangeEmail,
  onNext,
  loading,
}) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.container}>
      <ThemedText type="title">Reset Password</ThemedText>
      <ThemedText type="subtitle" style={{ marginVertical: 8 }}>
        Enter your email to receive a one-time password (OTP)
      </ThemedText>

      <ThemedInput
        placeholder="Email"
        value={email}
        onChangeText={onChangeEmail}
        keyboardType="email-address"
      />

      <Pressable
        style={[styles.button, { backgroundColor: brandPrimary }]}
        onPress={onNext}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
            Send OTP
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
});
