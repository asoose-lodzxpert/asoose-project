import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface FloatingActionButtonProps {
  icon: IconSymbolName;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  style,
  disabled = false,
}) => {
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: primary,
          opacity: pressed || disabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      <IconSymbol name={icon} size={26} color="#fff" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
