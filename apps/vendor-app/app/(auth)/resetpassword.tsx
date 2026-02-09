import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

import {
  resetVendorPassword,
  sendVendorOtp,
  verifyVendorOtp,
} from "@/services/reset-password.service";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import { ResetPasswordChange } from "@/components/reset-password/ResetPasswordChange";
import { ResetPasswordEmail } from "@/components/reset-password/ResetPasswordEmail";
import { ResetPasswordHeader } from "@/components/reset-password/ResetPasswordHeader";
import { ResetPasswordOtp } from "@/components/reset-password/ResetPasswordOtp";
import { ResetPasswordSuccess } from "@/components/reset-password/ResetPasswordSuccess";
import { ThemedView } from "@/components/themed-view";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const timerRef = useRef<number | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const LAST_SENT_KEY = "otpLastSent";
  const RESEND_COUNT_KEY = "otpResendCount";

  const sendOtp = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await sendVendorOtp(email);
      const newResendCount = resendCount + 1;
      setResendCount(newResendCount);
      const now = Date.now();
      await SecureStore.setItemAsync(LAST_SENT_KEY, now.toString());
      await SecureStore.setItemAsync(
        RESEND_COUNT_KEY,
        newResendCount.toString(),
      );
      setCooldown(30 + (newResendCount - 1) * 30);
      Toast.show({
        type: "success",
        text1: "OTP sent!",
        text2: `Check your email: ${email}`,
      });
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to send OTP" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 2) restoreCooldown();
  }, [step]);

  const restoreCooldown = async () => {
    const lastSent = await SecureStore.getItemAsync(LAST_SENT_KEY);
    const storedResendCount = await SecureStore.getItemAsync(RESEND_COUNT_KEY);

    const count = storedResendCount ? parseInt(storedResendCount) : 0;
    setResendCount(count);

    if (lastSent) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSent)) / 1000);
      const calculatedCooldown = 30 + (count - 1) * 30 - elapsed;
      setCooldown(calculatedCooldown > 0 ? calculatedCooldown : 0);
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  const handleNextEmail = async () => {
    if (!email) return Toast.show({ type: "error", text1: "Enter email" });
    setStep(2);
  };

  const handleNextOtp = async () => {
    if (!otp) return Toast.show({ type: "error", text1: "Enter OTP" });
    setLoading(true);
    try {
      await verifyVendorOtp(email, otp);
      setStep(3);
    } catch (err) {
      Toast.show({ type: "error", text1: "Invalid OTP" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword)
      return Toast.show({ type: "error", text1: "Fill all fields" });

    if (newPassword !== confirmPassword)
      return Toast.show({ type: "error", text1: "Passwords do not match" });

    setLoading(true);
    try {
      await resetVendorPassword(email, otp, newPassword);
      Toast.show({ type: "success", text1: "Password changed successfully!" });
      setStep(4);
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to reset password" });
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => router.push("/(auth)/login");

  return (
    <ThemedView style={{ flex: 1 }}>
      <ResetPasswordHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <ResetPasswordEmail
              email={email}
              onChangeEmail={setEmail}
              onNext={handleNextEmail}
              loading={loading}
            />
          )}
          {step === 2 && (
            <ResetPasswordOtp
              email={email}
              otp={otp}
              onChangeOtp={setOtp}
              cooldown={cooldown}
              onResendOtp={sendOtp}
              onNext={handleNextOtp}
              loading={loading}
            />
          )}
          {step === 3 && (
            <ResetPasswordChange
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              onChangeNew={setNewPassword}
              onChangeConfirm={setConfirmPassword}
              onSubmit={handleChangePassword}
              loading={loading}
            />
          )}
          {step === 4 && <ResetPasswordSuccess onDone={handleDone} />}
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast />
    </ThemedView>
  );
}
