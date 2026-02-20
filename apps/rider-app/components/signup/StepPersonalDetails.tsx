import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { STATE_CITIES, STATES } from "@/config/states";
import { useThemeColor } from "@/hooks/use-theme-color";
import { SignupForm } from "@/types/signup";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CustomDropdown } from "../CustomDropdown";
import { DatePicker } from "../DatePicker";

type Props = {
  data: SignupForm;
  onChange: <K extends keyof SignupForm>(key: K, value: SignupForm[K]) => void;
};

export function StepPersonalDetails({ data, onChange }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const surface = useThemeColor({}, "surfaceBackground");

  const [selectedState, setSelectedState] = useState<string | undefined>(
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const cities = useMemo(() => {
    if (!selectedState) return [];
    return STATE_CITIES[selectedState] || [];
  }, [selectedState]);

  return (
    <View>
      {/* Role Selection */}
      <Field label="I want to be a">
        <View style={styles.roleContainer}>
          <Pressable
            style={[
              styles.roleOption,
              data.role === "RIDER" && {
                borderColor: primary,
                backgroundColor: `${primary}15`,
              },
            ]}
            onPress={() => onChange("role", "RIDER")}
          >
            <IconSymbol
              name="package"
              size={24}
              color={data.role === "RIDER" ? primary : muted}
            />
            <ThemedText
              style={[
                styles.roleText,
                data.role === "RIDER" && { color: primary, fontWeight: "600" },
              ]}
            >
              Rider
            </ThemedText>
            <ThemedText style={[styles.roleDesc, { color: muted }]}>
              Deliver packages & food
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.roleOption,
              data.role === "DRIVER" && {
                borderColor: primary,
                backgroundColor: `${primary}15`,
              },
            ]}
            onPress={() => onChange("role", "DRIVER")}
          >
            <IconSymbol
              name="car"
              size={24}
              color={data.role === "DRIVER" ? primary : muted}
            />
            <ThemedText
              style={[
                styles.roleText,
                data.role === "DRIVER" && { color: primary, fontWeight: "600" },
              ]}
            >
              Driver
            </ThemedText>
            <ThemedText style={[styles.roleDesc, { color: muted }]}>
              Transport passengers
            </ThemedText>
          </Pressable>
        </View>
      </Field>

      {/* Full name */}
      <Field label="Enter your full name">
        <ThemedInput
          placeholder="John Doe"
          value={data.fullName}
          onChangeText={(v) => onChange("fullName", v)}
          autoCapitalize="words"
        />
      </Field>

      {/* Email */}
      <Field label="Enter your email address">
        <ThemedInput
          placeholder="john@example.com"
          value={data.email}
          onChangeText={(v) => onChange("email", v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </Field>

      {/* Password */}
      <Field label="Create a password">
        <ThemedInput
          placeholder="Minimum 8 characters"
          value={data.password}
          onChangeText={(v) => onChange("password", v)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          iconRight={
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <IconSymbol
                size={24}
                name={showPassword ? "eye.fill" : "eye.slash.fill"}
                color={primary}
              />
            </Pressable>
          }
        />
      </Field>

      {/* Confirm Password */}
      <Field label="Confirm your password">
        <ThemedInput
          placeholder="Re-enter your password"
          value={data.confirmPassword}
          onChangeText={(v) => onChange("confirmPassword", v)}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          iconRight={
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <IconSymbol
                size={24}
                name={showConfirmPassword ? "eye.fill" : "eye.slash.fill"}
                color={primary}
              />
            </Pressable>
          }
        />
      </Field>

      {/* Address */}
      <Field label="Enter your home address">
        <ThemedInput
          placeholder="Street address"
          value={data.address}
          onChangeText={(v) => onChange("address", v)}
        />
      </Field>

      {/* Phone */}
      <Field label="Enter your phone number">
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
        label="Select your date of birth"
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
        label="Choose your preferred language"
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
        label="Choose your state"
      />

      {/* City */}
      <CustomDropdown
        data={cities}
        value={data.city}
        onChange={(v) => onChange("city", v as string)}
        placeholder="Select city"
        containerStyle={{ flex: 2, marginTop: 20 }}
        label="Choose your city / region"
      />

      {/* Security tip */}
      <View style={[styles.tip, { backgroundColor: primary + "20" }]}>
        <IconSymbol name="shield" size={16} color={primary} />
        <ThemedText style={{ color: muted }}>Your data is secured</ThemedText>
      </View>
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
  roleContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  roleOption: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    gap: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  roleDesc: {
    fontSize: 11,
    textAlign: "center",
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
  // { label: "French", value: "fr" },
];
