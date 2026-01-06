import React from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SignupData } from "@/types/signup";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface Step4Props {
  data: SignupData;
}

export const Step4Review: React.FC<Step4Props> = ({ data }) => {
  const { step1, step2, step3 } = data;

  const renderDocument = (doc: string | undefined, type: string) => {
    const uploaded = !!doc;
    return (
      <View key={type} style={styles.documentRow}>
        <IconSymbol
          name={uploaded ? "check" : "xmark"}
          size={20}
          color={uploaded ? "#22C55E" : "#EF4444"}
        />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <ThemedText>{uploaded ? doc : "Not uploaded"}</ThemedText>
          <ThemedText type="caption">{type}</ThemedText>
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
      <View style={styles.card}>
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
      <View style={styles.card}>
        <ThemedText type="subtitle">Verification Documents</ThemedText>
        {renderDocument(step2.businessRegCert, "Business Registration")}
        {renderDocument(step2.taxIdDoc, "Tax ID")}
        {renderDocument(step2.proofOfAddress, "Proof of Address")}
      </View>

      {/* Store Setup */}
      <View style={styles.card}>
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
        {step3.storeLogo ? (
          <Image source={{ uri: step3.storeLogo }} style={styles.logo} />
        ) : (
          <IconSymbol size={40} name="camera.fill" color="#6B7280" />
        )}

        <ThemedText style={{ marginTop: 8 }}>Store Banner</ThemedText>
        {step3.storeBanner ? (
          <Image source={{ uri: step3.storeBanner }} style={styles.banner} />
        ) : (
          <IconSymbol size={40} name="camera.fill" color="#6B7280" />
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
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  infoRow: {
    marginBottom: 8,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  logo: { width: 80, height: 80, borderRadius: 40, marginTop: 4 },
  banner: { width: "100%", height: 150, borderRadius: 12, marginTop: 4 },
});
