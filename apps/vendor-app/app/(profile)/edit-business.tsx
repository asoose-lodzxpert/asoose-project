import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getBusinessDetails } from "@/services/business-details.service";
import type { OpenHours } from "@/types/signup";

const { width } = Dimensions.get("window");

export default function EditBusinessDetailsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"info" | "docs" | "store">("info");
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const brandPrimary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getBusinessDetails();
      if (__DEV__) console.log("Fetched business details:", data);
      setBusinessData(data);
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={brandPrimary} />
        <ThemedText style={{ marginTop: 12, opacity: 0.6 }}>
          Synchronizing Details...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* --- Modern Header --- */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backCircle, { backgroundColor: surfaceSubtle }]}
        >
          <IconSymbol name="chevron.left" size={22} color={brandPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <ThemedText style={[styles.headerSubtitle, { color: textMuted }]}>
            Manage
          </ThemedText>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Business Profile
          </ThemedText>
        </View>
        <Pressable onPress={loadData} style={styles.refreshBtn}>
          <IconSymbol name="arrow.clockwise" size={20} color={textMuted} />
        </Pressable>
      </View>

      {/* --- Segmented Control --- */}
      <View style={[styles.tabBar, { borderBottomColor: border }]}>
        <TabItem
          label="Profile"
          active={activeTab === "info"}
          onPress={() => setActiveTab("info")}
        />
        <TabItem
          label="Documents"
          active={activeTab === "docs"}
          onPress={() => setActiveTab("docs")}
        />
        <TabItem
          label="Store"
          active={activeTab === "store"}
          onPress={() => setActiveTab("store")}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "info" && (
          <View style={styles.tabContent}>
            <SectionHeader
              title="Core Identity"
              onEdit={() => router.push("/(profile)/edit-business/step1")}
            />
            <DetailTile
              label="Legal Name"
              value={businessData?.step1?.businessName}
              icon="building.2"
            />
            <DetailTile
              label="Email Address"
              value={businessData?.step1?.businessEmail}
              icon="envelope"
            />
            <DetailTile
              label="Phone Line"
              value={businessData?.step1?.phoneNumber}
              icon="phone"
            />
            <DetailTile
              label="Industry"
              value={businessData?.step1?.businessType}
              icon="tag"
            />

            <SectionHeader
              title="Financial Hub"
              onEdit={() => router.push("/(profile)/edit-business/step4")}
            />
            <DetailTile
              label="Settlement Bank"
              value={businessData?.step4?.bankName}
              icon="banknote"
            />
            <DetailTile
              label="Account No."
              value={businessData?.step4?.accountNumber}
              icon="number"
            />
          </View>
        )}

        {activeTab === "docs" && (
          <View style={styles.tabContent}>
            <SectionHeader title="Compliance Vault" />
            <DocTile
              title="Registration Cert"
              url={businessData?.step2?.businessRegCert}
              onView={setSelectedImage}
            />
            <DocTile
              title="Tax Identification"
              url={businessData?.step2?.taxIdDoc}
              onView={setSelectedImage}
            />
            <DocTile
              title="Utility Proof"
              url={businessData?.step2?.proofOfAddress}
              onView={setSelectedImage}
            />
          </View>
        )}

        {activeTab === "store" && (
          <View style={styles.tabContent}>
            <SectionHeader
              title="Public Appearance"
              onEdit={() => router.push("/(profile)/edit-business/step3")}
            />
            <DetailTile
              label="Display Name"
              value={businessData?.step3?.storeName}
              icon="shop"
            />
            <DescriptionBox value={businessData?.step3?.storeDescription} />

            <SectionHeader title="Operation Window" />
            <OpenHoursList hours={businessData?.step3?.openHours} />
          </View>
        )}
      </ScrollView>

      {/* --- Image Preview Modal --- */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.closeBtn}
            onPress={() => setSelectedImage(null)}
          >
            <IconSymbol name="xmark" size={22} color="#fff" />
          </Pressable>
          <Image
            source={{ uri: selectedImage! }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </ThemedView>
  );
}

/* --- Sub-Components --- */

