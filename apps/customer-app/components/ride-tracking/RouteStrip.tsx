import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";

type RouteStripProps = {
  pickup?: { street?: string };
  dropoff?: { street?: string };
  cardColor: string;
  borderColor: string;
  successColor: string;
  dangerColor: string;
  textSecondary: string;
};

export default function RouteStrip({
  pickup,
  dropoff,
  cardColor,
  borderColor,
  successColor,
  dangerColor,
  textSecondary,
}: RouteStripProps) {
  return (
    <View
      style={[styles.routeStrip, { backgroundColor: cardColor, borderColor }]}
    >
      <View style={[styles.routeDot, { backgroundColor: successColor }]} />
      <ThemedText
        numberOfLines={1}
        type="caption"
        style={{ flex: 1, color: textSecondary }}
      >
        {pickup?.street ?? "Pickup"}
      </ThemedText>
      <IconSymbol
        name="arrow.right"
        size={10}
        color={textSecondary}
        style={{ marginHorizontal: 6 }}
      />
      <ThemedText
        numberOfLines={1}
        type="caption"
        style={{ flex: 1, color: textSecondary }}
      >
        {dropoff?.street ?? "Dropoff"}
      </ThemedText>
      <View style={[styles.routeDot, { backgroundColor: dangerColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  routeStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
});
