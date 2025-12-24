import React, { useRef } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";

import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/themed-text";
import { SelectInput } from "@/components/ui/SelectInput";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

import {
  BUSINESS_TYPES,
  EMPLOYEE_RANGES,
  COUNTRY_CODES,
  BusinessType,
  EmployeeRange,
  CountryCode,
} from "@/config/signup";
import { SignupStep1Data } from "@/types/signup";
import { IconSymbol } from "@/components/ui/icon-symbol.ios";

/**
 * Edit Business Info (Step 1)
 *
 * Independent screen for editing business core details
 * No password field (unlike signup)
 */
export default function EditBusinessInfoScreen() {
  const router = useRouter();
  const brandPrimary = useThemeColor({}, "brandPrimary");

  const scrollRef = useRef<ScrollView>(null);

  /** Mock data — replace with store / API data */
  const [data, setData] = React.useState<SignupStep1Data>({
    businessName: "Fresh Bites Ltd",
    businessEmail: "contact@freshbites.com",
    countryCode: "+234",
    phoneNumber: "8012345678",
    businessType: "Restaurant",
    employees: "1-5",
    password: "", // unused but required by type
  });

  /** Generic change handler */
  const onChange = <K extends keyof SignupStep1Data>(
    key: K,
    value: SignupStep1Data[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  /** Save handler */
  const handleSave = () => {
    // TODO: submit updated business info to backend
    router.back();
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* ================= Header ================= */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <IconSymbol name="chevron.left" size={24} color={brandPrimary} />
          <ThemedText type="defaultSemiBold" style={{ color: brandPrimary }}>
            Back
          </ThemedText>
        </Pressable>
      </View>

      {/* ================= Form ================= */}
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
          <ThemedText type="subtitle">Update your business details</ThemedText>

          {/* Business Name */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Business name</ThemedText>
            <ThemedInput
              placeholder="Registered business name"
              value={data.businessName}
              onChangeText={(v) => onChange("businessName", v)}
            />
          </View>

          {/* Business Email */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Business email</ThemedText>
            <ThemedInput
              placeholder="Business contact email"
              value={data.businessEmail}
              onChangeText={(v) => onChange("businessEmail", v)}
              keyboardType="email-address"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">
              Business phone number
            </ThemedText>
            <View style={styles.row}>
              <SelectInput<CountryCode>
                options={COUNTRY_CODES}
                selected={data.countryCode || undefined}
                onSelect={(v) => onChange("countryCode", v)}
                style={{ flex: 1 }}
              />
              <ThemedInput
                placeholder="Phone number"
                value={data.phoneNumber}
                onChangeText={(v) => onChange("phoneNumber", v)}
                keyboardType="phone-pad"
                style={{ flex: 2 }}
              />
            </View>
          </View>

          {/* Business Type */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Type of business</ThemedText>
            <SelectInput<BusinessType>
              options={BUSINESS_TYPES}
              selected={data.businessType || undefined}
              onSelect={(v) => onChange("businessType", v)}
              placeholder="Select business category"
            />
          </View>

          {/* Employees */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Number of employees</ThemedText>
            <SelectInput<EmployeeRange>
              options={EMPLOYEE_RANGES}
              selected={data.employees || undefined}
              onSelect={(v) => onChange("employees", v)}
              placeholder="Employee range"
            />
          </View>

          {/* Save Button */}
          <Pressable
            style={[styles.saveButton, { backgroundColor: brandPrimary }]}
            onPress={handleSave}
          >
            <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
              Save changes
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

/* ============================================================
   Styles
   ============================================================ */

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
  },
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  field: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
});
