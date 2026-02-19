import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { fetchWithdrawalHistory } from "@/services/withdrawal.service";

interface Withdrawal {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  bankName: string;
  accountNumber: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
  referenceNumber?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function WithdrawalHistoryModal({ visible, onClose }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const border = useThemeColor({}, "borderDefault");
  const textMuted = useThemeColor({}, "textMuted");
  const textPrimary = useThemeColor({}, "textPrimary");
  const statusPending = useThemeColor({}, "statusPending");
  const statusSuccess = useThemeColor({}, "statusSuccess");
  const statusError = useThemeColor({}, "statusError");

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) loadHistory();
  }, [visible]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchWithdrawalHistory();
      setWithdrawals(data);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to load history",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: Withdrawal["status"]) => {
    switch (status) {
      case "PENDING":
        return {
          color: statusPending,
          label: "Processing",
          icon: "clock.fill" as const,
        };
      case "REJECTED":
        return {
          color: statusError,
          label: "Declined",
          icon: "xmark.circle" as const,
        };
      default:
        return {
          color: statusSuccess,
          label: "Completed",
          icon: "checkmark.circle.fill" as const,
        };
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const maskAccount = (num: string) => "****** " + num.slice(-4);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <View style={styles.dragHandleWrapper}>
          <View style={[styles.dragHandle, { backgroundColor: border }]} />
        </View>

        <View style={styles.header}>
          <View>
            <ThemedText style={[styles.headerLabel, { color: textMuted }]}>
              TRANSACTION LOG
            </ThemedText>
            <ThemedText style={[styles.headerTitle, { color: textPrimary }]}>
              Withdrawals
            </ThemedText>
          </View>
          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: surfaceSubtle }]}
          >
            <IconSymbol name="xmark" size={16} color={textMuted} />
          </Pressable>
        </View>

        {!loading && withdrawals.length > 0 && (
          <View
            style={[styles.summaryStrip, { backgroundColor: surfaceSubtle }]}
          >
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryValue, { color: textPrimary }]}>
                {withdrawals.length}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: textMuted }]}>
                Total
              </ThemedText>
            </View>
            <View
              style={[styles.summaryDivider, { backgroundColor: border }]}
            />
            <View style={styles.summaryItem}>
              <ThemedText
                style={[styles.summaryValue, { color: statusPending }]}
              >
                {withdrawals.filter((w) => w.status === "PENDING").length}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: textMuted }]}>
                Pending
              </ThemedText>
            </View>
            <View
              style={[styles.summaryDivider, { backgroundColor: border }]}
            />
            <View style={styles.summaryItem}>
              <ThemedText
                style={[styles.summaryValue, { color: statusSuccess }]}
              >
                {
                  withdrawals.filter(
                    (w) => w.status === "APPROVED" || w.status === "COMPLETED",
                  ).length
                }
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: textMuted }]}>
                Completed
              </ThemedText>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={primary} />
            <ThemedText style={[styles.loadingText, { color: textMuted }]}>
              Fetching records...
            </ThemedText>
          </View>
        ) : withdrawals.length === 0 ? (
          <View style={styles.center}>
            <View
              style={[styles.emptyCircle, { backgroundColor: primary + "12" }]}
            >
              <IconSymbol name="list" size={28} color={primary} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: textPrimary }]}>
              No withdrawals yet
            </ThemedText>
            <ThemedText style={[styles.emptyDesc, { color: textMuted }]}>
              Once you request a withdrawal, it will appear here.
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {withdrawals.map((item, index) => {
              const config = getStatusConfig(item.status);
              const isLast = index === withdrawals.length - 1;
              return (
                <View key={item.id} style={styles.row}>
                  <View style={styles.dotCol}>
                    <View
                      style={[styles.dot, { backgroundColor: config.color }]}
                    />
                    {!isLast && (
                      <View
                        style={[styles.connector, { backgroundColor: border }]}
                      />
                    )}
                  </View>

                  <View style={styles.rowInfo}>
                    <View style={styles.rowTop}>
                      <ThemedText
                        style={[styles.rowAmount, { color: textPrimary }]}
                      >
                        ₦{item.amount.toLocaleString()}
                      </ThemedText>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: config.color + "18" },
                        ]}
                      >
                        <ThemedText
                          style={[styles.badgeText, { color: config.color }]}
                        >
                          {config.label}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.rowMeta}>
                      <ThemedText
                        style={[styles.metaText, { color: textMuted }]}
                      >
                        {item.bankName} {maskAccount(item.accountNumber)}
                      </ThemedText>
                      <ThemedText
                        style={[styles.metaText, { color: textMuted }]}
                      >
                        {formatDate(item.createdAt)}
                      </ThemedText>
                    </View>

                    {item.referenceNumber && (
                      <ThemedText
                        style={[styles.refText, { color: textMuted }]}
                      >
                        Ref {item.referenceNumber}
                      </ThemedText>
                    )}

                    {item.status === "REJECTED" && item.rejectionReason && (
                      <View
                        style={[
                          styles.reasonBox,
                          {
                            backgroundColor: statusError + "12",
                            borderColor: statusError + "30",
                          },
                        ]}
                      >
                        <IconSymbol
                          name="info.circle"
                          size={12}
                          color={statusError}
                        />
                        <ThemedText
                          style={[styles.reasonText, { color: statusError }]}
                        >
                          {item.rejectionReason}
                        </ThemedText>
                      </View>
                    )}
                    {!isLast && (
                      <View
                        style={[styles.rowDivider, { backgroundColor: border }]}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dragHandleWrapper: { alignItems: "center", paddingTop: 14, paddingBottom: 4 },
  dragHandle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStrip: {
    flexDirection: "row",
    marginHorizontal: 24,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 18, fontWeight: "800" },
  summaryLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  summaryDivider: { width: 1, marginVertical: 4 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: "500" },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  emptyDesc: { textAlign: "center", lineHeight: 20, fontSize: 13 },
  list: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 4 },
  row: { flexDirection: "row" },
  dotCol: { width: 32, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  connector: { width: 1, flex: 1, marginTop: 4 },
  rowInfo: { flex: 1, paddingBottom: 4 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rowAmount: { fontSize: 17, fontWeight: "800" },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  rowMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaText: { fontSize: 12, fontWeight: "500" },
  refText: { fontSize: 11, fontWeight: "500", marginBottom: 6 },
  reasonBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  reasonText: { fontSize: 12, fontWeight: "600", flex: 1 },
  rowDivider: { height: 1, marginTop: 12, marginBottom: 16, marginRight: 0 },
});
