import React, { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";

import { ChangePasswordOtp } from "@/components/change-password/ChangePasswordOtp";
import { ChangePasswordChange } from "@/components/change-password/ChangePasswordChange";
import { ChangePasswordSuccess } from "@/components/change-password/ChangePasswordSuccess";
import { ChangePasswordHeader } from "@/components/change-password/ChangePasswordHeader";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/context/AuthContext";
import {
  sendChangePasswordOtp,
  verifyChangePasswordOtp,
  changePassword,
} from "@/services/reset-password.service";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<2 | 3 | 4>(2);
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /** Send OTP on mount */
  React.useEffect(() => {
    const sendOtp = async () => {
      try {
        await sendChangePasswordOtp();
        Toast.show({
          type: "success",
          text1: "OTP sent to your email",
        });
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: error.message || "Failed to send OTP",
        });
      }
    };

    sendOtp();
  }, []);

  /** OTP verified */
  const handleOtpVerified = async () => {
    if (!otp) {
      return Toast.show({ type: "error", text1: "Enter OTP" });
    }

    if (otp.length !== 6) {
      return Toast.show({ type: "error", text1: "OTP must be 6 digits" });
    }

    setLoading(true);

    try {
      const result = await verifyChangePasswordOtp(otp);

      if (result.valid) {
        Toast.show({
          type: "success",
          text1: "OTP verified successfully",
        });
        setStep(3);
      } else {
        Toast.show({
          type: "error",
          text1: "Invalid OTP. Please try again.",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Invalid OTP",
      });
    } finally {
      setLoading(false);
    }
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

    if (newPassword.length < 6) {
      return Toast.show({
        type: "error",
        text1: "Password must be at least 6 characters",
      });
    }

    setLoading(true);

    try {
      await changePassword(otp, newPassword);

      Toast.show({
        type: "success",
        text1: "Password changed successfully!",
      });

      setStep(4);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to change password",
      });
    } finally {
      setLoading(false);
    }
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
              email={user?.email || ""}
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

          {step === 4 && <ChangePasswordSuccess onDone={() => router.back()} />}
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast />
    </ThemedView>
  );
}
