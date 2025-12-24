import React from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  onDone: () => void;
}

export const ChangePasswordSuccess: React.FC<Props> = ({ onDone }) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const screenWidth = Dimensions.get("window").width;

  return (
    <View style={styles.container}>
      <View style={[styles.glowCircle, { borderColor: brandPrimary }]}>
        <IconSymbol name="check" size={48} color={brandPrimary} />
      </View>

      <ThemedText type="title" style={{ marginTop: 16 }}>
        Password changed!
      </ThemedText>
      <ThemedText
        type="subtitle"
        style={{ textAlign: "center", marginVertical: 8 }}
      >
        Your password has been updated successfully.
      </ThemedText>

      <View
        style={[styles.card, { borderColor: "green", width: screenWidth - 48 }]}
      >
        <View style={styles.cardRow}>
          <IconSymbol name="lock.fill" size={24} color="green" />
          <ThemedText type="defaultSemiBold" style={{ marginLeft: 8 }}>
            Your account is secure
          </ThemedText>
        </View>
        <ThemedText style={{ marginTop: 8, textAlign: "center" }}>
          You've been logged out of all your devices for your safety.
        </ThemedText>
      </View>

      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: brandPrimary,
            width: screenWidth - 48,
            marginTop: 24,
          },
        ]}
        onPress={onDone}
      >
        <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
          Done
        </ThemedText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  glowCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00ff00",
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  card: {
    flexDirection: "column",
    alignItems: "center",
    padding: 12,
    borderWidth: 2,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
