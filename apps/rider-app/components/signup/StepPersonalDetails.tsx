import React, { useState, useMemo } from "react";
import { View, StyleSheet, Platform, KeyboardAvoidingView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { SignupForm } from "@/types/signup";
import { DatePicker } from "../DatePicker";
import { CustomDropdown } from "../CustomDropdown";
import { STATE_CITIES, STATES } from "@/config/states";

type Props = {
  data: SignupForm;
  onChange: <K extends keyof SignupForm>(key: K, value: SignupForm[K]) => void;
};

export function StepPersonalDetails({ data, onChange }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const surface = useThemeColor({}, "surfaceBackground");

  const [selectedState, setSelectedState] = useState<string | undefined>(
    undefined
  );

  const cities = useMemo(() => {
    if (!selectedState) return [];
    return STATE_CITIES[selectedState] || [];
  }, [selectedState]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      {/* Full name */}
      <Field label="Full name">
        <ThemedInput
          placeholder="John Doe"
          value={data.fullName}
          onChangeText={(v) => onChange("fullName", v)}
        />
      </Field>

      {/* Address */}
      <Field label="Address">
        <ThemedInput
          placeholder="Street address"
          value={data.address}
          onChangeText={(v) => onChange("address", v)}
        />
      </Field>

      {/* Phone */}
      <Field label="Phone number">
        <View style={styles.row}>
          <CustomDropdown
            data={COUNTRY_CODES}
            value={data.phoneCode}
            onChange={(v) => onChange("phoneCode", v as string)}
            placeholder="+234"
            containerStyle={{ flex: 2 }}
          />

          <ThemedInput
            placeholder="8012345678"
            value={data.phoneNumber}
            onChangeText={(v) => onChange("phoneNumber", v)}
            containerStyle={{ flex: 4 }}
            keyboardType="phone-pad"
          />
        </View>
      </Field>

      <DatePicker
        label="Date of birth"
        value={data.dob}
        onChange={(d) => onChange("dob", d.toISOString())}
        maximumDate={get18YearsAgo()}
        prompt="You must be at least 18 years old"
        activeTextColor={primary}
        backgroundColor={surface}
        highlightColor={primary}
      />

      {/* Language */}
      <CustomDropdown
        data={LANGUAGES}
        value={data.language}
        onChange={(v) => onChange("language", v as string)}
        placeholder="Select language"
        containerStyle={{ flex: 2, marginTop: 20 }}
        label="Preferred language"
      />

      {/* State */}
      <CustomDropdown
        data={STATES}
        value={selectedState}
        onChange={(v) => {
          setSelectedState(v as string);
          onChange("state", v as string);
          onChange("city", null);
        }}
        placeholder="Select state"
        containerStyle={{ flex: 2, marginTop: 20 }}
        label="State"
      />

      {/* City */}
      <CustomDropdown
        data={cities}
        value={data.city}
        onChange={(v) => onChange("city", v as string)}
        placeholder="Select city"
        containerStyle={{ flex: 2, marginTop: 20 }}
        label="City / Region"
      />

      {/* Security tip */}
      <View style={[styles.tip, { backgroundColor: primary + "20" }]}>
        <IconSymbol name="shield" size={16} color={primary} />
        <ThemedText style={{ color: muted }}>Your data is secured</ThemedText>
      </View>
    </KeyboardAvoidingView>
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

function get18YearsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const styles = StyleSheet.create({
  field: {
    marginTop: 20,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  dropdown: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  helperText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  tip: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    opacity: 0.5,
    marginTop: 24,
  },
});

/* ---------------------------------- */
/* Data */
/* ---------------------------------- */
const COUNTRY_CODES = [
  { label: "+234", value: "+234" },
  { label: "+1", value: "+1" },
  { label: "+44", value: "+44" },
];

const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
];
