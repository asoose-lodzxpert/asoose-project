import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  getWithdrawalInfo,
  requestWithdrawal,
} from "@/services/withdrawal.service";
import type { WithdrawalInfo, BankAccountInfo } from "@/types/withdrawal";

/* ---------------------------------- */
/* Skeleton Loader Component */
/* ---------------------------------- */
const SkeletonBox = ({
  width = "100%",
  height = 20,
  style = {},
}: {
  width?: string | number;
  height?: number;
  style?: any;
}) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: typeof width === "number" ? width : width,
          height,
          backgroundColor: "#E1E9EE",
          borderRadius: 4,
        },
        style,
        { opacity },
      ]}
    />
  );
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

  const [amountDisplay, setAmountDisplay] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [withdrawalInfo, setWithdrawalInfo] = useState<WithdrawalInfo | null>(
    null,
  );
  const [account, setAccount] = useState<BankAccountInfo | null>(null);
  const [accountModal, setAccountModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  // Load withdrawal info

  useEffect(() => {
    (async () => {
      try {
        await loadWithdrawalInfo();
      } catch {
        // silent
      }
    })();
  }, []);

  const loadWithdrawalInfo = async () => {
    try {
      setLoading(true);
      const data = await getWithdrawalInfo();
      setWithdrawalInfo(data);
      if (data.bankAccount) {
        setAccount(data.bankAccount);
      }
    } catch {
      setError("Failed to load withdrawal info. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

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
    if (!withdrawalInfo) return;

    if (!amountDisplay) {
      setError(null);
    } else if (numericAmount < withdrawalInfo.minWithdrawal) {
      setError(
        `Minimum withdrawal is ₦${withdrawalInfo.minWithdrawal.toLocaleString()}`,
      );
    } else if (numericAmount > withdrawalInfo.balance) {
      setError("Amount exceeds available balance");
    } else {
      setError(null);
    }
  }, [amountDisplay, numericAmount, withdrawalInfo]);

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
  };

  const withdraw = async () => {
    if (error || numericAmount === 0 || !account) return;

    try {
      setWithdrawing(true);
      await requestWithdrawal({
        amount: numericAmount,
        bankAccountId: account.id,
      });
      setSuccessModal(true);
      setAmountDisplay("");
    } catch (err: any) {
      // ...existing code...
      setError(err?.message || "Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWithdrawalInfo().finally(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: surface }}>
        {/* Header and Back Button always visible */}
        <View style={[styles.headerRow, { marginBottom: 24 }]}>
          <Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={18} color={primary} />
            <ThemedText type="link">Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Withdraw Earnings
          </ThemedText>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Balance Card Skeleton */}
          <View style={[styles.balanceCard, { backgroundColor: cardBg }]}>
            <SkeletonBox
              width={120}
              height={16}
              style={{ alignSelf: "center", marginBottom: 8 }}
            />
            <SkeletonBox
              width={180}
              height={32}
              style={{ alignSelf: "center", marginBottom: 8 }}
            />
            <SkeletonBox
              width={100}
              height={16}
              style={{ alignSelf: "center" }}
            />
          </View>

          {/* Bank Card Skeleton */}
          <View style={styles.section}>
            <SkeletonBox width={100} height={18} style={{ marginBottom: 12 }} />
            <View style={[styles.bankCard, { backgroundColor: cardBg }]}>
              <SkeletonBox
                width={22}
                height={22}
                style={{ borderRadius: 11 }}
              />
              <View style={{ flex: 1 }}>
                <SkeletonBox
                  width="60%"
                  height={16}
                  style={{ marginBottom: 6 }}
                />
                <SkeletonBox width="40%" height={14} />
              </View>
              <SkeletonBox width={60} height={20} />
            </View>
          </View>

          {/* Amount Section Skeleton */}
          <View style={styles.section}>
            <SkeletonBox width={80} height={18} style={{ marginBottom: 12 }} />
            <SkeletonBox
              width="100%"
              height={48}
              style={{ marginBottom: 12 }}
            />
            <View style={styles.quickRow}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBox
                  key={i}
                  width={70}
                  height={36}
                  style={{ borderRadius: 8 }}
                />
              ))}
            </View>
          </View>

          {/* Button Skeleton */}
          <SkeletonBox
            width="100%"
            height={56}
            style={{ borderRadius: 12, marginTop: 32 }}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  if (!withdrawalInfo || !account) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: surface }]}>
        <ThemedText>No bank account configured</ThemedText>
        <ThemedText style={{ color: muted, marginTop: 8 }}>
          Please add a bank account to withdraw
        </ThemedText>
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
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
        {/* Header and Back Button in Same Row */}
        <View style={[styles.headerRow, { marginBottom: 24 }]}>
          <Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={18} color={primary} />
            <ThemedText type="link">Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Withdraw Earnings
          </ThemedText>
        </View>

        {/* Balance Card - Centered */}
        <View style={[styles.balanceCard, { backgroundColor: cardBg }]}>
          <ThemedText style={{ color: muted, textAlign: "center" }}>
            Available balance
          </ThemedText>
          <ThemedText type="title" style={{ textAlign: "center" }}>
            ₦{withdrawalInfo.balance.toLocaleString()}
          </ThemedText>
          <ThemedText style={{ color: primary, textAlign: "center" }}>
            {withdrawalInfo.balance >= withdrawalInfo.minWithdrawal
              ? "Ready to withdraw"
              : `Minimum withdrawal is ₦${withdrawalInfo.minWithdrawal.toLocaleString()}`}
          </ThemedText>
        </View>

        {/* Withdraw To */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Withdraw to</ThemedText>

          <View style={[styles.bankCard, { backgroundColor: cardBg }]}>
            <IconSymbol name="credit-card" size={22} color={primary} />

            <View style={{ flex: 1 }}>
              <ThemedText>{account.bankName}</ThemedText>
              <ThemedText style={styles.bankSub}>
                {account.accountNumber} - {account.accountName}
              </ThemedText>
            </View>

            <Pressable onPress={openAccountModal}>
              <ThemedText type="link">View</ThemedText>
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
                setAmountDisplay(formatAmount(withdrawalInfo.balance))
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

      {/* Account Info Modal */}
      <Modal transparent visible={accountModal} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <ThemedText type="defaultSemiBold">Bank Account Details</ThemedText>

            <View style={styles.modalRow}>
              <IconSymbol name="credit-card" size={18} color={primary} />
              <View>
                <ThemedText>{account.bankName}</ThemedText>
                <ThemedText style={styles.bankSub}>
                  {account.accountNumber}
                </ThemedText>
                <ThemedText style={styles.bankSub}>
                  {account.accountName}
                </ThemedText>
              </View>
            </View>

            <Pressable
              style={[styles.closeBtn, { backgroundColor: primary }]}
              onPress={() => setAccountModal(false)}
            >
              <ThemedText style={styles.withdrawText}>Close</ThemedText>
            </Pressable>
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
  headerRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 40,
  },
  headerBackBtn: {
    position: "absolute",
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingRight: 12,
    zIndex: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
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

  closeBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
});
