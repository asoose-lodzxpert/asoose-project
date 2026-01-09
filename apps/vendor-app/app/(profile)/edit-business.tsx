import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { getBusinessDetails } from "@/services/business-details.service";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * Edit Business Details Screen
 */
export default function EditBusinessDetailsScreen() {
  const router = useRouter();

  const background = useThemeColor({}, "surfaceBackground");
  const brandPrimary = useThemeColor({}, "brandPrimary");

  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getBusinessDetails();
        if (mounted) setBusinessData(data);
      } catch (err) {
        Toast.show({ type: "error", text1: "Failed to load business details" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ---------------- UI ----------------

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={brandPrimary} />
      </View>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* ===== Header ===== */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <IconSymbol name="chevron.left" size={24} color={brandPrimary} />
          <ThemedText type="defaultSemiBold" style={{ color: brandPrimary }}>
            Back
          </ThemedText>
        </Pressable>

        <ThemedText type="title">Business Details</ThemedText>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: background },
        ]}
      >
        {/* ===== Business Info ===== */}
        <InfoCard
          title="Business Information"
          onEdit={() => router.push("/(profile)/edit-business/step1")}
        >
          <InfoRow
            label="Business Name"
            value={businessData?.step1?.businessName}
          />
          <InfoRow label="Email" value={businessData?.step1?.businessEmail} />
          <InfoRow label="Phone" value={businessData?.step1?.phoneNumber} />
          <InfoRow label="Type" value={businessData?.step1?.businessType} />
          <InfoRow label="Employees" value={businessData?.step1?.employees} />
        </InfoCard>

        {/* ===== Documents ===== */}
        <InfoCard
          title="Business Documents"
          onEdit={() => router.push("/(profile)/edit-business/step2")}
        >
          <InfoRow
            label="Business Reg. Certificate"
            value={businessData?.step2?.businessRegCert}
          />
          <InfoRow label="Tax ID" value={businessData?.step2?.taxIdDoc} />
          <InfoRow
            label="Proof of Address"
            value={businessData?.step2?.proofOfAddress}
          />
        </InfoCard>

        {/* ===== Store Details ===== */}
        <InfoCard
          title="Store Details"
          onEdit={() => router.push("/(profile)/edit-business/step3")}
        >
          <InfoRow label="Store Name" value={businessData?.step3?.storeName} />
          <InfoRow
            label="Description"
            value={businessData?.step3?.storeDescription}
          />
          <InfoRow label="Open Hours" value={businessData?.step3?.openHours} />
        </InfoCard>
      </ScrollView>
    </ThemedView>
  );
}

/* ============================================================
   Card Component
   ============================================================ */

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
}

function InfoCard({ title, children, onEdit }: InfoCardProps) {
  const cardBg = useThemeColor({}, "surfaceCard");
  const brandPrimary = useThemeColor({}, "brandPrimary");

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>

        <Pressable onPress={onEdit} style={styles.editButton}>
          <IconSymbol name="pencil" size={14} color={brandPrimary} />
          <ThemedText style={{ fontSize: 13 }} type="link">
            Edit
          </ThemedText>
        </Pressable>
      </View>

      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

/* ============================================================
   Info Row
   ============================================================ */

function InfoRow({ label, value }: { label: string; value?: string }) {
  const muted = useThemeColor({}, "textDisabled");

  return (
    <View style={styles.row}>
      <ThemedText style={{ color: muted, fontSize: 13 }}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{value || "—"}</ThemedText>
    </View>
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
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  row: {
    gap: 2,
  },
});
