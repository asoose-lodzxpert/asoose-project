import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { VehicleType } from "@/types/ride";

type VehicleOption = {
  type: VehicleType;
  name: string;
  description: string;
  icon: IconSymbolName;
  capacity: string;
};

const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type: VehicleType.ECONOMY,
    name: "Economy",
    description: "Quick & affordable",
    icon: "car",
    capacity: "Up to 3",
  },
  {
    type: VehicleType.BUSINESS,
    name: "Business",
    description: "Comfortable ride",
    icon: "car.fill",
    capacity: "Up to 4",
  },
];

type Props = {
  selected: VehicleType;
  onSelect: (type: VehicleType) => void;
};

export function VehicleTypeSelector({ selected, onSelect }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Select Vehicle Type
      </ThemedText>

      <View style={styles.grid}>
        {VEHICLE_OPTIONS.map((vehicle) => {
          const isSelected = selected === vehicle.type;

          return (
            <Pressable
              key={vehicle.type}
              onPress={() => onSelect(vehicle.type)}
              style={[
                styles.vehicleCard,
                {
                  backgroundColor: card,
                  borderColor: isSelected ? primary : border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isSelected
                      ? `${primary}15`
                      : `${textSecondary}10`,
                  },
                ]}
              >
                <IconSymbol
                  name={vehicle.icon}
                  size={28}
                  color={isSelected ? primary : textSecondary}
                />
              </View>

              <ThemedText
                type="defaultSemiBold"
                style={[styles.vehicleName, { color: text }]}
              >
                {vehicle.name}
              </ThemedText>

              <ThemedText
                type="caption"
                style={[styles.vehicleDescription, { color: textSecondary }]}
              >
                {vehicle.description}
              </ThemedText>

              <ThemedText
                type="caption"
                style={[styles.vehicleCapacity, { color: textSecondary }]}
              >
                {vehicle.capacity}
              </ThemedText>

              {isSelected && (
                <View style={[styles.checkmark, { backgroundColor: primary }]}>
                  <IconSymbol name="checkmark" size={12} color="white" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  vehicleCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    position: "relative",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  vehicleName: {
    fontSize: 14,
    marginBottom: 4,
  },
  vehicleDescription: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 2,
  },
  vehicleCapacity: {
    fontSize: 10,
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
