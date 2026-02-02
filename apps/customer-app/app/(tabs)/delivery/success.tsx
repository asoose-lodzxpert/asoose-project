import { View, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatCurrency } from "@/services/sendPackage.api";
import { useSendPackage } from "@/context/SendPackageContext";
import { useEffect } from "react";

export default function DeliverySuccessScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { resetDelivery } = useSendPackage();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const success = useThemeColor({}, "statusSuccess");
  const muted = useThemeColor({}, "textMuted");
  const surfaceCard = useThemeColor({}, "surfaceCard");

  const price = Number(params.price) || 0;
  const distanceKm = Number(params.distanceKm) || 0;
  const etaMinutes = Number(params.etaMinutes) || 0;
  const method = params.method || "transfer";
  const deliveryId = params.deliveryId || "";

  function handleDone() {
    // Reset the delivery form
    resetDelivery();
    // Navigate back to delivery tab
    router.replace("/(tabs)/delivery");
  }

  function handleTrackDelivery() {
    // Navigate to delivery tracking screen
    router.push(`/deliveries/${deliveryId}`);
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: success + "20", borderColor: success },
          ]}
        >
          <IconSymbol name="checkmark.circle.fill" size={64} color={success} />
        </View>

        {/* Success Message */}
        <ThemedText type="title" style={styles.title}>
          Delivery Confirmed!
        </ThemedText>
        <ThemedText type="default" style={[styles.subtitle, { color: muted }]}>
          Your delivery request has been received and payment confirmed.
        </ThemedText>

        {/* Delivery Details Card */}
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: surfaceCard, borderColor: border },
          ]}
        >
          <View style={styles.detailRow}>
            <ThemedText type="caption" style={{ color: muted }}>
              Delivery ID
            </ThemedText>
            <ThemedText type="defaultSemiBold">{deliveryId}</ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <ThemedText type="caption" style={{ color: muted }}>
              Amount Paid
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              {formatCurrency(price)}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText type="caption" style={{ color: muted }}>
              Payment Method
            </ThemedText>
            <ThemedText type="default" style={{ textTransform: "capitalize" }}>
              {method === "transfer" ? "Bank Transfer" : method}
            </ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <ThemedText type="caption" style={{ color: muted }}>
              Distance
            </ThemedText>
            <ThemedText type="default">{distanceKm} km</ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText type="caption" style={{ color: muted }}>
              Estimated Time
            </ThemedText>
            <ThemedText type="default">{etaMinutes} min</ThemedText>
          </View>
        </View>

        {/* Info Message */}
        <View style={[styles.infoCard, { backgroundColor: primary + "10" }]}>
          <IconSymbol name="info.circle" size={20} color={primary} />
          <ThemedText
            type="caption"
            style={[styles.infoText, { color: primary }]}
          >
            We're now finding the best driver for your delivery. You'll be
            notified once a driver accepts.
          </ThemedText>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleTrackDelivery}
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: primary },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: "#FFF" }}>
              Track Delivery
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleDone}
            style={[
              styles.button,
              styles.secondaryButton,
              { borderColor: border },
            ]}
          >
            <ThemedText type="defaultSemiBold">Back to Home</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  detailsCard: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  infoCard: {
    width: "100%",
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    gap: 12,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  button: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    // backgroundColor set inline
  },
  secondaryButton: {
    borderWidth: 1,
  },
});
