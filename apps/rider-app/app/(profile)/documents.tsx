import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Image,
  Dimensions,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import Toast from "react-native-toast-message";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { getDocuments, type RiderDocument } from "@/services/documents.service";

const { width } = Dimensions.get("window");

export default function DocumentsScreen() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const textMuted = useThemeColor({}, "textMuted");
  const statusSuccess = useThemeColor({}, "statusSuccess");
  const statusError = useThemeColor({}, "statusError");
  const statusWarning = useThemeColor({}, "statusWarning");
  const modalBg = useThemeColor({}, "surfaceSubtle");
  const cardBg = useThemeColor({}, "surfaceCard");
  const shadowColor = useThemeColor({}, "surfaceSubtle");

  const [documents, setDocuments] = useState<RiderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load documents",
        text2: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDocuments();
  }, [fetchDocuments]);

  const getStatusConfig = (
    status: string,
  ): { color: string; icon: IconSymbolName; label: string; bg: string } => {
    switch (status) {
      case "VERIFIED":
        return {
          color: statusSuccess,
          icon: "checkmark.seal",
          label: "Verified",
          bg: statusSuccess + "20",
        };
      case "PENDING":
        return {
          color: statusWarning,
          icon: "clock",
          label: "Pending Review",
          bg: statusWarning + "20",
        };
      case "REJECTED":
        return {
          color: statusError,
          icon: "exclamationmark.octagon",
          label: "Rejected",
          bg: statusError + "20",
        };
      default:
        return {
          color: textMuted,
          icon: "doc",
          label: "Not Provided",
          bg: surfaceSubtle,
        };
    }
  };

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        { borderBottomColor: border, backgroundColor: surface },
      ]}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="chevron.left" size={24} color={primary} />
      </Pressable>
      <ThemedText type="subtitle" style={styles.headerTitle}>
        My Documents
      </ThemedText>
      <View style={{ width: 44 }} />
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        {renderHeader()}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.docCardSkeleton,
                { backgroundColor: surfaceSubtle, borderColor: border },
              ]}
            />
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
        <View style={[styles.infoBanner, { backgroundColor: surfaceSubtle }]}>
          <IconSymbol name="info.circle.fill" size={18} color={textMuted} />
          <ThemedText style={[styles.infoText, { color: textMuted }]}>
            Documents are managed and uploaded by the administration team.
          </ThemedText>
        </View>

        {documents.map((doc) => {
          const config = getStatusConfig(doc.status);
          return (
            <View
              key={doc.id}
              style={[
                styles.docCard,
                { borderColor: border, backgroundColor: surface },
              ]}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: config.bg }]}
              >
                <IconSymbol size={24} name={config.icon} color={config.color} />
              </View>

              <View style={styles.docInfo}>
                <ThemedText type="defaultSemiBold" style={styles.docType}>
                  {doc.type}
                </ThemedText>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: config.color },
                    ]}
                  />
                  <ThemedText
                    style={[styles.statusLabel, { color: config.color }]}
                  >
                    {config.label}
                  </ThemedText>
                </View>
              </View>

              {doc.url && (
                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: primary + "20" },
                  ]}
                  onPress={() => setPreviewUrl(doc.url)}
                >
                  <IconSymbol name="eye" size={18} color={primary} />
                </Pressable>
              )}
            </View>
          );
        })}

        {documents.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="doc.on.doc" size={48} color={textMuted} />
            <ThemedText style={{ color: textMuted, marginTop: 12 }}>
              No documents found
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Modern Preview Modal */}
      <Modal
        visible={!!previewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: modalBg }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPreviewUrl(null)}
          />
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: cardBg, shadowColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="defaultSemiBold">Document Preview</ThemedText>
              <Pressable
                onPress={() => setPreviewUrl(null)}
                style={styles.closeBtn}
              >
                <IconSymbol name="xmark" size={20} color={textMuted} />
              </Pressable>
            </View>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: previewUrl! }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <View pointerEvents="none" style={styles.watermarkContainer}>
                <ThemedText style={[styles.watermark, { color: textMuted }]}>
                  ASOOSE SECURE
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  scrollContent: { padding: 16 },
  infoBanner: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: "center",
    gap: 8,
  },
  infoText: { fontSize: 13, flex: 1 },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  docInfo: { flex: 1, marginLeft: 14 },
  docType: { fontSize: 16, marginBottom: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  docCardSkeleton: {
    height: 80,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  emptyState: { alignItems: "center", marginTop: 100, opacity: 0.5 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width * 0.9,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: 4 },
  imageContainer: { width: "100%", aspectRatio: 1, backgroundColor: "#000" },
  previewImage: { width: "100%", height: "100%" },
  watermarkContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  watermark: {
    fontSize: 32,
    fontWeight: "900",
    opacity: 0.15,
    transform: [{ rotate: "-30deg" }],
  },
});