const TabItem = ({ label, active, onPress }: any) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && { borderBottomColor: brandPrimary }]}
    >
      <ThemedText
        style={[
          styles.tabLabel,
          { color: textMuted },
          active && { color: brandPrimary, fontWeight: "700" },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
};

const SectionHeader = ({ title, onEdit }: any) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionTitle, { color: textMuted }]}>
        {title}
      </ThemedText>
      {onEdit && (
        <Pressable
          onPress={onEdit}
          style={[styles.editBadge, { backgroundColor: brandPrimary + "1A" }]}
        >
          <IconSymbol name="pencil" size={12} color={brandPrimary} />
          <ThemedText
            style={{ color: brandPrimary, fontSize: 12, fontWeight: "600" }}
          >
            Modify
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
};

const DetailTile = ({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon: IconSymbolName;
}) => {
  const cardBg = useThemeColor({}, "surfaceCard");
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  return (
    <View style={[styles.tile, { backgroundColor: cardBg }]}>
      <View style={[styles.tileIcon, { backgroundColor: brandPrimary + "1A" }]}>
        <IconSymbol name={icon} size={18} color={brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.tileLabel, { color: textMuted }]}>
          {label}
        </ThemedText>
        <ThemedText style={styles.tileValue}>{value || "â€”"}</ThemedText>
      </View>
    </View>
  );
};

const DocTile = ({
  title,
  url,
  onView,
}: {
  title: string;
  url?: string;
  onView: (url: string) => void;
}) => {
  const isUploaded = !!url;
  const cardBg = useThemeColor({}, "surfaceCard");
  const success = useThemeColor({}, "statusSuccess");
  const error = useThemeColor({}, "statusError");
  const brandPrimary = useThemeColor({}, "brandPrimary");

  return (
    <View style={[styles.tile, { backgroundColor: cardBg }]}>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.tileValue}>{title}</ThemedText>
        <ThemedText
          style={{ fontSize: 12, color: isUploaded ? success : error }}
        >
          {isUploaded ? "Verified Document" : "Pending Upload"}
        </ThemedText>
      </View>
      {isUploaded && (
        <Pressable
          onPress={() => onView(url)}
          style={[styles.viewBtn, { backgroundColor: brandPrimary + "1A" }]}
        >
          <IconSymbol name="eye.fill" size={16} color={brandPrimary} />
          <ThemedText style={{ color: brandPrimary, fontWeight: "600" }}>
            View
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
};

const DescriptionBox = ({ value }: { value?: string }) => {
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");
  const border = useThemeColor({}, "borderDefault");
  const textMuted = useThemeColor({}, "textMuted");
  return (
    <View
      style={[
        styles.descriptionBox,
        { backgroundColor: surfaceSubtle, borderColor: border },
      ]}
    >
      <ThemedText style={[styles.label, { color: textMuted }]}>
        Store Biography
      </ThemedText>
      <ThemedText style={styles.descText}>
        {value || "No description provided"}
      </ThemedText>
    </View>
  );
};

const OpenHoursList = ({ hours }: { hours?: OpenHours }) => {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const cardBg = useThemeColor({}, "surfaceCard");

  return (
    <View style={[styles.hoursCard, { backgroundColor: cardBg }]}>
      {days.map((day) => {
        const config = hours?.[day as keyof OpenHours];
        return (
          <View key={day} style={styles.hourRow}>
            <ThemedText style={styles.dayText}>
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </ThemedText>
            <ThemedText style={styles.timeText}>
              {config?.closed
                ? "Closed"
                : config?.is24Hours
                  ? "Open 24h"
                  : `${config?.open} - ${config?.close}`}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
};

/* --- Styles --- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  refreshBtn: { padding: 8 },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 25,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 15, fontWeight: "600" },
  scrollContent: { padding: 20 },
  tabContent: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  editBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    gap: 15,
    marginBottom: 8,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tileLabel: { fontSize: 12, fontWeight: "600" },
  tileValue: { fontSize: 15, fontWeight: "700" },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  descriptionBox: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 5 },
  descText: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  hoursCard: { padding: 16, borderRadius: 24, gap: 10 },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayText: { fontSize: 14, fontWeight: "600" },
  timeText: { fontSize: 13, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: { width: width * 0.9, height: "70%", borderRadius: 20 },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 30,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 10,
    borderRadius: 25,
  },
});
