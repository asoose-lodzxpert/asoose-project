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
import { ThemedText } from "./themed-text";

type ThemedInputProps = TextInputProps & {
  label?: string;
  iconRight?: React.ReactNode;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function ThemedInput({
  label,
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
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor,
            borderColor,
            height: multiline ? undefined : 52,
            alignItems: multiline ? "flex-start" : "center",
            paddingVertical: multiline ? 10 : 0,
          },
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
    // Note: We don't hardcode width here so containerStyle can control it
  },
  label: {
    fontSize: 14,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    width: "100%", // Ensures input fills the wrapper width
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
