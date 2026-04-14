import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { CustomDropdown } from "@/components/CustomDropdown";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  deleteBankAccount,
  getBankAccount,
  getBanks,
  saveBankAccount,
} from "@/services/bank-account.service";

interface BankAccountData {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

interface Bank {
  id: string;
  name: string;
  code: string;
}

export default function Step4BankAccountScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const primary = useThemeColor({}, "brandPrimary");
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const mutedText = useThemeColor({}, "textDisabled");
  const textPrimary = useThemeColor({}, "textPrimary");
  const errorColor = useThemeColor({}, "statusError");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);

  const [formData, setFormData] = useState<BankAccountData>({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });

  const [errors, setErrors] = useState<Partial<BankAccountData>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const banksData = await getBanks();
      setBanks(Array.isArray(banksData) ? banksData : []);
    } catch (e) {
      if (__DEV__) {
        console.error("Failed to load banks", e);
      }
      setBanks([]);
    }

    try {
      const account = await getBankAccount();
      if (account) {
        setFormData({
          bankName: account.bankName || "",
          bankCode: account.bankCode || "",
          accountNumber: account.accountNumber || "",
          accountName: account.accountName || "",
        });
        setHasExisting(true);
      }
    } catch (e) {
      if (__DEV__) {
        console.error("Failed to load account", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBankChange = (bankCode: string) => {
    const selectedBank = banks.find((b) => b.code === bankCode);
    setFormData({
      ...formData,
      bankCode,
      bankName: selectedBank?.name || "",
      accountName: "",
    });
    if (errors.bankCode) {
      setErrors({ ...errors, bankCode: undefined });
    }
  };

  const handleAccountNumberChange = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/\D/g, "");
    setFormData({ ...formData, accountNumber: cleaned, accountName: "" });
    if (errors.accountNumber) {
      setErrors({ ...errors, accountNumber: undefined });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<BankAccountData> = {};

    if (!formData.bankCode) {
      newErrors.bankCode = "Please select a bank";
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = "Account number is required";
    } else if (!/^\d{10}$/.test(formData.accountNumber.trim())) {
      newErrors.accountNumber = "Account number must be 10 digits";
    }

    // We no longer require remote verification. Optionally allow account name input.

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Toast.show({
        type: "error",
        text1: "Please fix the errors",
      });
      return;
    }

    // Show confirmation modal for updates
    if (hasExisting) {
      const confirmed = await confirm({
        title: "Update Bank Account",
        message:
          "Are you sure you want to update your bank account information?",
        confirmLabel: "Update",
        cancelLabel: "Cancel",
        variant: "danger"
      });

      if (!confirmed) return;
    }

    // Perform save
    setSaving(true);
    try {
      await saveBankAccount(formData);
      Toast.show({
        type: "success",
        text1: hasExisting
          ? "Bank account updated successfully"
          : "Bank account added successfully",
      });
      router.back();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to save bank account",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete Bank Account",
      message:
        "Are you sure you want to remove this bank account? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteBankAccount();
      Toast.show({
        type: "success",
        text1: "Bank account removed",
      });
      router.back();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to delete bank account",
      });
    } finally {
      setDeleting(false);
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
          <View
            style={{
              width: 120,
              height: 24,
              borderRadius: 4,
              backgroundColor: borderColor,
              opacity: 0.3,
            }}
          />
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: surfaceCard }]}>
            {/* Title Skeleton */}
            <View
              style={{
                width: 180,
                height: 20,
                borderRadius: 4,
                backgroundColor: borderColor,
                opacity: 0.3,
                marginBottom: 16,
              }}
            />

            {/* Bank Selection Skeleton */}
            <View style={styles.inputGroup}>
              <View
                style={{
                  width: 100,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                  marginBottom: 8,
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

            {/* Account Number Skeleton */}
            <View style={styles.inputGroup}>
              <View
                style={{
                  width: 120,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                  marginBottom: 8,
                }}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: 12,
                    backgroundColor: borderColor,
                    opacity: 0.3,
                  }}
                />
                <View
                  style={{
                    width: 80,
                    height: 50,
                    borderRadius: 12,
                    backgroundColor: borderColor,
                    opacity: 0.3,
                  }}
                />
              </View>
            </View>

            {/* Account Name Skeleton */}
            <View style={styles.inputGroup}>
              <View
                style={{
                  width: 110,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                  marginBottom: 8,
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

            {/* Save Button Skeleton */}
            <View
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: borderColor,
                opacity: 0.3,
                marginTop: 8,
              }}
            />
          </View>

          {/* Info Card Skeleton */}
          <View
            style={{
              height: 80,
              borderRadius: 12,
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText type="defaultSemiBold" style={{ color: primary }}>
            Back
          </ThemedText>
        </Pressable>

        <ThemedText type="subtitle">Bank Account</ThemedText>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: surfaceCard }]}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: 16 }}>
              {hasExisting ? "Update Bank Account" : "Add Bank Account"}
            </ThemedText>

            {/* Bank Selection */}
            <View style={styles.inputGroup}>
              <CustomDropdown
                label="Select Bank"
                placeholder="-- Select Bank --"
                data={banks.map((bank) => ({
                  label: bank.name,
                  value: bank.code,
                }))}
                value={formData.bankCode}
                onChange={(value) => handleBankChange(value as string)}
              />
            </View>

            {/* Account Number */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Account Number</ThemedText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[
                    styles.input,
                    { flex: 1 },
                    {
                      backgroundColor: surfaceCard,
                      borderColor: errors.accountNumber
                        ? errorColor
                        : borderColor,
                      color: textPrimary,
                    },
                  ]}
                  placeholder="0123456789"
                  placeholderTextColor={mutedText}
                  keyboardType="numeric"
                  maxLength={10}
                  value={formData.accountNumber}
                  onChangeText={handleAccountNumberChange}
                  editable={!saving}
                />
                {/* No verify button: users submit directly. */}
              </View>
              {errors.accountNumber && (
                <ThemedText style={[styles.errorText, { color: errorColor }]}>
                  {errors.accountNumber}
                </ThemedText>
              )}
            </View>

            {/* Account Name (Auto-filled after verification) */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Account Name (optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: surfaceCard,
                    borderColor: errors.accountName ? errorColor : borderColor,
                    color: textPrimary,
                  },
                ]}
                placeholder="Account name (optional)"
                placeholderTextColor={mutedText}
                value={formData.accountName}
                onChangeText={(t) => {
                  setFormData({ ...formData, accountName: t });
                  if (errors.accountName)
                    setErrors({ ...errors, accountName: undefined });
                }}
              />

              <ThemedText
                style={{ fontSize: 12, color: mutedText, marginTop: 8 }}
              >
                We won't automatically verify the account number. Please make
                sure the bank details are correct before submitting.
              </ThemedText>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[
                styles.saveButton,
                {
                  backgroundColor: saving ? mutedText : primary,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
                  {hasExisting ? "Update Account" : "Add Account"}
                </ThemedText>
              )}
            </Pressable>

            {/* Delete Button (only if existing account) */}
            {hasExisting && (
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={[
                  styles.deleteButton,
                  {
                    borderColor: errorColor,
                  },
                ]}
              >
                {deleting ? (
                  <ActivityIndicator color={errorColor} />
                ) : (
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: errorColor }}
                  >
                    Remove Account
                  </ThemedText>
                )}
              </Pressable>
            )}
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: primary + "10" }]}>
            <IconSymbol name="info.circle" size={20} color={primary} />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 12, color: primary }}>
                This bank account will be used for withdrawal payments. Ensure
                the details are correct.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  verifyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  deleteButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
});
