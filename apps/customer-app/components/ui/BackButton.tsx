import { Pressable, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export function BackButton({ onPress }: { onPress: () => void }) {
  const bg = useThemeColor({}, "surfaceCard");
  const icon = useThemeColor({}, "brandPrimary");

  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: bg }]}
    >
      <IconSymbol name="arrow.left" size={18} color={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
});
