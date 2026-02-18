import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useMemo } from "react";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { useSendPackage } from "@/context/SendPackageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatCurrency } from "@/services/sendPackage.api";

export function QuoteBottomSheet() {
  const router = useRouter();
  const { quote, loadingQuote, pickup, dropoff, refreshQuote } =
    useSendPackage();

  const surface = useThemeColor({}, "surfaceBackground");
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");

  // Check if coordinates are present to enable "Fetch Quote"
  const canFetchQuote = Boolean(
    pickup?.address?.coords && dropoff?.address?.coords,
  );

  // Check if we already have a valid quote to proceed to payment
  const hasQuote = Boolean(quote && !loadingQuote);

  const pricing = useMemo(() => {
    if (!quote) return null;
    return typeof quote.price === "number" ? quote.price : null;
  }, [quote]);

  const handlePress = async () => {
    if (hasQuote) {
      // Logic for Request Delivery
      router.push("/(delivery)/payment");
    } else if (canFetchQuote) {
      // Logic for Fetch Quote
      await refreshQuote();
    }
  };

  // Determine button text and state
  const getButtonLabel = () => {
    if (loadingQuote) return "Preparing quote…";
    if (hasQuote && pricing)
      return `Request delivery – ${formatCurrency(pricing)}`;
    if (hasQuote) return "Request delivery";
    return "Get Delivery Quote";
  };

  const isButtonDisabled = loadingQuote || (!hasQuote && !canFetchQuote);

  return (
    <View style={[styles.container, { backgroundColor: surface }]}>
      <View style={styles.summary}>
        {loadingQuote ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={primary} />
            <ThemedText style={styles.loadingText}>
              Calculating fare…
            </ThemedText>
          </View>
        ) : !hasQuote && canFetchQuote ? (
          <ThemedText
            style={[styles.loadingText, { color: muted, marginBottom: 8 }]}
          >
            Ready to calculate your fare
          </ThemedText>
        ) : null}
      </View>

      {/* ---------- Primary CTA ---------- */}
      <Pressable
        disabled={isButtonDisabled}
        onPress={handlePress}
        style={[
          styles.primaryButton,
          {
            backgroundColor: isButtonDisabled ? "#CBD5E1" : primary,
            opacity: isButtonDisabled ? 0.8 : 1,
          },
        ]}
      >
        <ThemedText style={styles.primaryButtonText}>
          {getButtonLabel()}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summary: {
    alignItems: "center",
    minHeight: 24,
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontWeight: "600",
    fontSize: 14,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
