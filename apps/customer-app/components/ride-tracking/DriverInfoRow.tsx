import { View, StyleSheet, Pressable, Linking } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type DriverInfoRowProps = {
  driver: any;
  driverPhone?: string;
};

export default function DriverInfoRow({
  driver,
  driverPhone,
}: DriverInfoRowProps) {
  const primaryColor = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const textSecondary = useThemeColor({}, "textSecondary");

  const initial = (driver?.firstName ?? driver?.name ?? "D")[0].toUpperCase();

  const fullName =
    driver?.firstName && driver?.lastName
      ? `${driver.firstName} ${driver.lastName}`
      : (driver?.name ?? "Your driver");

  const vehicle = driver?.vehicle
    ? [driver.vehicle.color, driver.vehicle.make, driver.vehicle.model]
        .filter(Boolean)
        .join(" ")
    : null;

  const plate = driver?.vehicle?.plateNumber;
  const rating = driver?.rating ? Number(driver.rating).toFixed(1) : null;

  return (
    <View style={styles.row}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: primaryColor + "22" }]}>
        <ThemedText
          type="defaultSemiBold"
          style={{ color: primaryColor, fontSize: 20 }}
        >
          {initial}
        </ThemedText>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
            {fullName}
          </ThemedText>
          {rating && (
            <View
              style={[
                styles.ratingChip,
                { backgroundColor: successColor + "18" },
              ]}
            >
              <ThemedText
                type="caption"
                style={{ color: successColor, fontWeight: "700" }}
              >
                ★ {rating}
              </ThemedText>
            </View>
          )}
        </View>

        {(vehicle || plate) && (
          <ThemedText
            type="caption"
            style={{ color: textSecondary, marginTop: 2 }}
          >
            {[vehicle, plate].filter(Boolean).join("  •  ")}
          </ThemedText>
        )}
      </View>

      {/* Call button */}
      {driverPhone && (
        <Pressable
          onPress={() => Linking.openURL(`tel:${driverPhone}`)}
          style={[styles.callBtn, { backgroundColor: successColor }]}
        >
          <IconSymbol name="phone.fill" size={16} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
