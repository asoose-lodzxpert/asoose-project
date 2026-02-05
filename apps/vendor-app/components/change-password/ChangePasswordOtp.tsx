import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  email: string;
  otp: string;
  onChangeOtp: (v: string) => void;
  onVerified: () => void;
  loading?: boolean;
}

const LAST_SENT_KEY = "change_password_otp_last_sent";
const RESEND_COUNT_KEY = "change_password_otp_resend_count";

export const ChangePasswordOtp: React.FC<Props> = ({
  email,
  otp,
  onChangeOtp,
  onVerified,
  loading,
}) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textDisabled");

  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  const timerRef = useRef<number | null>(null);

  /** Send OTP */
  const sendOtp = async () => {
    try {
      setSending(true);

      // mock API
      await new Promise((r) => setTimeout(r, 800));

      const nextCount = resendCount + 1;
      setResendCount(nextCount);

      const now = Date.now();
      await AsyncStorage.setItem(LAST_SENT_KEY, now.toString());
      await AsyncStorage.setItem(RESEND_COUNT_KEY, nextCount.toString());

      const nextCooldown = 30 + (nextCount - 1) * 30;
      setCooldown(nextCooldown);

      Toast.show({
        type: "success",
        text1: "OTP sent",
        text2: `Check ${email}`,
      });
    } catch {
      Toast.show({
        type: "error",
        text1: "Failed to send OTP",
      });
    } finally {
      setSending(false);
    }
  };

  /** Restore cooldown on mount */
  useEffect(() => {
    const restore = async () => {
      const lastSent = await AsyncStorage.getItem(LAST_SENT_KEY);
      const storedCount = await AsyncStorage.getItem(RESEND_COUNT_KEY);

      const count = storedCount ? parseInt(storedCount, 10) : 0;
      setResendCount(count);

      if (lastSent) {
        const elapsed = Math.floor(
          (Date.now() - parseInt(lastSent, 10)) / 1000,
        );
        const remaining = 30 + (count - 1) * 30 - elapsed;

        setCooldown(remaining > 0 ? remaining : 0);
      }

      if (!lastSent) {
        sendOtp();
      }
    };

    restore();
  }, []);

  /** Countdown timer */
  useEffect(() => {
    if (cooldown <= 0) return;

    timerRef.current = setTimeout(
      () => setCooldown((c) => Math.max(c - 1, 0)),
      1000,
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  return (
    <View style={styles.container}>
      {/* Title */}
      <ThemedText type="title">Enter OTP</ThemedText>

      {/* OTP Input */}
      <ThemedInput
        placeholder="Enter OTP"
        value={otp}
        onChangeText={onChangeOtp}
        keyboardType="numeric"
      />

      {/* Continue */}
      <Pressable
        style={[styles.button, { backgroundColor: brandPrimary }]}
        onPress={onVerified}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
            Continue
          </ThemedText>
        )}
      </Pressable>

      {/* Info */}
      <ThemedText style={[styles.info, { color: muted }]}>
        We’ve sent a one-time code to{" "}
        <ThemedText type="defaultSemiBold">{email}</ThemedText>.{"\n"}Check your
        inbox or spam folder.
      </ThemedText>

      {/* Cooldown info */}
      <ThemedText style={[styles.cooldownText, { color: muted }]}>
        {cooldown > 0
          ? `You can request another code in ${cooldown}s`
          : "Didn’t receive the code?"}
      </ThemedText>

      {/* Resend */}
      <Pressable
        disabled={cooldown > 0 || sending}
        onPress={sendOtp}
        style={styles.resend}
      >
        <ThemedText
          type="defaultSemiBold"
          style={{
            color: cooldown > 0 || sending ? muted : brandPrimary,
          }}
        >
          Resend OTP
        </ThemedText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  info: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  cooldownText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  resend: {
    alignSelf: "center",
    marginTop: 2,
  },
});
