import React, { useEffect, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  BackHandler,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatCurrency } from "@/services/sendPackage.api";
import { useSendPackage } from "@/context/SendPackageContext";

export default function DeliverySuccessScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { resetDelivery } = useSendPackage();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const success = useThemeColor({}, "statusSuccess");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");

  const price = Number(params.price) || 0;
  const etaMinutes = Number(params.etaMinutes) || 0;
  const deliveryId = (params.deliveryId as string) || "";

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleGoHome = () => {
    resetDelivery();
    router.replace("/(tabs)/delivery");
  };

  const handleViewHistory = () => {
    if (deliveryId) {
      router.replace(`/(settings)/delivery-history/${deliveryId}` as any);
    } else {
      router.replace("/(tabs)/delivery");
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Clean up context state after a short delay
    const resetTimer = setTimeout(() => resetDelivery(), 2000);

    const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleGoHome();
      return true;
    });

    return () => {
      clearTimeout(resetTimer);
      backSub.remove();
    };
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Content — centered vertically */}
      <View style={styles.content}>
        {/* Animated check circle */}
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }], marginBottom: 28 }}
        >
          <View
            style={[styles.outerCircle, { backgroundColor: success + "20" }]}
          >
            <View style={[styles.innerCircle, { backgroundColor: success }]}>
              <IconSymbol name="checkmark" size={40} color="#fff" />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: fadeAnim }]}>
          <ThemedText style={styles.title}>Request Placed!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            We're searching for a nearby driver{"\n"}to pick up your package.
          </ThemedText>

          {/* Minimal pill: fare + ETA only */}
          <View style={[styles.metaRow, { borderColor: border }]}>
            {price > 0 && (
              <View style={styles.metaItem}>
                <ThemedText
                  style={[styles.metaLabel, { color: textSecondary }]}
                >
                  Paid
                </ThemedText>
                <ThemedText style={[styles.metaValue, { color: primary }]}>
                  {formatCurrency(price)}
                </ThemedText>
              </View>
            )}
            {etaMinutes > 0 && (
              <View
                style={[
                  styles.metaItem,
                  price > 0 && { borderLeftWidth: 1, borderLeftColor: border },
                ]}
              >
                <ThemedText
                  style={[styles.metaLabel, { color: textSecondary }]}
                >
                  Est. Time
                </ThemedText>
                <ThemedText style={styles.metaValue}>
                  ~{etaMinutes} min
                </ThemedText>
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Buttons pinned to bottom */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, { backgroundColor: primary }]}
          onPress={handleViewHistory}
        >
          <ThemedText style={styles.btnText}>
            View in Delivery History
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.btnOutline, { borderColor: border }]}
          onPress={handleGoHome}
        >
          <ThemedText style={[styles.btnOutlineText, { color: primary }]}>
            Done
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  outerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { alignItems: "center", width: "100%" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  metaRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  metaItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: { fontSize: 16, fontWeight: "800" },
  footer: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  btn: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnOutline: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: { fontSize: 16, fontWeight: "600" },
});
