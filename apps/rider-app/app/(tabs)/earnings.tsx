import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { CustomDropdown } from "@/components/CustomDropdown";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  getEarnings,
  getWalletBalance,
  type EarningsData,
  type Timeframe,
} from "@/services/earnings.service";
import { useRouter } from "expo-router";

/* ---------------------------------- */
/* Timeframes */
/* ---------------------------------- */

interface Option {
  label: string;
  value: string;
}

const TIMEFRAMES: Option[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
];

/* ---------------------------------- */
/* Currency Formatter */
/* ---------------------------------- */

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("NGN", "₦"); // Ensures ₦ symbol
};

/* ---------------------------------- */

export default function EarningsScreen() {
  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");
  const primary = useThemeColor({}, "brandPrimary");
  const text = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "statusError");

  const router = useRouter();

  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<EarningsData | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Fetch earnings data
  const fetchEarningsData = useCallback(async () => {
    try {
      setLoading(true);
      const [earningsData, walletData] = await Promise.all([
        getEarnings(timeframe),
        getWalletBalance(),
      ]);
      setData(earningsData);
      setWalletBalance(walletData.balance);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load earnings",
        text2: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe]);

  // Initial load
  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData();
  };

  const handleTimeframeChange = (v: string | number) => {
    setTimeframe(v as Timeframe);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.fixedHeader}>
        <ThemedText type="subtitle">Earnings</ThemedText>

        <CustomDropdown
          data={TIMEFRAMES}
          value={timeframe}
          onChange={handleTimeframeChange}
          containerStyle={{ width: 160 }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primary]}
          />
        }
      >
        {/* Virtual Bank Card Balance Section */}
        <View style={styles.cardContainer}>
          {loading && !data ? (
            <VirtualCardSkeleton />
          ) : (
            <View style={[styles.virtualCard, { backgroundColor: primary }]}>
              <View style={styles.cardOverlay} />

              <ThemedText style={styles.cardLabel}>
                Available Balance
              </ThemedText>

              <ThemedText type="title" style={styles.cardBalance}>
                {formatCurrency(walletBalance)}
              </ThemedText>

              <ThemedText style={styles.cardNumber}>
                •••• •••• •••• 2479
              </ThemedText>

              <View style={styles.cardBottomRow}>
                <ThemedText style={styles.cardSubtitle}>
                  Ready to withdraw
                </ThemedText>
                <Pressable
                  style={styles.cardWithdrawBtn}
                  disabled={loading}
                  onPress={() => router.push("/(earnings)/withdraw")}
                >
                  <ThemedText
                    style={[styles.cardWithdrawText, { color: primary }]}
                  >
                    Withdraw
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <SectionTitle title="Performance" />

        {loading && !data ? (
          <View style={styles.metricsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard label="Rides" value={data ? `${data.rides}` : "—"} />
            <MetricCard
              label="Avg / Ride"
              value={data ? formatCurrency(data.avgPerRide) : "—"}
            />
            <MetricCard
              label="Hours Online"
              value={data ? `${data.hoursOnline.toFixed(1)}h` : "—"}
            />
            <MetricCard
              label="Rating"
              value={data ? `${data.rating} ★` : "—"}
            />
          </View>
        )}

        <SectionTitle title="Earnings Breakdown" />

        {loading && !data ? (
          <BreakdownSkeleton />
        ) : (
          <View style={[styles.breakdownCard, { backgroundColor: cardBg }]}>
            <BreakdownRow
              label="Ride fees"
              subtitle="Base pay for completed rides"
              value={data?.breakdown.rideFees || 0}
              valueColor={text}
            />
            <BreakdownRow
              label="Bonuses"
              subtitle="Incentives for peak hours & promotions"
              value={data?.breakdown.bonuses || 0}
              valueColor={text}
            />
            <BreakdownRow
              label="Service fees"
              subtitle="Platform deduction for operations"
              value={data?.breakdown.serviceFees || 0}
              valueColor={danger}
            />

            <View style={styles.divider} />

            <BreakdownRow
              label="Total Earnings"
              value={data?.total || 0}
              bold
              valueColor={text}
            />
          </View>
        )}

        <View style={[styles.explainerCard, { backgroundColor: cardBg }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            How Earnings Work
          </ThemedText>
          <ThemedText style={{ color: muted, lineHeight: 20 }}>
            • Ride fees are calculated per trip based on distance and demand.
            {"\n"}• Bonuses reward you for working during busy periods or
            hitting milestones.{"\n"}• Service fees help maintain the platform
            and ensure reliable service.{"\n"}• Your total earnings are
            available for withdrawal anytime with no hidden charges.
          </ThemedText>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Toast />
    </ThemedView>
  );
}

/* Skeleton Loaders */
function SkeletonBox({
  width,
  height,
  borderRadius = 8,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
}) {
  return (
    <View
      style={{
        width: width as any,
        height,
        borderRadius,
        backgroundColor: "rgba(0,0,0,0.06)",
      }}
    />
  );
}

function VirtualCardSkeleton() {
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <View style={[styles.virtualCard, { backgroundColor: primary }]}>
      <View style={styles.cardOverlay} />
      <SkeletonBox width={120} height={16} borderRadius={4} />
      <SkeletonBox width="80%" height={42} borderRadius={8} />
      <SkeletonBox width={180} height={18} borderRadius={4} />
      <View style={styles.cardBottomRow}>
        <SkeletonBox width={120} height={16} borderRadius={4} />
        <SkeletonBox width={100} height={44} borderRadius={22} />
      </View>
    </View>
  );
}

function MetricCardSkeleton() {
  const cardBg = useThemeColor({}, "surfaceSubtle");

  return (
    <View style={[styles.metricCard, { backgroundColor: cardBg }]}>
      <SkeletonBox width={80} height={16} borderRadius={4} />
      <SkeletonBox width={60} height={20} borderRadius={4} />
    </View>
  );
}

function BreakdownSkeleton() {
  const cardBg = useThemeColor({}, "surfaceSubtle");

  return (
    <View style={[styles.breakdownCard, { backgroundColor: cardBg }]}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.breakdownRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBox width="60%" height={16} borderRadius={4} />
            <SkeletonBox width="90%" height={13} borderRadius={4} />
          </View>
          <SkeletonBox width={80} height={16} borderRadius={4} />
        </View>
      ))}

      <View style={styles.divider} />

      <View style={styles.breakdownRow}>
        <SkeletonBox width={100} height={18} borderRadius={4} />
        <SkeletonBox width={100} height={18} borderRadius={4} />
      </View>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  const cardBg = useThemeColor({}, "surfaceSubtle");
  const muted = useThemeColor({}, "textMuted");

  return (
    <View style={[styles.metricCard, { backgroundColor: cardBg }]}>
      <ThemedText style={{ color: muted }}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
    </View>
  );
}

