import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
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
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const MAX_SIZE = 5 * 1024 * 1024;

  /* Simulate fetch */
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Simulated preloaded documents
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

  const pickFile = async (key: DocumentKey) => {
    if (!editing) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) return;

    if (asset.size && asset.size > MAX_SIZE) {
      Alert.alert("File too large", "Maximum file size is 5MB");
      return;
    }

    setDocuments((prev) => ({ ...prev, [key]: asset }));
  };

  const removeFile = (key: DocumentKey) => {
    if (!editing) return;
    setDocuments((prev) => ({ ...prev, [key]: null }));
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <ThemedText style={{ textAlign: "center", marginTop: 200 }}>
          Loading documents...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
        <Pressable onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="title" style={{ flex: 1, textAlign: "center" }}>
          Documents
        </ThemedText>
        <Pressable
          onPress={() => {
            if (editing) {
              Alert.alert("Saved", "Documents have been saved successfully");
            }
            setEditing(!editing);
          }}
        >
          <ThemedText style={{ color: primary, fontWeight: "600" }}>
            {editing ? "Done" : "Edit"}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {(
          [
            { key: "id", label: "ID Document" },
            { key: "license", label: "Driver's License" },
            { key: "insurance", label: "Vehicle Insurance" },
          ] as const
        ).map(({ key, label }) => {
          const file = documents[key];
          const uploaded = Boolean(file);

          return (
            <View key={key} style={styles.section}>
              <ThemedText type="defaultSemiBold">{label}</ThemedText>
              <Pressable
                disabled={!editing || uploaded}
                onPress={() => pickFile(key)}
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
                  {uploaded
                    ? "File uploaded successfully"
                    : "Tap to upload or drag & drop"}
                </ThemedText>
                <ThemedText style={styles.hintText}>
                  {uploaded && file
                    ? (file as any).name ||
                      (file as any).uri?.split("/").pop() ||
                      ""
                    : "PDF, JPG, PNG (max 5MB)"}
                </ThemedText>
                {uploaded && editing && (
                  <Pressable
                    onPress={() => removeFile(key)}
                    style={styles.removeButton}
                  >
                    <ThemedText type="link">Remove</ThemedText>
                  </Pressable>
                )}
              </Pressable>
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
