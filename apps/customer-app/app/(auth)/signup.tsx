import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Alert } from "react-native";
import { signup as signupApi } from "@/services/auth.service";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { CustomDropdown } from "@/components/CustomDropdown";

/* ---------------------------------- */
/* Static Data */
/* ---------------------------------- */
const COUNTRY_CODES = [{ label: "+234", value: "+234" }];

/* ---------------------------------- */
/* Screen */
/* ---------------------------------- */
export default function SignupScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+234");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ---------------------------------- */
  /* Password Strength */
  /* ---------------------------------- */
  const strength = useMemo(() => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 8) return 2;
    return 3;
  }, [password]);

  const strengthColors = ["#E5E7EB", "#F87171", "#FBBF24", "#22C55E"];

  /* ---------------------------------- */
  /* Simulate Signup */
  /* ---------------------------------- */
  const handleSignup = async () => {
    if (!accepted || !fullName || !email || !phoneNumber || !password) return;

    setLoading(true);
    try {
      const phone = `${phoneCode}${phoneNumber}`;
      const res = await signupApi({ name: fullName, email, phone, password });
      // assume success when no error thrown
      setLoading(false);
      router.replace("/login");
    } catch (err: any) {
      setLoading(false);
      console.error("signup error", err);
      const msg =
        err?.message ||
        err?.error ||
        "Could not create account. Please try again.";
      Alert.alert("Signup failed", String(msg));
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={[styles.title, { color: primary }]}>
            Create Account
          </ThemedText>
          <ThemedText type="caption">
            Join thousands of happy customers
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <ThemedInput
            placeholder="Full name"
            value={fullName}
            onChangeText={setFullName}
          />

          <ThemedInput
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {/* Phone */}
          <View style={styles.row}>
            <CustomDropdown
              data={COUNTRY_CODES}
              value={phoneCode}
              onChange={(v) => setPhoneCode(v as string)}
              placeholder="+234"
              containerStyle={{ flex: 2 }}
            />

            <ThemedInput
              placeholder="Phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              containerStyle={{ flex: 4 }}
            />
          </View>

          {/* Password */}
          <ThemedInput
            placeholder="Password (minimum 8 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            iconRight={
              <Pressable onPress={() => setSecure((s) => !s)}>
                <IconSymbol
                  name={secure ? "eye.slash.fill" : "eye.fill"}
                  size={18}
                  color={textMuted}
                />
              </Pressable>
            }
          />

          {/* Strength Indicator */}
          <View style={styles.strengthRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      strength > i ? strengthColors[strength] : "#E5E7EB",
                  },
                ]}
              />
            ))}
          </View>

          {/* Referral */}
          <Pressable>
            <ThemedText style={{ color: primary, fontWeight: "600" }}>
              Have a referral code?
            </ThemedText>
          </Pressable>

          {/* Terms */}
          <Pressable
            style={styles.termsRow}
            onPress={() => setAccepted((v) => !v)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: accepted ? primary : border,
                  backgroundColor: accepted ? primary : "transparent",
                },
              ]}
            >
              {accepted && <IconSymbol name="check" size={14} color="#000" />}
            </View>

            <ThemedText style={styles.termsText}>
              I agree to the{" "}
              <ThemedText style={{ color: primary }}>
                Terms of Service
              </ThemedText>{" "}
              and{" "}
              <ThemedText style={{ color: primary }}>Privacy Policy</ThemedText>
            </ThemedText>
          </Pressable>

          {/* Security Banner */}
          <View style={styles.securityBanner}>
            <IconSymbol name="shield" size={18} color="#16A34A" />
            <ThemedText style={styles.securityText}>
              Your information is encrypted and secure
            </ThemedText>
          </View>

          {/* Create Account */}
          <Pressable
            onPress={handleSignup}
            disabled={!accepted || loading}
            style={[
              styles.primaryButton,
              {
                backgroundColor: primary,
                opacity: !accepted || loading ? 0.6 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ThemedText style={styles.primaryButtonText}>
                Create Account
              </ThemedText>
            )}
          </Pressable>
        </View>

        {/* Social Login */}
        <View style={styles.socialSection}>
          <Pressable style={[styles.socialButton, { borderColor: border }]}>
            <IconSymbol name="google.logo" size={18} color={primary} />
            <ThemedText>Continue with Google</ThemedText>
          </Pressable>
        </View>

        {/* Footer */}
        <Pressable
          onPress={() => router.replace("/login")}
          style={styles.footer}
        >
          <ThemedText>
            Already have an account?{" "}
            <ThemedText style={{ color: primary, fontWeight: "600" }}>
              Sign in
            </ThemedText>
          </ThemedText>
        </Pressable>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 80,
    marginBottom: 32,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  strengthRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: -6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  termsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  termsText: {
    fontSize: 13,
    flex: 1,
  },
  securityBanner: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
  },
  securityText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  socialSection: {
    marginTop: 28,
  },
  socialButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
});
