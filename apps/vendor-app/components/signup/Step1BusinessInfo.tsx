import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/themed-text";
import { CustomDropdown } from "@/components/CustomDropdown";
import {
  BUSINESS_TYPES,
  EMPLOYEE_RANGES,
  COUNTRY_CODES,
  BusinessType,
  EmployeeRange,
  CountryCode,
} from "@/config/signup";
import { SignupStep1Data } from "@/types/signup";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import Toast from "react-native-toast-message";

interface Step1Props {
  data: SignupStep1Data;
  onChange: <K extends keyof SignupStep1Data>(
    key: K,
    value: SignupStep1Data[K],
  ) => void;
}

export const Step1BusinessInfo: React.FC<Step1Props> = ({ data, onChange }) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const errorColor = useThemeColor({}, "statusError");
  const border = useThemeColor({}, "borderDefault");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  // Password validation state
  const [validations, setValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });

  useEffect(() => {
    setValidations({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-[\]{};':"\\|,.<>/?]/.test(password),
    });
    onChange("password", password);
  }, [password]);

  // OTP timer countdown
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleSendOtp = async () => {
    if (!data.businessEmail) {
      Toast.show({
        type: "error",
        text1: "Email required",
        text2: "Please enter your business email",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.businessEmail)) {
      Toast.show({
        type: "error",
        text1: "Invalid email",
        text2: "Please enter a valid email address",
      });
      return;
    }

    setSendingOtp(true);
    try {
      // Call backend to send OTP
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/send-signup-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: data.businessEmail }),
        },
      );

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(result.message || "Failed to send OTP");
      }

      onChange("otpSent", true);
      setOtpTimer(60); // 60 second countdown
      Toast.show({
        type: "success",
        text1: "OTP sent",
        text2: "Check your email for the verification code",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error sending OTP",
        text2: error.message || "Please try again",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!data.otpCode) {
      Toast.show({
        type: "error",
        text1: "OTP required",
        text2: "Please enter the verification code",
      });
      return;
    }

    if (data.otpCode.length < 4) {
      Toast.show({
        type: "error",
        text1: "Invalid OTP",
        text2: "OTP should be at least 4 characters",
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      // Call backend to verify OTP
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/verify-signup-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.businessEmail,
            otp: data.otpCode,
          }),
        },
      );

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(result.message || "Invalid OTP");
      }

      onChange("businessEmailVerified", true);
      Toast.show({
        type: "success",
        text1: "Email verified",
        text2: "You can now continue with your business details",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Verification failed",
        text2: error.message || "Invalid OTP",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const renderValidation = (label: string, valid: boolean) => (
    <View style={styles.validationRow} key={label}>
      <IconSymbol
        name={valid ? "check" : "xmark"}
        size={16}
        color={valid ? successColor : errorColor}
      />
      <ThemedText style={{ color: valid ? successColor : errorColor }}>
        {label}
      </ThemedText>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title">Let's get started</ThemedText>
        <ThemedText style={[styles.subtitle, { color: textMuted }]}>
          Start by verifying your business email address.
        </ThemedText>

        {/* Business Email - OTP Section */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Business email</ThemedText>
          <View style={styles.emailOtpRow}>
            <ThemedInput
              placeholder="Enter your business email"
              value={data.businessEmail}
              onChangeText={(v) => onChange("businessEmail", v)}
              keyboardType="email-address"
              editable={!data.businessEmailVerified}
              containerStyle={{ flex: 1 }}
            />
            {!data.businessEmailVerified && (
              <Pressable
                style={[
                  styles.otpButton,
                  {
                    backgroundColor: brandPrimary,
                    opacity: sendingOtp || !data.businessEmail ? 0.6 : 1,
                  },
                ]}
                onPress={handleSendOtp}
                disabled={sendingOtp || !data.businessEmail || data.otpSent}
              >
                {sendingOtp ? (
                  <ActivityIndicator size="small" color={textOnPrimary} />
                ) : data.otpSent ? (
                  <ThemedText style={{ fontSize: 12, color: textOnPrimary }}>
                    Sent
                  </ThemedText>
                ) : (
                  <ThemedText style={{ fontSize: 12, color: textOnPrimary }}>
                    Send OTP
                  </ThemedText>
                )}
              </Pressable>
            )}
            {data.businessEmailVerified && (
              <View
                style={[styles.verifiedBadge, { borderColor: successColor }]}
              >
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={20}
                  color={successColor}
                />
              </View>
            )}
          </View>
        </View>

        {/* OTP Input */}
        {data.otpSent && !data.businessEmailVerified && (
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">
              Verification code{" "}
              {otpTimer > 0 && (
                <ThemedText style={{ color: brandPrimary }}>
                  ({otpTimer}s)
                </ThemedText>
              )}
            </ThemedText>
            <View style={styles.emailOtpRow}>
              <ThemedInput
                placeholder="Enter OTP code"
                value={data.otpCode}
                onChangeText={(v) => onChange("otpCode", v)}
                maxLength={6}
                containerStyle={{ flex: 1 }}
              />
              <Pressable
                style={[
                  styles.otpButton,
                  {
                    backgroundColor: brandPrimary,
                    opacity: verifyingOtp ? 0.6 : 1,
                  },
                ]}
                onPress={handleVerifyOtp}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? (
                  <ActivityIndicator size="small" color={textOnPrimary} />
                ) : (
                  <ThemedText style={{ fontSize: 12, color: textOnPrimary }}>
                    Verify
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Rest of the form - disabled until email verified */}
        <View style={{ opacity: data.businessEmailVerified ? 1 : 0.5 }}>
          {/* Business Name */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Business name</ThemedText>
            <ThemedInput
              placeholder="What is your registered business name?"
              value={data.businessName}
              onChangeText={(v) => onChange("businessName", v)}
              editable={data.businessEmailVerified}
            />
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">
              Business phone number
            </ThemedText>
            <View style={styles.row}>
              <CustomDropdown
                data={COUNTRY_CODES.map((code) => ({
                  label: code,
                  value: code,
                }))}
                value={data.countryCode || null}
                onChange={(v) => onChange("countryCode", v as CountryCode)}
                placeholder="Code"
                containerStyle={{ flex: 2 }}
              />
              <ThemedInput
                placeholder="Enter phone number"
                value={data.phoneNumber}
                onChangeText={(v) => onChange("phoneNumber", v)}
                keyboardType="phone-pad"
                containerStyle={{ flex: 4 }}
                editable={data.businessEmailVerified}
              />
            </View>
          </View>

          {/* Business Type */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Type of business</ThemedText>
            <CustomDropdown
              data={BUSINESS_TYPES.map((type) => ({
                label: type,
                value: type,
              }))}
              value={data.businessType || null}
              onChange={(v) => onChange("businessType", v as BusinessType)}
              placeholder="Select your business category"
              disabled={!data.businessEmailVerified}
            />
          </View>

          {/* Employees */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Number of employees</ThemedText>
            <CustomDropdown
              data={EMPLOYEE_RANGES.map((range) => ({
                label: range,
                value: range,
              }))}
              value={data.employees || null}
              onChange={(v) => onChange("employees", v as EmployeeRange)}
              placeholder="Choose an employee range"
              disabled={!data.businessEmailVerified}
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Password</ThemedText>
            <ThemedInput
              placeholder="Create a strong password"
              secureTextEntry={secure}
              value={password}
              onFocus={() => {
                setIsPasswordFocused(true);
                scrollRef.current?.scrollToEnd({ animated: true });
              }}
              onBlur={() => setIsPasswordFocused(false)}
              onChangeText={(text) => setPassword(text)}
              editable={data.businessEmailVerified}
              iconRight={
                <Pressable onPress={() => setSecure(!secure)}>
                  <IconSymbol
                    size={24}
                    name={secure ? "eye.fill" : "eye.slash.fill"}
                    color={brandPrimary}
                  />
                </Pressable>
              }
            />
            {isPasswordFocused && (
              <View style={styles.validationContainer}>
                {renderValidation("At least 8 characters", validations.length)}
                {renderValidation(
                  "At least 1 uppercase letter",
                  validations.uppercase,
                )}
                {renderValidation(
                  "At least 1 lowercase letter",
                  validations.lowercase,
                )}
                {renderValidation("At least 1 number", validations.number)}
                {renderValidation("At least 1 symbol", validations.symbol)}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 16,
    paddingBottom: 24,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 14,
  },
  field: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  emailOtpRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  otpButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  verifiedBadge: {
    borderWidth: 2,
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  validationContainer: {
    marginTop: 8,
    gap: 4,
  },
  validationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
