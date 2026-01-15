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
  fetchStoreBalance,
  fetchBankAccounts,
  createWithdrawal,
} from "@/services/withdrawal.service";
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

  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balanceData, accounts] = await Promise.all([
        fetchStoreBalance(),
        fetchBankAccounts(),
      ]);
      setBalance(balanceData?.amount ?? 0);
      setBankAccounts(accounts);
      if (accounts.length > 0) {
        setSelectedBank(accounts[0]);
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to load data",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleMaxPress = () => {
    setAmount(balance.toString());
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return Toast.show({
        type: "error",
        text1: "Please enter a valid amount",
      });
    }

    if (parseFloat(amount) > balance) {
      return Toast.show({
        type: "error",
        text1: "Insufficient balance",
      });
    }

    if (!selectedBank) {
      return Toast.show({
        type: "error",
        text1: "Please select a bank account",
      });
    }

    setLoading(true);

    try {
      await createWithdrawal({
        amount: parseFloat(amount),
        bankAccountId: selectedBank.id,
      });

      Toast.show({
        type: "success",
        text1: "Withdrawal request submitted",
        text2: "Your withdrawal is pending approval",
      });

      // Refresh balance
      const balanceData = await fetchStoreBalance();
      setBalance(balanceData?.amount ?? 0);
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
        {/* Header Skeleton */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.backButton}>
            <View
              style={{
                width: 24,
                height: 24,
                backgroundColor: borderColor,
                borderRadius: 12,
                opacity: 0.3,
              }}
            />
            <View
              style={{
                width: 50,
                height: 20,
                backgroundColor: borderColor,
                borderRadius: 4,
                opacity: 0.3,
              }}
            />
          </View>
          <View
            style={{
              width: 120,
              height: 24,
              backgroundColor: borderColor,
              borderRadius: 4,
              opacity: 0.3,
            }}
          />
          <View
            style={{
              width: 24,
              height: 24,
              backgroundColor: borderColor,
              borderRadius: 12,
              opacity: 0.3,
            }}
          />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          {/* Balance Card Skeleton */}
          <View style={[styles.balanceCard, { backgroundColor: surfaceCard }]}>
            <View
              style={{
                width: 120,
                height: 16,
                backgroundColor: borderColor,
                borderRadius: 4,
                opacity: 0.3,
                marginBottom: 12,
              }}
            />
            <View
              style={{
                width: 150,
                height: 36,
                backgroundColor: borderColor,
                borderRadius: 6,
                opacity: 0.3,
              }}
            />
          </View>

          {/* Amount Input Skeleton */}
          <View style={styles.section}>
            <View
              style={{
                width: 150,
                height: 20,
                backgroundColor: borderColor,
                borderRadius: 4,
                opacity: 0.3,
                marginBottom: 12,
              }}
            />
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: surfaceCard,
                  borderColor: borderColor,
                },
              ]}
            >
              <View
                style={{
                  flex: 1,
                  height: 24,
                  backgroundColor: borderColor,
                  borderRadius: 4,
                  opacity: 0.3,
                }}
              />
            </View>
          </View>

          {/* Bank Account Skeleton */}
          <View style={styles.section}>
            <View
              style={{
                width: 100,
                height: 20,
                backgroundColor: borderColor,
                borderRadius: 4,
                opacity: 0.3,
                marginBottom: 12,
              }}
            />
            {[1, 2].map((item) => (
              <View
                key={item}
                style={[
                  styles.bankCard,
                  {
                    backgroundColor: surfaceCard,
                    borderColor: borderColor,
                    marginBottom: 12,
                  },
                ]}
              >
                <View style={styles.bankCardLeft}>
                  <View
                    style={[
                      styles.bankIcon,
                      { backgroundColor: borderColor, opacity: 0.3 },
                    ]}
                  />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View
                      style={{
                        width: "60%",
                        height: 16,
                        backgroundColor: borderColor,
                        borderRadius: 4,
                        opacity: 0.3,
                      }}
                    />
                    <View
                      style={{
                        width: "40%",
                        height: 14,
                        backgroundColor: borderColor,
                        borderRadius: 4,
                        opacity: 0.3,
                      }}
                    />
                    <View
                      style={{
                        width: "50%",
                        height: 14,
                        backgroundColor: borderColor,
                        borderRadius: 4,
                        opacity: 0.3,
                      }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Footer Skeleton */}
        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <View
            style={[
              styles.withdrawButton,
              { backgroundColor: borderColor, opacity: 0.3 },
            ]}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
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
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: surfaceCard }]}>
          <ThemedText style={{ color: mutedText, fontSize: 14 }}>
            Available Balance
          </ThemedText>
          <ThemedText type="title" style={{ fontSize: 32, marginTop: 8 }}>
            ₦{balance.toLocaleString()}
          </ThemedText>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            Withdrawal Amount
          </ThemedText>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: surfaceCard,
                borderColor: borderColor,
              },
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

        {/* Bank Account Selection */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            Bank Account
          </ThemedText>

          {bankAccounts.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: surfaceCard,
                  borderColor: borderColor,
                },
              ]}
            >
              <IconSymbol name="alert-circle" size={40} color={mutedText} />
              <ThemedText style={{ color: mutedText, marginTop: 12 }}>
                No bank accounts found
              </ThemedText>
              <Pressable
                onPress={() => router.push("/(profile)/edit-business")}
                style={[styles.addBankButton, { borderColor: primary }]}
              >
                <ThemedText style={{ color: primary }}>
                  Add Bank Account
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {bankAccounts.map((account) => (
                <Pressable
                  key={account.id}
                  onPress={() => setSelectedBank(account)}
                  style={[
                    styles.bankCard,
                    {
                      backgroundColor: surfaceCard,
                      borderColor:
                        selectedBank?.id === account.id ? primary : borderColor,
                      borderWidth: selectedBank?.id === account.id ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.bankCardLeft}>
                    <View
                      style={[
                        styles.bankIcon,
                        {
                          backgroundColor:
                            selectedBank?.id === account.id
                              ? primary + "20"
                              : borderColor,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="credit-card"
                        size={20}
                        color={
                          selectedBank?.id === account.id ? primary : mutedText
                        }
                      />
                    </View>
                    <View>
                      <ThemedText type="defaultSemiBold">
                        {account.bankName}
                      </ThemedText>
                      <ThemedText style={{ color: mutedText, fontSize: 12 }}>
                        {account.accountNumber}
                      </ThemedText>
                      <ThemedText style={{ color: mutedText, fontSize: 12 }}>
                        {account.accountName}
                      </ThemedText>
                    </View>
                  </View>
                  {selectedBank?.id === account.id && (
                    <IconSymbol name="check" size={24} color={primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Withdraw Button */}
      <View style={[styles.footer, { borderTopColor: borderColor }]}>
        <Pressable
          onPress={handleWithdraw}
          disabled={loading || bankAccounts.length === 0}
          style={[
            styles.withdrawButton,
            {
              backgroundColor:
                loading || bankAccounts.length === 0 ? mutedText : primary,
            },
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

      {/* History Modal */}
      <WithdrawalHistoryModal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
      />

      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  section: {
    gap: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
  maxButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
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
    borderWidth: 1,
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
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  withdrawButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
