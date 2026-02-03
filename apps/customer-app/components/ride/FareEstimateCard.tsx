import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { FareBreakdown } from "@/types/ride";
import { RideService } from "@/services/ride.service";

type Props = {
  fareBreakdown: FareBreakdown;
  distanceKm: number;
  durationMin: number;
};

export function FareEstimateCard({
  fareBreakdown,
  distanceKm,
  durationMin,
}: Props) {
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <ThemedText type="subtitle" style={styles.title}>
        Fare Estimate
      </ThemedText>

      <View style={styles.infoRow}>
        <ThemedText type="caption" style={{ color: textSecondary }}>
          Distance
        </ThemedText>
        <ThemedText type="default">
          {RideService.formatDistance(distanceKm)}
        </ThemedText>
      </View>

      <View style={styles.infoRow}>
        <ThemedText type="caption" style={{ color: textSecondary }}>
          Duration
        </ThemedText>
        <ThemedText type="default">
          {RideService.formatDuration(durationMin)}
        </ThemedText>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      <View style={styles.fareRow}>
        <ThemedText type="caption" style={{ color: textSecondary }}>
          Base Fare
        </ThemedText>
        <ThemedText type="caption" style={{ color: textSecondary }}>
          {RideService.formatCurrency(fareBreakdown.baseFare)}
        </ThemedText>
      </View>

      <View style={styles.fareRow}>
        <ThemedText type="caption" style={{ color: textSecondary }}>
          Distance Fare
        </ThemedText>
        <ThemedText type="caption" style={{ color: textSecondary }}>
          {RideService.formatCurrency(fareBreakdown.distanceFare)}
        </ThemedText>
      </View>

      <View style={styles.fareRow}>
        <ThemedText type="caption" style={{ color: textSecondary }}>
          Time Fare
        </ThemedText>
        <ThemedText type="caption" style={{ color: textSecondary }}>
          {RideService.formatCurrency(fareBreakdown.timeFare)}
        </ThemedText>
      </View>

      {fareBreakdown.platformFee > 0 && (
        <View style={styles.fareRow}>
          <ThemedText type="caption" style={{ color: textSecondary }}>
            Platform Fee
          </ThemedText>
          <ThemedText type="caption" style={{ color: textSecondary }}>
            {RideService.formatCurrency(fareBreakdown.platformFee)}
          </ThemedText>
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: border }]} />

      <View style={styles.totalRow}>
        <ThemedText type="defaultSemiBold">Total Fare</ThemedText>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.totalAmount, { color: primary }]}
        >
          {RideService.formatCurrency(fareBreakdown.totalFare)}
        </ThemedText>
      </View>

      {fareBreakdown.surgeMultiplier && fareBreakdown.surgeMultiplier > 1 && (
        <View style={styles.surgeNotice}>
          <ThemedText type="caption" style={{ color: textSecondary }}>
            {fareBreakdown.surgeMultiplier}x surge pricing applied
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  totalAmount: {
    fontSize: 20,
  },
  surgeNotice: {
    marginTop: 8,
    paddingTop: 8,
  },
});
