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
import { ThemedText } from "./themed-text"; // Assuming this is your text component

type ThemedInputProps = TextInputProps & {
  label?: string;
  error?: string;
  iconRight?: React.ReactNode;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function ThemedInput({
  label,
  error,
  iconRight,
  style,
  containerStyle,
  multiline = false,
  ...props
}: ThemedInputProps) {
  const backgroundColor = useThemeColor({}, "surfaceCard");
  const defaultBorderColor = useThemeColor({}, "borderDefault");
  const errorColor = useThemeColor({}, "statusError");
  const textColor = useThemeColor({}, "textPrimary");
  const placeholderColor = useThemeColor({}, "textDisabled");

  // Determine border color based on error state
  const borderColor = error ? errorColor : defaultBorderColor;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <ThemedText style={styles.label}>{label}</ThemedText>}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor,
            borderColor,
            height: multiline ? undefined : 56, // Slightly taller for a more premium feel
            minHeight: multiline ? 100 : undefined,
            alignItems: multiline ? "flex-start" : "center",
            paddingVertical: multiline ? 12 : 0,
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

      {error ? (
        <ThemedText style={[styles.errorText, { color: errorColor }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: 4, // Space between this input and the next element
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    borderWidth: 1.5, // Slightly thicker border for modern look
    borderRadius: 16, // Matching the "Squircle" aesthetic
    paddingHorizontal: 16,
    flexDirection: "row",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    height: "100%",
  },
  icon: {
    marginLeft: 10,
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 12,
    fontWeight: "500",
  },
});
