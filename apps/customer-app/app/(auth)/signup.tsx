import React, { useMemo, useState, useEffect, useRef } from "react";
import { z } from "zod";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useToast } from "@/components/ui/ThemedToast";
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
import { SafeAreaView } from "react-native-safe-area-context";

const COUNTRY_CODES = [{ label: "+234", value: "+234" }];

export default function Signup() {
  const schema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email address"),
    phoneNumber: z.string().min(7, "Phone number is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    accepted: z.literal(true, { message: "You must accept the terms" }),
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const showToast = useToast();

  // Theme Colors
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const border = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");

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

  const strength = useMemo(() => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 8) return 2;
    return 3;
  }, [password]);

  const strengthColors = ["#E5E7EB", "#F87171", "#FBBF24", "#10B981"];

  useEffect(() => {
    (async () => {
      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);
    })();
  }, []);

  useEffect(() => {
    if (response?.type === "success" && response.authentication) {
      handleGoogleSignIn(response.authentication.accessToken);
    }
  }, [response]);

  const handleGoogleSignIn = async (accessToken: string) => {
    setOauthLoading(true);
    try {
      await authenticateWithGoogle(accessToken);
      showToast({ variant: "success", message: "Account created!" });
      router.replace("/(tabs)/home");
    } catch (err: any) {
      showToast({
        variant: "error",
        message: err.message || "Google sign-in failed",
      });
    } finally {
      setOauthLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setOauthLoading(true);
    try {
      await authenticateWithApple();
      showToast({ variant: "success", message: "Account created!" });
      router.replace("/(tabs)/home");
    } catch (err: any) {
      if (err.message !== "Apple Sign-In was cancelled") {
        showToast({
          variant: "error",
          message: err.message || "Apple sign-in failed",
        });
      }
    } finally {
      setOauthLoading(false);
    }
  };

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
      result.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
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
    } catch (err: any) {
      showToast({
        variant: "error",
        message: err.message || "Could not create account",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <ThemedText
                type="title"
                style={[styles.title, { color: textPrimary }]}
              >
                Create Account
              </ThemedText>
              <ThemedText style={{ color: textSecondary }}>
                Join Asoose today and experience more.
              </ThemedText>
            </View>

            {/* Form Fields */}
            <View style={styles.form}>
              <ThemedInput
                placeholder="Full name"
                value={fullName}
                onChangeText={setFullName}
                error={errors.fullName}
              />

              <ThemedInput
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email}
              />

              <View style={styles.phoneRow}>
                <CustomDropdown
                  data={COUNTRY_CODES}
                  value={phoneCode}
                  onChange={(v) => setPhoneCode(v as string)}
                  containerStyle={styles.dropdown}
                />
                <ThemedInput
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  containerStyle={{ flex: 1 }}
                  error={errors.phoneNumber}
                />
              </View>

              <View>
                <ThemedInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secure}
                  error={errors.password}
                  iconRight={
                    <Pressable onPress={() => setSecure(!secure)}>
                      <IconSymbol
                        name={secure ? "eye.slash.fill" : "eye.fill"}
                        size={20}
                        color={textSecondary}
                      />
                    </Pressable>
                  }
                />
                {/* Strength Indicator */}
                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              strength > i ? strengthColors[strength] : border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* Terms Checkbox */}
              <Pressable
                style={styles.termsRow}
                onPress={() => setAccepted(!accepted)}
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
                  {accepted && (
                    <IconSymbol name="check" size={12} color={textOnPrimary} />
                  )}
                </View>
                <ThemedText style={styles.termsText}>
                  I agree to the{" "}
                  <ThemedText style={{ color: primary, fontWeight: "600" }}>
                    Terms
                  </ThemedText>{" "}
                  and{" "}
                  <ThemedText style={{ color: primary, fontWeight: "600" }}>
                    Privacy Policy
                  </ThemedText>
                </ThemedText>
              </Pressable>
              {errors.accepted && (
                <ThemedText style={styles.errorText}>
                  {errors.accepted}
                </ThemedText>
              )}

              {/* Action Button */}
              <Pressable
                onPress={handleSignup}
                disabled={loading}
                style={[
                  styles.primaryButton,
                  { backgroundColor: primary, opacity: loading ? 0.7 : 1 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={textOnPrimary} />
                ) : (
                  <ThemedText
                    style={[styles.primaryButtonText, { color: textOnPrimary }]}
                  >
                    Create Account
                  </ThemedText>
                )}
              </Pressable>
            </View>

            {/* OAuth Section */}
            <View style={styles.socialSection}>
              <View style={styles.dividerRow}>
                <View style={[styles.line, { backgroundColor: border }]} />
                <ThemedText style={[styles.orText, { color: textSecondary }]}>
                  or join with
                </ThemedText>
                <View style={[styles.line, { backgroundColor: border }]} />
              </View>

              <View style={styles.socialRow}>
                <Pressable
                  style={[
                    styles.socialButton,
                    { backgroundColor: surfaceSubtle },
                  ]}
                  onPress={() => promptAsync()}
                  disabled={oauthLoading}
                >
                  {oauthLoading ? (
                    <ActivityIndicator size="small" color={primary} />
                  ) : (
                    <>
                      <Image
                        source={require("@/assets/images/icons8-google-48.png")}
                        style={styles.socialIcon}
                      />
                      <ThemedText style={styles.socialText}>Google</ThemedText>
                    </>
                  )}
                </Pressable>

                {appleAvailable && (
                  <Pressable
                    style={[
                      styles.socialButton,
                      { backgroundColor: surfaceSubtle },
                    ]}
                    onPress={handleAppleSignIn}
                  >
                    <IconSymbol
                      name="apple.logo"
                      size={20}
                      color={textPrimary}
                    />
                    <ThemedText style={styles.socialText}>Apple</ThemedText>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Login Link */}
            <Pressable
              onPress={() => router.replace("/login")}
              style={styles.footer}
            >
              <ThemedText style={{ color: textSecondary }}>
                Already have an account?{" "}
                <ThemedText style={{ color: primary, fontWeight: "700" }}>
                  Sign in
                </ThemedText>
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    gap: 8,
  },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  form: { gap: 20 },
  phoneRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  dropdown: { width: 100 },
  strengthRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  termsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  termsText: { fontSize: 14, flex: 1 },
  errorText: { color: "#F87171", fontSize: 12, marginTop: -12, marginLeft: 34 },
  primaryButton: {
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  primaryButtonText: { fontSize: 17, fontWeight: "700" },
  socialSection: { marginTop: 32 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  line: { flex: 1, height: 1 },
  orText: { fontSize: 14, fontWeight: "500" },
  socialRow: { flexDirection: "row", gap: 12 },
  socialButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  socialIcon: { width: 22, height: 22 },
  socialText: { fontWeight: "600", fontSize: 15 },
  footer: { marginTop: 32, alignItems: "center" },
});
