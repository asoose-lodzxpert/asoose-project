import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export function HomeSearchBar({ onPress }: { onPress: () => void }) {
  const surface = useThemeColor({}, "surfaceSubtle");
  const textMuted = useThemeColor({}, "textMuted");

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { backgroundColor: surface }]}
    >
      <IconSymbol name="search" size={18} color={textMuted} />
      <ThemedText style={{ color: textMuted }}>
        Search for groceries, food or items
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // justifyContent: "space-between",
  },
});
