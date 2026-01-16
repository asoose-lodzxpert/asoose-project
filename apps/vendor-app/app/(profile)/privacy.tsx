import React, { useState } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  Share,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";

import { TermsSection } from "@/components/terms/TermsSection";
import privacyData from "@/data/privacy-data.json";

export default function PrivacyScreen() {
  const border = useThemeColor({}, "borderDefault");
  const linkColor = useThemeColor({}, "brandPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");

  // All sections open by default
  const initialOpenSections = privacyData.sections.map((s) => s.id);
  const [openSections, setOpenSections] =
    useState<string[]>(initialOpenSections);

  const handlePress = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((secId) => secId !== id) : [...prev, id]
    );
  };

  const handleViewFullPolicy = () => {
    Linking.openURL("https://asoose.com/privacy-policy");
  };

  const handleShare = async () => {
    try {
      const text = privacyData.sections
        .map((s) => `${s.label}\n${s.content}`)
        .join("\n\n");
      await Share.share({ message: text });
    } catch (error) {
      console.error("Error sharing privacy policy:", error);
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

        <ThemedText type="subtitle">Privacy Policy</ThemedText>

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
        {/* Full Policy Link */}
        <Pressable
          style={[
            styles.fullPolicyCard,
            { backgroundColor: surfaceCard, borderColor: linkColor },
          ]}
          onPress={handleViewFullPolicy}
        >
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">
              View Complete Privacy Policy
            </ThemedText>
            <ThemedText style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Read our full privacy policy on asoose.com
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={20} color={linkColor} />
        </Pressable>

        {privacyData.sections.map((section) => (
          <TermsSection
            key={section.id}
            section={{
              ...section,
              icon: section.icon as IconSymbolName,
            }}
            isOpen={openSections.includes(section.id)}
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
  fullPolicyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 12,
  },
});
