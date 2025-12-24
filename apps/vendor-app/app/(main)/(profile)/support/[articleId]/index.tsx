import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Pressable, View } from "react-native";

import { helpData } from "@/lib/help-data";

export default function ArticleScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();

  // Find the article from JSON
  let article;
  for (const section of helpData.sections) {
    const found = section.articles.find((a) => a.id === articleId);
    if (found) {
      article = { ...found, sectionLabel: section.label };
      break;
    }
  }

  if (!article) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ThemedText>Article not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <IconSymbol name="chevron.left" size={20} color="#000" />
          <ThemedText style={{ marginLeft: 6 }} type="link">
            Back
          </ThemedText>
        </Pressable>
        <View />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={{ marginBottom: 8 }}>
          {article.title}
        </ThemedText>
        <ThemedText type="caption" style={{ marginBottom: 16 }}>
          Section: {article.sectionLabel}
        </ThemedText>
        <ThemedText>{article.content}</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  container: {
    padding: 16,
  },
});
