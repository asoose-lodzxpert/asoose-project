import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { CustomDropdown } from "../CustomDropdown";
import BANKS from "@/config/banks";
import { SignupForm } from "@/types/signup";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  data: SignupForm;
  onChange: <K extends keyof SignupForm>(key: K, value: SignupForm[K]) => void;
};

export function StepAccountDetails({ data, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const primary = useThemeColor({}, "brandPrimary");
  const errorColor = useThemeColor({}, "statusError");

  const isValidAccountNumber = (value: string) => /^\d{10}$/.test(value);

  const fetchAccountName = () => {
    if (!isValidAccountNumber(data.accountNumber)) {
      setError("Account number must be exactly 10 digits");
      return;
    }

    setError(null);
    setLoading(true);

    // 🔹 Simulate API call
    setTimeout(() => {
      setLoading(false);

      if (data.bank === null) {
        Toast.show({
          type: "error",
          text1: "Bank not selected",
          text2: "Please select a bank to proceed",
        });
        return;
      }

      // Demo logic: pretend some lookups fail
      if (
        data.accountNumber.startsWith("0") ||
        data.accountNumber.startsWith("1")
      ) {
        onChange("accountName", "John Doe");
      } else {
        onChange("accountName", "");
        Toast.show({
          type: "error",
          text1: "Lookup failed",
          text2: "Unable to fetch account name",
        });
      }
    }, 1500);
  };

  return (
    <View>
      {/* Bank */}
      <CustomDropdown
        data={BANKS}
        value={data.bank}
        onChange={(v) => onChange("bank", v as string)}
        placeholder="Select bank"
        containerStyle={{ marginTop: 20 }}
        label="Bank name"
      />

      {/* Account number */}
      <Field label="Account number">
        <ThemedInput
          placeholder="0123456789"
          value={data.accountNumber}
          keyboardType="numeric"
          onChangeText={(v) => {
            onChange("accountNumber", v);
            onChange("accountName", "");

            if (v.length === 0) {
              setError(null);
            } else if (!/^\d+$/.test(v)) {
              setError("Account number must contain only digits");
            } else if (v.length !== 10) {
              setError("Account number must be exactly 10 digits");
            } else {
              setError(null);
            }
          }}
        />

        {error && (
          <ThemedText
            style={[styles.errorText, { backgroundColor: errorColor }]}
          >
            {error}
          </ThemedText>
        )}

        <Pressable
          style={[
            styles.button,
            (!isValidAccountNumber(data.accountNumber) || loading) &&
              styles.buttonDisabled,
            { backgroundColor: primary },
          ]}
          onPress={fetchAccountName}
          disabled={
            !isValidAccountNumber(data.accountNumber) || !data.bank || loading
          }
        >
          <ThemedText style={[styles.buttonText]}>
            {loading ? "Fetching..." : "Fetch Account Name"}
          </ThemedText>
        </Pressable>
      </Field>

      {/* Account name */}
      {data.accountName && (
        <View style={{ marginTop: 12 }}>
          <ThemedText>
            Account name:{" "}
            <ThemedText type="defaultSemiBold">{data.accountName}</ThemedText>
          </ThemedText>
        </View>
      )}
    </View>
  );
}

/* ---------------------------------- */
/* Helpers */
/* ---------------------------------- */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {children}
    </View>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const styles = StyleSheet.create({
  field: {
    marginTop: 20,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600",
  },
});
