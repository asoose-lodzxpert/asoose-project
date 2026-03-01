import React, { useEffect, useRef } from "react";
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function OrderSuccessScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const success = useThemeColor({}, "statusSuccess");
  const textSecondary = useThemeColor({}, "textSecondary");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");

  const orderId = (params.orderId as string) || "";
  const amount = Number(params.amount) || 0;
  const currency = (params.currency as string) || "₦";

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleGoHome = () => {
    router.dismissAll();
    router.replace("/(tabs)/home");
  };

  const handleViewOrders = () => {
    router.dismissAll();
    router.replace("/(tabs)/home");
    setTimeout(() => {
      router.push("/(settings)/order-history-screen" as any);
    }, 120);
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

    const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleGoHome();
      return true;
    });
    return () => backSub.remove();
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.content}>
        {/* Icon */}
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }], marginBottom: 28 }}
        >
          <View
            style={[styles.outerCircle, { backgroundColor: success + "20" }]}
          >
            <View style={[styles.innerCircle, { backgroundColor: success }]}>
              <IconSymbol name="checkmark" size={44} color="#fff" />
            </View>
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textBlock, { opacity: fadeAnim }]}>
          <ThemedText style={styles.title}>Order Placed!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Payment confirmed. Your order{"\n"}is on its way to being prepared.
          </ThemedText>

          {/* Minimal info pill */}
          {(orderId || amount > 0) && (
            <View
              style={[
                styles.infoPill,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              {!!orderId && (
                <View style={styles.infoItem}>
                  <ThemedText
                    style={[styles.infoLabel, { color: textSecondary }]}
                  >
                    Order
                  </ThemedText>
                  <ThemedText style={styles.infoValue}>
                    #{orderId.slice(-8).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              {amount > 0 && (
                <View
                  style={[
                    styles.infoItem,
                    !!orderId && {
                      borderLeftWidth: 1,
                      borderLeftColor: border,
                      paddingLeft: 16,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.infoLabel, { color: textSecondary }]}
                  >
                    Paid
                  </ThemedText>
                  <ThemedText style={[styles.infoValue, { color: success }]}>
                    {currency}
                    {amount.toLocaleString()}
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, { backgroundColor: primary }]}
          onPress={handleViewOrders}
        >
          <ThemedText style={styles.btnText}>View Order History</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.btnOutline, { borderColor: border }]}
          onPress={handleGoHome}
        >
          <ThemedText style={[styles.btnOutlineText, { color: primary }]}>
            Back to Home
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
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { alignItems: "center", width: "100%" },
  title: {
    fontSize: 28,
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
  infoPill: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: { fontSize: 16, fontWeight: "800" },
  footer: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  btn: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  btnOutline: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: { fontSize: 16, fontWeight: "600" },
});
