import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { fetchOrderById } from "@/services/order-history.service";
import { createDispute } from "@/services/dispute.service";
import Toast from "react-native-toast-message";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatCurrency(value: string | number | undefined | null) {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-NG");
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const success = useThemeColor({}, "statusSuccess");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const DISPUTE_REASONS = [
    "Missing Item",
    "Wrong Item Delivered",
    "Late Delivery",
    "Item Quality Issue",
    "Damaged Item",
    "Other",
  ];

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await fetchOrderById(id);
      setOrder(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const renderTimeline = () => {
    if (!order?.timeline?.length) return null;
    const currentStep = order.timeline[order.timeline.length - 1];

    return (
      <View style={[styles.modernCard, { backgroundColor: card }]}>
        <View style={styles.cardHeader}>
          <View
            style={[styles.statusIndicator, { backgroundColor: success }]}
          />
          <ThemedText style={styles.headerTitle}>ORDER STATUS</ThemedText>
        </View>

        <ThemedText style={styles.mainStatus}>{currentStep.label}</ThemedText>
        <ThemedText style={[styles.statusDesc, { color: textSecondary }]}>
          {currentStep.description}
        </ThemedText>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: brandPrimary, width: "25%" },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderItems = () => {
    if (!order?.items) return null;
    return (
      <View style={[styles.modernCard, { backgroundColor: card }]}>
        <ThemedText style={styles.headerTitle}>YOUR ORDER</ThemedText>
        {order.items.map((item: any, idx: number) => (
          <View
            key={item.id}
            style={[styles.itemRow, idx === 0 && { marginTop: 12 }]}
          >
            <View style={[styles.qtyBox, { backgroundColor: subtle }]}>
              <ThemedText style={[styles.qtyText, { color: brandPrimary }]}>
                {item.quantity}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.itemName}>{item.name}</ThemedText>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                ₦{formatCurrency(item.price)} per unit
              </ThemedText>
            </View>
            <ThemedText style={styles.itemTotal}>
              ₦{formatCurrency(item.price * item.quantity)}
            </ThemedText>
          </View>
        ))}

        <View style={[styles.divider, { backgroundColor: border }]} />

        <View style={styles.totalRow}>
          <ThemedText style={styles.totalLabel}>Total Paid</ThemedText>
          <ThemedText style={[styles.totalAmount, { color: textColor }]}>
            ₦{formatCurrency(order.total)}
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderDeliveryInfo = () => {
    if (!order || !order.addressDetails) return null;
    return (
      <View style={[styles.modernCard, { backgroundColor: card }]}>
        <View style={styles.infoGrid}>
          <View style={styles.gridBox}>
            <IconSymbol name="bicycle" size={18} color={brandPrimary} />
            <ThemedText style={styles.gridVal}>{order.distance}</ThemedText>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Distance
            </ThemedText>
          </View>
          <View style={[styles.verticalDivider, { backgroundColor: border }]} />
          <View style={styles.gridBox}>
            <IconSymbol name="clock.fill" size={18} color={brandPrimary} />
            <ThemedText style={styles.gridVal}>
              {order.eta.split(" ")[0]}
            </ThemedText>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Mins ETA
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.divider,
            { backgroundColor: border, marginVertical: 20 },
          ]}
        />

        <View style={styles.addressRow}>
          <View style={[styles.iconCircle, { backgroundColor: surface }]}>
            <IconSymbol
              name="mappin.and.ellipse"
              size={16}
              color={brandPrimary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText
              type="caption"
              style={{ color: textSecondary, marginBottom: 2 }}
            >
              DELIVER TO
            </ThemedText>
            <ThemedText style={styles.addressText}>
              {order.addressDetails.address}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !order) {
    return (
      <ThemedView
        style={[
          styles.container,
          {
            backgroundColor: surface,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={brandPrimary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="arrow.left" size={20} color={textColor} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerSub}>ORDER ID</ThemedText>
          <ThemedText style={styles.headerId}>
            #{order?.id?.slice(-6)?.toUpperCase() ?? "------"}
          </ThemedText>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandPrimary}
          />
        }
      >
        {renderTimeline()}
        {renderDeliveryInfo()}
        {renderItems()}

        <Pressable
          style={[styles.supportBtn, { borderColor: border }]}
          onPress={() => setShowDisputeModal(true)}
        >
          <ThemedText style={{ color: brandPrimary, fontWeight: "700" }}>
            Need help with this order?
          </ThemedText>
        </Pressable>

        {/* Dispute Modal */}
        <Modal
          visible={showDisputeModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowDisputeModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowDisputeModal(false)}
            />
            <View style={[styles.modalSheet, { backgroundColor: card }]}>
              {/* Handle */}
              <View style={[styles.modalHandle, { backgroundColor: border }]} />

              {/* Header */}
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  File a Dispute
                </ThemedText>
                <Pressable onPress={() => setShowDisputeModal(false)}>
                  <IconSymbol name="xmark" size={20} color={textSecondary} />
                </Pressable>
              </View>

              <ThemedText
                style={[styles.modalSubtitle, { color: textSecondary }]}
              >
                Order #{order?.id?.slice(-6)?.toUpperCase()}
              </ThemedText>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Reason chips */}
                <ThemedText
                  style={[styles.inputLabel, { color: textSecondary }]}
                >
                  REASON
                </ThemedText>
                <View style={styles.reasonGrid}>
                  {DISPUTE_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setDisputeReason(r)}
                      style={[
                        styles.reasonChip,
                        {
                          borderColor:
                            disputeReason === r ? brandPrimary : border,
                          backgroundColor:
                            disputeReason === r
                              ? brandPrimary + "18"
                              : "transparent",
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.reasonChipText,
                          {
                            color:
                              disputeReason === r
                                ? brandPrimary
                                : textSecondary,
                            fontWeight: disputeReason === r ? "700" : "400",
                          },
                        ]}
                      >
                        {r}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Description */}
                <ThemedText
                  style={[styles.inputLabel, { color: textSecondary }]}
                >
                  DESCRIBE THE ISSUE
                </ThemedText>
                <TextInput
                  value={disputeDescription}
                  onChangeText={setDisputeDescription}
                  placeholder="Tell us exactly what went wrong…"
                  placeholderTextColor={textSecondary}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={[
                    styles.descriptionInput,
                    {
                      color: textColor,
                      borderColor: border,
                      backgroundColor: surface,
                    },
                  ]}
                />

                {/* Submit */}
                <TouchableOpacity
                  onPress={async () => {
                    if (!disputeReason) {
                      Toast.show({
                        type: "error",
                        text1: "Select a reason",
                      });
                      return;
                    }
                    if (disputeDescription.trim().length < 10) {
                      Toast.show({
                        type: "error",
                        text1: "Description too short",
                        text2: "Please describe the issue in more detail.",
                      });
                      return;
                    }
                    setSubmittingDispute(true);
                    try {
                      await createDispute({
                        reason: disputeReason,
                        description: disputeDescription.trim(),
                        orderId: order?.id,
                      });
                      Toast.show({
                        type: "success",
                        text1: "Dispute filed",
                        text2:
                          "Our team will review and get back to you shortly.",
                      });
                      setShowDisputeModal(false);
                      setDisputeReason("");
                      setDisputeDescription("");
                    } catch (err: any) {
                      Toast.show({
                        type: "error",
                        text1: "Failed to file dispute",
                        text2:
                          err?.message ||
                          "Please try again or contact support.",
                      });
                    } finally {
                      setSubmittingDispute(false);
                    }
                  }}
                  disabled={submittingDispute}
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: brandPrimary,
                      opacity: submittingDispute ? 0.6 : 1,
                    },
                  ]}
                >
                  {submittingDispute ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.submitBtnText}>
                      Submit Dispute
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerCenter: { alignItems: "center" },
  headerSub: { fontSize: 10, fontWeight: "800", opacity: 0.5 },
  headerId: { fontSize: 14, fontWeight: "700" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { padding: 20, gap: 16 },

  // Modern Card Component
  modernCard: {
    padding: 24,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.5,
  },

  // Status Section
  mainStatus: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  statusDesc: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  progressContainer: { marginTop: 24 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    width: "100%",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },

  // Items Section
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 10,
  },
  qtyBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontSize: 14, fontWeight: "800" },
  itemName: { fontSize: 15, fontWeight: "600" },
  itemTotal: { fontSize: 15, fontWeight: "700" },
  divider: { height: 1, width: "100%", marginTop: 20, opacity: 0.5 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  totalLabel: { fontSize: 16, fontWeight: "600", opacity: 0.6 },
  totalAmount: { fontSize: 24, fontWeight: "800" },

  // Delivery Grid
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  gridBox: { alignItems: "center", gap: 4 },
  gridVal: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  verticalDivider: { width: 1, height: 40, opacity: 0.3 },
  addressRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addressText: { fontSize: 14, fontWeight: "600", lineHeight: 20 },

  supportBtn: {
    width: "100%",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },

  // Dispute Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSubtitle: { fontSize: 12, fontWeight: "600", marginBottom: 24 },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  reasonChipText: { fontSize: 13 },
  descriptionInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 120,
    marginBottom: 24,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  submitBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});
