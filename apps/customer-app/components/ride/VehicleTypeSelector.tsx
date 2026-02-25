import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { VehicleType } from "@/types/ride";
import { RideService } from "@/services/ride.service";

/**
 * Configuration-driven approach:
 * Everything the UI needs to know about a vehicle is here.
 */
type VehicleOption = {
  type: VehicleType;
  name: string;
  description: string;
  icon: IconSymbolName;
  capacity: number;
  tag?: string;
};

const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type: VehicleType.ECONOMY,
    name: "Economy",
    description: "Quick & affordable",
    icon: "car.fill",
    capacity: 3,
    tag: "POPULAR",
  },
  {
    type: VehicleType.BUSINESS,
    name: "Business",
    description: "Premium comfort",
    icon: "car.rear.fill",
    capacity: 4,
  },
];

type Props = {
  selected: VehicleType;
  onSelect: (type: VehicleType) => void;
  fareOptions?: { economy: number; business: number } | null;
  isFareLoading?: boolean;
  distanceKm?: number;
  durationMin?: number;
};

export function VehicleTypeSelector({
  selected,
  onSelect,
  fareOptions,
  isFareLoading,
  distanceKm,
  durationMin,
}: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");

  const routeInfo =
    distanceKm && durationMin
      ? `${RideService.formatDistance(distanceKm)}  ·  ${RideService.formatDuration(durationMin)}`
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Choose Ride</ThemedText>
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

      <View style={styles.list}>
        {VEHICLE_OPTIONS.map((vehicle) => {
          const isSelected = selected === vehicle.type;

          // Fare lookup — fareOptions keys are lowercase ('economy'/'business')
          const fareKey =
            vehicle.type.toLowerCase() as keyof typeof fareOptions;
          const rawFare = fareOptions?.[fareKey];
          const fareLabel =
            rawFare != null ? RideService.formatCurrency(rawFare) : "";

          return (
            <Pressable
              key={vehicle.type}
              onPress={() => onSelect(vehicle.type)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: isSelected ? `${primary}0d` : card,
                  borderColor: isSelected ? primary : border,
                  borderWidth: isSelected ? 2 : 1,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isSelected
                      ? `${primary}22`
                      : `${textSecondary}14`,
                  },
                ]}
              >
                <IconSymbol
                  name={vehicle.icon}
                  size={22}
                  color={isSelected ? primary : textSecondary}
                />
              </View>

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ fontSize: 15, color: text }}
                  >
                    {vehicle.name}
                  </ThemedText>
                  {vehicle.tag && (
                    <View
                      style={[styles.tag, { backgroundColor: `${success}22` }]}
                    >
                      <ThemedText style={[styles.tagText, { color: success }]}>
                        {vehicle.tag}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <ThemedText
                  type="caption"
                  style={{ color: textSecondary, marginTop: 2 }}
                >
                  {vehicle.description} · {vehicle.capacity} seats
                </ThemedText>
              </View>

              <View style={styles.fareCol}>
                {isFareLoading ? (
                  <ActivityIndicator size="small" color={primary} />
                ) : (
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ fontSize: 16, color: isSelected ? primary : text }}
                  >
                    {fareLabel}
                  </ThemedText>
                )}
                {isSelected && (
                  <View
                    style={[styles.selectedPip, { backgroundColor: primary }]}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
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
  list: { gap: 10 },
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  fareCol: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 70,
  },
  selectedPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
