import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  message?: string;
};

export function FindingDriverView({ message }: Props) {
  const card = useThemeColor({}, "surfaceCard");
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={[styles.container, { backgroundColor: card }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={primary} />

        <ThemedText type="subtitle" style={styles.title}>
          {message || "Finding a driver..."}
        </ThemedText>

        <ThemedText
          type="caption"
          style={[styles.subtitle, { color: textSecondary }]}
        >
          We're matching you with the nearest available driver
        </ThemedText>

        <View style={styles.dotsContainer}>
          <View style={[styles.dot, { backgroundColor: primary }]} />
          <View
            style={[styles.dot, { backgroundColor: primary, opacity: 0.6 }]}
          />
          <View
            style={[styles.dot, { backgroundColor: primary, opacity: 0.3 }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
