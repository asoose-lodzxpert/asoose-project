import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { RelativePathString, router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { HelpSection as Section } from "@/types/support";

interface Props {
  section: Section;
  openSectionId: string | null;
  setOpenSectionId: (id: string | null) => void;
}

export const HelpSection: React.FC<Props> = ({
  section,
  openSectionId,
  setOpenSectionId,
}) => {
  const border = useThemeColor({}, "borderDefault");
  const muted = useThemeColor({}, "textSecondary");
  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceCard");

  const isOpen = openSectionId === section.id;

  const toggleOpen = () => {
    setOpenSectionId(isOpen ? null : section.id);
  };

  // Map section ID to a left icon
  const getSectionIcon = (id: string) => {
    switch (id) {
      case "getting-started":
        return "lightbulb"; // example icon
      case "orders":
        return "list";
      case "payments":
        return "dollar-sign";
      case "menu":
        return "menu";
      case "account":
        return "shield";
      default:
        return "info";
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: background, borderColor: border },
      ]}
    >
      {/* Header */}
      <Pressable onPress={toggleOpen} style={styles.header}>
        <View style={styles.left}>
          <IconSymbol
            name={getSectionIcon(section.id)}
            size={20}
            color={muted}
          />
          <ThemedText type="defaultSemiBold" style={{ marginLeft: 8 }}>
            {section.label}
          </ThemedText>
        </View>

        <IconSymbol
          name="chevron.down"
          size={18}
          color={muted}
          style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {/* Articles */}
      {isOpen && (
        <View style={styles.articles}>
          {section.articles.map((article) => (
            <Pressable
              key={article.id}
              onPress={() =>
                router.push(`/support/${article.id}` as RelativePathString)
              }
              style={styles.articleRow}
            >
              <ThemedText type="defaultSemiBold" style={{ color: primary }}>
                {article.title}
              </ThemedText>
              <ThemedText style={styles.preview} numberOfLines={2}>
                {article.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  articles: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  articleRow: {
    paddingVertical: 10,
    gap: 4,
  },
  preview: {
    fontSize: 13,
    opacity: 0.7,
  },
});
