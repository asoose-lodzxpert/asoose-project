import React from "react";
import { View, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { RelativePathString, router } from "expo-router";

export function SectionHeader({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 12,
      }}
    >
      <ThemedText type="subtitle">{title}</ThemedText>
      <Pressable onPress={() => router.push(href as RelativePathString)}>
        <ThemedText type="link">View all</ThemedText>
      </Pressable>
    </View>
  );
}
