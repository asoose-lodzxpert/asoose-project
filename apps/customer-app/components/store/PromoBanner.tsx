import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export function PromoBanner({
  promoText,
  loading = false,
}: {
  promoText: string;
  loading?: boolean;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const text = useThemeColor({}, "textPrimary");
  const skeleton = useThemeColor({}, "surfaceSubtle");
  return (
    <View
      style={[
        styles.promoBanner,
        { borderColor: primary, backgroundColor: cardBg },
      ]}
    >
      {loading ? (
        <View
          style={{
            width: "60%",
            height: 18,
            backgroundColor: skeleton,
            borderRadius: 4,
          }}
        />
      ) : (
        <ThemedText style={[styles.promoText, { color: text }]}>
          {promoText}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  promoBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    alignItems: "center",
  },
  promoText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
