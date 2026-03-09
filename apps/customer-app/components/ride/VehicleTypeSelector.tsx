import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RideService } from "@/services/ride.service";

type Props = {
  fare?: number | null;
  isFareLoading?: boolean;
  distanceKm?: number;
  durationMin?: number;
};

/**
 * Displays a single, non-selectable ride option card.
 * Economy is the only ride type — no selection UI is shown.
 */
export function VehicleTypeSelector({
  fare,
  isFareLoading,
  distanceKm,
  durationMin,
}: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  const routeInfo =
    distanceKm && durationMin
      ? `${RideService.formatDistance(distanceKm)}  ·  ${RideService.formatDuration(durationMin)}`
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Your Ride</ThemedText>
        {routeInfo && (
          <View style={[styles.routeChip, { backgroundColor: `${primary}18` }]}>
            <IconSymbol name="map" size={11} color={primary} />
            <ThemedText
              type="caption"
              style={{ color: primary, fontWeight: "600" }}
            >
              {routeInfo}
            </ThemedText>
          </View>
        )}
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: `${primary}0d`,
            borderColor: primary,
            borderWidth: 2,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${primary}22` }]}>
          <IconSymbol name="car.fill" size={22} color={primary} />
        </View>

        <View style={styles.info}>
          <ThemedText
            type="defaultSemiBold"
            style={{ fontSize: 15, color: text }}
          >
            Standard Ride
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: textSecondary, marginTop: 2 }}
          >
            Quick &amp; affordable · 3 seats
          </ThemedText>
        </View>

        <View style={styles.fareCol}>
          {isFareLoading ? (
            <ActivityIndicator size="small" color={primary} />
          ) : (
            <ThemedText
              type="defaultSemiBold"
              style={{ fontSize: 16, color: primary }}
            >
              {fare != null ? RideService.formatCurrency(fare) : ""}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  routeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  fareCol: {
    alignItems: "flex-end",
    minWidth: 70,
  },
});
