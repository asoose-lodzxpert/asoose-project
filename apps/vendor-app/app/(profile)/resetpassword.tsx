import React, { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";

import { ChangePasswordOtp } from "@/components/change-password/ChangePasswordOtp";
import { ChangePasswordChange } from "@/components/change-password/ChangePasswordChange";
import { ChangePasswordSuccess } from "@/components/change-password/ChangePasswordSuccess";
import { ChangePasswordHeader } from "@/components/change-password/ChangePasswordHeader";
import { ThemedView } from "@/components/themed-view";

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<2 | 3 | 4>(2);
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /** OTP verified */
  const handleOtpVerified = async () => {
    if (!otp) {
      return Toast.show({ type: "error", text1: "Enter OTP" });
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);

    setStep(3);
  };

  /** Change password */
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      return Toast.show({ type: "error", text1: "Fill all fields" });
    }

    if (newPassword !== confirmPassword) {
      return Toast.show({
        type: "error",
        text1: "Passwords do not match",
      });
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);

    Toast.show({
      type: "success",
      text1: "Password changed successfully!",
    });

    setStep(4);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ChangePasswordHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 2 && (
            <ChangePasswordOtp
              email="demo@demo.com"
              otp={otp}
              onChangeOtp={setOtp}
              onVerified={handleOtpVerified}
              loading={loading}
            />
          )}

          {step === 3 && (
            <ChangePasswordChange
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              onChangeNew={setNewPassword}
              onChangeConfirm={setConfirmPassword}
              onSubmit={handleChangePassword}
              loading={loading}
            />
          )}

          {step === 4 && (
            <ChangePasswordSuccess onDone={() => router.back()} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast />
    </ThemedView>
  );
}
