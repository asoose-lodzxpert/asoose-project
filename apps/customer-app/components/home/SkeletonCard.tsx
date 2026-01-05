import React from "react";
import { View } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

export function SkeletonCard() {
  const card = useThemeColor({}, "surfaceCard");
  return (
    <View
      style={{
        width: 160,
        height: 180,
        borderRadius: 16,
        backgroundColor: card,
        marginRight: 12,
      }}
    />
  );
}
