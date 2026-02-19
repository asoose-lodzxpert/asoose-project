import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Dispute, getMyDisputes } from "@/services/dispute.service";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#F59E0B",
  IN_REVIEW: "#3B82F6",
  RESOLVED: "#10B981",
  REJECTED: "#EF4444",
  CLOSED: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

function DisputeCard({
  dispute,
  onPress,
}: {
  dispute: Dispute;
  onPress: () => void;
}) {
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const muted = useThemeColor({}, "textMuted");

  const statusColor = STATUS_COLORS[dispute.status] ?? "#6B7280";
  const createdAt = new Date(dispute.createdAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: card, borderColor: border }]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardMeta}>
          <ThemedText style={styles.cardCategory}>
            {dispute.category ?? "Dispute"}
          </ThemedText>
          <ThemedText style={[styles.cardDate, { color: muted }]}>
            {createdAt}
          </ThemedText>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}
        >
          <ThemedText style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[dispute.status] ?? dispute.status}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.reason} numberOfLines={1}>
        {dispute.reason}
      </ThemedText>
      <ThemedText
        style={[styles.description, { color: textSecondary }]}
        numberOfLines={2}
      >
        {dispute.description}
      </ThemedText>

      {dispute.relatedAmount && Number(dispute.relatedAmount) > 0 && (
        <ThemedText style={[styles.amount, { color: muted }]}>
          Related amount: ₦{Number(dispute.relatedAmount).toLocaleString()}
        </ThemedText>
      )}

      <View style={styles.cardFooter}>
        <ThemedText style={[styles.idText, { color: muted }]}>
          #{dispute.id.slice(-8).toUpperCase()}
        </ThemedText>
        <IconSymbol name="chevron.right" size={16} color={muted} />
      </View>
    </Pressable>
  );
}

export default function DisputesScreen() {
  const router = useRouter();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textPrimary = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDisputes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await getMyDisputes({ take: 50 });
      setDisputes(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load disputes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDisputes(true);
  }, [loadDisputes]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>My Disputes</ThemedText>
        <View style={styles.backBtn} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <IconSymbol
            name="exclamationmark.circle.fill"
            size={40}
            color={muted}
          />
          <ThemedText style={[styles.emptyText, { color: muted }]}>
            {error}
          </ThemedText>
          <Pressable
            style={[styles.retryBtn, { borderColor: primary }]}
            onPress={() => loadDisputes()}
          >
            <ThemedText style={{ color: primary, fontWeight: "600" }}>
              Retry
            </ThemedText>
          </Pressable>
        </View>
      ) : disputes.length === 0 ? (
        <View style={styles.centered}>
          <IconSymbol
            name="exclamationmark.circle.fill"
            size={56}
            color={muted}
          />
          <ThemedText style={[styles.emptyTitle, { color: textPrimary }]}>
            No disputes yet
          </ThemedText>
          <ThemedText style={[styles.emptyText, { color: muted }]}>
            When you file a dispute it will appear here
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={primary}
              colors={[primary]}
            />
          }
          ListHeaderComponent={
            <ThemedText style={[styles.countLabel, { color: muted }]}>
              {total} {total === 1 ? "dispute" : "disputes"} filed
            </ThemedText>
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <DisputeCard
              dispute={item}
              onPress={() =>
                router.push(`/(settings)/dispute/${item.id}` as any)
              }
            />
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36 },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  listContent: { padding: 16, paddingBottom: 40 },
  countLabel: { fontSize: 13, marginBottom: 12 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  cardMeta: { flex: 1, gap: 2 },
  cardCategory: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  cardDate: { fontSize: 12 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  reason: { fontSize: 15, fontWeight: "600" },
  description: { fontSize: 13, lineHeight: 19 },
  amount: { fontSize: 12, marginTop: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  idText: { fontSize: 12 },
});
