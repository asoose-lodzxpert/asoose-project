import { useJobs } from "@/context/JobContext";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const ConnectionStatusIndicator = () => {
  const { connectionStatus, isOnline, manualReconnect } = useJobs();

  if (!isOnline) return null;

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          backgroundColor: "#10b981",
          text: "Connected",
          showReconnect: false,
        };
      case "reconnecting":
        return {
          backgroundColor: "#f59e0b",
          text: "Reconnecting...",
          showReconnect: false,
        };
      case "disconnected":
        return {
          backgroundColor: "#6b7280",
          text: "Disconnected",
          showReconnect: true,
        };
      case "failed":
        return {
          backgroundColor: "#ef4444",
          text: "Connection Failed",
          showReconnect: true,
        };
      default:
        return {
          backgroundColor: "#6b7280",
          text: "Unknown",
          showReconnect: false,
        };
    }
  };

  const config = getStatusConfig();

  if (connectionStatus === "connected") {
    // Don't show anything when connected
    return null;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: config.backgroundColor }]}
    >
      <View style={styles.indicator} />
      <Text style={styles.text}>{config.text}</Text>
      {config.showReconnect && (
        <TouchableOpacity onPress={manualReconnect} style={styles.button}>
          <Text style={styles.buttonText}>Reconnect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
  },
  text: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  button: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
