import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { fetchOrderById } from "@/services/order-history.service";
import { checkDispute, Dispute } from "@/services/dispute.service";
import {
  DisputeSheet,
  ExistingDisputeCard,
} from "@/components/dispute/DisputeSheet";

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
  const statusError = useThemeColor({}, "statusError");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dispute state
  const [showDisputeSheet, setShowDisputeSheet] = useState(false);
  const [existingDispute, setExistingDispute] = useState<Dispute | null>(null);
  const [disputeTargetOrderId, setDisputeTargetOrderId] = useState<
    string | undefined
  >(undefined);

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
      // Only check top-level dispute for single orders
      if (data?.type === "ORDER") {
        const disputeRes = await checkDispute({ orderId: id }).catch(() => ({
          dispute: null,
        }));
        setExistingDispute(disputeRes.dispute);
      }
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

  const renderPayment = (payment: any) => {
    if (!payment) return null;
    const isPaid = payment.status === "PAID" || payment.status === "SUCCESS";
    const statusColor = isPaid ? success : brandPrimary;
    return (
      <View style={[styles.modernCard, { backgroundColor: card }]}>
        <View style={styles.cardHeader}>
          <View
            style={[styles.statusIndicator, { backgroundColor: statusColor }]}
          />
          <ThemedText style={styles.headerTitle}>PAYMENT</ThemedText>
        </View>
        <View style={styles.paymentRow}>
          <ThemedText style={[styles.paymentLabel, { color: textSecondary }]}>
            Method
          </ThemedText>
          <ThemedText style={styles.paymentValue}>
            {payment.method ?? "N/A"}
          </ThemedText>
        </View>
        <View style={styles.paymentRow}>
          <ThemedText style={[styles.paymentLabel, { color: textSecondary }]}>
            Status
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "22" },
            ]}
          >
            <ThemedText style={[styles.paymentStatus, { color: statusColor }]}>
              {payment.status}
            </ThemedText>
          </View>
        </View>
        <View style={styles.paymentRow}>
          <ThemedText style={[styles.paymentLabel, { color: textSecondary }]}>
            Amount
          </ThemedText>
          <ThemedText style={styles.paymentValue}>
            ₦{formatCurrency(payment.amount)}
          </ThemedText>
        </View>
        {payment.paidAt && (
          <View style={styles.paymentRow}>
            <ThemedText style={[styles.paymentLabel, { color: textSecondary }]}>
              Paid At
            </ThemedText>
            <ThemedText style={[styles.paymentValue, { color: textSecondary }]}>
              {new Date(payment.paidAt).toLocaleString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </ThemedText>
          </View>
        )}
        {payment.reference && (
          <View style={styles.paymentRow}>
            <ThemedText style={[styles.paymentLabel, { color: textSecondary }]}>
              Reference
            </ThemedText>
            <ThemedText
              style={[
                styles.paymentValue,
                { color: textSecondary, fontSize: 12 },
              ]}
              numberOfLines={1}
            >
              {payment.reference}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  const renderGroupOrders = () => {
    if (!order?.orders?.length) return null;
    return order.orders.map((sub: any) => {
      return (
        <View
          key={sub.id}
          style={[styles.modernCard, { backgroundColor: card }]}
        >
          {/* Sub-order header */}
          <View style={[styles.cardHeader, { marginBottom: 16 }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.subStoreName}>
                {sub.store?.name ?? "Store"}
              </ThemedText>
              <ThemedText style={[styles.headerTitle, { marginTop: 2 }]}>
                #{sub.id.slice(-6).toUpperCase()}
              </ThemedText>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: success + "22" }]}
            >
              <ThemedText style={[styles.paymentStatus, { color: success }]}>
                {sub.status}
              </ThemedText>
            </View>
          </View>

          {/* Items */}
          {sub.items?.map((item: any, idx: number) => (
            <View
              key={item.id}
              style={[styles.itemRow, idx === 0 && { marginTop: 0 }]}
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
            <ThemedText style={styles.totalLabel}>Sub-total</ThemedText>
            <ThemedText
              style={[styles.totalAmount, { color: textColor, fontSize: 18 }]}
            >
              ₦{formatCurrency(sub.total)}
            </ThemedText>
          </View>

          {/* Delivery info */}
          {sub.delivery?.address && (
            <View style={[styles.addressRow, { marginTop: 16 }]}>
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
                  {sub.delivery.address.address}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Rider */}
          {sub.delivery?.rider?.name && (
            <View style={[styles.addressRow, { marginTop: 12 }]}>
              <View style={[styles.iconCircle, { backgroundColor: surface }]}>
                <IconSymbol name="bicycle" size={16} color={brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  type="caption"
                  style={{ color: textSecondary, marginBottom: 2 }}
                >
                  RIDER
                </ThemedText>
                <ThemedText style={styles.addressText}>
                  {sub.delivery.rider.name}
                </ThemedText>
                {sub.delivery.rider.plate && (
                  <ThemedText type="caption" style={{ color: textSecondary }}>
                    {sub.delivery.rider.plate}
                  </ThemedText>
                )}
              </View>
            </View>
          )}

          {/* Per-sub-order dispute */}
          {sub.dispute ? (
            <View
              style={[
                styles.disputeInfoCard,
                { borderColor: border, marginTop: 12, marginBottom: 0 },
              ]}
            >
              <View style={styles.disputeInfoRow}>
                <IconSymbol
                  name="exclamationmark.triangle"
                  size={16}
                  color={brandPrimary}
                />
                <ThemedText style={styles.disputeInfoTitle}>
                  Dispute: {sub.dispute.reason}
                </ThemedText>
                <View
                  style={[
                    styles.disputeStatusBadge,
                    { backgroundColor: brandPrimary + "22" },
                  ]}
                >
                  <ThemedText
                    style={[styles.disputeStatusText, { color: brandPrimary }]}
                  >
                    {sub.dispute.status}
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : (
            <Pressable
              style={[
                styles.supportBtn,
                { borderColor: border, marginTop: 12, marginBottom: 0 },
              ]}
              onPress={() => {
                setDisputeTargetOrderId(sub.id);
                setShowDisputeSheet(true);
              }}
            >
              <ThemedText
                style={{ color: brandPrimary, fontWeight: "700", fontSize: 13 }}
              >
                Report issue with this store
              </ThemedText>
            </Pressable>
          )}
        </View>
      );
    });
  };

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

  const renderOtpCard = () => {
    const otp: string | null | undefined = order?.deliveryOtp;
    const status: string = order?.status ?? "";
    const isDone = ["DELIVERED", "CANCELLED"].includes(status);

    if (!otp || isDone) return null;

    return (
      <View
        style={[
          styles.modernCard,
          {
            backgroundColor: brandPrimary + "18",
            borderWidth: 1,
            borderColor: brandPrimary + "40",
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <IconSymbol name="lock.shield.fill" size={18} color={brandPrimary} />
          <ThemedText style={[styles.headerTitle, { color: brandPrimary }]}>
            DELIVERY OTP
          </ThemedText>
        </View>
        <ThemedText
          style={[
            styles.otpCode,
            {
              color: brandPrimary,
              letterSpacing: 12,
              fontVariant: ["tabular-nums"] as any,
            },
          ]}
        >
          {otp}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: textSecondary, textAlign: "center", marginTop: 8 }}
        >
          Only share this code with your rider when they arrive at your
          location.
        </ThemedText>
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
          <ThemedText style={styles.headerSub}>
            {order?.type === "GROUP" ? "MULTI-STORE ORDER" : "ORDER ID"}
          </ThemedText>
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
        {order?.type === "GROUP" ? (
          <>
            {renderPayment(order?.payment)}
            {renderOtpCard()}
            {renderGroupOrders()}
          </>
        ) : (
          <>
            {renderTimeline()}
            {renderDeliveryInfo()}
            {renderOtpCard()}
            {renderItems()}
            {renderPayment(order?.payment)}
            {existingDispute ? (
              <ExistingDisputeCard
                dispute={existingDispute}
                onPress={() =>
                  router.push(
                    `/(settings)/dispute/${existingDispute.id}` as any,
                  )
                }
              />
            ) : (
              <Pressable
                style={[styles.supportBtn, { borderColor: border }]}
                onPress={() => {
                  setDisputeTargetOrderId(order?.id);
                  setShowDisputeSheet(true);
                }}
              >
                <ThemedText style={{ color: brandPrimary, fontWeight: "700" }}>
                  Need help with this order?
                </ThemedText>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <DisputeSheet
        visible={showDisputeSheet}
        onClose={() => setShowDisputeSheet(false)}
        entityLabel={`Order #${(disputeTargetOrderId ?? order?.id ?? "").slice(-6).toUpperCase()}`}
        orderId={disputeTargetOrderId ?? order?.id}
        onDisputeFiled={(d) => {
          setExistingDispute(d);
          setDisputeTargetOrderId(undefined);
        }}
      />
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
  otpCode: {
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 12,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  subStoreName: {
    fontSize: 16,
    fontWeight: "700",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: "700",
  },
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

  // Dispute info card (when dispute exists)
  disputeInfoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    marginTop: 10,
    marginBottom: 40,
  },
  disputeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disputeInfoTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  disputeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  disputeStatusText: { fontSize: 11, fontWeight: "700" },
  disputeInfoDesc: { fontSize: 13, lineHeight: 18 },
  disputeInfoFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  disputeInfoLink: { fontSize: 13, fontWeight: "600" },

  // Image picker
  imagePickerRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  imageSlot: {
    width: 110,
    height: 110,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },
  imageRemoveBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
