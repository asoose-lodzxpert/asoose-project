import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const CategoryRow: React.FC<Props> = ({ name, onEdit, onDelete }) => {
  const error = useThemeColor({}, "statusError");
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");

  return (
    <View style={[styles.card, { backgroundColor: surface }]}>
      <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.name}>
        {name}
      </ThemedText>

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          style={[styles.button, { backgroundColor: primary }]}
        >
          <IconSymbol name="pencil" size={16} color="#fff" />
          <ThemedText style={styles.buttonText}>Edit</ThemedText>
        </Pressable>

        <Pressable
          onPress={onDelete}
          style={[styles.button, { backgroundColor: error }]}
        >
          <IconSymbol name="trash" size={16} color="#fff" />
          <ThemedText style={styles.buttonText}>Delete</ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,

    // subtle shadow (same as item card)
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  name: {
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },

  actions: {
    flexDirection: "row",
    gap: 8,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
