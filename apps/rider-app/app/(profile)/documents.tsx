import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";

type DocumentKey = "id" | "license" | "insurance";
type DocumentFile = any;

export default function DocumentsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");

  const [documents, setDocuments] = useState<
    Record<DocumentKey, DocumentFile | null>
  >({
    id: null,
    license: null,
    insurance: null,
  });
  // Editing is disabled; documents are view-only
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* Simulate fetch */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDocuments({
        id: null,
        license: null,
        insurance: null,
      });
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timeout);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setDocuments((prev) => ({ ...prev })); // simulate reload
      setRefreshing(false);
    }, 1000);
  }, []);

  // Remove pickFile and removeFile logic; view-only

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <IconSymbol name="chevron.left" size={24} color={primary} />
            <ThemedText
              style={{ color: primary, marginLeft: 4, fontWeight: "500" }}
            >
              Back
            </ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: "center" }}>
            Documents
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          {["ID Document", "Driver's License", "Vehicle Insurance"].map(
            (label, idx) => (
              <View key={label} style={styles.section}>
                <ThemedText type="defaultSemiBold">{label}</ThemedText>
                <View
                  style={[
                    styles.uploadCard,
                    { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
                  ]}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#E5E7EB",
                    }}
                  />
                  <View
                    style={{
                      height: 18,
                      width: 120,
                      backgroundColor: "#E5E7EB",
                      borderRadius: 4,
                      marginTop: 8,
                    }}
                  />
                  <View
                    style={{
                      height: 14,
                      width: 100,
                      backgroundColor: "#E5E7EB",
                      borderRadius: 4,
                      marginTop: 6,
                    }}
                  />
                </View>
              </View>
            ),
          )}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText
            style={{ color: primary, marginLeft: 4, fontWeight: "500" }}
          >
            Back
          </ThemedText>
        </Pressable>
        <ThemedText type="title" style={{ flex: 1, textAlign: "center" }}>
          Documents
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {[
          { key: "id", label: "ID Document" },
          { key: "license", label: "Driver's License" },
          { key: "insurance", label: "Vehicle Insurance" },
        ].map(({ key, label }) => {
          const docKey = key as DocumentKey;
          const file = documents[docKey];
          const uploaded = Boolean(file);
          return (
            <View key={key} style={styles.section}>
              <ThemedText type="defaultSemiBold">{label}</ThemedText>
              <View
                style={[
                  styles.uploadCard,
                  uploaded && { borderColor: primary, opacity: 0.9 },
                ]}
              >
                <IconSymbol
                  size={32}
                  name={uploaded ? "check" : "cloud.upload"}
                  color={uploaded ? "#22C55E" : "#9CA3AF"}
                />
                <ThemedText style={styles.uploadText}>
                  {uploaded ? "File uploaded successfully" : "No file uploaded"}
                </ThemedText>
                <ThemedText style={styles.hintText}>
                  {uploaded && file
                    ? (file as any).name ||
                      (file as any).uri?.split("/").pop() ||
                      ""
                    : "PDF, JPG, PNG (max 5MB)"}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  section: { gap: 8, marginTop: 12 },
  uploadCard: {
    height: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  uploadText: { fontSize: 15, textAlign: "center" },
  hintText: { fontSize: 12, textAlign: "center", color: "#9CA3AF" },
  removeButton: { marginTop: 6 },
});
