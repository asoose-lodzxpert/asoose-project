import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";
import { useThemeColor } from "@/hooks/use-theme-color";

const STEP_LABELS = ["Business Info", "Documents", "Store Setup", "Review"];

interface ProgressBarProps {
  step: number;
  totalSteps?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  step,
  totalSteps = 4,
}) => {
  const primary = useThemeColor({}, "brandPrimary");
  const borderDefault = useThemeColor({}, "borderDefault");
  const textMuted = useThemeColor({}, "textMuted");
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <View>
          <ThemedText type="defaultSemiBold" style={styles.stepLabel}>
            {STEP_LABELS[step - 1] ?? `Step ${step}`}
          </ThemedText>
          <ThemedText style={[styles.stepCounter, { color: textMuted }]}>
            Step {step} of {totalSteps}
          </ThemedText>
        </View>
        <Pressable onPress={() => router.replace("/login")} hitSlop={8}>
          <ThemedText type="link" style={styles.loginLink}>
            Sign in
          </ThemedText>
        </Pressable>
      </View>

      {/* Progress Bar */}
      <View style={styles.container}>
        {[...Array(totalSteps)].map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.step,
              { backgroundColor: idx + 1 <= step ? primary : borderDefault },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  stepLabel: {
    fontSize: 15,
  },
  stepCounter: {
    fontSize: 12,
    marginTop: 1,
  },
  loginLink: {
    fontSize: 13,
  },
  container: {
    flexDirection: "row",
    gap: 4,
  },
  step: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});
