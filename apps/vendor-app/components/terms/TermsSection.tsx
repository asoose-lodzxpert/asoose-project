import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";

interface Section {
  id: string;
  label: string;
  content: string;
  icon: IconSymbolName;
}

interface Props {
  section: Section;
  isOpen: boolean;
  onPress: () => void;
}

export const TermsSection: React.FC<Props> = ({ section, isOpen, onPress }) => {
  const border = useThemeColor({}, "borderDefault");
  const mutedText = useThemeColor({}, "textDisabled");

  return (
    <View style={[styles.container, { borderColor: border }]}>
      <Pressable style={styles.header} onPress={onPress}>
        <IconSymbol name={section.icon} size={20} color={mutedText} />
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {section.label}
        </ThemedText>
        <IconSymbol
          name={isOpen ? "chevron.up" : "chevron.down"}
          size={20}
          color={mutedText}
        />
      </Pressable>
      {isOpen && (
        <View style={styles.content}>
          <ThemedText>{section.content}</ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    flex: 1,
  },
  content: {
    padding: 12,
  },
});
