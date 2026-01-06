import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { StoreMetrics } from "@/types/store";
import formatMoney from "@/lib/format-money";

interface Props {
  metrics: StoreMetrics;
}

type Card = { label: string; value: number | string };

// Helper to format numbers

export const MetricsCards: React.FC<Props> = ({ metrics }) => {
  const background = useThemeColor({}, "surfaceCard");
  const mutedText = useThemeColor({}, "textDisabled");

  const cardData: Card[] = [
    { label: "Today's Orders", value: metrics.todaysOrders },
    { label: "Today's Sales", value: metrics.todaysSales },
    { label: "Pending Approvals", value: metrics.pendingApprovals },
    { label: "Avg. Rating", value: `${metrics.avgRating}%` },
  ];

  // Split cards into rows of two
  const rows: Card[][] = [];
  for (let i = 0; i < cardData.length; i += 2) {
    rows.push(cardData.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((c) => (
            <View
              key={c.label}
              style={[styles.card, { backgroundColor: background }]}
            >
              <ThemedText
                type="title"
                style={{ textAlign: "left", width: "100%" }}
              >
                {c.label === "Today's Sales"
                  ? `₦${formatMoney(Number(c.value))}`
                  : formatMoney(c.value)}
              </ThemedText>
              <ThemedText
                type="defaultSemiBold"
                style={{
                  marginTop: 4,
                  textAlign: "left",
                  width: "100%",
                  color: mutedText,
                }}
              >
                {c.label}
              </ThemedText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "flex-start",
    justifyContent: "center",
  },
});
