import { View, StyleSheet, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  statusInfo,
  isSearching as checkSearching,
  getStatusPillColor,
} from "./utils/rideStatusUtils";

type StatusHeaderProps = {
  status: string;
  formattedFare: string;
};

export default function StatusHeader({
  status,
  formattedFare,
}: StatusHeaderProps) {
  const primaryColor = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const textSecondary = useThemeColor({}, "textSecondary");

  const { label: statusLabel, sub: statusSub } = statusInfo(status);
  const searching = checkSearching(status);
  const pillColor = getStatusPillColor(status, primaryColor, successColor);

  return (
    <>
      <View style={styles.statusHeaderRow}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: pillColor + "18",
              borderColor: pillColor + "40",
            },
          ]}
        >
          {searching ? (
            <ActivityIndicator
              size="small"
              color={pillColor}
              style={{ marginRight: 6 }}
            />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: pillColor }]} />
          )}

          <ThemedText
            type="caption"
            style={{
              color: pillColor,
              fontWeight: "700",
              letterSpacing: 0.3,
            }}
          >
            {statusLabel.toUpperCase()}
          </ThemedText>
        </View>

        <View
          style={[styles.fareBadge, { backgroundColor: primaryColor + "14" }]}
        >
          <ThemedText
            type="caption"
            style={{ color: primaryColor, fontWeight: "700" }}
          >
            {formattedFare}
          </ThemedText>
        </View>
      </View>

      {statusSub && (
        <ThemedText
          type="caption"
          style={{ color: textSecondary, marginTop: 3, marginBottom: 8 }}
        >
          {statusSub}
        </ThemedText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  fareBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
});
