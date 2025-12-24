import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Action {
  label: string;
  color?: string;
  onPress: () => void;
  icon?: React.ReactNode;
}

interface Props {
  heading?: string; // optional heading
  actions: Action[];
}

export const QuickActions: React.FC<Props> = ({ heading, actions }) => {
  const background = useThemeColor({}, "surfaceCard");
  const mutedText = useThemeColor({}, "textDisabled");
  const linkColor = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.wrapper}>
      {heading && (
        <ThemedText type="title" style={[styles.heading, { color: mutedText }]}>
          {heading}
        </ThemedText>
      )}
      <View style={styles.container}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            style={[
              styles.button,
              { backgroundColor: action.color || background },
            ]}
            onPress={action.onPress}
          >
            <View style={styles.content}>
              {action.icon && <View style={styles.icon}>{action.icon}</View>}
              <ThemedText type="defaultSemiBold">{action.label}</ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 16,
    marginBottom: 8,
  },
  container: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  icon: {
    marginRight: 4,
  },
});
