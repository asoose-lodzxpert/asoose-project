import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { StyleSheet, View } from "react-native";

export function SignupSuccess() {
  const success = useThemeColor({}, "statusSuccess");
  const pending = useThemeColor({}, "statusPending");
  const muted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  return (
    <ThemedView style={styles.container}>
      {/* 1. Minimal Header */}
      <View style={styles.header}>
        <IconSymbol name="checkmark.circle.fill" size={60} color={success} />
        <ThemedText type="title" style={styles.title}>
          Application Sent
        </ThemedText>
        <ThemedText style={styles.subTitle}>
          We're reviewing your profile
        </ThemedText>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      <View style={styles.content}>
        <TimelineItem
          icon="checkmark.circle.fill"
          color={success}
          title="Submitted"
          time="Just now"
          isDone
        />
        <TimelineItem
          icon="clock.fill"
          color={pending}
          title="Document Verification"
          time="24-48 hours"
          active
        />
        <TimelineItem
          icon="circle"
          color={muted}
          title="Background Check"
          time="1-3 days"
        />
        <TimelineItem
          icon="circle"
          color={muted}
          title="Account Ready"
          time="Final step"
          isLast
        />
      </View>

      {/* 3. Simple Footer Info */}
      <View style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: muted }]}>
          We'll notify you via email as soon as your account is activated.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

function TimelineItem({
  icon,
  color,
  title,
  time,
  active,
  isDone,
  isLast,
}: any) {
  return (
    <View style={styles.row}>
      <View style={styles.leftColumn}>
        <IconSymbol name={icon} size={18} color={color} />
        {!isLast && (
          <View
            style={[
              styles.line,
              { backgroundColor: isDone ? color : "#E5E7EB" },
            ]}
          />
        )}
      </View>
      <View style={styles.rightColumn}>
        <ThemedText style={[styles.rowTitle, active && { fontWeight: "700" }]}>
          {title}
        </ThemedText>
        <ThemedText style={styles.rowTime}>{time}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 32, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 40 },
  title: { marginTop: 16, fontSize: 24 },
  subTitle: { fontSize: 15, opacity: 0.6, marginTop: 4 },
  divider: { height: 1, width: "100%", marginBottom: 40, opacity: 0.5 },
  content: { paddingLeft: 4 },
  row: { flexDirection: "row", minHeight: 70 },
  leftColumn: { alignItems: "center", marginRight: 16 },
  line: { width: 2, flex: 1, marginVertical: 4 },
  rightColumn: { flex: 1, paddingTop: -2 },
  rowTitle: { fontSize: 16, marginBottom: 2 },
  rowTime: { fontSize: 13, opacity: 0.5 },
  footer: { marginTop: 40, alignItems: "center" },
  footerText: { textAlign: "center", fontSize: 13, lineHeight: 18 },
});
