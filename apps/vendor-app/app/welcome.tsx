import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const steps: { icon: IconSymbolName; title: string; desc: string }[] = [
  {
    icon: "ticket.fill",
    title: "Seamless Order\nManagement",
    desc: "Receive, track, and fulfill orders with real-time notifications and status updates.",
  },
  {
    icon: "banknote",
    title: "Fast and Secure\nPayouts",
    desc: "Withdraw your earnings quickly and securely, with full payout history and support.",
  },
  {
    icon: "fork.knife",
    title: "Easy Store\nSetup",
    desc: "Set up your store, manage your listings, and update your business profile anytime.",
  },
];

export default function WelcomeScreen({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Theme Colors
  const backgroundColor = useThemeColor({}, "surfaceBackground");
  const primary = useThemeColor({}, "brandPrimary");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const dotInactive = useThemeColor({}, "borderDefault");

  const isLastStep = activeStep === steps.length - 1;

  const handleFinish = (target: "/(auth)/signup" | "/(auth)/login") => {
    if (onDone) onDone();
    else router.replace(target);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(scrollOffset / width);
    setActiveStep(currentIndex);
  };

  const scrollToNext = () => {
    if (!isLastStep) {
      flatListRef.current?.scrollToIndex({
        index: activeStep + 1,
        animated: true,
      });
    } else {
      handleFinish("/(auth)/signup");
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          {!isLastStep && (
            <Pressable
              onPress={() => handleFinish("/(auth)/signup")}
              style={styles.skipBtn}
            >
              <ThemedText style={[styles.skipText, { color: textSecondary }]}>
                Skip
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* The "Engine": FlatList handles all the sliding logic */}
        <FlatList
          ref={flatListRef}
          data={steps}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${primary}15` },
                ]}
              >
                <IconSymbol name={item.icon} size={42} color={primary} />
              </View>

              <ThemedText
                type="title"
                style={[styles.title, { color: textPrimary }]}
              >
                {item.title}
              </ThemedText>

              <ThemedText
                style={[styles.description, { color: textSecondary }]}
              >
                {item.desc}
              </ThemedText>
            </View>
          )}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.pagination}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  activeStep === i
                    ? [styles.activeDot, { backgroundColor: primary }]
                    : { backgroundColor: dotInactive },
                ]}
              />
            ))}
          </View>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: primary }]}
            onPress={scrollToNext}
          >
            <ThemedText
              type="defaultSemiBold"
              style={{ color: textOnPrimary, fontSize: 17 }}
            >
              {isLastStep ? "Get Started" : "Next"}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleFinish("/(auth)/login")}
            style={styles.loginBtn}
          >
            <ThemedText style={[styles.loginText, { color: textSecondary }]}>
              Already have an account?{" "}
              <ThemedText style={{ color: primary, fontWeight: "700" }}>
                Log in
              </ThemedText>
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    height: 60,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 32,
  },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 16, fontWeight: "500" },
  slide: {
    width: width,
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 16,
  },
  description: { fontSize: 17, lineHeight: 26, maxWidth: "90%" },
  footer: { paddingBottom: 20, paddingHorizontal: 32 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    gap: 6,
  },
  dot: { height: 6, width: 6, borderRadius: 3 },
  activeDot: { width: 20 },
  primaryButton: {
    width: "100%",
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtn: { marginTop: 24, alignItems: "center", marginBottom: 10 },
  loginText: { fontSize: 15 },
});
