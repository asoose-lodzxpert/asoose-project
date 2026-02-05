import { type ViewProps, StatusBar, useColorScheme } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";
import { SafeAreaView } from "react-native-safe-area-context";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "surfaceBackground",
  );

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={backgroundColor}
      />
      <SafeAreaView style={[{ backgroundColor }, style]} {...otherProps} />
    </>
  );
}
