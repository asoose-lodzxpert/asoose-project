import { useThemeColor } from "@/hooks/use-theme-color";
import { Pressable, StyleSheet } from "react-native";
import { ThemedText } from "../themed-text";
import { IconSymbol } from "./icon-symbol";

export function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <Pressable onPress={onToggle} style={styles.toggleRow}>
      <ThemedText>{label}</ThemedText>
      <IconSymbol
        name={value ? "checkmark.circle.fill" : "circle"}
        size={20}
        color={value ? primary : "#9CA3AF"}
      />
    </Pressable>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const styles = StyleSheet.create({
     toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    alignItems: "center",
  },
})