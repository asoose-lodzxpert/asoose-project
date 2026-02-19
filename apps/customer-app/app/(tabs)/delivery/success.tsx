import React, { useEffect, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
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
