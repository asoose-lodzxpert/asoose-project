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
import { Collapsible } from "@/components/ui/collapsible";
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
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const mutedText = useThemeColor({}, "textDisabled");
  const background = useThemeColor({}, "surfaceBackground");

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
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

  const getStatusColor = (status: Withdrawal["status"]) => {
    switch (status) {
      case "PENDING":
        return useThemeColor({}, "statusPending");
      case "APPROVED":
      case "COMPLETED":
        return useThemeColor({}, "statusSuccess");
      case "REJECTED":
        return useThemeColor({}, "statusError");
      default:
        return mutedText;
    }
  };

  const getStatusIcon = (status: Withdrawal["status"]) => {
    switch (status) {
      case "PENDING":
        return "info.circle" as const;
      case "APPROVED":
      case "COMPLETED":
        return "check" as const;
      case "REJECTED":
        return "close" as const;
      default:
        return "info.circle" as const;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedText type="title">Withdrawal History</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={primary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primary} />
            <ThemedText style={{ marginTop: 16 }}>
              Loading history...
            </ThemedText>
          </View>
        ) : withdrawals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="file-text" size={60} color={mutedText} />
            <ThemedText
              type="subtitle"
              style={{ marginTop: 16, color: mutedText }}
            >
              No withdrawal history
            </ThemedText>
            <ThemedText
              style={{ color: mutedText, marginTop: 8, textAlign: "center" }}
            >
              Your withdrawal requests will appear here
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {withdrawals.map((withdrawal) => (
              <View
                key={withdrawal.id}
                style={[
                  styles.withdrawalCard,
                  {
                    backgroundColor: surfaceCard,
                    borderColor: borderColor,
                  },
                ]}
              >
                {/* Main Info */}
                <View style={styles.withdrawalHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
                      ₦{withdrawal.amount.toLocaleString()}
                    </ThemedText>
                    <ThemedText
                      style={{ color: mutedText, fontSize: 12, marginTop: 4 }}
                    >
                      {formatDate(withdrawal.createdAt)}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          getStatusColor(withdrawal.status) + "20",
                      },
                    ]}
                  >
                    <IconSymbol
                      name={getStatusIcon(withdrawal.status)}
                      size={16}
                      color={getStatusColor(withdrawal.status)}
                    />
                    <ThemedText
                      style={{
                        color: getStatusColor(withdrawal.status),
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {withdrawal.status}
                    </ThemedText>
                  </View>
                </View>

                {/* Collapsible Details */}
                <View style={{ marginTop: 12 }}>
                  <Collapsible title="View Details">
                    <View style={styles.detailsContainer}>
                      <View style={styles.detailRow}>
                        <ThemedText style={{ color: mutedText }}>
                          Bank Name
                        </ThemedText>
                        <ThemedText type="defaultSemiBold">
                          {withdrawal.bankName}
                        </ThemedText>
                      </View>
                      <View style={styles.detailRow}>
                        <ThemedText style={{ color: mutedText }}>
                          Account Number
                        </ThemedText>
                        <ThemedText type="defaultSemiBold">
                          {withdrawal.accountNumber}
                        </ThemedText>
                      </View>
                      {withdrawal.referenceNumber && (
                        <View style={styles.detailRow}>
                          <ThemedText style={{ color: mutedText }}>
                            Reference
                          </ThemedText>
                          <ThemedText type="defaultSemiBold">
                            {withdrawal.referenceNumber}
                          </ThemedText>
                        </View>
                      )}
                      {withdrawal.processedAt && (
                        <View style={styles.detailRow}>
                          <ThemedText style={{ color: mutedText }}>
                            Processed At
                          </ThemedText>
                          <ThemedText type="defaultSemiBold">
                            {formatDate(withdrawal.processedAt)}
                          </ThemedText>
                        </View>
                      )}
                      {withdrawal.rejectionReason && (
                        <View style={styles.detailRow}>
                          <ThemedText style={{ color: mutedText }}>
                            Rejection Reason
                          </ThemedText>
                          <ThemedText
                            type="defaultSemiBold"
                            style={{ color: useThemeColor({}, "statusError") }}
                          >
                            {withdrawal.rejectionReason}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </Collapsible>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </ThemedView>
    </Modal>
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
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  withdrawalCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  withdrawalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsContainer: {
    gap: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
