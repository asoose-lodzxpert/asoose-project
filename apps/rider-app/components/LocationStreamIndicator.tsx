import { View, Text, StyleSheet } from "react-native";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";

export function LocationStreamIndicator() {
  const { locationStreamStatus, isOnline } = useJobs();
  const success = useThemeColor({}, "statusSuccess");
  const error = useThemeColor({}, "statusError");
  const warning = useThemeColor({}, "statusPending");

  if (!isOnline) return null;

  const getStatusColor = () => {
    if (!locationStreamStatus.isActive) return error;
    if (!locationStreamStatus.isConnected) return warning;
    return success;
  };

  const getStatusText = () => {
    if (!locationStreamStatus.isActive) return "Location Inactive";
    if (!locationStreamStatus.isConnected) {
      const queueInfo =
        locationStreamStatus.queueSize > 0
          ? ` (${locationStreamStatus.queueSize} queued)`
          : "";
      return `Location Offline${queueInfo}`;
    }
    return "Location Active";
  };

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.text}>{getStatusText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    color: "#666",
  },
});
