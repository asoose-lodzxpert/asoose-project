import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Modal,
  FlatList,
  ActivityIndicator,
  Clipboard,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type SavedCard = {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: string;
  expiryYear: string;
  bank?: string;
  cardType?: string;
  isDefault: boolean;
};

type WalletInfo = {
  balance: number;
  currency: string;
  balanceHidden: boolean;
  hasWallet: boolean;
  accountNumber: string | null;
  bankName: string | null;
};

type TxRecord = {
  id: string;
  amount: number;
  type: string;
  status: string;
  reference: string;
  date: string;
};

type TxMeta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const brandLabel = (b: string) => {
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    verve: "Verve",
  };
  return map[b?.toLowerCase()] ?? b ?? "Card";
};

const brandColor = (b: string, fallback: string) => {
  if (b?.toLowerCase() === "visa") return "#1A1F71";
  if (b?.toLowerCase() === "mastercard") return "#EB001B";
  if (b?.toLowerCase() === "verve") return "#00A550";
  return fallback;
};

const txStatusColors = (
  s: string,
  success: string,
  error: string,
  warning: string,
) => {
  const up = s?.toUpperCase();
  if (["PAID", "COMPLETED", "SUCCESS"].includes(up))
    return { bg: success + "22", text: success };
  if (["FAILED", "REVERSED"].includes(up))
    return { bg: error + "22", text: error };
  return { bg: warning + "22", text: warning };
};

const isCredit = (type: string) =>
  type === "Wallet Top-up" || type?.toLowerCase().includes("topup");

// ── Transaction History Modal ─────────────────────────────────────────────────

function TxHistoryModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const bg = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");
  const error = useThemeColor({}, "statusError");
  const warning = useThemeColor({}, "statusPending");

  const [rows, setRows] = useState<TxRecord[]>([]);
  const [meta, setMeta] = useState<TxMeta>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(async (page: number, replace = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (page === 1) setInitialLoading(true);
    else setPaging(true);
    try {
      const res = (await get(`users/wallet/history?page=${page}&limit=10`)) as {
        data: TxRecord[];
        meta: TxMeta;
      };
      setRows((prev) => (replace ? res.data : [...prev, ...res.data]));
      setMeta(res.meta);
      pageRef.current = page;
    } catch {
      Toast.show({
        text1: "Failed to load history",
        type: "error",
        position: "top",
        topOffset: 40,
      });
    } finally {
      setInitialLoading(false);
      setPaging(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setRows([]);
      pageRef.current = 1;
      fetchPage(1, true);
    }
  }, [visible, fetchPage]);

  const loadMore = () => {
    if (!loadingRef.current && pageRef.current < meta.pages) {
      fetchPage(pageRef.current + 1);
    }
  };

  const renderItem = ({ item }: { item: TxRecord }) => {
    const credit = isCredit(item.type);
    const sc = txStatusColors(item.status, success, error, warning);
    return (
      <View style={[styles.txRow, { borderBottomColor: border }]}>
        <View
          style={[
            styles.txIcon,
            { backgroundColor: (credit ? success : primary) + "18" },
          ]}
        >
          <IconSymbol
            name={credit ? "arrow.down.left" : "arrow.up.right"}
            size={16}
            color={credit ? success : primary}
          />
        </View>
        <View style={styles.txInfo}>
          <ThemedText style={styles.txType}>{item.type}</ThemedText>
          <ThemedText style={[styles.txDate, { color: textSecondary }]}>
            {new Date(item.date).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </ThemedText>
        </View>
        <View style={styles.txRight}>
          <ThemedText
            style={[styles.txAmount, { color: credit ? success : textPrimary }]}
          >
            {credit ? "+" : "\u2212"}₦
            {Number(item.amount).toLocaleString("en-NG")}
          </ThemedText>
          <View style={[styles.txBadge, { backgroundColor: sc.bg }]}>
            <ThemedText style={[styles.txBadgeText, { color: sc.text }]}>
              {item.status}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.modalContainer, { backgroundColor: bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: border }]}>
          <ThemedText style={styles.modalTitle}>Transaction History</ThemedText>
          <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}>
            <IconSymbol name="xmark" size={20} color={textPrimary} />
          </Pressable>
        </View>

        {initialLoading ? (
          <View style={styles.txLoadingWrap}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.txSkeletonRow}>
                <Skeleton width={36} height={36} borderRadius={18} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Skeleton
                    width="55%"
                    height={13}
                    style={{ marginBottom: 6 }}
                  />
                  <Skeleton width="35%" height={11} />
                </View>
                <Skeleton width="22%" height={13} />
              </View>
            ))}
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.txEmpty}>
            <IconSymbol name="clock" size={48} color={textSecondary} />
            <ThemedText style={[styles.txEmptyText, { color: textSecondary }]}>
              No transactions yet
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={
              <ThemedText
                style={[styles.txTotalLabel, { color: textSecondary }]}
              >
                {meta.total} transaction{meta.total !== 1 ? "s" : ""}
              </ThemedText>
            }
            ListFooterComponent={
              paging ? (
                <View style={styles.txFooter}>
                  <ActivityIndicator size="small" color={primary} />
                </View>
              ) : null
            }
          />
        )}
      </ThemedView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");
  const card = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");
  const error = useThemeColor({}, "statusError");
  const showConfirm = useConfirm();

  const [cards, setCards] = useState<SavedCard[]>([]);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [walletRes, cardsRes] = await Promise.allSettled([
        get("users/wallet"),
        get("users/payment/cards"),
      ]);
      if (walletRes.status === "fulfilled")
        setWallet(walletRes.value as WalletInfo);
      if (cardsRes.status === "fulfilled")
        setCards(
          Array.isArray(cardsRes.value) ? (cardsRes.value as SavedCard[]) : [],
        );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleProvision = async () => {
    setProvisioning(true);
    try {
      const res = (await request("users/wallet/provision", {
        method: "POST",
      })) as any;
      setWallet((prev) => ({
        balance: prev?.balance ?? 0,
        currency: prev?.currency ?? "NGN",
        balanceHidden: prev?.balanceHidden ?? false,
        hasWallet: true,
        accountNumber: res.accountNumber ?? null,
        bankName: res.bankName ?? null,
      }));
      Toast.show({
        text1: "Wallet created!",
        type: "success",
        position: "top",
        topOffset: 40,
      });
    } catch (e: any) {
      Toast.show({
        text1: e?.message ?? "Failed to create wallet",
        type: "error",
        position: "top",
        topOffset: 40,
      });
    } finally {
      setProvisioning(false);
    }
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    setCopied(true);
    Toast.show({
      text1: "Copied!",
      type: "success",
      position: "top",
      topOffset: 40,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetDefault = async (cardId: string) => {
    try {
      await request(`users/payment/cards/${cardId}/default`, {
        method: "PATCH",
      });
      setCards((prev) =>
        prev.map((c) => ({ ...c, isDefault: c.id === cardId })),
      );
      Toast.show({
        text1: "Default card updated",
        type: "success",
        position: "top",
        topOffset: 40,
      });
    } catch {
      Toast.show({
        text1: "Failed to update default card",
        type: "error",
        position: "top",
        topOffset: 40,
      });
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const ok = await showConfirm({
      title: "Remove Card",
      message: "Remove this saved card?",
      icon: "alert-circle",
      variant: "danger",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await request(`users/payment/cards/${cardId}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      Toast.show({
        text1: "Card removed",
        type: "success",
        position: "top",
        topOffset: 40,
      });
    } catch {
      Toast.show({
        text1: "Failed to remove card",
        type: "error",
        position: "top",
        topOffset: 40,
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Far-left: transaction history */}
        <Pressable
          onPress={() => setHistoryVisible(true)}
          style={styles.historyBtn}
          hitSlop={10}
        >
          <IconSymbol name="clock.arrow.circlepath" size={22} color={primary} />
        </Pressable>

        <ThemedText style={styles.headerTitle}>Payment Methods</ThemedText>

        {/* Far-right: close */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.closeBtn}
        >
          <IconSymbol name="xmark" size={20} color={textPrimary} />
        </Pressable>
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
        {loading ? (
          <>
            <View
              style={[
                styles.section,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <Skeleton width="40%" height={16} style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={90} borderRadius={12} />
            </View>
            <View
              style={[
                styles.section,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <Skeleton width="35%" height={16} style={{ marginBottom: 16 }} />
              {[0, 1].map((i) => (
                <Skeleton
                  key={i}
                  width="100%"
                  height={58}
                  borderRadius={8}
                  style={{ marginBottom: 10 }}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            {/* ── Wallet ─────────────────────────────────────────────── */}
            <View
              style={[
                styles.section,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <ThemedText style={styles.sectionTitle}>Wallet</ThemedText>

              {/* Balance */}
              <View style={styles.walletBalanceRow}>
                <View
                  style={[
                    styles.walletIconWrap,
                    { backgroundColor: primary + "18" },
                  ]}
                >
                  <IconSymbol name="wallet.pass" size={22} color={primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText
                    style={[styles.walletLabel, { color: textSecondary }]}
                  >
                    Available Balance
                  </ThemedText>
                  <ThemedText style={styles.walletAmount}>
                    ₦
                    {Number(wallet?.balance ?? 0).toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}
                  </ThemedText>
                </View>
              </View>

              {/* DVA top-up info or provision CTA */}
              {wallet?.hasWallet && wallet.accountNumber ? (
                <View
                  style={[
                    styles.dvaCard,
                    {
                      backgroundColor: primary + "0D",
                      borderColor: primary + "30",
                    },
                  ]}
                >
                  <ThemedText style={[styles.dvaTitle, { color: primary }]}>
                    Fund via bank transfer
                  </ThemedText>
                  <View style={styles.dvaRow}>
                    <ThemedText
                      style={[styles.dvaLabel, { color: textSecondary }]}
                    >
                      Bank
                    </ThemedText>
                    <ThemedText style={styles.dvaValue}>
                      {wallet.bankName}
                    </ThemedText>
                  </View>
                  <View style={[styles.dvaRow, { marginTop: 6 }]}>
                    <ThemedText
                      style={[styles.dvaLabel, { color: textSecondary }]}
                    >
                      Account No.
                    </ThemedText>
                    <View style={styles.dvaAccRow}>
                      <ThemedText
                        style={[styles.dvaAccNum, { color: primary }]}
                      >
                        {wallet.accountNumber}
                      </ThemedText>
                      <Pressable
                        onPress={() => handleCopy(wallet.accountNumber!)}
                        hitSlop={8}
                      >
                        <IconSymbol
                          name={copied ? "checkmark" : "doc.on.doc"}
                          size={16}
                          color={copied ? success : primary}
                        />
                      </Pressable>
                    </View>
                  </View>
                  <ThemedText
                    style={[styles.dvaNota, { color: textSecondary }]}
                  >
                    Transfers reflect instantly · NGN only
                  </ThemedText>
                </View>
              ) : (
                <Pressable
                  onPress={handleProvision}
                  disabled={provisioning}
                  style={[
                    styles.provisionBtn,
                    {
                      backgroundColor: primary,
                      opacity: provisioning ? 0.7 : 1,
                    },
                  ]}
                >
                  {provisioning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <IconSymbol name="plus" size={16} color="#fff" />
                  )}
                  <ThemedText style={styles.provisionText}>
                    {provisioning ? "Creating wallet…" : "Create Wallet"}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {/* ── Saved Cards ────────────────────────────────────────── */}
            <View
              style={[
                styles.section,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <ThemedText style={styles.sectionTitle}>Saved Cards</ThemedText>

              {cards.length === 0 ? (
                <View style={styles.emptyCards}>
                  <IconSymbol
                    name="creditcard"
                    size={40}
                    color={textSecondary}
                  />
                  <ThemedText
                    style={[styles.emptyText, { color: textSecondary }]}
                  >
                    Cards are saved automatically after your first successful
                    payment
                  </ThemedText>
                </View>
              ) : (
                cards.map((c, idx) => (
                  <View
                    key={c.id}
                    style={[
                      styles.cardRow,
                      idx > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: border,
                      },
                    ]}
                  >
                    {/* Brand badge */}
                    <View
                      style={[
                        styles.brandBadge,
                        {
                          backgroundColor: brandColor(c.brand, primary) + "18",
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.brandText,
                          { color: brandColor(c.brand, primary) },
                        ]}
                      >
                        {brandLabel(c.brand)}
                      </ThemedText>
                    </View>

                    <View style={styles.cardInfo}>
                      <ThemedText style={styles.cardNumber}>
                        •••• {c.last4}
                      </ThemedText>
                      <ThemedText
                        style={[styles.cardExpiry, { color: textSecondary }]}
                      >
                        {c.bank ? `${c.bank} · ` : ""}Exp {c.expiryMonth}/
                        {c.expiryYear}
                      </ThemedText>
                    </View>

                    <View style={styles.cardActions}>
                      {c.isDefault ? (
                        <View
                          style={[
                            styles.defaultBadge,
                            { backgroundColor: success + "22" },
                          ]}
                        >
                          <ThemedText
                            style={[styles.defaultText, { color: success }]}
                          >
                            Default
                          </ThemedText>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleSetDefault(c.id)}
                          style={[
                            styles.setDefaultBtn,
                            { borderColor: border },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.setDefaultText,
                              { color: textSecondary },
                            ]}
                          >
                            Set default
                          </ThemedText>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => handleDeleteCard(c.id)}
                        hitSlop={8}
                      >
                        <IconSymbol name="trash" size={16} color={error} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              <View
                style={[styles.cardNote, { backgroundColor: border + "50" }]}
              >
                <IconSymbol name="lock.fill" size={13} color={textSecondary} />
                <ThemedText
                  style={[styles.cardNoteText, { color: textSecondary }]}
                >
                  Cards are tokenized by Paystack. Your full card number is
                  never stored.
                </ThemedText>
              </View>
            </View>

            {/* ── Accepted Payment Methods ───────────────────────────── */}
            <View
              style={[
                styles.section,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <ThemedText style={styles.sectionTitle}>
                Accepted Payment Methods
              </ThemedText>

              {[
                {
                  icon: "banknote",
                  label: "Cash",
                  sub: "Pay with cash on delivery or arrival",
                },
                {
                  icon: "creditcard",
                  label: "Card via Paystack",
                  sub: "Visa, Mastercard, Verve — securely tokenized",
                },
                {
                  icon: "wallet.pass",
                  label: "Asoose Wallet",
                  sub: "Fund your wallet via bank transfer",
                },
              ].map((opt, i) => (
                <View
                  key={opt.label}
                  style={[
                    styles.optRow,
                    i > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optIconWrap,
                      { backgroundColor: primary + "18" },
                    ]}
                  >
                    <IconSymbol
                      name={opt.icon as any}
                      size={18}
                      color={primary}
                    />
                  </View>
                  <View style={styles.optInfo}>
                    <ThemedText style={styles.optLabel}>{opt.label}</ThemedText>
                    <ThemedText
                      style={[styles.optSub, { color: textSecondary }]}
                    >
                      {opt.sub}
                    </ThemedText>
                  </View>
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={20}
                    color={success}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <TxHistoryModal
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      />
    </ThemedView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  historyBtn: { padding: 4, marginRight: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  closeBtn: { padding: 4 },

  scrollContent: { paddingBottom: 40 },

  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 14 },

  // Wallet
  walletBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  walletIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  walletLabel: { fontSize: 12, marginBottom: 2 },
  walletAmount: { fontSize: 24, fontWeight: "800" },

  dvaCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  dvaTitle: { fontSize: 12, fontWeight: "700", marginBottom: 8 },
  dvaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dvaLabel: { fontSize: 13 },
  dvaValue: { fontSize: 13, fontWeight: "600" },
  dvaAccRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dvaAccNum: { fontSize: 20, fontWeight: "800", letterSpacing: 2 },
  dvaNota: { fontSize: 11, marginTop: 8 },

  provisionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  provisionText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Cards
  emptyCards: { alignItems: "center", paddingVertical: 28, gap: 10 },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 240,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 10,
  },
  brandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 60,
    alignItems: "center",
  },
  brandText: { fontSize: 11, fontWeight: "700" },
  cardInfo: { flex: 1 },
  cardNumber: { fontSize: 15, fontWeight: "700" },
  cardExpiry: { fontSize: 12, marginTop: 1 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  defaultText: { fontSize: 11, fontWeight: "700" },
  setDefaultBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  setDefaultText: { fontSize: 11 },

  cardNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  cardNoteText: { flex: 1, fontSize: 12, lineHeight: 16 },

  // Accepted methods
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  optIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  optInfo: { flex: 1 },
  optLabel: { fontSize: 14, fontWeight: "600" },
  optSub: { fontSize: 12, marginTop: 1 },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalClose: { padding: 4 },

  txLoadingWrap: { padding: 20, gap: 16 },
  txSkeletonRow: { flexDirection: "row", alignItems: "center" },

  txEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  txEmptyText: { fontSize: 15 },

  txTotalLabel: { fontSize: 12, margin: 16, marginBottom: 4 },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1 },
  txType: { fontSize: 14, fontWeight: "600" },
  txDate: { fontSize: 12, marginTop: 2 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  txBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  txBadgeText: { fontSize: 10, fontWeight: "700" },
  txFooter: { paddingVertical: 20, alignItems: "center" },
});
