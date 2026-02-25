import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import {
  getLinkedAccounts,
  linkGoogleAccount,
  unlinkGoogleAccount,
  isAppleAvailable,
  linkAppleAccount,
  unlinkAppleAccount,
  LinkedAccountsStatus,
} from "@/services/account-linking.service";

export default function LinkedAccountsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textPrimary = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");
  const accentRed = useThemeColor({}, "statusError");
  const accentGreen = useThemeColor({}, "statusSuccess");

  const [status, setStatus] = useState<LinkedAccountsStatus | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"google" | "apple" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [linked, appleOk] = await Promise.all([
        getLinkedAccounts(),
        isAppleAvailable(),
      ]);
      setStatus(linked);
      setAppleAvailable(appleOk);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Google ──────────────────────────────────────────────────────────────────
  const handleGoogleAction = async () => {
    if (!status) return;
    setActionLoading("google");
    try {
      if (status.google) {
        await unlinkGoogleAccount();
        setStatus((prev) => (prev ? { ...prev, google: false } : prev));
      } else {
        await linkGoogleAccount();
        setStatus((prev) => (prev ? { ...prev, google: true } : prev));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Apple ───────────────────────────────────────────────────────────────────
  const handleAppleAction = async () => {
    if (!status || !appleAvailable) return;
    setActionLoading("apple");
    try {
      if (status.apple) {
        await unlinkAppleAccount();
        setStatus((prev) => (prev ? { ...prev, apple: false } : prev));
      } else {
        await linkAppleAccount();
        setStatus((prev) => (prev ? { ...prev, apple: true } : prev));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={primary} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Linked Accounts
        </ThemedText>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <ThemedText style={{ color: accentRed, marginBottom: 12 }}>
            {error}
          </ThemedText>
          <Pressable
            onPress={refresh}
            style={[styles.retryBtn, { borderColor: primary }]}
          >
            <ThemedText style={{ color: primary }}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            Link your social accounts for faster sign-in.
          </ThemedText>

          {/* Google */}
          <View
            style={[
              styles.card,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <View style={styles.row}>
              <View style={styles.providerInfo}>
                {/* Google "G" icon placeholder */}
                <View
                  style={[styles.iconBadge, { backgroundColor: "#EA4335" }]}
                >
                  <ThemedText style={styles.iconText}>G</ThemedText>
                </View>
                <View>
                  <ThemedText
                    style={[styles.providerName, { color: textPrimary }]}
                  >
                    Google
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.providerStatus,
                      { color: status?.google ? accentGreen : muted },
                    ]}
                  >
                    {status?.google ? "Linked" : "Not linked"}
                  </ThemedText>
                </View>
              </View>

              <Pressable
                onPress={handleGoogleAction}
                disabled={actionLoading === "google"}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: status?.google ? "transparent" : primary,
                    borderColor: status?.google ? accentRed : primary,
                    borderWidth: status?.google ? 1 : 0,
                  },
                ]}
              >
                {actionLoading === "google" ? (
                  <ActivityIndicator
                    size="small"
                    color={status?.google ? accentRed : "#fff"}
                  />
                ) : (
                  <ThemedText
                    style={[
                      styles.actionBtnText,
                      { color: status?.google ? accentRed : "#fff" },
                    ]}
                  >
                    {status?.google ? "Unlink" : "Link"}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>

          {/* Apple — iOS only */}
          {appleAvailable && (
            <View
              style={[
                styles.card,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <View style={styles.row}>
                <View style={styles.providerInfo}>
                  <View style={[styles.iconBadge, { backgroundColor: "#000" }]}>
                    <ThemedText style={styles.iconText}></ThemedText>
                  </View>
                  <View>
                    <ThemedText
                      style={[styles.providerName, { color: textPrimary }]}
                    >
                      Apple
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.providerStatus,
                        { color: status?.apple ? accentGreen : muted },
                      ]}
                    >
                      {status?.apple ? "Linked" : "Not linked"}
                    </ThemedText>
                  </View>
                </View>

                <Pressable
                  onPress={handleAppleAction}
                  disabled={actionLoading === "apple"}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: status?.apple ? "transparent" : primary,
                      borderColor: status?.apple ? accentRed : primary,
                      borderWidth: status?.apple ? 1 : 0,
                    },
                  ]}
                >
                  {actionLoading === "apple" ? (
                    <ActivityIndicator
                      size="small"
                      color={status?.apple ? accentRed : "#fff"}
                    />
                  ) : (
                    <ThemedText
                      style={[
                        styles.actionBtnText,
                        { color: status?.apple ? accentRed : "#fff" },
                      ]}
                    >
                      {status?.apple ? "Unlink" : "Link"}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* Safety note */}
          <ThemedText style={[styles.note, { color: muted }]}>
            You can only unlink a provider if you have another sign-in method
            (email/password or another linked provider) configured.
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  providerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});
