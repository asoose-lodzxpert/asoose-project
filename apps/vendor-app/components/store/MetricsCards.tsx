import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { StoreMetrics } from "@/types/store";
import formatMoney from "@/lib/format-money";

interface Props {
  metrics: StoreMetrics;
  loading?: boolean;
}

type Card = { label: string; value: number | string };

export const MetricsCards: React.FC<Props> = ({ metrics, loading }) => {
  const background = useThemeColor({}, "surfaceCard");
  const mutedText = useThemeColor({}, "textDisabled");
  const borderColor = useThemeColor({}, "borderDefault");

  if (loading) {
    return (
      <View style={styles.container}>
        {[0, 1].map((rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {[0, 1].map((colIdx) => (
              <View
                key={colIdx}
                style={[styles.card, { backgroundColor: background }]}
              >
                <View
                  style={{
                    width: "60%",
                    height: 24,
                    backgroundColor: borderColor,
                    borderRadius: 4,
                    opacity: 0.3,
                    marginBottom: 8,
                  }}
                />
                <View
                  style={{
                    width: "80%",
                    height: 16,
                    backgroundColor: borderColor,
                    borderRadius: 4,
                    opacity: 0.3,
                  }}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

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
                  ? `\u20a6${formatMoney(Number(c.value))}`
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
