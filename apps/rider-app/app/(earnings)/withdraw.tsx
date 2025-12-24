import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

/* ---------------------------------- */
/* Config (Simulated Backend Data) */
/* ---------------------------------- */

const WITHDRAW_DATA = {
  balance: 367500,
  min: 5000,
  accounts: [
    { id: "1", bank: "GTBank", type: "Savings", last4: "1234" },
    { id: "2", bank: "Access Bank", type: "Current", last4: "8890" },
    { id: "3", bank: "UBA", type: "Savings", last4: "5566" },
  ],
};

/* ---------------------------------- */

export default function WithdrawEarningsScreen() {
  const router = useRouter();

  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [accountModalLoading, setAccountModalLoading] = useState(false);

  const [amountDisplay, setAmountDisplay] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [account, setAccount] = useState(WITHDRAW_DATA.accounts[0]);
  const [accountModal, setAccountModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  // Simulate initial data load
  useEffect(() => {
    setTimeout(() => setLoading(false), 1200);
  }, []);

  // Format number with commas
  const formatAmount = (num: number): string => {
    if (num === 0) return "";
    return num.toLocaleString("en-NG");
  };

  const getNumericAmount = (): number => {
    return Number(amountDisplay.replace(/,/g, "")) || 0;
  };

  const numericAmount = getNumericAmount();

  /* ---------------------------------- */
  /* Validation */
  /* ---------------------------------- */

  useEffect(() => {
    if (!amountDisplay) {
      setError(null);
    } else if (numericAmount < WITHDRAW_DATA.min) {
      setError(`Minimum withdrawal is ₦${WITHDRAW_DATA.min.toLocaleString()}`);
    } else if (numericAmount > WITHDRAW_DATA.balance) {
      setError("Amount exceeds available balance");
    } else {
      setError(null);
    }
  }, [amountDisplay, numericAmount]);

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    const num = Number(cleaned);
    if (cleaned === "" || isNaN(num)) {
      setAmountDisplay("");
    } else {
      setAmountDisplay(formatAmount(num));
    }
  };

  const openAccountModal = () => {
    setAccountModal(true);
    setAccountModalLoading(true);
    setTimeout(() => setAccountModalLoading(false), 1000);
  };

  const withdraw = () => {
    if (error || numericAmount === 0) return;

    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      setSuccessModal(true);
    }, 1800);
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);

    // Simulate fetching fresh data
    setTimeout(() => {
      // Here you could update balance/accounts with new mock data if desired
      setRefreshing(false);
    }, 1500);
  }, []);

  if (loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: surface }]}>
        <ActivityIndicator size="large" color={primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1, backgroundColor: surface }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primary]}
          />
        }
      >
        {/* Header */}
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={18} color={primary} />
          <ThemedText type="link">Back</ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.pageTitle}>
          Withdraw Earnings
        </ThemedText>

        {/* Balance Card - Centered */}
        <View style={[styles.balanceCard, { backgroundColor: cardBg }]}>
          <ThemedText style={{ color: muted, textAlign: "center" }}>
            Available balance
          </ThemedText>
          <ThemedText type="title" style={{ textAlign: "center" }}>
            ₦{WITHDRAW_DATA.balance.toLocaleString()}
          </ThemedText>
          <ThemedText style={{ color: primary, textAlign: "center" }}>
            Ready to withdraw
          </ThemedText>
        </View>

        {/* Withdraw To */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Withdraw to</ThemedText>

          <View style={[styles.bankCard, { backgroundColor: cardBg }]}>
            <IconSymbol name="credit-card" size={22} color={primary} />

            <View style={{ flex: 1 }}>
              <ThemedText>{account.bank}</ThemedText>
              <ThemedText style={styles.bankSub}>
                {account.type} - ••••{account.last4}
              </ThemedText>
            </View>

            <Pressable onPress={openAccountModal}>
              <ThemedText type="link">Change</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Amount</ThemedText>

          <ThemedInput
            placeholder="0"
            keyboardType="numeric"
            value={amountDisplay}
            onChangeText={handleAmountChange}
            iconRight={<ThemedText>₦</ThemedText>}
          />

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <View style={styles.quickRow}>
            {[5000, 10000, 20000].map((v) => (
              <QuickButton
                key={v}
                label={`₦${v.toLocaleString()}`}
                onPress={() => setAmountDisplay(formatAmount(v))}
              />
            ))}
            <QuickButton
              label="All"
              onPress={() =>
                setAmountDisplay(formatAmount(WITHDRAW_DATA.balance))
              }
            />
          </View>
        </View>

        {/* Withdraw Button */}
        <Pressable
          style={[
            styles.withdrawBtn,
            { backgroundColor: primary },
            (error || withdrawing || numericAmount === 0) && { opacity: 0.5 },
          ]}
          disabled={!!error || withdrawing || numericAmount === 0}
          onPress={withdraw}
        >
          {withdrawing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.withdrawText}>Withdraw</ThemedText>
          )}
        </Pressable>
      </ScrollView>

      {/* Account Selector Modal */}
      <Modal transparent visible={accountModal} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <ThemedText type="defaultSemiBold">Select account</ThemedText>

            {accountModalLoading ? (
              <View style={styles.loadingRows}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.skeletonRow}>
                    <View style={styles.skeletonIcon} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.skeletonLine} />
                      <View
                        style={[
                          styles.skeletonLine,
                          { width: "60%", marginTop: 6 },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              WITHDRAW_DATA.accounts.map((a) => (
                <Pressable
                  key={a.id}
                  style={styles.modalRow}
                  onPress={() => {
                    setAccount(a);
                    setAccountModal(false);
                  }}
                >
                  <IconSymbol name="credit-card" size={18} color={primary} />
                  <View>
                    <ThemedText>{a.bank}</ThemedText>
                    <ThemedText style={styles.bankSub}>
                      {a.type} - ••••{a.last4}
                    </ThemedText>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal transparent visible={successModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: cardBg,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <IconSymbol
              name="checkmark.circle.fill"
              size={48}
              color={primary}
            />
            <ThemedText type="defaultSemiBold">
              Withdrawal successful
            </ThemedText>
            <ThemedText style={{ textAlign: "center" }}>
              Your money will be deposited shortly.
            </ThemedText>

            <Pressable
              style={[styles.doneBtn, { backgroundColor: primary }]}
              onPress={() => router.back()}
            >
              <ThemedText style={styles.withdrawText}>Done</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

/* ---------------------------------- */
/* Small Components */
/* ---------------------------------- */

function QuickButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const cardBg = useThemeColor({}, "surfaceSubtle");

  return (
    <Pressable
      onPress={onPress}
      style={[styles.quickBtn, { backgroundColor: cardBg }]}
    >
      <ThemedText>{label}</ThemedText>
    </Pressable>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  pageTitle: {
    marginTop: 8,
    marginBottom: 20,
  },

  balanceCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },

  section: { gap: 10, marginBottom: 24 },

  bankCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
  },

  bankSub: {
    fontSize: 12,
    opacity: 0.6,
  },

  error: {
    fontSize: 12,
    color: "#EF4444",
  },

  quickRow: {
    flexDirection: "row",
    gap: 8,
  },

  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },

  withdrawBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  withdrawText: {
    color: "#fff",
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    borderRadius: 16,
    padding: 20,
    gap: 20,
    alignItems: "flex-start",
  },

  modalRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    width: "100%",
    paddingVertical: 8,
  },

  loadingRows: {
    width: "100%",
    gap: 20,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    width: "100%",
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  skeletonLine: {
    height: 16,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  doneBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});
