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
  BusinessType,
  EmployeeRange,
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
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceCard = useThemeColor({}, "surfaceCard");

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
      // Only send editable fields (business type and employees)
      await updateBusinessInfo({
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
      <ThemedView style={{ flex: 1 }}>
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
            <View
              style={{
                width: 60,
                height: 20,
                borderRadius: 4,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Skeleton */}
          <View
            style={{
              width: 200,
              height: 24,
              borderRadius: 4,
              backgroundColor: borderColor,
              opacity: 0.3,
            }}
          />

          {/* Form Fields Skeleton */}
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.field}>
              <View
                style={{
                  width: 120,
                  height: 18,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                  marginBottom: 6,
                }}
              />
              <View
                style={{
                  height: 50,
                  borderRadius: 12,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
            </View>
          ))}

          {/* Save Button Skeleton */}
          <View
            style={{
              marginTop: 24,
              height: 50,
              borderRadius: 14,
              backgroundColor: borderColor,
              opacity: 0.3,
            }}
          />
        </ScrollView>
      </ThemedView>
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

          {/* Business Name - NON-EDITABLE */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Business name</ThemedText>
            <ThemedInput
              placeholder="Registered business name"
              value={data?.businessName}
              editable={false}
              style={{ opacity: 0.6 }}
            />
            <ThemedText style={{ fontSize: 11, opacity: 0.6 }}>
              Contact support to change your business name
            </ThemedText>
          </View>

          {/* Business Email - NON-EDITABLE */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Business email</ThemedText>
            <ThemedInput
              placeholder="Business contact email"
              value={data?.businessEmail}
              keyboardType="email-address"
              editable={false}
              style={{ opacity: 0.6 }}
            />
            <ThemedText style={{ fontSize: 11, opacity: 0.6 }}>
              Contact support to change your business email
            </ThemedText>
          </View>

          {/* Phone Number - NON-EDITABLE */}
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">
              Business phone number
            </ThemedText>
            <View style={styles.row}>
              <ThemedInput
                value={data?.countryCode}
                editable={false}
                containerStyle={{ flex: 2, opacity: 0.6 }}
              />
              <ThemedInput
                placeholder="Phone number"
                value={data?.phoneNumber}
                keyboardType="phone-pad"
                editable={false}
                containerStyle={{ flex: 4, opacity: 0.6 }}
              />
            </View>
            <ThemedText style={{ fontSize: 11, opacity: 0.6 }}>
              Contact support to change your phone number
            </ThemedText>
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
