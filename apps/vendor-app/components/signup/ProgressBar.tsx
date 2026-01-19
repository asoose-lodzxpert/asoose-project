import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";
import { useThemeColor } from "@/hooks/use-theme-color";

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
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      {/* Link back to login */}
      <Pressable
        onPress={() => router.replace("/login")}
        style={styles.loginLink}
      >
        <ThemedText type="link">Already have an account? Log in</ThemedText>
      </Pressable>

      {/* Step Fraction */}
      <ThemedText style={styles.stepText}>
        Step {step} of {totalSteps}
      </ThemedText>

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
    marginVertical: 16,
    paddingHorizontal: 24,
  },
  loginLink: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  stepText: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  step: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
});
