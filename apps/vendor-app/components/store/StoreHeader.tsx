import React from "react";
import { View, StyleSheet, Switch } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  storeName: string;
  approved: boolean;
  isOnline: boolean;
  onToggleOnline: () => void;
}

export const StoreHeader: React.FC<Props> = ({
  storeName,
  approved,
  isOnline,
  onToggleOnline,
}) => {
  const yellow = useThemeColor({}, "brandPrimary");
  const green = useThemeColor({}, "statusSuccess");

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <ThemedText type="defaultSemiBold">{storeName}</ThemedText>
        {approved && (
          <View style={[styles.badge, { backgroundColor: green }]}>
            <ThemedText style={{ color: "#fff", fontSize: 12 }}>
              Approved
            </ThemedText>
          </View>
        )}
      </View>
      <Switch
        value={isOnline}
        onValueChange={onToggleOnline}
        trackColor={{ false: "#E5E7EB", true: yellow }}
        thumbColor={isOnline ? yellow : "#F3F4F6"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
