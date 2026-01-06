import React from "react";
import { Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";

export function MapCurrentLocationBtn({
  onPress,
  locating,
}: {
  onPress: () => void;
  locating?: boolean;
}) {
  return (
    <Pressable
      style={styles.currentLocBtn}
      onPress={onPress}
      disabled={!!locating}
    >
      {locating ? (
        <ActivityIndicator
          size="small"
          color="#fff"
          style={{ marginRight: 8 }}
        />
      ) : (
        <IconSymbol name="navigation" size={22} color="#fff" />
      )}
      <ThemedText style={{ color: "#fff", marginLeft: 6 }}>
        {locating ? "Getting location..." : "Use Current Location"}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  currentLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 90,
    right: 16,
    backgroundColor: "#1a73e8",
    padding: 10,
    borderRadius: 10,
    zIndex: 10,
  },
});
