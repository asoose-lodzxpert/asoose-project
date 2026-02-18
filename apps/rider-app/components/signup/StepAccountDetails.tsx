import React, { useState } from "react";
import { View, StyleSheet } from "react-native";

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
  const mutedText = useThemeColor({}, "textSecondary");
  const errorColor = useThemeColor({}, "statusError");

  return (
    <View>
      <View style={styles.infoBox}>
        <ThemedText style={[styles.infoText, { color: mutedText }]}>
          Please ensure the bank details entered below are correct to avoid
          payout issues.
        </ThemedText>
      </View>

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
          maxLength={10}
          onChangeText={(v) => {
            onChange("accountNumber", v);
            if (v.length > 0 && !/^\d+$/.test(v)) {
              setError("Account number must contain only digits");
            } else if (v.length > 0 && v.length !== 10) {
              setError("Account number must be exactly 10 digits");
            } else {
              setError(null);
            }
          }}
        />
        {error && (
          <ThemedText style={[styles.errorText, { color: errorColor }]}>
            {error}
          </ThemedText>
        )}
      </Field>

      {/* Account name */}
      <Field label="Account name">
        <ThemedInput
          placeholder="e.g. John Doe"
          value={data.accountName}
          autoCapitalize="characters"
          onChangeText={(v) => onChange("accountName", v)}
        />
      </Field>
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
  infoBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
  },
});
