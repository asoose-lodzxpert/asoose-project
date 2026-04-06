import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions, Modal } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface Props {
  visible: boolean;
}

const STEPS = [
  { id: 1, label: "Securing your application data" },
  { id: 2, label: "Uploading documents for review" },
  { id: 3, label: "Submitting store profile" },
  { id: 4, label: "Synchronizing with ASOOSE cloud" },
  { id: 5, label: "Queuing for administrative approval" },
];

const ENCOURAGEMENTS = [
  "Our team will review your application soon.",
  "Ensuring a safe marketplace for everyone.",
  "Documents are being securely transmitted.",
  "Asoose administrators will verify your details.",
  "Your application is being prioritized for review.",
];

export const SignupProgress: React.FC<Props> = ({ visible }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [encouragement, setEncouragement] = useState(ENCOURAGEMENTS[0]);
  const progressPercent = useSharedValue(0);
  
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceCard");
  const textMuted = useThemeColor({}, "textMuted");

  useEffect(() => {
    if (visible) {
      // Reset
      setCurrentStep(0);
      progressPercent.value = 0;

      // Slow fake progress to 95%
      progressPercent.value = withTiming(95, { duration: 12000 }); 

      const stepInterval = setInterval(() => {
        setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);

      const msgInterval = setInterval(() => {
        setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
      }, 4000);

      return () => {
        clearInterval(stepInterval);
        clearInterval(msgInterval);
      };
    }
  }, [visible]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressPercent.value}%`,
    };
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.container, { backgroundColor: "rgba(0,0,0,0.8)" }]}>
        <Animated.View
          entering={FadeIn.duration(500)}
          style={[styles.card, { backgroundColor: surface }]}
        >
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: brandPrimary + "15" }]}>
              <IconSymbol name="shield.fill" size={28} color={brandPrimary} />
            </View>
            <ThemedText type="subtitle" style={styles.title}>
              Enrolling Your Business
            </ThemedText>
            <ThemedText style={{ color: textMuted, textAlign: "center", fontSize: 13 }}>
              {encouragement}
            </ThemedText>
          </View>

          <View style={styles.stepsList}>
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isDone = index < currentStep;

              return (
                <View key={step.id} style={styles.stepItem}>
                  <View
                    style={[
                      styles.indicator,
                      {
                        backgroundColor: isDone ? brandPrimary : isActive ? brandPrimary : "#EEE",
                      },
                    ]}
                  >
                    {isDone && <IconSymbol name="checkmark" size={10} color="#FFF" />}
                  </View>
                  <ThemedText
                    style={[
                      styles.stepText,
                      {
                        color: isActive ? brandPrimary : isDone ? "#333" : textMuted,
                        opacity: isActive ? 1 : 0.6,
                        fontWeight: isActive ? "700" : "400",
                      },
                    ]}
                  >
                    {step.label}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          <View style={styles.meterContainer}>
            <View style={styles.meterBg}>
              <Animated.View
                style={[
                  styles.meterFill,
                  { backgroundColor: brandPrimary },
                  animatedProgressStyle,
                ]}
              />
            </View>
            <ThemedText style={styles.waitText}>
              Submitting to verification queue...
            </ThemedText>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 32,
    padding: 32,
    gap: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    textAlign: "center",
  },
  stepsList: {
    gap: 16,
    marginVertical: 10,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: {
    fontSize: 14,
  },
  meterContainer: {
    gap: 10,
  },
  meterBg: {
    height: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: 4,
  },
  waitText: {
    fontSize: 12,
    color: "#BBBBBB",
    textAlign: "center",
  },
});
