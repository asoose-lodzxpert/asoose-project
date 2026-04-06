import React from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SignupData } from "@/types/signup";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Checkbox } from "react-native-paper";
import * as Linking from "expo-linking";

interface Step4Props {
  data: SignupData;
  onCheck: (val: boolean) => void;
}

export const Step4Review: React.FC<Step4Props> = ({ data, onCheck }) => {
  const { step1, step2, step3 } = data;
  const successColor = useThemeColor({}, "statusSuccess");
  const errorColor = useThemeColor({}, "statusError");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value?: string | null;
  }) => (
    <View style={[styles.infoRow, { borderBottomColor: border }]}>
      <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>
        {label}
      </ThemedText>
      <ThemedText style={styles.infoValue} numberOfLines={2}>
        {value || "—"}
      </ThemedText>
    </View>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={[styles.sectionHeader, { borderBottomColor: border }]}>
      <ThemedText style={[styles.sectionTitle, { color: textMuted }]}>
        {title}
      </ThemedText>
    </View>
  );

  const DocRow = ({
    uri,
    name,
    label,
    required,
  }: {
    uri?: string;
    name?: string;
    label: string;
    required: boolean;
  }) => {
    const selected = !!uri;
    return (
      <View style={[styles.docRow, { borderBottomColor: border }]}>
        {selected ? (
          <Image source={{ uri }} style={styles.docThumb} />
        ) : (
          <View style={[styles.docThumbEmpty, { borderColor: border }]}>
            <IconSymbol name="doc.fill" size={16} color={textMuted} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.docLabel}>{label}</ThemedText>
          {!required && (
            <ThemedText style={[styles.docSub, { color: textMuted }]}>
              Optional
            </ThemedText>
          )}
        </View>
        <IconSymbol
          name={selected ? "checkmark.circle.fill" : "xmark.circle"}
          size={18}
          color={selected ? successColor : errorColor}
        />
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText type="title">Review</ThemedText>
      <ThemedText style={[styles.subtitle, { color: textMuted }]}>
        Confirm your details before submitting.
      </ThemedText>

      {/* Business Information */}
      <SectionHeader title="BUSINESS INFO" />
      <InfoRow label="Business Name" value={step1.businessName} />
      <InfoRow label="Email" value={step1.businessEmail} />
      <InfoRow
        label="Phone"
        value={
          step1.countryCode && step1.phoneNumber
            ? `${step1.countryCode} ${step1.phoneNumber}`
            : step1.phoneNumber
        }
      />
      <InfoRow label="Business Type" value={step1.businessType} />
      <InfoRow label="Employees" value={step1.employees} />

      {/* Documents */}
      <SectionHeader title="DOCUMENTS" />
      <DocRow
        uri={step2.businessRegCertUri}
        name={step2.businessRegCertName}
        label="Business Registration"
        required
      />
      <DocRow
        uri={step2.taxIdDocUri}
        name={step2.taxIdDocName}
        label="Tax ID Document"
        required
      />
      <DocRow
        uri={step2.proofOfAddressUri}
        name={step2.proofOfAddressName}
        label="Proof of Address"
        required={false}
      />

      {/* Store Setup */}
      <SectionHeader title="STORE SETUP" />
      <InfoRow label="Store Name" value={step3.storeName} />
      <InfoRow label="Description" value={step3.storeDescription} />
      <InfoRow
        label="Location"
        value={
          step3.location
            ? `${step3.location.lat.toFixed(5)}, ${step3.location.lng.toFixed(5)}`
            : undefined
        }
      />

      {/* Store images */}
      {(step3.storeLogoUri || step3.storeBannerUri) && (
        <View style={styles.imagesRow}>
          {step3.storeLogoUri && (
            <View style={styles.imageBlock}>
              <Image source={{ uri: step3.storeLogoUri }} style={styles.logo} />
              <ThemedText style={[styles.imageLabel, { color: textMuted }]}>
                Logo
              </ThemedText>
            </View>
          )}
          {step3.storeBannerUri && (
            <View style={[styles.imageBlock, { flex: 1 }]}>
              <Image
                source={{ uri: step3.storeBannerUri }}
                style={styles.banner}
              />
              <ThemedText style={[styles.imageLabel, { color: textMuted }]}>
                Banner
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Open Hours */}
      {step3.openHours && Object.keys(step3.openHours).length > 0 && (
        <>
          <SectionHeader title="OPEN HOURS" />
          {Object.entries(step3.openHours).map(([day, h]) => (
            <View
              key={day}
              style={[styles.infoRow, { borderBottomColor: border }]}
            >
              <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </ThemedText>
              <ThemedText style={styles.infoValue}>
                {h.closed
                  ? "Closed"
                  : h.is24Hours
                    ? "24 Hours"
                    : `${h.open || "?"} – ${h.close || "?"}`}
              </ThemedText>
            </View>
          ))}
        </>
      )}

      {/* Terms & Conditions Section */}
      <View style={[styles.termsRow, { borderColor: border }]}>
        <Checkbox
          status={data.acceptedTerms ? "checked" : "unchecked"}
          onPress={() => onCheck(!data.acceptedTerms)}
          color={useThemeColor({}, "brandPrimary")}
        />
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.termsText}>
            I have read and agree to the{" "}
            <ThemedText
              onPress={() => Linking.openURL("https://asoose.com/terms")}
              style={{ color: useThemeColor({}, "brandPrimary"), fontWeight: "700" }}
            >
              Terms and Conditions
            </ThemedText>
            {" "}and privacy policy.
          </ThemedText>
        </View>
      </View>

      <View style={{ height: 8 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: 32 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  sectionHeader: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    flexShrink: 0,
    width: 110,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  docThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    flexShrink: 0,
  },
  docThumbEmpty: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  docLabel: { fontSize: 13, fontWeight: "500" },
  docSub: { fontSize: 11, marginTop: 1 },
  imagesRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    alignItems: "flex-start",
  },
  imageBlock: {
    gap: 4,
    alignItems: "center",
  },
  imageLabel: {
    fontSize: 11,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  banner: {
    width: "100%",
    height: 80,
    borderRadius: 8,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  termsText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
