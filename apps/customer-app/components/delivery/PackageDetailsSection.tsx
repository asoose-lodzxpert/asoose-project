import React from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { Section } from "@/components/ui/Section";
import { useSendPackage } from "@/context/SendPackageContext";
import { ThemedInput } from "../ThemedInput";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export function PackageDetailsSection() {
  const { packageOptions, setPackageOptions } = useSendPackage();

  const brandPrimary = useThemeColor({}, "brandPrimary");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const border = useThemeColor({}, "borderDefault");
  const textMuted = useThemeColor({}, "textMuted");

  const update = <K extends keyof typeof packageOptions>(
    key: K,
    value: (typeof packageOptions)[K],
  ) => {
    setPackageOptions({
      ...packageOptions,
      [key]: value,
    });
  };

  return (
    <Section title="Package Details">
      <ThemedText type="caption" style={styles.hint}>
        Select all that apply to your items
      </ThemedText>

      <View style={styles.chipContainer}>
        <OptionChip
          label="Fragile"
          icon="wineglass.fill"
          active={packageOptions.fragile}
          onPress={() => update("fragile", !packageOptions.fragile)}
        />
        <OptionChip
          label="Perishable"
          icon="leaf.fill"
          active={packageOptions.perishable}
          onPress={() => update("perishable", !packageOptions.perishable)}
        />
        <OptionChip
          label="Liquid"
          icon="drop.fill"
          active={packageOptions.containsLiquid}
          onPress={() =>
            update("containsLiquid", !packageOptions.containsLiquid)
          }
        />
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <ThemedText type="caption" style={styles.inputLabel}>
            Value (₦)
          </ThemedText>
          <ThemedInput
            placeholder="0.00"
            keyboardType="numeric"
            value={String(packageOptions.declaredValue)}
            onChangeText={(v) => update("declaredValue", v)}
            style={styles.smallInput}
          />
        </View>

        <View style={styles.inputWrapper}>
          <ThemedText type="caption" style={styles.inputLabel}>
            Weight (kg)
          </ThemedText>
          <ThemedInput
            placeholder="0"
            keyboardType="numeric"
            value={String(packageOptions.weightKg ?? "")}
            onChangeText={(v) => update("weightKg", Number(v) || 0)}
            style={styles.smallInput}
          />
        </View>
      </View>
    </Section>
  );
}

function OptionChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconSymbolName;
  active: boolean;
  onPress: () => void;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");
  const card = useThemeColor({}, "surfaceCard");

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? primary : border,
          backgroundColor: active ? `${primary}15` : card,
        },
      ]}
    >
      <IconSymbol name={icon} size={14} color={active ? primary : "#94A3B8"} />
      <ThemedText
        style={[
          styles.chipText,
          {
            color: active ? primary : "#64748B",
            fontWeight: active ? "700" : "500",
          },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginBottom: 12,
    opacity: 0.6,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  smallInput: {
    height: 48,
  },
});
