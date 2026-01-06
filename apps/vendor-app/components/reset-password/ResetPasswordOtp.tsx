import React, { useEffect, useRef } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "../themed-view";

interface Props {
  email: string;
  otp: string;
  onChangeOtp: (v: string) => void;
  cooldown: number;
  onResendOtp: () => Promise<void>;
  onNext: () => void;
  loading: boolean;
}

export const ResetPasswordOtp: React.FC<Props> = ({
  email,
  otp,
  onChangeOtp,
  cooldown,
  onResendOtp,
  onNext,
  loading,
}) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.container}>
      <ThemedText type="title">Enter OTP</ThemedText>
      <ThemedText type="subtitle" style={{ marginVertical: 8 }}>
        OTP has been sent to {email}
      </ThemedText>

      <ThemedInput
        placeholder="Enter OTP"
        value={otp}
        onChangeText={onChangeOtp}
        keyboardType="numeric"
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
            Next
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        disabled={cooldown > 0 || loading}
        onPress={onResendOtp}
        style={{ marginTop: 12 }}
      >
        <ThemedText style={{ color: cooldown > 0 ? "gray" : brandPrimary }}>
          {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
        </ThemedText>
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
