// app/(main)/support/index.tsx
import React, { useState } from "react";
import { ScrollView, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

import { helpData } from "@/lib/help-data";

import { HelpSearch } from "@/components/support/HelpSearch";
import { QuickResources } from "@/components/support/QuickResources";
import { HelpSection } from "@/components/support/HelpSection";
import { SupportCTA } from "@/components/support/SupportCTA";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SupportScreen() {
  const linkColor = useThemeColor({}, "brandPrimary");

  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backRow}
        >
          <IconSymbol name="chevron.left" size={20} color={linkColor} />
          <ThemedText type="defaultSemiBold" style={{ color: linkColor }}>
            Back
          </ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.heading}>
          Support & Help
        </ThemedText>

        <HelpSearch sections={helpData.sections} />
        <QuickResources />

        {helpData.sections.map((section) => (
          <HelpSection
            key={section.id}
            section={section}
            openSectionId={openSectionId}
            setOpenSectionId={(id: string | null) => setOpenSectionId(id)}
          />
        ))}

        <SupportCTA />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heading: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
});
