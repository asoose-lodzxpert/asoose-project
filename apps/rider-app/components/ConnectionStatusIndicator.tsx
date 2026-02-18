import { useJobs } from "@/context/JobContext";
import React from "react";
import { StyleSheet, View } from "react-native";

export const ConnectionStatusIndicator = () => {
  const { connectionStatus, isOnline } = useJobs();

  if (!isOnline) return null;

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "#10b981"; // Green
      case "reconnecting":
        return "#f59e0b"; // Orange
      case "disconnected":
        return "#6b7280";
      case "failed":
        return "#ef4444"; // Red
      default:
        return "#6b7280";
    }
  };

  // Don't show anything when connected
  // if (connectionStatus === "connected") {
  //   return null;
  // }

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
