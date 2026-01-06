import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { HomeSearchBar } from "./HomeSearchBar";
import { useLocation } from "@/context/LocationContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RelativePathString, router } from "expo-router";

export function HomeHeader() {
  const { location, openPicker } = useLocation();
  const textMuted = useThemeColor({}, "textMuted");
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.container}>
      {/* Address */}
      <Pressable style={styles.row} onPress={openPicker}>
        <IconSymbol name="location.fill" size={18} color={primary} />

        <View style={{ flex: 1 }}>
          <ThemedText style={styles.label}>
            {location?.label || "Location"}
          </ThemedText>
          <ThemedText style={{ color: textMuted }} numberOfLines={1}>
            {location?.address || "Fetching address…"}
          </ThemedText>
        </View>

        <IconSymbol name="chevron.down" size={18} color={primary} />
      </Pressable>

      {/* Search */}
      <HomeSearchBar
        onPress={() => router.push("/search" as RelativePathString)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontWeight: "700",
  },
});
