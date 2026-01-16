import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  step: number;
  onNext: () => void;
  onBack: () => void;
  loading?: boolean;
};

export function SignupNavigation({ step, onNext, onBack, loading }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");

  return (
    <View style={styles.container}>
      {step > 1 && (
        <Pressable
          style={styles.backButton}
          onPress={onBack}
          disabled={loading}
        >
          <ThemedText type="link">Back</ThemedText>
        </Pressable>
      )}

      <Pressable
        style={[styles.nextButton, { backgroundColor: primary }]}
        onPress={onNext}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={textOnPrimary} />
        ) : (
          <ThemedText type="defaultSemiBold" style={{ color: textOnPrimary }}>
            {step === 3 ? "Submit" : "Continue"}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
  },
  backButton: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    flex: 1, // ✅ fills remaining space
    height: 56, // ✅ larger primary CTA
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
