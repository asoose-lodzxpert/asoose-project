import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

const { width } = Dimensions.get("window");
const ONBOARDING_KEY = "asoose_customer_onboarded";

type Step = {
  key: string;
  content: React.ReactNode;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);

  // Theme Colors
  const primary = useThemeColor({}, "brandPrimary");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const dotInactive = useThemeColor({}, "borderDefault");

  const steps: Step[] = [
    {
      key: "branding",
      content: (
        <View style={styles.slide}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
          />
          <ThemedText style={[styles.appName, { color: textPrimary }]}>
            ASOOSE
          </ThemedText>
          <ThemedText style={[styles.slogan, { color: textSecondary }]}>
            Order. Ride. Deliver.
          </ThemedText>
        </View>
      ),
    },
    {
      key: "services",
      content: (
        <View style={styles.slide}>
          <ThemedText style={[styles.stepTitle, { color: textPrimary }]}>
            Everything you need,{"\n"}one single app
          </ThemedText>
          <View style={styles.iconRow}>
            <ServiceBubble icon="person.fill" label="Order" />
            <ServiceBubble icon="car.fill" label="Ride" />
            <ServiceBubble icon="shippingbox.fill" label="Deliver" />
          </View>
        </View>
      ),
    },
    {
      key: "categories",
      content: (
        <View style={styles.slide}>
          <ThemedText
            style={[styles.stepTitle, { color: textPrimary, marginBottom: 32 }]}
          >
            Choose your service
          </ThemedText>
          <CategoryCard
            icon="fork.knife"
            title="Order Food & More"
            description="Restaurants and essentials delivered fast"
          />
          <CategoryCard
            icon="car.fill"
            title="Book Rides"
            description="Safe transportation whenever you need it"
          />
          <CategoryCard
            icon="shippingbox.fill"
            title="Send Packages"
            description="Quick courier delivery for your items"
          />
        </View>
      ),
    },
  ];

  const isLastStep = index === steps.length - 1;

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
      // Navigate anyway
      router.replace("/(auth)/login");
    }
  };

  const next = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      ref.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header - Skip */}
        <View style={styles.header}>
          {!isLastStep && (
            <Pressable onPress={handleFinish} style={styles.skipBtn}>
              <ThemedText style={[styles.skipText, { color: textSecondary }]}>
                Skip
              </ThemedText>
            </Pressable>
          )}
        </View>

        <FlatList
          ref={ref}
          data={steps}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          keyExtractor={(i) => i.key}
          renderItem={({ item }) => (
            <View style={{ width }}>{item.content}</View>
          )}
        />

        {/* Footer Actions */}
        <View style={styles.footer}>
          <View style={styles.pagination}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index
                    ? [styles.activeDot, { backgroundColor: primary }]
                    : { backgroundColor: dotInactive },
                ]}
              />
            ))}
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: primary }]}
            onPress={next}
          >
            <ThemedText style={[styles.buttonText, { color: textOnPrimary }]}>
              {isLastStep ? "Get Started" : "Continue"}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/* ───────── Sub-Components ───────── */

function ServiceBubble({
  icon,
  label,
}: {
  icon: IconSymbolName;
  label: string;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={styles.bubbleContainer}>
      <View style={[styles.bubble, { backgroundColor: `${primary}15` }]}>
        <IconSymbol name={icon} size={28} color={primary} />
      </View>
      <ThemedText style={[styles.bubbleLabel, { color: textSecondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function CategoryCard({
  icon,
  title,
  description,
}: {
  icon: IconSymbolName;
  title: string;
  description: string;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={[styles.card, { backgroundColor: surface }]}>
      <View style={styles.cardIcon}>
        <IconSymbol name={icon} size={24} color={primary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.cardTitle, { color: textPrimary }]}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.cardDesc, { color: textSecondary }]}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

/* ───────── Styles ───────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 50,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 24,
  },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 16, fontWeight: "600" },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  appName: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  slogan: {
    fontSize: 18,
    fontWeight: "500",
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 36,
  },
  iconRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 40,
  },
  bubbleContainer: { alignItems: "center", gap: 12 },
  bubble: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleLabel: { fontSize: 14, fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 24,
    width: "100%",
    marginBottom: 12,
  },
  cardIcon: { width: 32, alignItems: "center" },
  cardTitle: { fontWeight: "700", fontSize: 17, marginBottom: 2 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
  },
  button: {
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 18,
  },
});
