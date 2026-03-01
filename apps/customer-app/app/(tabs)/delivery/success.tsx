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
        <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 28 }}>
          <View style={[styles.outerCircle, { backgroundColor: success + "20" }]}>
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
                <ThemedText style={[styles.metaLabel, { color: textSecondary }]}>Paid</ThemedText>
                <ThemedText style={[styles.metaValue, { color: primary }]}>
                  {formatCurrency(price)}
                </ThemedText>
              </View>
            )}
            {etaMinutes > 0 && (
              <View style={[styles.metaItem, price > 0 && { borderLeftWidth: 1, borderLeftColor: border }]}>
                <ThemedText style={[styles.metaLabel, { color: textSecondary }]}>Est. Time</ThemedText>
                <ThemedText style={styles.metaValue}>~{etaMinutes} min</ThemedText>
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Buttons pinned to bottom */}
      <View style={styles.footer}>
        <Pressable style={[styles.btn, { backgroundColor: primary }]} onPress={handleViewHistory}>
          <ThemedText style={styles.btnText}>View in Delivery History</ThemedText>
        </Pressable>
        <Pressable style={[styles.btnOutline, { borderColor: border }]} onPress={handleGoHome}>
          <ThemedText style={[styles.btnOutlineText, { color: primary }]}>Done</ThemedText>
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
  title: { fontSize: 26, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  metaRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  metaItem: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  metaLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  metaValue: { fontSize: 16, fontWeight: "800" },
  footer: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  btn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnOutline: { height: 56, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnOutlineText: { fontSize: 16, fontWeight: "600" },
});


  // Theme colors from useThemeColor
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const success = useThemeColor({}, "statusSuccess");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");

  const price = Number(params.price) || 0;
  const etaMinutes = Number(params.etaMinutes) || 0;
  const deliveryId = params.deliveryId || "";

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const resetTimer = setTimeout(() => {
      resetDelivery();
    }, 2000);

    const backAction = () => {
      handleGoHome();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => {
      clearTimeout(resetTimer);
      backHandler.remove();
    };
  }, []);

  const handleGoHome = () => {
    resetDelivery();
    router.replace("/(tabs)/delivery");
  };

  const handleTrack = () => {
    router.push(`/(settings)/delivery-history/${deliveryId}`);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.content}>
        <Animated.View
          style={[styles.iconBox, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={[styles.circle, { backgroundColor: success }]}>
            <IconSymbol name="checkmark" size={32} color={textOnPrimary} />
          </View>
        </Animated.View>

        <Animated.View
          style={{ opacity: fadeAnim, alignItems: "center", width: "100%" }}
        >
          <ThemedText style={styles.title}>Request Placed</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            We're searching for a driver to pick up your package.
          </ThemedText>

          <View
            style={[
              styles.simpleCard,
              { backgroundColor: surfaceCard, borderColor: border },
            ]}
          >
            <View style={styles.priceRow}>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                TOTAL PAID
              </ThemedText>
              <ThemedText style={[styles.price, { color: primary }]}>
                {formatCurrency(price)}
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: border }]} />

            <View style={styles.infoRow}>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                EST. TIME
              </ThemedText>
              <ThemedText style={styles.val}>~{etaMinutes} mins</ThemedText>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleTrack}
          style={[styles.btn, { backgroundColor: primary }]}
        >
          <ThemedText style={[styles.btnText, { color: textOnPrimary }]}>
            Track Order
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleGoHome}
          style={[styles.btnSecondary, { borderColor: border }]}
        >
          <ThemedText style={{ fontWeight: "600", color: primary }}>
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
    padding: 24,
  },
  iconBox: { marginBottom: 20 },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  subtitle: { textAlign: "center", fontSize: 15, marginBottom: 32 },
  simpleCard: { width: "100%", padding: 20, borderRadius: 16, borderWidth: 1 },
  priceRow: { alignItems: "center", marginBottom: 16 },
  price: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  val: { fontWeight: "700" },
  footer: { padding: 24, gap: 12 },
  btn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontWeight: "700", fontSize: 16 },
  btnSecondary: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
