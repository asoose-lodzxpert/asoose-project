import React from "react";
import {
  TextInput,
  StyleSheet,
  View,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

type ThemedInputProps = TextInputProps & {
  iconRight?: React.ReactNode;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function ThemedInput({
  iconRight,
  style,
  containerStyle,
  multiline = false,
  ...props
}: ThemedInputProps) {
  const backgroundColor = useThemeColor({}, "surfaceCard");
  const borderColor = useThemeColor({}, "borderDefault");
  const textColor = useThemeColor({}, "textPrimary");
  const placeholderColor = useThemeColor({}, "textDisabled");

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          height: multiline ? undefined : 52,
          alignItems: multiline ? "flex-start" : "center",
          paddingVertical: multiline ? 10 : 0,
        },
        containerStyle,
      ]}
    >
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={placeholderColor}
        style={[
          styles.input,
          {
            color: textColor,
            textAlignVertical: multiline ? "top" : "center",
          },
          style,
        ]}
      />
      {iconRight && <View style={styles.icon}>{iconRight}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  icon: {
    marginLeft: 8,
    alignSelf: "center",
  },
});
