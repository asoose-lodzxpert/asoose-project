import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Location } from "@/types/ride";

type Props = {
  type: "pickup" | "dropoff";
  title: string;
  location: Location | null;
  onPress: () => void;
};

export function RideLocationCard({ type, title, location, onPress }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");
  const card = useThemeColor({}, "surfaceCard");
  const muted = useThemeColor({}, "textMuted");

  const isPickup = type === "pickup";
  const iconColor = isPickup ? success : danger;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: card }]}
    >
      <View style={styles.titleRow}>
        <IconSymbol name="location.fill" size={18} color={iconColor} />
        <ThemedText type="subtitle">{title}</ThemedText>
      </View>

      <ThemedText type="default" style={[styles.address, { color: muted }]}>
        {location?.address || "Select location"}
      </ThemedText>

      <View style={styles.chevronContainer}>
        <IconSymbol name="chevron.right" size={16} color={primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 80,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    lineHeight: 22,
  },
  chevronContainer: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -8,
  },
});
