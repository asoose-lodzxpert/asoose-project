import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  fetchBankAccounts,
  createWithdrawal,
} from "@/services/withdrawal.service";
import { useBalance } from "@/context/BalanceContext";
import { WithdrawalHistoryModal } from "@/components/withdrawal/WithdrawalHistoryModal";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function WithdrawalScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const mutedText = useThemeColor({}, "textDisabled");
  const textPrimary = useThemeColor({}, "textPrimary");
  const { balance, refetchBalance } = useBalance();
  const [amount, setAmount] = useState("");
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [_, accountData] = await Promise.all([
        refetchBalance(),
        fetchBankAccounts(),
      ]);

      // Handle case where it might come as an array or object
      const account = Array.isArray(accountData) ? accountData[0] : accountData;
      setBankAccount(account || null);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to load data",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleMaxPress = () => setAmount(balance.toString());

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return Toast.show({
        type: "error",
        text1: "Please enter a valid amount",
      });
    }

    if (parseFloat(amount) > (balance ?? 0)) {
      return Toast.show({ type: "error", text1: "Insufficient balance" });
    }

    if (!bankAccount) {
      return Toast.show({
        type: "error",
        text1: "Please add a bank account first",
      });
    }

    setLoading(true);
    try {
      await createWithdrawal({
        amount: parseFloat(amount),
        bankAccountId: bankAccount.id,
      });

      Toast.show({
        type: "success",
        text1: "Withdrawal request submitted",
        text2: "Your withdrawal is pending approval",
      });

      await refetchBalance();
      setAmount("");
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to create withdrawal",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <ActivityIndicator
          size="large"
          color={primary}
          style={{ marginTop: 40 }}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText type="defaultSemiBold">Back</ThemedText>
        </Pressable>
        <ThemedText type="subtitle">Withdraw Funds</ThemedText>
        <Pressable
          onPress={() => setShowHistory(true)}
          style={styles.historyButton}
        >
          <IconSymbol name="list" size={24} color={primary} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.balanceCard, { backgroundColor: surfaceCard }]}>
          <ThemedText style={{ color: mutedText, fontSize: 14 }}>
            Available Balance
          </ThemedText>
          <ThemedText type="title" style={{ fontSize: 32, marginTop: 8 }}>
            ₦{(balance ?? 0).toLocaleString()}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            Withdrawal Amount
          </ThemedText>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: surfaceCard, borderColor: borderColor },
            ]}
          >
            <ThemedText style={{ fontSize: 18, marginRight: 8 }}>₦</ThemedText>
            <TextInput
              style={[styles.input, { color: textPrimary }]}
              placeholder="0.00"
              placeholderTextColor={mutedText}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <Pressable
              onPress={handleMaxPress}
              style={[styles.maxButton, { backgroundColor: primary }]}
            >
              <ThemedText style={{ color: "#fff", fontSize: 12 }}>
                MAX
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            Settlement Account
          </ThemedText>
          {!bankAccount ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: surfaceCard, borderColor: borderColor },
              ]}
            >
              <ThemedText style={{ color: mutedText }}>
                No bank account linked
              </ThemedText>
              <Pressable
                onPress={() => router.push("/(profile)/edit-business")}
                style={[styles.addBankButton, { borderColor: primary }]}
              >
                <ThemedText style={{ color: primary }}>
                  Link Bank Account
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View
              style={[
                styles.bankCard,
                {
                  backgroundColor: surfaceCard,
                  borderColor: primary,
                  borderWidth: 1,
                },
              ]}
            >
              <View style={styles.bankCardLeft}>
                <View
                  style={[styles.bankIcon, { backgroundColor: primary + "15" }]}
                >
                  <IconSymbol name="credit-card" size={20} color={primary} />
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">
                    {bankAccount.bankName}
                  </ThemedText>
                  <ThemedText style={{ color: mutedText, fontSize: 12 }}>
                    {bankAccount.accountNumber}
                  </ThemedText>
                  <ThemedText style={{ color: mutedText, fontSize: 12 }}>
                    {bankAccount.accountName}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: borderColor }]}>
        <Pressable
          onPress={handleWithdraw}
          disabled={loading || !bankAccount}
          style={[
            styles.withdrawButton,
            { backgroundColor: loading || !bankAccount ? mutedText : primary },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
              Withdraw ₦{amount || "0"}
            </ThemedText>
          )}
        </Pressable>
      </View>

      <WithdrawalHistoryModal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
      />
      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  historyButton: { padding: 4 },
  content: { padding: 20, gap: 24 },
  balanceCard: { padding: 24, borderRadius: 16, alignItems: "center" },
  section: { gap: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: { flex: 1, fontSize: 18, fontWeight: "600" },
  maxButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  addBankButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
  },
  bankCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { padding: 20, borderTopWidth: 1 },
  withdrawButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
