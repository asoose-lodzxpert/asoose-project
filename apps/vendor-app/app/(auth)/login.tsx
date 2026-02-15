import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { signIn } = useAuth();
  const router = useRouter();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");

  // Animated logo
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", () => {
      Animated.timing(logoAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      Animated.timing(logoAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [logoAnim]);

  function validateForm() {
    if (!identifier) {
      setError("Email is required.");
      return false;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    return true;
  }

  async function handleLogin() {
    setError("");
    if (!validateForm()) return;

    setLoading(true);

    try {
      await signIn(identifier, password);
      router.replace("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* Logo removed for cleaner, centered layout */}

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.centeredWrapper}>
                {/* Form */}
                <View style={styles.form}>
                  <ThemedText type="title" style={styles.centeredTitle}>
                    Welcome back
                  </ThemedText>

                  <View style={styles.field}>
                    <ThemedInput
                      placeholder="Email address"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={identifier}
                      onChangeText={(text) => {
                        setIdentifier(text);
                        if (error) setError("");
                      }}
                    />
                  </View>

                  <View style={styles.field}>
                    <ThemedInput
                      placeholder="Password"
                      secureTextEntry={secure}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (error) setError("");
                      }}
                      iconRight={
                        <Pressable onPress={() => setSecure(!secure)}>
                          <IconSymbol
                            size={24}
                            name={secure ? "eye.fill" : "eye.slash.fill"}
                            color={primary}
                          />
                        </Pressable>
                      }
                    />
                  </View>

                  {error ? (
                    <ThemedText style={styles.inputError}>{error}</ThemedText>
                  ) : null}

                  <Pressable
                    style={styles.forgot}
                    onPress={() => router.push("/(auth)/resetpassword")}
                  >
                    <ThemedText type="link">Forgot password?</ThemedText>
                  </Pressable>

                  <Pressable
                    style={[styles.button, { backgroundColor: primary }]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={textOnPrimary} />
                    ) : (
                      <ThemedText
                        style={{ color: textOnPrimary }}
                        type="defaultSemiBold"
                      >
                        Login
                      </ThemedText>
                    )}
                  </Pressable>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                  <ThemedText>
                    Don't have an account?{" "}
                    <ThemedText
                      type="link"
                      onPress={() => router.push("/(auth)/signup")}
                    >
                      Sign up
                    </ThemedText>
                  </ThemedText>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  // Logo styles removed
  centeredWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
    paddingVertical: 32,
  },
  centeredTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  form: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    width: "100%",
    maxWidth: 400,
  },
  field: {
    marginTop: 12,
  },
  forgot: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  footer: {
    alignItems: "center",
    marginBottom: 24,
  },
  error: {
    marginTop: 12,
    color: "#EF4444",
    textAlign: "center",
  },
  inputError: {
    marginTop: 4,
    color: "#EF4444",
    textAlign: "left",
  },
});
