import React, { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useToast } from "@/components/ui/toast";
import * as WebBrowser from "expo-web-browser";
import {
  useGoogleSignIn,
  authenticateWithGoogle,
  authenticateWithApple,
  isAppleSignInAvailable,
} from "@/services/oauth.service";

WebBrowser.maybeCompleteAuthSession();

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { CustomDropdown } from "@/components/CustomDropdown";
import { signup } from "@/services/auth.service";

/* ---------------------------------- */
/* Static Data */
/* ---------------------------------- */
const COUNTRY_CODES = [{ label: "+234", value: "+234" }];

/* ---------------------------------- */
/* Screen */
/* ---------------------------------- */
export default function Signup() {
  // Validation schema
  const schema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email address"),
    phoneNumber: z.string().min(7, "Phone number is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    accepted: z.literal(true, { message: "You must accept the terms" }),
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const showToast = useToast();
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

  // OAuth state
  const { request, response, promptAsync } = useGoogleSignIn();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

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

  // Check Apple Sign-In availability
  useEffect(() => {
    (async () => {
      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);
    })();
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === "success" && response.authentication) {
      handleGoogleSignIn(response.authentication.accessToken);
    }
  }, [response]);

  /* ---------------------------------- */
  /* Google Sign-In */
  /* ---------------------------------- */
  const handleGoogleSignIn = async (accessToken: string) => {
    setOauthLoading(true);
    try {
      const response = await authenticateWithGoogle(accessToken);
      showToast({ variant: "success", message: "Account created!" });
      router.replace("/(tabs)/home");
    } catch (err: any) {
      const errorMsg = err.message || "Google sign-in failed";
      console.error("[SignupScreen] Google sign-in error:", err);
      showToast({ variant: "error", message: errorMsg });
    } finally {
      setOauthLoading(false);
    }
  };

  /* ---------------------------------- */
  /* Apple Sign-In */
  /* ---------------------------------- */
  const handleAppleSignIn = async () => {
    setOauthLoading(true);
    try {
      const response = await authenticateWithApple();
      showToast({ variant: "success", message: "Account created!" });
      router.replace("/(tabs)/home");
    } catch (err: any) {
      if (err.message !== "Apple Sign-In was cancelled") {
        const errorMsg = err.message || "Apple sign-in failed";
        console.error("[SignupScreen] Apple sign-in error:", err);
        showToast({ variant: "error", message: errorMsg });
      }
    } finally {
      setOauthLoading(false);
    }
  };

  /* ---------------------------------- */
  /* Simulate Signup */
  /* ---------------------------------- */
  const handleSignup = async () => {
    setErrors({});
    const result = schema.safeParse({
      fullName,
      email,
      phoneNumber,
      password,
      accepted,
    });
    if (!result.success) {
      const fieldErrors: { [key: string]: string } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      showToast({ variant: "error", message: Object.values(fieldErrors)[0] });
      return;
    }
    setLoading(true);
    try {
      const phone = `${phoneCode}${phoneNumber}`;
      await signup({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone,
        password,
      });
      showToast({ variant: "success", message: "Account created!" });
      router.replace("/login");
    } catch (err: unknown) {
      console.error("signup error", err);
      const message =
        err instanceof Error
          ? err.message
          : "Could not create account. Please try again.";
      showToast({ variant: "error", message });
    } finally {
      setLoading(false);
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
          {errors.fullName && (
            <ThemedText style={{ color: "#F87171", fontSize: 13 }}>
              {errors.fullName}
            </ThemedText>
          )}

          <ThemedInput
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errors.email && (
            <ThemedText style={{ color: "#F87171", fontSize: 13 }}>
              {errors.email}
            </ThemedText>
          )}

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
            {errors.phoneNumber && (
              <ThemedText style={{ color: "#F87171", fontSize: 13 }}>
                {errors.phoneNumber}
              </ThemedText>
            )}
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
          {errors.password && (
            <ThemedText style={{ color: "#F87171", fontSize: 13 }}>
              {errors.password}
            </ThemedText>
          )}

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
          {errors.accepted && (
            <ThemedText style={{ color: "#F87171", fontSize: 13 }}>
              {errors.accepted}
            </ThemedText>
          )}

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
          <View style={styles.socialRow}>
            {/* Google Sign-In */}
            <Pressable
              style={[
                styles.socialButton,
                {
                  borderColor: border,
                  flex: 1,
                  opacity: oauthLoading ? 0.6 : 1,
                },
              ]}
              onPress={() => promptAsync()}
              disabled={!request || loading || oauthLoading}
            >
              {oauthLoading ? (
                <ActivityIndicator size="small" color={primary} />
              ) : (
                <>
                  <IconSymbol name="google.logo" size={18} color={primary} />
                  <ThemedText>Google</ThemedText>
                </>
              )}
            </Pressable>

            {/* Apple Sign-In (iOS only) */}
            {appleAvailable && (
              <Pressable
                style={[
                  styles.socialButton,
                  {
                    borderColor: border,
                    flex: 1,
                    opacity: oauthLoading ? 0.6 : 1,
                  },
                ]}
                onPress={handleAppleSignIn}
                disabled={loading || oauthLoading}
              >
                <IconSymbol name="apple.logo" size={18} color={primary} />
                <ThemedText>Apple</ThemedText>
              </Pressable>
            )}
          </View>
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
  socialRow: {
    flexDirection: "row",
    gap: 12,
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
