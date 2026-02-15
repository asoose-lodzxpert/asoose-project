import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { get, request } from "@/lib/authFetch";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import Toast from "react-native-toast-message";

type SavedCard = {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault?: boolean;
};

type WalletBalance = {
  balance: number;
  currency: string;
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");
  const card = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const accentGreen = useThemeColor({}, "statusSuccess");
  const accentRed = useThemeColor({}, "statusError");
  const showConfirm = useConfirm();

  const [cards, setCards] = useState<SavedCard[]>([]);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPaymentMethods = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      // Note: Backend endpoints for user wallet/cards may not exist yet
      // Using fallback empty data until backend implements these endpoints
      try {
        const cardsData = await get("users/payment/cards");
        setCards(Array.isArray(cardsData) ? cardsData : []);
      } catch (err) {
        // Cards endpoint may not exist, default to empty
        setCards([]);
      }

      try {
        const walletData = await get("users/wallet");
        setWallet(walletData);
      } catch (err) {
        // Wallet endpoint may not exist, default to null
        setWallet(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load payment methods";
      setError(message);
      setCards([]);
      setWallet(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPaymentMethods(true);
    setRefreshing(false);
  }, [loadPaymentMethods]);

  const handleDeleteCard = async (cardId: string) => {
    const ok = await showConfirm({
      title: "Remove Card",
      message: "Are you sure you want to remove this payment card?",
      icon: "alert-circle",
      variant: "danger",
      confirmLabel: "Remove",
    });

    if (!ok) return;

    try {
      // Note: Backend endpoint may not exist yet
      try {
        await request(`users/payment/cards/${cardId}`, { method: "DELETE" });
      } catch (err) {
        // If endpoint doesn't exist, just show message
        throw new Error("Card management not yet available on backend");
      }
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err) {
      Toast.show({
        text1: err instanceof Error ? err.message : "Failed to remove card",
        type: "error",
      });
    }
  };

  const formatCardBrand = (brand: string) => {
    const brands: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
    };
    return brands[brand.toLowerCase()] || brand;
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={primary} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Payment Methods
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primary}
            colors={[primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.scrollContent}>
            <View
              style={[
                styles.section,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <Skeleton width="40%" height={18} style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={80} borderRadius={12} />
            </View>
            <View
              style={[
                styles.section,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <Skeleton width="40%" height={18} style={{ marginBottom: 16 }} />
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <Skeleton width="100%" height={60} borderRadius={8} />
                </View>
              ))}
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <IconSymbol
              name="exclamationmark.triangle"
              size={48}
              color={accentRed}
            />
            <ThemedText style={[styles.errorText, { color: accentRed }]}>
              {error}
            </ThemedText>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: primary }]}
              onPress={() => loadPaymentMethods()}
            >
              <ThemedText style={styles.retryText}>Try Again</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Wallet Section */}
            {wallet && (
              <View
                style={[
                  styles.section,
                  { backgroundColor: card, borderColor: border },
                ]}
              >
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Wallet
                </ThemedText>
                <View style={styles.walletCard}>
                  <View style={styles.walletInfo}>
                    <IconSymbol name="wallet" size={24} color={accentGreen} />
                    <View style={styles.walletDetails}>
                      <ThemedText
                        type="caption"
                        style={{ color: textSecondary }}
                      >
                        Available Balance
                      </ThemedText>
                      <ThemedText type="subtitle" style={styles.walletAmount}>
                        {wallet.currency} {wallet.balance.toLocaleString()}
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.topUpBtn, { backgroundColor: primary }]}
                    onPress={() => {
                      Toast.show({
                        text1: "Top up feature coming soon!",
                        type: "info",
                      });
                    }}
                  >
                    <ThemedText style={styles.topUpText}>Top Up</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Saved Cards Section */}
            <View
              style={[
                styles.section,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Saved Cards
              </ThemedText>

              {cards.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconSymbol
                    name="creditcard"
                    size={48}
                    color={textSecondary}
                  />
                  <ThemedText
                    type="caption"
                    style={[styles.emptyText, { color: textSecondary }]}
                  >
                    No saved cards yet
                  </ThemedText>
                </View>
              ) : (
                cards.map((cardItem, index) => (
                  <View
                    key={cardItem.id}
                    style={[
                      styles.cardItem,
                      index < cards.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: border,
                      },
                    ]}
                  >
                    <View style={styles.cardInfo}>
                      <IconSymbol name="creditcard" size={24} color={primary} />
                      <View style={styles.cardDetails}>
                        <ThemedText style={styles.cardBrand}>
                          {formatCardBrand(cardItem.brand)} ••••{" "}
                          {cardItem.last4}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          style={{ color: textSecondary }}
                        >
                          Expires {cardItem.expiryMonth}/{cardItem.expiryYear}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      {cardItem.isDefault && (
                        <View
                          style={[
                            styles.defaultBadge,
                            { backgroundColor: accentGreen + "22" },
                          ]}
                        >
                          <ThemedText
                            type="caption"
                            style={[styles.defaultText, { color: accentGreen }]}
                          >
                            Default
                          </ThemedText>
                        </View>
                      )}
                      <Pressable
                        onPress={() => handleDeleteCard(cardItem.id)}
                        style={styles.deleteBtn}
                      >
                        <IconSymbol name="trash" size={18} color={accentRed} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              <Pressable
                style={[styles.addCardBtn, { borderColor: border }]}
                onPress={() => {
                  Toast.show({
                    text1: "Add card feature coming soon!",
                    type: "info",
                  });
                }}
              >
                <IconSymbol name="plus" size={18} color={primary} />
                <ThemedText style={[styles.addCardText, { color: primary }]}>
                  Add New Card
                </ThemedText>
              </Pressable>
            </View>

            {/* Payment Options Section */}
            <View
              style={[
                styles.section,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Other Payment Options
              </ThemedText>

              <View style={styles.optionItem}>
                <View style={styles.optionInfo}>
                  <IconSymbol name="banknote" size={24} color={primary} />
                  <View style={styles.optionDetails}>
                    <ThemedText style={styles.optionLabel}>Cash</ThemedText>
                    <ThemedText type="caption" style={{ color: textSecondary }}>
                      Pay with cash on delivery/arrival
                    </ThemedText>
                  </View>
                </View>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={24}
                  color={accentGreen}
                />
              </View>

              <View
                style={[
                  styles.optionItem,
                  { borderTopWidth: 1, borderTopColor: border },
                ]}
              >
                <View style={styles.optionInfo}>
                  <IconSymbol name="creditcard" size={24} color={primary} />
                  <View style={styles.optionDetails}>
                    <ThemedText style={styles.optionLabel}>Paystack</ThemedText>
                    <ThemedText type="caption" style={{ color: textSecondary }}>
                      Secure card payment gateway
                    </ThemedText>
                  </View>
                </View>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={24}
                  color={accentGreen}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  scrollContent: { paddingBottom: 32 },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
  },

  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 15,
  },
  retryBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },

  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },

  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  walletDetails: {
    marginLeft: 12,
  },
  walletAmount: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  topUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  topUpText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardDetails: {
    marginLeft: 12,
    flex: 1,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 8,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
  },

  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 12,
  },
  addCardText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "600",
  },

  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  optionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});
