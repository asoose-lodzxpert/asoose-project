import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  getBankAccount,
  updateBankAccount,
} from "@/services/bank-account.service";
import type { BankAccount } from "@/types/bank-account";

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusError = "#EF4444";

  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [tempAccount, setTempAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBankAccount = useCallback(async () => {
    try {
      setLoading(true);
      const account = await getBankAccount();
      setBankAccount(account);
      setTempAccount(account);
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to load account" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBankAccount();
  }, [fetchBankAccount]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBankAccount();
  }, [fetchBankAccount]);

  const handleEditToggle = () => {
    if (editing) {
      // If canceling, revert changes
      setTempAccount(bankAccount);
      setEditing(false);
    } else {
      setEditing(true);
    }
  };

  const saveChanges = async () => {
    if (!tempAccount) return;
    setIsSaving(true);
    try {
      const updated = await updateBankAccount(tempAccount);
      setBankAccount(updated);
      setTempAccount(updated);
      setEditing(false);
      Toast.show({ type: "success", text1: "Bank details updated" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Update failed" });
    } finally {
      setIsSaving(false);
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <View style={styles.headerSide}>
          {editing ? (
            <Pressable onPress={handleEditToggle}>
              <ThemedText style={{ color: statusError, fontWeight: "600" }}>
                Cancel
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="chevron.left" size={24} color={primary} />
            </Pressable>
          )}
        </View>

        <ThemedText type="subtitle" style={styles.headerTitle}>
          Bank Details
        </ThemedText>

        <View style={styles.headerSide}>
          {loading ? null : (
            <Pressable
              onPress={editing ? saveChanges : handleEditToggle}
              disabled={isSaving}
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
              <ThemedText type="defaultSemiBold">Bank Name</ThemedText>
              <ThemedInput
                value={tempAccount?.bankName}
                onChangeText={(v) =>
                  setTempAccount((p) => (p ? { ...p, bankName: v } : null))
                }
                placeholder="Enter bank name"
              />
            </View>

            <View style={styles.inputGap}>
              <ThemedText type="defaultSemiBold">Account Number</ThemedText>
              <ThemedInput
                value={tempAccount?.accountNumber}
                onChangeText={(v) =>
                  setTempAccount((p) => (p ? { ...p, accountNumber: v } : null))
                }
                keyboardType="numeric"
                maxLength={10}
                placeholder="10 digit NUBAN"
              />
            </View>

            <View style={styles.inputGap}>
              <ThemedText type="defaultSemiBold">Account Name</ThemedText>
              <ThemedInput
                value={tempAccount?.accountName}
                onChangeText={(v) =>
                  setTempAccount((p) => (p ? { ...p, accountName: v } : null))
                }
                placeholder="Enter account name"
              />
            </View>
          </View>
        ) : (
          <View style={styles.viewContainer}>
            <View style={styles.payoutBadge}>
              <IconSymbol
                name="checkmark.seal.fill"
                size={16}
                color="#10B981"
              />
              <ThemedText style={styles.payoutText}>
                Active Settlement Account
              </ThemedText>
            </View>

            {renderDataRow(
              "Bank Name",
              bankAccount?.bankName || "",
              "house.fill",
            )}
            {renderDataRow(
              "Account Number",
              bankAccount?.accountNumber || "",
              "credit-card",
            )}
            {renderDataRow(
              "Account Holder",
              bankAccount?.accountName || "",
              "person.crop.circle.fill",
            )}

            <ThemedText style={[styles.disclaimer, { color: textSecondary }]}>
              This account will receive all your automated payouts. Please
              ensure the details are accurate to avoid delays.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerSide: { minWidth: 60 },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  backBtn: { marginLeft: -8, padding: 8 },
  scrollContent: { padding: 20 },
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
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: { fontSize: 16 },
  payoutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  payoutText: { color: "#10B981", fontSize: 14, fontWeight: "600" },
  disclaimer: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 30,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
