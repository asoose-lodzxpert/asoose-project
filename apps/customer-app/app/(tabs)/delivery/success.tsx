import React, { useEffect, useRef } from "react";
import { View, Pressable, StyleSheet, Animated, Easing } from "react-native";
import {
  RelativePathString,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
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

  // Theme Colors
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const success = useThemeColor({}, "statusSuccess");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  // Data
  const price = Number(params.price) || 0;
  const distanceKm = Number(params.distanceKm) || 0;
  const etaMinutes = Number(params.etaMinutes) || 0;
  const method = params.method || "transfer";
  const deliveryId = params.deliveryId || "";

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Pop in the checkmark
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      // 2. Fade in text & Slide up card
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  function handleDone() {
    resetDelivery();
    router.replace("/(tabs)/delivery");
  }

  function handleTrackDelivery() {
    router.push(
      `/(settings)/delivery-history/${deliveryId}` as RelativePathString,
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.contentContainer}>
        {/* --- Animated Success Icon --- */}
        <Animated.View
          style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}
        >
          <View
            style={[styles.iconCircle, { backgroundColor: success + "15" }]}
          >
            <View style={[styles.iconInner, { backgroundColor: success }]}>
              <IconSymbol name="checkmark" size={40} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>

        {/* --- Header Text --- */}
        <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
          <ThemedText style={[styles.title, { color: textPrimary }]}>
            Success!
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Your delivery request has been placed successfully.
          </ThemedText>
        </Animated.View>

        {/* --- Receipt Card --- */}
        <Animated.View
          style={[
            styles.ticketCard,
            {
              backgroundColor: surfaceCard,
              borderColor: border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top Section */}
          <View style={styles.ticketSection}>
            <ThemedText style={[styles.label, { color: textSecondary }]}>
              AMOUNT PAID
            </ThemedText>
            <ThemedText style={[styles.amount, { color: primary }]}>
              {formatCurrency(price)}
            </ThemedText>
          </View>

          {/* Divider with Dashed Line illusion */}
          <View style={styles.ticketDividerContainer}>
            <View
              style={[
                styles.ticketNotch,
                { backgroundColor: surface, left: -10 },
              ]}
            />
            <View style={[styles.dashedLine, { borderColor: border }]} />
            <View
              style={[
                styles.ticketNotch,
                { backgroundColor: surface, right: -10 },
              ]}
            />
          </View>

          {/* Details Section */}
          <View style={styles.ticketSection}>
            <View style={styles.row}>
              <ThemedText style={[styles.rowLabel, { color: textSecondary }]}>
                Order ID
              </ThemedText>
              <ThemedText style={styles.rowValue}>
                {Array.isArray(deliveryId)
                  ? deliveryId[0]?.slice(0, 8).toUpperCase()
                  : deliveryId.slice(0, 8).toUpperCase()}
              </ThemedText>
            </View>

            <View style={[styles.row, { marginTop: 12 }]}>
              <ThemedText style={[styles.rowLabel, { color: textSecondary }]}>
                Est. Time
              </ThemedText>
              <ThemedText style={styles.rowValue}>
                ~{etaMinutes} mins
              </ThemedText>
            </View>

            <View style={[styles.row, { marginTop: 12 }]}>
              <ThemedText style={[styles.rowLabel, { color: textSecondary }]}>
                Payment
              </ThemedText>
              <ThemedText
                style={[styles.rowValue, { textTransform: "capitalize" }]}
              >
                {method === "transfer" ? "Bank Transfer" : method}
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Info Pill */}
        <Animated.View
          style={[
            styles.infoPill,
            { backgroundColor: primary + "10", opacity: fadeAnim },
          ]}
        >
          <IconSymbol name="person.2.fill" size={16} color={primary} />
          <ThemedText style={[styles.infoPillText, { color: primary }]}>
            Connecting you to a nearby driver...
          </ThemedText>
        </Animated.View>
      </View>

      {/* --- Footer Buttons --- */}
      <View style={[styles.footer, { borderTopColor: border }]}>
        <Pressable
          onPress={handleTrackDelivery}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <ThemedText style={styles.primaryButtonText}>
            Track Delivery
          </ThemedText>
          <IconSymbol name="arrow.right" size={20} color="#FFF" />
        </Pressable>

        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ThemedText style={{ fontWeight: "600" }}>Back to Home</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Icon Styles
  iconWrapper: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Typography
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },

  // Ticket Card
  ticketCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  ticketSection: {
    padding: 24,
    alignItems: "center",
  },
  ticketDividerContainer: {
    height: 20,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dashedLine: {
    width: "84%",
    height: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 1,
    opacity: 0.5,
  },
  ticketNotch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    top: 0,
  },

  // Ticket Content
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  amount: {
    fontSize: 32,
    fontWeight: "800",
  },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Info Pill
  infoPill: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    gap: 8,
  },
  infoPillText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 30,
    gap: 12,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
