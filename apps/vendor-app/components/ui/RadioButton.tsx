import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface RadioButtonProps {
  selected: boolean;
  onPress: () => void;
  label?: string;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  selected,
  onPress,
  label,
}) => {
  const primary = useThemeColor({}, "brandPrimary");
  const borderColor = useThemeColor({}, "borderDefault");

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={[styles.circle, { borderColor }]}>
        {selected && (
          <View style={[styles.innerCircle, { backgroundColor: primary }]} />
        )}
      </View>
      {label && <ThemedText style={{ marginLeft: 8 }}>{label}</ThemedText>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center" },
  circle: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  innerCircle: { width: 12, height: 12, borderRadius: 6 },
});
