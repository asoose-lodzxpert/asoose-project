import React, { useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "../themed-view";

interface Props {
  newPassword: string;
  confirmPassword: string;
  onChangeNew: (v: string) => void;
  onChangeConfirm: (v: string) => void;
  onSubmit: () => Promise<void>;
  loading: boolean;
}

export const ResetPasswordChange: React.FC<Props> = ({
  newPassword,
  confirmPassword,
  onChangeNew,
  onChangeConfirm,
  onSubmit,
  loading,
}) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const validations = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    symbol: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title">Enter New Password</ThemedText>
      <ThemedText type="subtitle" style={{ marginVertical: 8 }}>
        Set a new password you can remember
      </ThemedText>

      <ThemedInput
        placeholder="New Password"
        secureTextEntry={secureNew}
        value={newPassword}
        onChangeText={onChangeNew}
        iconRight={
          <Pressable onPress={() => setSecureNew(!secureNew)}>
            <IconSymbol
              size={24}
              name={secureNew ? "eye.fill" : "eye.slash.fill"}
              color={brandPrimary}
            />
          </Pressable>
        }
      />

      <View style={styles.validationContainer}>
        {Object.entries(validations).map(([key, valid]) => (
          <View key={key} style={styles.validationRow}>
            <IconSymbol
              size={16}
              name="check"
              color={valid ? "green" : "red"}
            />
            <ThemedText style={{ marginLeft: 6 }}>
              {key === "length"
                ? "At least 8 characters"
                : key === "uppercase"
                  ? "At least 1 uppercase letter"
                  : key === "lowercase"
                    ? "At least 1 lowercase letter"
                    : key === "number"
                      ? "At least 1 number"
                      : "At least 1 symbol"}
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedInput
        placeholder="Confirm Password"
        secureTextEntry={secureConfirm}
        value={confirmPassword}
        onChangeText={onChangeConfirm}
        iconRight={
          <Pressable onPress={() => setSecureConfirm(!secureConfirm)}>
            <IconSymbol
              size={24}
              name={secureConfirm ? "eye.fill" : "eye.slash.fill"}
              color={brandPrimary}
            />
          </Pressable>
        }
      />

      <Pressable
        style={[styles.button, { backgroundColor: brandPrimary }]}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
            Change Password
          </ThemedText>
        )}
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
  validationContainer: { marginVertical: 8, gap: 4 },
  validationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
