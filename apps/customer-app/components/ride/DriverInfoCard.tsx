import { View, StyleSheet, Image, Pressable , Linking } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Driver } from "@/types/ride";
import { RideService } from "@/services/ride.service";

type Props = {
  driver: Driver;
  showActions?: boolean;
};

export function DriverInfoCard({ driver, showActions = true }: Props) {
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");

  const handleCall = () => {
    Linking.openURL(`tel:${driver.phone}`);
  };

  const handleMessage = () => {
    Linking.openURL(`sms:${driver.phone}`);
  };

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: primary }]}>
            <ThemedText style={styles.avatarText}>
              {driver.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        </View>

        <View style={styles.driverInfo}>
          <ThemedText type="defaultSemiBold">{driver.name}</ThemedText>
          <View style={styles.ratingRow}>
            <IconSymbol name="star.fill" size={14} color="#FFA000" />
            <ThemedText type="caption" style={styles.rating}>
              {driver.rating.toFixed(1)}
            </ThemedText>
          </View>
        </View>

        {showActions && (
          <View style={styles.actions}>
            <Pressable
              onPress={handleCall}
              style={[styles.actionButton, { backgroundColor: success }]}
            >
              <IconSymbol name="phone.fill" size={18} color="white" />
            </Pressable>
            <Pressable
              onPress={handleMessage}
              style={[
                styles.actionButton,
                { backgroundColor: card, borderColor: border, borderWidth: 1 },
              ]}
            >
              <IconSymbol name="message.fill" size={18} color={primary} />
            </Pressable>
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      <View style={styles.vehicleInfo}>
        <View style={styles.vehicleRow}>
          <IconSymbol name="car.fill" size={16} color={textSecondary} />
          <ThemedText type="caption" style={{ color: textSecondary }}>
            {driver.vehicle.color} {driver.vehicle.make} {driver.vehicle.model}
          </ThemedText>
        </View>
        <View style={styles.vehicleRow}>
          <IconSymbol name="number" size={16} color={textSecondary} />
          <ThemedText type="caption" style={{ color: textSecondary }}>
            {driver.vehicle.plateNumber}
          </ThemedText>
        </View>
      </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  driverInfo: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  rating: {
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  vehicleInfo: {
    gap: 8,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
