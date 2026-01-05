import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export function SendPackageHeader() {
  const bg = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  return (
    <View
      style={[styles.container, { backgroundColor: bg, borderColor: border }]}
    >
      <ThemedText type="title">Send a Package</ThemedText>
      <ThemedText style={styles.caption}>
        Quick courier delivery for your items
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
  },
  caption: {
    marginTop: 4,
    color: "#6B7280",
  },
});
