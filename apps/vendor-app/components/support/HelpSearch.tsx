import React, { useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { RelativePathString, router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedInput } from "@/components/ThemedInput";

import { HelpSection } from "@/types/support";
import { fuzzyMatch } from "@/lib/fuzzyMatch";

interface Props {
  sections: HelpSection[];
}

export const HelpSearch: React.FC<Props> = ({ sections }) => {
  const muted = useThemeColor({}, "textDisabled");
  const primary = useThemeColor({}, "brandPrimary");

  const [query, setQuery] = useState("");

  const articles = useMemo(
    () => sections.flatMap((s) => s.articles),
    [sections],
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];

    return articles.filter(
      (a) => fuzzyMatch(query, a.title) || fuzzyMatch(query, a.content),
    );
  }, [query, articles]);

  return (
    <View style={styles.container}>
      <ThemedInput
        placeholder="How can we help you?"
        value={query}
        onChangeText={setQuery}
      />

      {!query && (
        <ThemedText type="caption" style={[styles.caption, { color: muted }]}>
          Try typing "Payment Issues" or "add menu items"
        </ThemedText>
      )}

      {query && results.length > 0 && (
        <View style={styles.results}>
          {results.map((article) => (
            <Pressable
              key={article.id}
              onPress={() =>
                router.push({
                  pathname: `/support/${article.id}` as RelativePathString,
                })
              }
            >
              <ThemedText type="defaultSemiBold" style={{ color: primary }}>
                {article.title}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      {query && results.length === 0 && (
        <ThemedText type="caption" style={[styles.caption, { color: muted }]}>
          No results found
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  caption: {
    marginTop: 8,
  },
  results: {
    marginTop: 12,
    gap: 12,
  },
});
