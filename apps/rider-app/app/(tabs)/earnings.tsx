import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { CustomDropdown } from "@/components/CustomDropdown";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";

/* ---------------------------------- */
/* Mock Data */
/* ---------------------------------- */

const EARNINGS_DATA = {
  today: {
    total: 12500,
    deliveries: 8,
    avgPerDelivery: 1560,
    hoursOnline: 6,
    rating: 4.9,
    breakdown: {
      deliveryFees: 14000,
      bonuses: 1000,
      serviceFees: -2500,
    },
  },

  week: {
    total: 78200,
    deliveries: 48,
    avgPerDelivery: 1630,
    hoursOnline: 36,
    rating: 4.91,
    breakdown: {
      deliveryFees: 88000,
      bonuses: 6000,
      serviceFees: -15800,
    },
  },

  month: {
    total: 312500,
    deliveries: 198,
    avgPerDelivery: 1580,
    hoursOnline: 150,
    rating: 4.92,
    breakdown: {
      deliveryFees: 345000,
      bonuses: 22000,
      serviceFees: -54500,
    },
  },

  year: {
    total: 3650000,
    deliveries: 2350,
    avgPerDelivery: 1550,
    hoursOnline: 1800,
    rating: 4.91,
    breakdown: {
      deliveryFees: 4020000,
      bonuses: 310000,
      serviceFees: -680000,
    },
  },
};

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

type Timeframe = "today" | "week" | "month" | "year";

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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const data = EARNINGS_DATA[timeframe];

  const simulateFetch = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 1500);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    simulateFetch();
  };

  const handleTimeframeChange = (v: string | number) => {
    setTimeframe(v as Timeframe);
    simulateFetch();
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.fixedHeader}>
        <ThemedText type="title">Earnings</ThemedText>

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
          <View style={[styles.virtualCard, { backgroundColor: primary }]}>
            <View style={styles.cardOverlay} />

            <ThemedText style={styles.cardLabel}>Available Balance</ThemedText>

            <ThemedText type="title" style={styles.cardBalance}>
              {loading ? "—" : formatCurrency(data.total)}
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
        </View>

        <SectionTitle title="Performance" />

        <View style={styles.metricsGrid}>
          <MetricCard
            label="Deliveries"
            value={loading ? "—" : `${data.deliveries}`}
          />
          <MetricCard
            label="Avg / Delivery"
            value={loading ? "—" : formatCurrency(data.avgPerDelivery)}
          />
          <MetricCard
            label="Hours Online"
            value={loading ? "—" : `${data.hoursOnline.toFixed(1)}h`}
          />
          <MetricCard
            label="Rating"
            value={loading ? "—" : `${data.rating} ★`}
          />
        </View>

        <SectionTitle title="Earnings Breakdown" />

        <View style={[styles.breakdownCard, { backgroundColor: cardBg }]}>
          <BreakdownRow
            label="Delivery fees"
            subtitle="Base pay for completed deliveries"
            value={data.breakdown.deliveryFees}
            valueColor={text}
            loading={loading}
          />
          <BreakdownRow
            label="Bonuses"
            subtitle="Incentives for peak hours & promotions"
            value={data.breakdown.bonuses}
            valueColor={text}
            loading={loading}
          />
          <BreakdownRow
            label="Service fees"
            subtitle="Platform deduction for operations"
            value={data.breakdown.serviceFees}
            valueColor={danger}
            loading={loading}
          />

          <View style={styles.divider} />

          <BreakdownRow
            label="Total Earnings"
            value={data.total}
            bold
            loading={loading}
            valueColor={text}
          />
        </View>

        <View style={[styles.explainerCard, { backgroundColor: cardBg }]}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
            How Earnings Work
          </ThemedText>
          <ThemedText style={{ color: muted, lineHeight: 20 }}>
            • Delivery fees are calculated per trip based on distance and
            demand.{"\n"}• Bonuses reward you for working during busy periods or
            hitting milestones.{"\n"}• Service fees help maintain the platform
            and ensure reliable service.{"\n"}• Your total earnings are
            available for withdrawal anytime with no hidden charges.
          </ThemedText>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

/* Components */
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
  loading,
}: {
  label: string;
  subtitle?: string;
  value: number;
  bold?: boolean;
  valueColor?: string;
  loading?: boolean;
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
        {loading
          ? "—"
          : `${value < 0 ? "-" : ""}${formatCurrency(Math.abs(value))}`}
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
