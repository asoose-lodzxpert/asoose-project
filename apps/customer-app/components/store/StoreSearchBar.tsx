import React, { useRef, useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedText } from "@/components/themed-text";
import AsyncStorage from "@react-native-async-storage/async-storage";


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
  const mutedColor = useThemeColor({}, "textMuted");
  const primary = useThemeColor({}, "brandPrimary");
  const text = useThemeColor({}, "textPrimary");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const border = useThemeColor({}, "borderDefault");

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem("recent_instore_searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) { /* ignore */ }
  };

  const saveRecentSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 10);
    setRecentSearches(updated);
    await AsyncStorage.setItem("recent_instore_searches", JSON.stringify(updated));
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem("recent_instore_searches");
  };

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
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={() => saveRecentSearch(value)}
        placeholder={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        iconRight={<IconSymbol name="search" size={22} color={iconColor} />}
      />
      {isFocused && recentSearches.length > 0 && (
        <View style={styles.recentContainer}>
          {(() => {
            const suggestions = value.trim()
              ? recentSearches.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
              : recentSearches.slice(0, 10);
            
            if (suggestions.length === 0) return null;

            return (
              <>
                <View style={styles.recentHeader}>
                  <ThemedText style={styles.recentTitle}>{value.trim() ? "SUGGESTIONS" : "RECENT"}</ThemedText>
                  <Pressable onPress={clearRecentSearches}>
                    <ThemedText style={[styles.clearBtn, { color: primary }]}>Clear</ThemedText>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {suggestions.map((s, i) => (
                    <Pressable 
                      key={i} 
                      onPress={() => {
                        onChangeText(s);
                        saveRecentSearch(s);
                      }}
                      style={[styles.pill, { backgroundColor: subtle, borderColor: border }]}
                    >
                      <ThemedText style={[styles.pillText, { color: text }]}>{s}</ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            );
          })()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recentContainer: {
    marginTop: 8,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  recentTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#999",
  },
  clearBtn: {
    fontSize: 11,
    fontWeight: "600",
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default StoreSearchBar;
