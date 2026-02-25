import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function SearchingState() {
  const primaryColor = useThemeColor({}, "brandPrimary");
  const cardColor = useThemeColor({}, "surfaceCard");
  const borderColor = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View
      style={[
        styles.searchingCard,
        { backgroundColor: cardColor, borderColor: borderColor },
      ]}
    >
      <ActivityIndicator size="large" color={primaryColor} />

      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
          Looking for nearby drivers
        </ThemedText>

        <ThemedText
          type="caption"
          style={{ color: textSecondary, marginTop: 2 }}
        >
          We'll notify you as soon as one accepts
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
});
