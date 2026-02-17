import React from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SignupData } from "@/types/signup";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Step4Props {
  data: SignupData;
}

export const Step4Review: React.FC<Step4Props> = ({ data }) => {
  const { step1, step2, step3 } = data;
  const successColor = useThemeColor({}, "statusSuccess");
  const errorColor = useThemeColor({}, "statusError");
  const textSecondary = useThemeColor({}, "textSecondary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const shadowColor = useThemeColor({}, "surfaceSubtle");

  const renderDocument = (doc: string | undefined, type: string) => {
    const uploaded = !!doc;
    return (
      <View
        key={type}
        style={[
          styles.documentCard,
          { backgroundColor: surfaceCard, borderColor: border },
        ]}
      >
        {uploaded ? (
          <View style={styles.documentImageContainer}>
            <Image
              source={{ uri: doc }}
              style={styles.documentImage}
              resizeMode="cover"
            />
            <View
              style={[styles.statusBadge, { backgroundColor: successColor }]}
            >
              <IconSymbol name="checkmark" size={14} color="#fff" />
            </View>
          </View>
        ) : (
          <View style={[styles.documentPlaceholder, { borderColor: border }]}>
            <IconSymbol name="doc.fill" size={40} color={textSecondary} />
          </View>
        )}
        <View style={styles.documentInfo}>
          <ThemedText type="defaultSemiBold" style={styles.documentTitle}>
            {type}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: uploaded ? successColor : errorColor }}
          >
            {uploaded ? "✓ Uploaded" : "Not uploaded"}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText type="title">Review Your Information</ThemedText>
      <ThemedText type="subtitle">Make sure everything is correct.</ThemedText>

      {/* Business Information */}
      <View
        style={[styles.card, { backgroundColor: surfaceCard, shadowColor }]}
      >
        <ThemedText type="subtitle">Business Information</ThemedText>

        <View style={styles.infoRow}>
          <ThemedText>Business Name</ThemedText>
          <ThemedText type="value">{step1.businessName}</ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText>Business Email</ThemedText>
          <ThemedText type="value">{step1.businessEmail}</ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText>Phone</ThemedText>
          <ThemedText type="value">
            {step1.countryCode} {step1.phoneNumber}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText>Business Type</ThemedText>
          <ThemedText type="value">{step1.businessType}</ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText>Employees</ThemedText>
          <ThemedText type="value">{step1.employees}</ThemedText>
        </View>
      </View>

      {/* Verification Documents */}
      <View
        style={[styles.card, { backgroundColor: surfaceCard, shadowColor }]}
      >
        <ThemedText type="subtitle">Verification Documents</ThemedText>
        <View style={styles.documentsGrid}>
          {renderDocument(step2.businessRegCertUri, "Business Registration")}
          {renderDocument(step2.taxIdDocUri, "Tax ID")}
          {renderDocument(step2.proofOfAddressUri, "Proof of Address")}
        </View>
      </View>

      {/* Store Setup */}
      <View
        style={[styles.card, { backgroundColor: surfaceCard, shadowColor }]}
      >
        <ThemedText type="subtitle">Store Setup</ThemedText>

        <View style={styles.infoRow}>
          <ThemedText>Store Name</ThemedText>
          <ThemedText type="value">{step3.storeName}</ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText>Store Description</ThemedText>
          <ThemedText type="value">{step3.storeDescription}</ThemedText>
        </View>

        <ThemedText style={{ marginTop: 8 }}>Store Logo</ThemedText>
        {step3.storeLogoUri ? (
          <Image source={{ uri: step3.storeLogoUri }} style={styles.logo} />
        ) : (
          <IconSymbol size={40} name="camera.fill" color={textSecondary} />
        )}

        <ThemedText style={{ marginTop: 8 }}>Store Banner</ThemedText>
        {step3.storeBannerUri ? (
          <Image source={{ uri: step3.storeBannerUri }} style={styles.banner} />
        ) : (
          <IconSymbol size={40} name="camera.fill" color={textSecondary} />
        )}

        <View style={{ marginTop: 8 }}>
          <ThemedText>Location</ThemedText>
          <ThemedText type="value">
            {step3.location
              ? `${step3.location.lat}, ${step3.location.lng}`
              : "Not selected"}
          </ThemedText>
        </View>

        <View style={{ marginTop: 8 }}>
          <ThemedText>Open Hours</ThemedText>
          {step3.openHours &&
            Object.entries(step3.openHours).map(([day, h]) => (
              <ThemedText key={day}>
                {day.charAt(0).toUpperCase() + day.slice(1)}:{" "}
                {h.closed
                  ? "Closed"
                  : h.is24Hours
                    ? "24 Hours"
                    : `${h.open} - ${h.close}`}
              </ThemedText>
            ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: 24 },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  infoRow: {
    marginBottom: 8,
  },
  documentsGrid: {
    gap: 12,
  },
  documentCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  documentImageContainer: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  documentImage: {
    width: "100%",
    height: "100%",
  },
  documentPlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  documentInfo: {
    gap: 4,
  },
  documentTitle: {
    fontSize: 15,
  },
  logo: { width: 80, height: 80, borderRadius: 40, marginTop: 4 },
  banner: { width: "100%", height: 150, borderRadius: 12, marginTop: 4 },
});