function BreakdownRow({
  label,
  subtitle,
  value,
  bold,
  valueColor,
}: {
  label: string;
  subtitle?: string;
  value: number;
  bold?: boolean;
  valueColor?: string;
}) {
  const muted = useThemeColor({}, "textMuted");

  return (
    <View style={styles.breakdownRow}>
      <View style={{ flex: 1 }}>
        <ThemedText type={bold ? "defaultSemiBold" : "default"}>
          {label}
        </ThemedText>
        {subtitle && (
          <ThemedText style={[styles.breakdownSubtitle, { color: muted }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      <ThemedText
        type={bold ? "defaultSemiBold" : "default"}
        style={{ color: valueColor }}
      >
        {`${value < 0 ? "-" : ""}${formatCurrency(Math.abs(value))}`}
      </ThemedText>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
      {title}
    </ThemedText>
  );
}

/* Styles remain unchanged */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  fixedHeader: {
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardContainer: {
    marginTop: 8,
    marginBottom: 32,
    alignItems: "center",
  },
  virtualCard: {
    width: "100%",
    height: 220,
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 24,
  },
  cardLabel: {
    color: "#fff",
    fontSize: 15,
    opacity: 0.95,
  },
  cardBalance: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  cardNumber: {
    color: "#fff",
    fontSize: 18,
    letterSpacing: 3,
    opacity: 0.9,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardSubtitle: {
    color: "#fff",
    fontSize: 15,
    opacity: 0.95,
  },
  cardWithdrawBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 999,
  },
  cardWithdrawText: {
    fontWeight: "700",
    fontSize: 15,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  breakdownCard: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  breakdownSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 10,
  },
  explainerCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
    fontSize: 17,
  },
});
