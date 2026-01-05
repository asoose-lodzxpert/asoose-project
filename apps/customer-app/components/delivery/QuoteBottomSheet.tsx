import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { useSendPackage } from "@/context/SendPackageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { calculatePrice, formatCurrency } from "@/services/sendPackage.api";

export function QuoteBottomSheet() {
  const router = useRouter();
  const { quote, loadingQuote, returnData } = useSendPackage();

  const surface = useThemeColor({}, "surfaceBackground");
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const [showDetails, setShowDetails] = useState(false);

  const isReady = Boolean(quote && !loadingQuote);

  const pricing = useMemo(() => {
    if (!quote) return null;

    const data = returnData();
    return calculatePrice(
      quote.distanceKm,
      data.packageSize ?? "small",
      data.packageOptions?.weightKg ?? 0,
      data.packageOptions
    );
  }, [quote, returnData]);

  return (
    <View style={[styles.container, { backgroundColor: surface }]}>
      {/* ---------- Tap Hint (Top, Centered) ---------- */}
      {isReady && (
        <Pressable
          onPress={() => setShowDetails((v) => !v)}
          style={styles.tapHint}
        >
          <ThemedText style={{ color: muted }}>
            Tap to {showDetails ? "hide" : "view"} full breakdown
          </ThemedText>
        </Pressable>
      )}

      <View style={styles.summary}>
        {loadingQuote && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={primary} />
            <ThemedText style={styles.loadingText}>
              Preparing your delivery quote…
            </ThemedText>
          </View>
        )}
      </View>

      {/* ---------- Primary CTA ---------- */}
      <Pressable
        disabled={!isReady}
        onPress={() => router.push("/(delivery)/payment")}
        style={[
          styles.primaryButton,
          { backgroundColor: isReady ? primary : "#CBD5E1" },
        ]}
      >
        <ThemedText style={styles.primaryButtonText}>
          {loadingQuote
            ? "Preparing quote…"
            : pricing
              ? `Request delivery – ${formatCurrency(pricing.price)}`
              : "Request delivery"}
        </ThemedText>
      </Pressable>

      {/* ---------- Breakdown ---------- */}
      {showDetails && pricing && quote && (
        <>
          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.details}>
            <Detail label="Distance" value={`${quote.distanceKm} km`} />
            <Detail label="ETA" value={`${quote.etaMinutes} mins`} />

            {pricing.fragileSurcharge > 0 && (
              <Detail
                label="Fragile handling"
                value={formatCurrency(pricing.fragileSurcharge)}
              />
            )}

            {pricing.liquidSurcharge > 0 && (
              <Detail
                label="Contains liquid"
                value={formatCurrency(pricing.liquidSurcharge)}
              />
            )}

            {pricing.perishableSurcharge > 0 && (
              <Detail
                label="Perishable"
                value={formatCurrency(pricing.perishableSurcharge)}
              />
            )}

            {pricing.insuranceFee > 0 && (
              <Detail
                label="Declared value (insurance)"
                value={formatCurrency(pricing.insuranceFee)}
              />
            )}

            <Detail
              label="Total"
              value={formatCurrency(pricing.price)}
              highlight
            />
          </View>
        </>
      )}
    </View>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");

  return (
    <View style={styles.detailRow}>
      <ThemedText style={{ color: muted }}>{label}</ThemedText>
      <ThemedText
        style={highlight ? { color: primary, fontWeight: "700" } : undefined}
      >
        {value}
      </ThemedText>
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
    // paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
  },

  tapHint: {
    alignItems: "center",
    marginBottom: 8,
  },

  summary: {
    alignItems: "center",
    // marginBottom: 16,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
    fontWeight: "600",
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

  divider: {
    height: 1,
    marginVertical: 12,
  },

  details: {
    gap: 10,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
