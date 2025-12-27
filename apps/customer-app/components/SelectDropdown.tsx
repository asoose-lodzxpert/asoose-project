import React from "react";
import { StyleSheet, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  label: string;
  data: any[];
  value: any;
  onChange: (item: any) => void;
  placeholder?: string;
};

export function SelectDropdown({
  label,
  data,
  value,
  onChange,
  placeholder,
}: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>{label}</ThemedText>

      <Dropdown
        mode="modal"
        data={data}
        labelField="label"
        valueField="value"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={styles.dropdown}
        placeholderStyle={{ color: muted }}
        selectedTextStyle={styles.selectedText}
        activeColor={`${primary}20`}
        iconColor={primary}
        search
        searchPlaceholder="Search..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    gap: 6,
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
  },
  dropdown: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  selectedText: {
    fontSize: 15,
  },
});
