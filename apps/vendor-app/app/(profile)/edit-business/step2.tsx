import Toast from "react-native-toast-message";
import { getBusinessDetails } from "@/services/business-details.service";
import { updateBusinessDocuments } from "@/services/business.service";
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { SignupStep2Data } from "@/types/signup";

/**
 * Max file size: 5MB
 */
const MAX_SIZE = 5 * 1024 * 1024;

export default function EditBusinessDocumentsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");

  const [data, setData] = useState<SignupStep2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const details = await getBusinessDetails();
        if (mounted && details?.step2) {
          setData({
            businessRegCert: details.step2.businessRegCert || "",
            taxIdDoc: details.step2.taxIdDoc || "",
            proofOfAddress: details.step2.proofOfAddress || "",
          });
        }
      } catch (err) {
        Toast.show({ type: "error", text1: "Failed to load documents" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** Handle file pick */
  const pickFile = async (key: keyof SignupStep2Data) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];

    if (file.size && file.size > MAX_SIZE) {
      Alert.alert("File too large", "Maximum file size is 5MB");
      return;
    }

    setData((prev) => (prev ? { ...prev, [key]: file.uri } : prev));
  };

  /** Remove uploaded file */
  const removeFile = (key: keyof SignupStep2Data) => {
    setData((prev) => (prev ? { ...prev, [key]: "" } : prev));
  };
  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await updateBusinessDocuments({
        businessRegCert: data.businessRegCert,
        taxIdDoc: data.taxIdDoc,
        proofOfAddress: data.proofOfAddress,
      });
      Toast.show({ type: "success", text1: "Documents updated" });
      router.back();
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to update documents" });
    } finally {
      setSaving(false);
    }
  };

  /** Render single document card */
  const renderDocCard = (
    key: keyof SignupStep2Data,
    label: string,
    optional?: boolean
  ) => {
    const value = data?.[key];
    const uploaded = Boolean(value);

    return (
      <View style={[styles.card, { backgroundColor: surface }]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <ThemedText type="defaultSemiBold">
            {label} {optional && "(Optional)"}
          </ThemedText>

          {uploaded && (
            <Pressable onPress={() => removeFile(key)}>
              <ThemedText type="link">Remove</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Upload area */}
        <Pressable
          onPress={() => pickFile(key)}
          style={[
            styles.uploadBox,
            {
              borderColor: uploaded ? primary : border,
              borderStyle: uploaded ? "solid" : "dashed",
            },
          ]}
        >
          <IconSymbol
            size={32}
            name={uploaded ? "check" : "cloud.upload"}
            color={uploaded ? "#22C55E" : "#9CA3AF"}
          />

          <ThemedText style={styles.uploadText}>
            {uploaded ? "Document uploaded" : "Tap to upload document"}
          </ThemedText>

          <ThemedText style={styles.hintText}>
            {uploaded ? value?.split("/").pop() : "PDF, JPG or PNG (max 5MB)"}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={primary} />
        <ThemedText type="subtitle">Loading documents...</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* ================= Header ================= */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText type="defaultSemiBold" style={{ color: primary }}>
            Back
          </ThemedText>
        </Pressable>
      </View>

      {/* ================= Content ================= */}
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="subtitle">
          Manage your verification documents
        </ThemedText>

        {renderDocCard("businessRegCert", "Business Registration Certificate")}

        {renderDocCard("taxIdDoc", "Tax Identification Document")}

        {renderDocCard("proofOfAddress", "Proof of Address", true)}

        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: primary,
              marginTop: 24,
              opacity: saving ? 0.7 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{ color: "#fff", textAlign: "center" }}
          >
            {saving ? "Saving..." : "Save changes"}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

/* ============================================================
   Styles
   ============================================================ */

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  container: {
    padding: 16,
    gap: 20,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  uploadBox: {
    height: 140,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadText: {
    fontSize: 15,
    textAlign: "center",
  },
  hintText: {
    fontSize: 12,
    textAlign: "center",
    color: "#9CA3AF",
  },
});
