import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Dispute, getDisputeById } from "@/services/dispute.service";

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

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#6B7280",
  MEDIUM: "#3B82F6",
  HIGH: "#F59E0B",
  URGENT: "#EF4444",
};

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const muted = useThemeColor({}, "textMuted");
  const subtle = useThemeColor({}, "surfaceSubtle");

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await getDisputeById(id);
        setDispute(data);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load dispute");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Dispute Details</ThemedText>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      </ThemedView>
    );
  }

  if (error || !dispute) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Dispute Details</ThemedText>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centered}>
          <IconSymbol
            name="exclamationmark.circle.fill"
            size={40}
            color={muted}
          />
          <ThemedText style={[styles.emptyText, { color: muted }]}>
            {error ?? "Dispute not found"}
          </ThemedText>
          <Pressable
            style={[styles.retryBtn, { borderColor: primary }]}
            onPress={() => load()}
          >
            <ThemedText style={{ color: primary, fontWeight: "600" }}>
              Retry
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const statusColor = STATUS_COLORS[dispute.status] ?? "#6B7280";
  const priorityColor = PRIORITY_COLORS[dispute.priority] ?? "#6B7280";

  const createdAt = new Date(dispute.createdAt).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const linkedId = dispute.orderId ?? dispute.rideId ?? dispute.deliveryId;
  const linkedType = dispute.orderId
    ? "Order"
    : dispute.rideId
      ? "Ride"
      : "Delivery";

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Dispute Details</ThemedText>
        <View style={styles.backBtn} />
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
        {/* ID + badges */}
        <View
          style={[
            styles.idCard,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText style={[styles.disputeId, { color: muted }]}>
            #{dispute.id.slice(-8).toUpperCase()}
          </ThemedText>
          <View style={styles.badges}>
            <View
              style={[styles.badge, { backgroundColor: statusColor + "20" }]}
            >
              <ThemedText style={[styles.badgeText, { color: statusColor }]}>
                {STATUS_LABELS[dispute.status] ?? dispute.status}
              </ThemedText>
            </View>
            <View
              style={[styles.badge, { backgroundColor: priorityColor + "20" }]}
            >
              <ThemedText style={[styles.badgeText, { color: priorityColor }]}>
                {dispute.priority}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.dateText, { color: muted }]}>
            Filed on {createdAt}
          </ThemedText>
        </View>

        {/* Reason & Description */}
        <View
          style={[
            styles.section,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText style={[styles.sectionLabel, { color: muted }]}>
            REASON
          </ThemedText>
          <ThemedText style={styles.reason}>{dispute.reason}</ThemedText>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <ThemedText style={[styles.sectionLabel, { color: muted }]}>
            DESCRIPTION
          </ThemedText>
          <ThemedText style={[styles.description, { color: textSecondary }]}>
            {dispute.description}
          </ThemedText>
        </View>

        {/* Linked entity */}
        {linkedId && (
          <View
            style={[
              styles.section,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <ThemedText style={[styles.sectionLabel, { color: muted }]}>
              LINKED {linkedType.toUpperCase()}
            </ThemedText>
            <ThemedText style={styles.linkedId}>
              #{linkedId.slice(-8).toUpperCase()}
            </ThemedText>
          </View>
        )}

        {/* Evidence images */}
        {dispute.evidenceImages && dispute.evidenceImages.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <ThemedText style={[styles.sectionLabel, { color: muted }]}>
              EVIDENCE ({dispute.evidenceImages.length}{" "}
              {dispute.evidenceImages.length === 1 ? "IMAGE" : "IMAGES"})
            </ThemedText>
            <View style={styles.imagesRow}>
              {dispute.evidenceImages.map((uri, idx) => (
                <Image
                  key={idx}
                  source={{ uri }}
                  style={[styles.evidenceImage, { backgroundColor: subtle }]}
                  resizeMode="cover"
                />
              ))}
            </View>
          </View>
        )}

        {/* Status info */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: statusColor + "10",
              borderColor: statusColor + "30",
            },
          ]}
        >
          <IconSymbol name="info.circle.fill" size={16} color={statusColor} />
          <ThemedText style={[styles.infoText, { color: statusColor }]}>
            {dispute.status === "OPEN"
              ? "Your dispute has been received and will be reviewed shortly."
              : dispute.status === "IN_REVIEW"
                ? "Our team is currently reviewing your dispute."
                : dispute.status === "RESOLVED"
                  ? "This dispute has been resolved. Check your wallet for any refunds."
                  : dispute.status === "REJECTED"
                    ? "This dispute was rejected. Contact support for more information."
                    : "This dispute is closed."}
          </ThemedText>
        </View>
      </ScrollView>
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
  emptyText: { fontSize: 14, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },

  idCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  disputeId: { fontSize: 13, fontWeight: "600" },
  badges: { flexDirection: "row", gap: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  dateText: { fontSize: 12 },

  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  reason: { fontSize: 16, fontWeight: "700" },
  description: { fontSize: 14, lineHeight: 21 },
  linkedId: { fontSize: 15, fontWeight: "600" },
  divider: { height: 1, marginVertical: 4 },

  imagesRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 4,
  },
  evidenceImage: {
    width: 130,
    height: 130,
    borderRadius: 12,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
