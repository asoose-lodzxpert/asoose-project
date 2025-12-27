import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  Pressable,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

type Step = {
  key: string;
  title?: string;
  description?: string;
  content: React.ReactNode;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");

  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);

  const next = () => {
    if (index === steps.length - 1) {
      router.replace("/(auth)/login");
    } else {
      ref.current?.scrollToIndex({ index: index + 1 });
    }
  };

  const steps: Step[] = [
    {
      key: "branding",
      content: (
        <View style={styles.center}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
          />
          <ThemedText style={styles.appName}>ASOOSE</ThemedText>
          <ThemedText style={styles.slogan}>Order. Ride. Deliver.</ThemedText>
        </View>
      ),
    },

    {
      key: "services",
      content: (
        <View style={styles.center}>
          <ThemedText style={styles.stepTitle}>
            Everything you need, one app
          </ThemedText>

          <View style={styles.iconRow}>
            <ServiceBubble icon="person" color="#FACC15" label="Order" />
            <ServiceBubble icon="bus.fill" color="#93C5FD" label="Ride" />
            <ServiceBubble
              icon="square.grid.2x2.fill"
              color="#FDBA74"
              label="Deliver"
            />
          </View>
        </View>
      ),
    },

    {
      key: "categories",
      content: (
        <View style={styles.center}>
          <ThemedText style={styles.stepTitle}>Choose your service</ThemedText>

          <CategoryCard
            icon="fork.knife"
            title="Order Food & More"
            description="Restaurants, groceries, and essentials delivered fast"
          />

          <CategoryCard
            icon="car.fill"
            title="Book Rides"
            description="Safe, reliable transportation whenever you need it"
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

  return (
    <ThemedView style={{ flex: 1 }}>
      <FlatList
        ref={ref}
        data={steps}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => i.key}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => <View style={{ width }}>{item.content}</View>}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && { backgroundColor: primary }]}
            />
          ))}
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: primary }]}
          onPress={next}
        >
          <ThemedText style={styles.buttonText}>
            {index === steps.length - 1 ? "Get Started" : "Next"}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

/* ───────── Components ───────── */

function ServiceBubble({
  icon,
  color,
  label,
}: {
  icon: IconSymbolName;
  color: string;
  label: string;
}) {
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <View style={[styles.bubble, { backgroundColor: color }]}>
        <IconSymbol name={icon} size={28} color="#111827" />
      </View>
      <ThemedText>{label}</ThemedText>
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
  const border = useThemeColor({}, "borderDefault");
  return (
    <View style={[styles.card, { borderColor: border }]}>
      <IconSymbol name={icon} size={28} color={primary} />
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.cardTitle}>{title}</ThemedText>
        <ThemedText style={styles.cardDesc}>{description}</ThemedText>
      </View>
    </View>
  );
}

/* ───────── Styles ───────── */

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },

  logo: {
    width: 96,
    height: 96,
    resizeMode: "contain",
  },

  appName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
  },

  slogan: {
    fontSize: 16,
    color: "#4B5563",
  },

  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },

  iconRow: {
    flexDirection: "row",
    gap: 28,
  },

  bubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    width: "100%",
    marginTop: 12,
    // elevation: 2,
    borderWidth: 1,
  },

  cardTitle: {
    fontWeight: "700",
    fontSize: 16,
  },

  cardDesc: {
    fontSize: 13,
    color: "#6B7280",
  },

  footer: {
    padding: 20,
    gap: 16,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },

  button: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },

  buttonText: {
    fontWeight: "700",
    fontSize: 16,
    color: "#fff",
  },
});
