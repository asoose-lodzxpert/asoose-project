import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { getBusinessDetails } from "@/services/business-details.service";
import { updateBusinessInfo } from "@/services/business.service";

import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/themed-text";
import { CustomDropdown } from "@/components/CustomDropdown";
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

  const [data, setData] = useState<SignupStep1Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const details = await getBusinessDetails();
        if (mounted && details?.step1) {
          setData({
            businessName: details.step1.businessName || "",
            businessEmail: details.step1.businessEmail || "",
            countryCode: details.step1.countryCode || "+234",
            phoneNumber: details.step1.phoneNumber || "",
            businessType: details.step1.businessType || "",
            employees: details.step1.employees || "",
            password: "", // unused
          });
        }
      } catch (err) {
        Toast.show({ type: "error", text1: "Failed to load business info" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** Generic change handler */
  const onChange = <K extends keyof SignupStep1Data>(
    key: K,
    value: SignupStep1Data[K]
  ) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  /** Save handler */
  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await updateBusinessInfo({
        businessName: data.businessName,
        businessEmail: data.businessEmail,
        countryCode: data.countryCode,
        phoneNumber: data.phoneNumber,
        businessType: data.businessType,
        employees: data.employees,
      });
      Toast.show({ type: "success", text1: "Business info updated" });
      router.back();
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to update business info" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ThemedText type="subtitle">Loading business info...</ThemedText>
      </View>
    );
  }

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
              value={data?.businessName}
              onChangeText={(v) => onChange("businessName", v)}
            />
          </View>

          {/* Business Email */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Business email</ThemedText>
            <ThemedInput
              placeholder="Business contact email"
              value={data?.businessEmail}
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
              <CustomDropdown
                data={COUNTRY_CODES.map((code) => ({
                  label: code,
                  value: code,
                }))}
                value={data?.countryCode || null}
                onChange={(v) => onChange("countryCode", v as CountryCode)}
                placeholder="Code"
                containerStyle={{ flex: 1 }}
              />
              <ThemedInput
                placeholder="Phone number"
                value={data?.phoneNumber}
                onChangeText={(v) => onChange("phoneNumber", v)}
                keyboardType="phone-pad"
                style={{ flex: 2 }}
              />
            </View>
          </View>

          {/* Business Type */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Type of business</ThemedText>
            <CustomDropdown
              data={BUSINESS_TYPES.map((type) => ({
                label: type,
                value: type,
              }))}
              value={data?.businessType || null}
              onChange={(v) => onChange("businessType", v as BusinessType)}
              placeholder="Select business category"
            />
          </View>

          {/* Employees */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Number of employees</ThemedText>
            <CustomDropdown
              data={EMPLOYEE_RANGES.map((range) => ({
                label: range,
                value: range,
              }))}
              value={data?.employees || null}
              onChange={(v) => onChange("employees", v as EmployeeRange)}
              placeholder="Employee range"
            />
          </View>

          {/* Save Button */}
          <Pressable
            style={[
              styles.saveButton,
              { backgroundColor: brandPrimary, opacity: saving ? 0.7 : 1 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
              {saving ? "Saving..." : "Save changes"}
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
