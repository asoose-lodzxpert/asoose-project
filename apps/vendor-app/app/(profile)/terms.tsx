import React, { useState, useEffect } from "react";
import { ScrollView, View, StyleSheet, Pressable, Share } from "react-native";
import { router } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";

import { TermsSection } from "@/components/terms/TermsSection";
import termsData from "@/data/terms-data.json";

export default function TermsScreen() {
  const border = useThemeColor({}, "borderDefault");
  const linkColor = useThemeColor({}, "brandPrimary");

  const [openSection, setOpenSection] = useState<string | null>(
    termsData.sections[0]?.id || ""
  );

  const handlePress = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  const handleShare = async () => {
    try {
      const text = termsData.sections
        .map((s) => `${s.label}\n${s.content}`)
        .join("\n\n");
      await Share.share({ message: text });
    } catch (error) {
      // Silent error handling
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <IconSymbol name="chevron.left" size={20} color={linkColor} />
          <ThemedText style={{ color: linkColor }}>Back</ThemedText>
        </Pressable>

        <ThemedText type="subtitle">Terms of Service</ThemedText>

        <Pressable
          onPress={handleShare}
          style={styles.shareButton}
          hitSlop={10}
        >
          <IconSymbol name="share" size={20} color={linkColor} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        {termsData.sections.map((section) => (
          <TermsSection
            key={section.id}
            section={{
              ...section,
              icon: section.icon as IconSymbolName,
            }}
            isOpen={openSection === section.id}
            onPress={() => handlePress(section.id)}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shareButton: {
    padding: 4,
  },
});
