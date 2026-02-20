import React from "react";
import { View, Pressable, Image, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export function VehicleGrid({ value, onChange }: any) {
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.grid}>
      {VEHICLES.map((v) => (
        <Pressable
          key={v.key}
          style={[styles.card, value === v.key && { borderColor: primary }]}
          onPress={() => onChange(v.key)}
        >
          <Image source={v.image} style={styles.image} />
          <ThemedText>{v.label}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const VEHICLES = [
  {
    key: "bicycle",
    label: "Bicycle",
    image: require("@/assets/images/bicycle.png"),
  },
  {
    key: "motorcycle",
    label: "Motorcycle",
    image: require("@/assets/images/motorcycle.png"),
  },
  { key: "car", label: "Car", image: require("@/assets/images/car.png") },
];

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  card: {
    width: "48%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  image: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
});
