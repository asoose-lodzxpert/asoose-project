import React, { useRef, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";


interface StoreSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onDebouncedChange?: (text: string) => void;
  placeholder?: string;
  loading?: boolean;
}

const StoreSearchBar: React.FC<StoreSearchBarProps> = ({
  value,
  onChangeText,
  onDebouncedChange,
  placeholder = "Search stores...",
  loading = false,
}) => {
  const iconColor = useThemeColor({}, "iconDefault");
  const skeleton = useThemeColor({}, "surfaceSubtle");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!onDebouncedChange) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onDebouncedChange(value);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, onDebouncedChange]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View
          style={{
            height: 40,
            borderRadius: 8,
            backgroundColor: skeleton,
            width: "100%",
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        iconRight={<IconSymbol name="search" size={22} color={iconColor} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default StoreSearchBar;
