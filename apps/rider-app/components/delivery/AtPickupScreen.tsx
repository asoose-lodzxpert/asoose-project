import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

export default function AtPickupScreen() {
  const { activeJob, confirmPickup } = useJobs();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const cardBg = useThemeColor({}, "surfaceSubtle");

  if (!activeJob) return null;
  const isRide = activeJob.jobType === "ride";

  return (
    <View style={styles.container}>
      <View style={[styles.bottomContainer, { backgroundColor: surface }]}>
        <View style={styles.arrivedSection}>
          <IconSymbol name="checkmark.circle.fill" size={48} color="#10B981" />
          <ThemedText type="title" style={styles.arrivedTitle}>
            {isRide ? "You’ve arrived at pickup" : "You’ve arrived at pickup"}
          </ThemedText>
          <ThemedText style={styles.arrivedSubtitle}>
            {isRide
              ? "Pick up your passenger"
              : "Collect the order from the vendor"}
          </ThemedText>
        </View>

        <View style={[styles.vendorCard, { backgroundColor: cardBg }]}>
          <View style={styles.vendorInfo}>
            <IconSymbol
              name={isRide ? "car" : "pizza"}
              size={36}
              color={primary}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">
                {isRide
                  ? activeJob.customerName
                  : activeJob.pickupAddress?.name ||
                    activeJob.pickupAddress?.label ||
                    activeJob.customerName}
              </ThemedText>
              <ThemedText style={styles.vendorAddress}>
                {isRide
                  ? activeJob.pickupAddress?.address ||
                    activeJob.pickupAddress ||
                    ""
                  : activeJob.pickupAddress?.address ||
                    activeJob.pickupAddress ||
                    ""}
              </ThemedText>
            </View>
          </View>
          <Pressable style={styles.callBtn}>
            <IconSymbol name="phone" size={22} color={primary} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.confirmBtn, { backgroundColor: primary }]}
          onPress={confirmPickup}
        >
          <IconSymbol name="checkmark" size={20} color="#fff" />
          <ThemedText style={styles.confirmText}>
            {isRide ? "CONFIRM PICKUP" : "CONFIRM PICKUP"}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  bottomContainer: {
    marginTop: "auto",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24,
  },

  arrivedSection: {
    alignItems: "center",
    gap: 6,
  },

  arrivedTitle: {
    marginTop: 8,
  },

  arrivedSubtitle: {
    color: "#666",
    textAlign: "center",
  },

  vendorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },

  vendorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  vendorAddress: {
    color: "#666",
    fontSize: 14,
  },

  callBtn: {
    width: 52,
    height: 52,
    backgroundColor: "#F0FDF4",
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },

  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
  },

  confirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
