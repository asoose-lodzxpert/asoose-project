import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CustomDropdown } from "@/components/CustomDropdown";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  getBankAccount,
  getBanks,
  verifyAccountNumber,
  updateBankAccount,
  type Bank,
} from "@/services/bank-account.service";
import type { BankAccount } from "@/types/bank-account";

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const isMountedRef = useRef(true);

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const statusError = "#EF4444";

  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [tempAccount, setTempAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchBankAccount = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const [account, bankList] = await Promise.all([
        getBankAccount(),
        getBanks(),
      ]);
      setBankAccount(account);
      setTempAccount(account);
      setBanks(bankList);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load account" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchBankAccount();
  }, [fetchBankAccount]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBankAccount();
  };

  const handleEditToggle = () => {
    if (editing) {
      setTempAccount(bankAccount);
      setEditing(false);
      setErrors({});
    } else {
      setEditing(true);
      setTempAccount(
        bankAccount ||
          ({
            id: "",
            bankName: "",
            accountNumber: "",
            accountName: "",
            bankCode: "",
            riderId: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as BankAccount),
      );
      setErrors({});
    }
  };

  const validateFields = () => {
    const newErrors: Record<string, string> = {};

    if (!tempAccount?.bankCode?.trim()) {
      newErrors.bankCode = "Please select a bank";
    }

    if (!tempAccount?.accountNumber?.trim()) {
      newErrors.accountNumber = "Account number is required";
    } else if (tempAccount.accountNumber.length !== 10) {
      newErrors.accountNumber = "Account number must be exactly 10 digits";
    } else if (!/^\d+$/.test(tempAccount.accountNumber)) {
      newErrors.accountNumber = "Account number must contain only digits";
    }

    if (!tempAccount?.accountName?.trim()) {
      newErrors.accountName =
        "Account name is required — enter account number to auto-fill";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveChanges = async () => {
    Keyboard.dismiss();

    if (!tempAccount) {
      Toast.show({ type: "error", text1: "No account data" });
      return;
    }

    // Validate all fields
    if (!validateFields()) {
      Toast.show({ type: "error", text1: "Please fix validation errors" });
      return;
    }

    setIsSaving(true);

    try {
      // Only send fields the backend expects
      const payload = {
        bankName: tempAccount.bankName,
        accountNumber: tempAccount.accountNumber,
        accountName: tempAccount.accountName,
        ...(tempAccount.bankCode && { bankCode: tempAccount.bankCode }),
      };

      const updated = await updateBankAccount(payload as BankAccount);
      if (isMountedRef.current) {
        setBankAccount(updated);
        setTempAccount(updated);
        setEditing(false);
        Toast.show({ type: "success", text1: "Bank details updated" });
        setTimeout(() => {
          router.back();
        }, 500);
      }
    } catch (error: any) {
      console.warn("Save error:", error);
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: error?.message || "Please try again",
      });
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const renderDataRow = (label: string, value: string, icon: any) => (
    <View style={[styles.dataRow, { borderBottomColor: border }]}>
      <IconSymbol
        name={icon}
        size={20}
        color={textSecondary}
        style={styles.rowIcon}
      />
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.label, { color: textSecondary }]}>
          {label}
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.value}>
          {value || "Not set"}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <View style={styles.headerSide}>
          {editing ? (
            <Pressable
              onPress={handleEditToggle}
              hitSlop={20}
              style={({ pressed }) => [
                styles.clickableArea,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <ThemedText style={{ color: statusError, fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.back()}
              hitSlop={20}
              style={({ pressed }) => [
                styles.backBtn,
                styles.clickableArea,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <IconSymbol name="chevron.left" size={24} color={primary} />
            </Pressable>
          )}
        </View>

        <View style={styles.titleContainer}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Bank Details
          </ThemedText>
        </View>

        <View style={[styles.headerSide, { alignItems: "flex-end" }]}>
          {!loading && (
            <Pressable
              onPress={editing ? saveChanges : handleEditToggle}
              disabled={isSaving}
              hitSlop={20}
              style={({ pressed }) => [
                styles.clickableArea,
                { opacity: pressed || isSaving ? 0.5 : 1 },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={primary} />
              ) : (
                <ThemedText style={{ color: primary, fontWeight: "700" }}>
                  {editing ? "Done" : "Edit"}
                </ThemedText>
              )}
            </Pressable>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={primary}
            />
          }
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color={primary}
              style={{ marginTop: 50 }}
            />
          ) : editing ? (
            <View style={styles.formContainer}>
              <View style={styles.inputGap}>
                <ThemedText type="defaultSemiBold">Bank</ThemedText>
                <CustomDropdown
                  data={banks.map((b) => ({ label: b.name, value: b.code }))}
                  value={tempAccount?.bankCode || null}
                  placeholder="Select your bank"
                  onChange={(code) => {
                    const selected = banks.find((b) => b.code === code);
                    setTempAccount(
                      (p) =>
                        ({
                          ...(p || {}),
                          bankCode: String(code),
                          bankName: selected?.name || "",
                          accountName: "",
                        }) as BankAccount,
                    );
                    if (errors.bankCode) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.bankCode;
                        return next;
                      });
                    }
                  }}
                />
                {errors.bankCode && (
                  <ThemedText
                    style={{ color: statusError, fontSize: 12, marginTop: 4 }}
                  >
                    {errors.bankCode}
                  </ThemedText>
                )}
              </View>

              <View style={styles.inputGap}>
                <ThemedText type="defaultSemiBold">Account Number</ThemedText>
                <ThemedInput
                  value={tempAccount?.accountNumber || ""}
                  onChangeText={async (v) => {
                    const numOnly = v.replace(/[^0-9]/g, "").slice(0, 10);
                    setTempAccount(
                      (p) =>
                        ({
                          ...(p || {}),
                          accountNumber: numOnly,
                          accountName: "",
                        }) as BankAccount,
                    );
                    if (errors.accountNumber) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.accountNumber;
                        return next;
                      });
                    }
                    // Auto-verify when 10 digits entered and bank selected
                    if (numOnly.length === 10 && tempAccount?.bankCode) {
                      setIsVerifying(true);
                      try {
                        const result = await verifyAccountNumber(
                          tempAccount.bankCode,
                          numOnly,
                        );
                        setTempAccount(
                          (p) =>
                            ({
                              ...(p || {}),
                              accountNumber: numOnly,
                              accountName: result.accountName,
                            }) as BankAccount,
                        );
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.accountName;
                          return next;
                        });
                      } catch {
                        Toast.show({
                          type: "error",
                          text1: "Could not verify account",
                          text2: "Check the number or try again",
                        });
                      } finally {
                        setIsVerifying(false);
                      }
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="10 digit NUBAN"
                />
                {errors.accountNumber && (
                  <ThemedText
                    style={{ color: statusError, fontSize: 12, marginTop: 4 }}
                  >
                    {errors.accountNumber}
                  </ThemedText>
                )}
                {isVerifying && (
                  <ThemedText
                    style={{ color: textSecondary, fontSize: 12, marginTop: 4 }}
                  >
                    Verifying account...
                  </ThemedText>
                )}
                {!isVerifying &&
                  tempAccount?.accountNumber &&
                  !errors.accountNumber && (
                    <ThemedText
                      style={{ color: "#10B981", fontSize: 12, marginTop: 4 }}
                    >
                      ✓ {tempAccount.accountNumber.length}/10 digits
                    </ThemedText>
                  )}
              </View>

              <View style={styles.inputGap}>
                <ThemedText type="defaultSemiBold">Account Name</ThemedText>
                <ThemedInput
                  value={tempAccount?.accountName || ""}
                  placeholder={
                    isVerifying
                      ? "Verifying..."
                      : "Auto-filled after verification"
                  }
                  editable={false}
                  style={{ opacity: 0.7 }}
                />
                {errors.accountName && (
                  <ThemedText
                    style={{ color: statusError, fontSize: 12, marginTop: 4 }}
                  >
                    {errors.accountName}
                  </ThemedText>
                )}
                {tempAccount?.accountName ? (
                  <ThemedText
                    style={{ color: "#10B981", fontSize: 12, marginTop: 4 }}
                  >
                    ✓ Account verified
                  </ThemedText>
                ) : null}
              </View>

              <Pressable
                onPress={saveChanges}
                disabled={isSaving || Object.keys(errors).length > 0}
                style={({ pressed }) => [
                  styles.doneButton,
                  {
                    backgroundColor: primary,
                    opacity:
                      pressed || isSaving || Object.keys(errors).length > 0
                        ? 0.7
                        : 1,
                  },
                ]}
              >
                <ThemedText style={styles.doneButtonText}>
                  {isSaving ? "Saving..." : "Update Account"}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.viewContainer}>
              {renderDataRow(
                "Bank Name",
                bankAccount?.bankName || "",
                "house.fill",
              )}
              {renderDataRow(
                "Account Number",
                bankAccount?.accountNumber || "",
                "creditcard.fill",
              )}
              {renderDataRow(
                "Account Holder",
                bankAccount?.accountName || "",
                "person.crop.circle.fill",
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isSaving} transparent animationType="fade">
        <View style={styles.overlayContainer}>
          <View style={[styles.overlayBox, { backgroundColor: cardBg }]}>
            <ActivityIndicator size="large" color={primary} />
            <ThemedText style={styles.overlayText}>
              Saving bank details...
            </ThemedText>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerSide: {
    width: 70,
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  clickableArea: {
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: "center",
  },
  backBtn: { marginLeft: -8 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  viewContainer: { gap: 10 },
  formContainer: { gap: 24 },
  inputGap: { gap: 8 },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { marginRight: 16, opacity: 0.7 },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: { fontSize: 16 },
  overlayContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayBox: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: "center",
    gap: 16,
    width: "80%",
  },
  overlayText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  doneButton: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  doneButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
