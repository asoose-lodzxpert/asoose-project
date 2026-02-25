import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { resolveAddress } from "@/utils/address";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AUTO_DECLINE_TIMEOUT = 90;
const EXTENSION_TIME = 15;

export default function IncomingJobSheet() {
  const { incomingJob, acceptJob, declineJob } = useJobs();

  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const danger = useThemeColor({}, "statusError");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");

  const { bottom } = useSafeAreaInsets();

  const [timer, setTimer] = useState(AUTO_DECLINE_TIMEOUT);
  const [canExtend, setCanExtend] = useState(true);
  const [loadingAccept, setLoadingAccept] = useState(false);

  // Keep a stable ref so the interval closure always calls the latest declineJob
  // without declineJob being in the deps (which would reset the timer on every render).
  const declineJobRef = React.useRef(declineJob);
  useEffect(() => {
    declineJobRef.current = declineJob;
  });

  useEffect(() => {
    if (!incomingJob) return;
    setTimer(AUTO_DECLINE_TIMEOUT);
    setCanExtend(true);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Must NOT call declineJob inside a state updater — defer to avoid
          // "Cannot update a component while rendering a different component"
          setTimeout(() => {
            declineJobRef.current(incomingJob.id, incomingJob.jobType);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingJob?.id]);

  if (!incomingJob) return null;

  const isRide = incomingJob.jobType === "ride";
  const isMultiStop =
    !isRide && (incomingJob.storeCount ?? 1) > 1 && !!incomingJob.stops;
  const pickup = resolveAddress(incomingJob.pickupAddress);
  const dropoff = resolveAddress(incomingJob.dropoffAddress);
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const timerUrgent = timer <= 15;

  const handleAccept = async () => {
    setLoadingAccept(true);
    try {
      await acceptJob(incomingJob.id, incomingJob.jobType);
    } catch {
      setLoadingAccept(false);
    }
  };

  const badgeLabel = isRide
    ? "NEW RIDE"
    : isMultiStop
      ? "MULTI-STORE"
      : "NEW DELIVERY";

  return (
    <View style={[styles.wrapper, { backgroundColor: background }]}>
      <View style={[styles.container, { paddingBottom: bottom + 20 }]}>
        {/* Header: badge + extend + timer */}
        <View style={styles.header}>
          <View
            style={[
              styles.badge,
              { backgroundColor: primary + "18", borderColor: primary + "30" },
            ]}
          >
            <View style={[styles.badgeDot, { backgroundColor: primary }]} />
            <ThemedText style={[styles.badgeText, { color: primary }]}>
              {badgeLabel}
            </ThemedText>
          </View>

          <View style={styles.timerRow}>
            {canExtend && timer <= 30 && (
              <Pressable
                style={[
                  styles.extendBtn,
                  { borderColor: primary, backgroundColor: card },
                ]}
                onPress={() => {
                  setTimer((p) => p + EXTENSION_TIME);
                  setCanExtend(false);
                }}
              >
                <ThemedText style={[styles.extendText, { color: primary }]}>
                  +15s
                </ThemedText>
              </Pressable>
            )}
            <ThemedText
              style={[
                styles.timer,
                { color: timerUrgent ? danger : textPrimary },
              ]}
            >
              {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </ThemedText>
          </View>
        </View>

        {/* Route card */}
        <View
          style={[
            styles.routeCard,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          {isMultiStop ? (
            <>
              {incomingJob.stops!.map((stop, i) => (
                <View key={stop.orderId ?? i}>
                  <View style={styles.routeRow}>
                    <View style={[styles.dot, { backgroundColor: primary }]} />
                    <ThemedText
                      style={[styles.routeText, { color: textPrimary }]}
                      numberOfLines={1}
                    >
                      {`Stop ${i + 1}: ${stop.storeName}`}
                    </ThemedText>
                  </View>
                  {i < incomingJob.stops!.length - 1 && (
                    <View
                      style={[styles.divider, { backgroundColor: border }]}
                    />
                  )}
                </View>
              ))}
              <View style={[styles.divider, { backgroundColor: border }]} />
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: danger }]} />
                <ThemedText
                  style={[styles.routeText, { color: textPrimary }]}
                  numberOfLines={1}
                >
                  {dropoff || "Drop-off location"}
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: primary }]} />
                <ThemedText
                  style={[styles.routeText, { color: textPrimary }]}
                  numberOfLines={1}
                >
                  {pickup || "Pickup location"}
                </ThemedText>
              </View>
              <View style={[styles.divider, { backgroundColor: border }]} />
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: danger }]} />
                <ThemedText
                  style={[styles.routeText, { color: textPrimary }]}
                  numberOfLines={1}
                >
                  {dropoff || "Drop-off location"}
                </ThemedText>
              </View>
            </>
          )}
        </View>
        {/* Contact phones */}
        {(incomingJob.pickupContactPhone ||
          incomingJob.dropoffContactPhone) && (
          <View
            style={[
              styles.contactsCard,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            {incomingJob.pickupContactPhone && (
              <Pressable
                style={styles.contactRow}
                onPress={() =>
                  Linking.openURL(`tel:${incomingJob.pickupContactPhone}`)
                }
              >
                <View
                  style={[
                    styles.contactIcon,
                    { backgroundColor: primary + "18" },
                  ]}
                >
                  <IconSymbol name="phone" size={14} color={primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[styles.contactLabel, { color: textMuted }]}
                  >
                    {isRide ? "PASSENGER" : "PICKUP CONTACT"}
                  </ThemedText>
                  <ThemedText style={[styles.contactPhone, { color: primary }]}>
                    {incomingJob.pickupContactPhone}
                  </ThemedText>
                </View>
                <IconSymbol name="arrow.right" size={12} color={textMuted} />
              </Pressable>
            )}
            {incomingJob.pickupContactPhone &&
              incomingJob.dropoffContactPhone && (
                <View
                  style={[styles.contactDivider, { backgroundColor: border }]}
                />
              )}
            {incomingJob.dropoffContactPhone && (
              <Pressable
                style={styles.contactRow}
                onPress={() =>
                  Linking.openURL(`tel:${incomingJob.dropoffContactPhone}`)
                }
              >
                <View
                  style={[
                    styles.contactIcon,
                    { backgroundColor: danger + "18" },
                  ]}
                >
                  <IconSymbol name="phone" size={14} color={danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[styles.contactLabel, { color: textMuted }]}
                  >
                    DROPOFF CONTACT
                  </ThemedText>
                  <ThemedText style={[styles.contactPhone, { color: danger }]}>
                    {incomingJob.dropoffContactPhone}
                  </ThemedText>
                </View>
                <IconSymbol name="arrow.right" size={12} color={textMuted} />
              </Pressable>
            )}
          </View>
        )}
        {!isRide &&
          (incomingJob.isFragile ||
            incomingJob.isPerishable ||
            incomingJob.containsLiquid) && (
            <View style={styles.flagsRow}>
              {incomingJob.isFragile && (
                <View
                  style={[
                    styles.flag,
                    { backgroundColor: "#F59E0B18", borderColor: "#F59E0B40" },
                  ]}
                >
                  <ThemedText style={[styles.flagText, { color: "#F59E0B" }]}>
                    ⚠ Fragile
                  </ThemedText>
                </View>
              )}
              {incomingJob.isPerishable && (
                <View
                  style={[
                    styles.flag,
                    { backgroundColor: "#10B98118", borderColor: "#10B98140" },
                  ]}
                >
                  <ThemedText style={[styles.flagText, { color: "#10B981" }]}>
                    🌡 Perishable
                  </ThemedText>
                </View>
              )}
              {incomingJob.containsLiquid && (
                <View
                  style={[
                    styles.flag,
                    { backgroundColor: "#3B82F618", borderColor: "#3B82F640" },
                  ]}
                >
                  <ThemedText style={[styles.flagText, { color: "#3B82F6" }]}>
                    💧 Liquid
                  </ThemedText>
                </View>
              )}
            </View>
          )}

        {/* Order items summary */}
        {!isRide &&
          !isMultiStop &&
          incomingJob.orderItems &&
          incomingJob.orderItems.length > 0 && (
            <View
              style={[
                styles.itemsCard,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <IconSymbol name="shippingbox" size={14} color={textMuted} />
              <ThemedText
                style={[styles.itemsText, { color: textMuted }]}
                numberOfLines={2}
              >
                {incomingJob.orderItems.length === 1
                  ? incomingJob.orderItems[0]
                  : `${incomingJob.orderItems[0]} + ${incomingJob.orderItems.length - 1} more`}
              </ThemedText>
            </View>
          )}

        {/* Stats row */}
        <View style={styles.stats}>
          {isMultiStop && (
            <View style={styles.statItem}>
              <IconSymbol name="storefront" size={13} color={textMuted} />
              <ThemedText style={[styles.statText, { color: textMuted }]}>
                {incomingJob.storeCount} stores
              </ThemedText>
            </View>
          )}
          {incomingJob.distanceKm != null && (
            <View style={styles.statItem}>
              <IconSymbol
                name="arrow.right.circle"
                size={13}
                color={textMuted}
              />
              <ThemedText style={[styles.statText, { color: textMuted }]}>
                {incomingJob.distanceKm} km
              </ThemedText>
            </View>
          )}
          {incomingJob.durationMin != null && (
            <View style={styles.statItem}>
              <IconSymbol name="clock" size={13} color={textMuted} />
              <ThemedText style={[styles.statText, { color: textMuted }]}>
                ~{incomingJob.durationMin} min
              </ThemedText>
            </View>
          )}
          <ThemedText style={[styles.earnings, { color: primary }]}>
            ₦{incomingJob.earnings?.toFixed(0)}
          </ThemedText>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.actionBtn,
              styles.declineBtn,
              { borderColor: border },
            ]}
            onPress={() => declineJob(incomingJob.id, incomingJob.jobType)}
            disabled={loadingAccept}
          >
            <ThemedText style={[styles.actionBtnLabel, { color: danger }]}>
              Decline
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: primary }]}
            onPress={handleAccept}
            disabled={loadingAccept}
          >
            {loadingAccept ? (
              <ActivityIndicator color={textOnPrimary} size="small" />
            ) : (
              <ThemedText
                style={[styles.actionBtnLabel, { color: textOnPrimary }]}
              >
                Accept
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timer: { fontSize: 17, fontWeight: "800", letterSpacing: 0.5 },
  extendBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  extendText: { fontSize: 12, fontWeight: "700" },
  routeCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  divider: { height: 1, marginLeft: 4 },
  routeText: { fontSize: 14, fontWeight: "500", flex: 1 },
  flagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  flagText: { fontSize: 12, fontWeight: "700" },
  itemsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  itemsText: { fontSize: 13, flex: 1 },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 13 },
  earnings: { fontSize: 20, fontWeight: "800", marginLeft: "auto" },
  contactsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    overflow: "hidden",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  contactLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  contactPhone: { fontSize: 14, fontWeight: "700" },
  contactDivider: { height: 1, marginHorizontal: 14 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: { borderWidth: 1 },
  actionBtnLabel: { fontSize: 15, fontWeight: "700" },
});
