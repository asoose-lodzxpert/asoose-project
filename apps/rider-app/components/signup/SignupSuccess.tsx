import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export function SignupSuccess() {
  const success = useThemeColor({}, "statusSuccess");
  const warning = useThemeColor({}, "statusPending");
  const muted = useThemeColor({}, "textMuted");
  const cardBg = useThemeColor({}, "surfaceSubtle");

  return (
    <ThemedView style={styles.container}>
      {/* Header Confirmation */}
      <View style={styles.header}>
        <View style={[styles.successIcon, { backgroundColor: success }]}>
          <IconSymbol name="check" size={36} color="#fff" />
        </View>

        <ThemedText type="title">Application Submitted!</ThemedText>
        <ThemedText style={styles.subTitle}>
          We're reviewing your documents
        </ThemedText>
      </View>

      {/* Status Tracker */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <IconSymbol name="file-text" size={18} color={warning} />
          <ThemedText type="defaultSemiBold">Status: Under Review</ThemedText>
        </View>

        {/* Timeline */}
        <TimelineItem
          icon="checkmark.circle.fill"
          iconColor={success}
          title="Application submitted"
          description="Just now"
          active
        />

        <TimelineItem
          icon="clock.fill"
          iconColor={warning}
          title="Document verification"
          description="Reviewing your documents (24-48 hours)"
          active
        />

        <TimelineItem
          icon="circle"
          iconColor={muted}
          title="Background check"
          description="Will begin after verification (1-3 days)"
        />

        <TimelineItem
          icon="circle"
          iconColor={muted}
          title="Account activation"
          description="Final step to start delivering"
          isLast
        />
      </View>

      {/* What's Next */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <ThemedText type="defaultSemiBold">What's next?</ThemedText>

        <View style={styles.nextItem}>
          <IconSymbol name="1.circle.fill" size={20} color={warning} />
          <ThemedText style={styles.nextText}>
            We'll verify your documents within 24-48 hours.
          </ThemedText>
        </View>

        <View style={styles.nextItem}>
          <IconSymbol name="2.circle.fill" size={20} color={muted} />
          <ThemedText style={styles.nextText}>
            A background check will begin immediately after.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

/* ---------------------------------- */
/* Timeline Item */
/* ---------------------------------- */
function TimelineItem({
  icon,
  iconColor,
  title,
  description,
  active,
  isLast,
}: {
  icon: any;
  iconColor: string;
  title: string;
  description: string;
  active?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <IconSymbol name={icon} size={20} color={iconColor} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.timelineContent}>
        <ThemedText type={active ? "defaultSemiBold" : "default"}>
          {title}
        </ThemedText>
        <ThemedText style={styles.timelineText}>{description}</ThemedText>
      </View>
    </View>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },

  header: {
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },

  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  subTitle: {
    opacity: 0.7,
    textAlign: "center",
  },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },

  timelineRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  timelineLeft: {
    alignItems: "center",
    width: 24,
  },

  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 4,
  },

  timelineContent: {
    flex: 1,
    gap: 2,
  },

  timelineText: {
    fontSize: 13,
    opacity: 0.7,
  },

  nextItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 12,
  },

  nextText: {
    flex: 1,
    flexWrap: "wrap",
  },
});
