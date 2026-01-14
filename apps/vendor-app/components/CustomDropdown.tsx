import React from "react";
import { View, StyleSheet } from "react-native";
import { Dropdown as RNEDropdown } from "react-native-element-dropdown";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { useThemeColor } from "@/hooks/use-theme-color";

type Option = {
  label: string;
  value: string | number;
};

type CustomDropdownProps = {
  data: Option[];
  value?: string | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  prompt?: string;
  disabled?: boolean;

  inputProps?: Partial<React.ComponentProps<typeof ThemedInput>>;
  containerStyle?: object;
  dropdownStyle?: object;
};

export function CustomDropdown({
  data,
  value,
  onChange,
  placeholder = "Select...",
  label,
  prompt,
  disabled = false,
  containerStyle,
  dropdownStyle,
}: CustomDropdownProps) {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: border }]} />
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {label}
        </ThemedText>
      )}

      <RNEDropdown
        data={data}
        labelField="label"
        valueField="value"
        value={value}
        onChange={(item) => !disabled && onChange(item.value)}
        placeholder={placeholder}
        placeholderStyle={{ color: disabled ? muted + "60" : muted }}
        selectedTextStyle={{ color: disabled ? muted + "80" : text }}
        itemTextStyle={{ color: text }}
        style={[
          styles.dropdown,
          {
            backgroundColor: surface,
            borderColor: border,
            opacity: disabled ? 0.6 : 1,
          },
          dropdownStyle,
        ]}
        inputSearchStyle={{ color: primary }}
        search={false}
        flatListProps={{
          style: {
            borderRadius: 7,
          },
          ItemSeparatorComponent: renderSeparator,
        }}
        containerStyle={{
          backgroundColor: surface,
          borderColor: border,
          borderRadius: 10,
          borderWidth: 2,
          marginBottom: 20,
        }}
        activeColor={border}
        disable={disabled}
      />

      {prompt && <ThemedText style={styles.prompt}>{prompt}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No gap here - it will be applied conditionally via label's marginBottom
  },
  label: {
    marginBottom: 6,
  },
  dropdown: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  prompt: {
    fontSize: 12,
    opacity: 0.6,
  },
  separator: {
    height: 1,
  },
});
