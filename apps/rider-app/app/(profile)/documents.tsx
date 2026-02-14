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

// Defining a more specific type for the file object
interface DocumentFile {
  name?: string;
  uri?: string;
}

export default function DocumentsScreen() {
  const router = useRouter();

  // Theme Colors
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textMuted = useThemeColor({}, "textMuted");
  const statusSuccess = useThemeColor({}, "statusSuccess");

  const [documents, setDocuments] = useState<
    Record<DocumentKey, DocumentFile | null>
  >({
    id: null,
    license: null,
    insurance: null,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* Simulate initial fetch */
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Logic to populate data if needed
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
      // Simulate data refresh
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        { borderBottomColor: border, backgroundColor: surface },
      ]}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="chevron.left" size={24} color={primary} />
        <ThemedText style={[styles.backText, { color: primary }]}>
          Back
        </ThemedText>
      </Pressable>
      <ThemedText type="subtitle" style={styles.headerTitle}>
        Documents
      </ThemedText>
      <View style={{ width: 60 }} />
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        {renderHeader()}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.section}>
              <View
                style={[styles.skeletonText, { backgroundColor: border }]}
              />
              <View
                style={[
                  styles.uploadCard,
                  {
                    backgroundColor: surfaceSubtle,
                    borderColor: border,
                    borderStyle: "solid",
                  },
                ]}
              >
                <View
                  style={[styles.skeletonCircle, { backgroundColor: border }]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    { backgroundColor: border, width: "40%" },
                  ]}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
          />
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
                  { borderColor: uploaded ? statusSuccess : border },
                  uploaded && { backgroundColor: surfaceSubtle },
                ]}
              >
                <IconSymbol
                  size={32}
                  name={uploaded ? "checkmark.circle.fill" : "cloud.fill"}
                  color={uploaded ? statusSuccess : textMuted}
                />
                <ThemedText style={styles.uploadText}>
                  {uploaded ? "Verified Document" : "No file available"}
                </ThemedText>
                <ThemedText style={[styles.hintText, { color: textMuted }]}>
                  {uploaded && file
                    ? file.name || file.uri?.split("/").pop()
                    : "Only administrators can upload documents"}
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    width: 60,
  },
  backText: {
    marginLeft: 4,
    fontWeight: "500",
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  uploadCard: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  hintText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  // Skeleton Styles
  skeletonText: {
    height: 16,
    width: 100,
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 4,
    marginTop: 8,
  },
});
