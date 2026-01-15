import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { getBusinessDetails } from "@/services/business-details.service";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { OpenHours } from "@/types/signup";

/**
 * Edit Business Details Screen
 */
export default function EditBusinessDetailsScreen() {
  const router = useRouter();

  const background = useThemeColor({}, "surfaceBackground");
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const textDisabled = useThemeColor({}, "textDisabled");
  const borderColor = useThemeColor({}, "borderDefault");

  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
      <ThemedView style={{ flex: 1 }}>
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
            <View
              style={{
                width: 60,
                height: 20,
                borderRadius: 4,
                backgroundColor: borderColor,
                opacity: 0.3,
              }}
            />
          </View>
          <View
            style={{
              width: 140,
              height: 24,
              borderRadius: 4,
              backgroundColor: borderColor,
              opacity: 0.3,
            }}
          />
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.container,
            { backgroundColor: background },
          ]}
        >
          {/* Business Information Skeleton */}
          <View style={[styles.card, { backgroundColor: surfaceCard }]}>
            <View style={styles.cardHeader}>
              <View
                style={{
                  width: 150,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
              <View
                style={{
                  width: 60,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
            </View>
            <View style={{ gap: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ gap: 4 }}>
                  <View
                    style={{
                      width: 100,
                      height: 14,
                      borderRadius: 4,
                      backgroundColor: borderColor,
                      opacity: 0.3,
                    }}
                  />
                  <View
                    style={{
                      width: "70%",
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: borderColor,
                      opacity: 0.3,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Business Documents Skeleton */}
          <View style={[styles.card, { backgroundColor: surfaceCard }]}>
            <View style={styles.cardHeader}>
              <View
                style={{
                  width: 160,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
            </View>
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <View
                      style={{
                        width: 140,
                        height: 14,
                        borderRadius: 4,
                        backgroundColor: borderColor,
                        opacity: 0.3,
                      }}
                    />
                    <View
                      style={{
                        width: 80,
                        height: 14,
                        borderRadius: 4,
                        backgroundColor: borderColor,
                        opacity: 0.3,
                      }}
                    />
                  </View>
                  <View
                    style={{
                      width: 60,
                      height: 30,
                      borderRadius: 6,
                      backgroundColor: borderColor,
                      opacity: 0.3,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Store Details Skeleton */}
          <View style={[styles.card, { backgroundColor: surfaceCard }]}>
            <View style={styles.cardHeader}>
              <View
                style={{
                  width: 120,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
              <View
                style={{
                  width: 60,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
            </View>
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ gap: 4 }}>
                  <View
                    style={{
                      width: 100,
                      height: 14,
                      borderRadius: 4,
                      backgroundColor: borderColor,
                      opacity: 0.3,
                    }}
                  />
                  <View
                    style={{
                      width: "80%",
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: borderColor,
                      opacity: 0.3,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Bank Account Skeleton */}
          <View style={[styles.card, { backgroundColor: surfaceCard }]}>
            <View style={styles.cardHeader}>
              <View
                style={{
                  width: 110,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
              <View
                style={{
                  width: 60,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: borderColor,
                  opacity: 0.3,
                }}
              />
            </View>
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ gap: 4 }}>
                  <View
                    style={{
                      width: 100,
                      height: 14,
                      borderRadius: 4,
                      backgroundColor: borderColor,
                      opacity: 0.3,
                    }}
                  />
                  <View
                    style={{
                      width: "70%",
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: borderColor,
                      opacity: 0.3,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </ThemedView>
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

        <ThemedText type="subtitle">Business Details</ThemedText>

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
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="defaultSemiBold">Business Documents</ThemedText>
          </View>

          <View style={{ gap: 12 }}>
            <DocumentRow
              label="Business Reg. Certificate"
              documentUrl={businessData?.step2?.businessRegCert}
              onView={setSelectedImage}
            />
            <DocumentRow
              label="Tax ID"
              documentUrl={businessData?.step2?.taxIdDoc}
              onView={setSelectedImage}
            />
            <DocumentRow
              label="Proof of Address"
              documentUrl={businessData?.step2?.proofOfAddress}
              onView={setSelectedImage}
            />
          </View>
        </View>

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
          <OpenHoursDisplay openHours={businessData?.step3?.openHours} />
        </InfoCard>

        {/* ===== Bank Account ===== */}
        <InfoCard
          title="Bank Account"
          onEdit={() => router.push("/(profile)/edit-business/step4")}
        >
          {businessData?.step4?.bankName ? (
            <>
              <InfoRow
                label="Bank Name"
                value={businessData?.step4?.bankName}
              />
              <InfoRow
                label="Account Number"
                value={businessData?.step4?.accountNumber}
              />
              <InfoRow
                label="Account Name"
                value={businessData?.step4?.accountName}
              />
            </>
          ) : (
            <View style={styles.row}>
              <ThemedText
                style={{
                  color: textDisabled,
                  fontSize: 13,
                }}
              >
                No bank account added yet
              </ThemedText>
            </View>
          )}
        </InfoCard>
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalClose}
            onPress={() => setSelectedImage(null)}
          >
            <IconSymbol name="xmark" size={24} color="#fff" />
          </Pressable>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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

function InfoRow({ label, value }: { label: string; value?: any }) {
  const muted = useThemeColor({}, "textDisabled");

  let displayValue = "—";
  if (value !== undefined && value !== null) {
    if (typeof value === "string") {
      displayValue = value;
    } else if (typeof value === "number") {
      displayValue = String(value);
    } else if (typeof value === "object") {
      displayValue = "View details";
    }
  }

  return (
    <View style={styles.row}>
      <ThemedText style={{ color: muted, fontSize: 13 }}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{displayValue}</ThemedText>
    </View>
  );
}

/* ============================================================
   Document Row
   ============================================================ */

function DocumentRow({
  label,
  documentUrl,
  onView,
}: {
  label: string;
  documentUrl?: string;
  onView: (url: string) => void;
}) {
  const muted = useThemeColor({}, "textDisabled");
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const errorColor = useThemeColor({}, "statusError");

  const isUploaded = !!documentUrl;

  const handleViewDocument = () => {
    if (documentUrl) {
      onView(documentUrl);
    }
  };

  return (
    <View style={styles.documentRow}>
      <View style={{ flex: 1 }}>
        <ThemedText style={{ color: muted, fontSize: 13, marginBottom: 4 }}>
          {label}
        </ThemedText>
        <ThemedText
          type="defaultSemiBold"
          style={{
            color: isUploaded ? successColor : errorColor,
            fontSize: 12,
          }}
        >
          {isUploaded ? "✓ Uploaded" : "✗ Not uploaded"}
        </ThemedText>
      </View>
      {isUploaded && (
        <Pressable onPress={handleViewDocument} style={styles.viewButton}>
          <ThemedText style={{ color: brandPrimary, fontSize: 13 }}>
            View
          </ThemedText>
          <IconSymbol name="eye.fill" size={16} color={brandPrimary} />
        </Pressable>
      )}
    </View>
  );
}

/* ============================================================
   Open Hours Display
   ============================================================ */

function OpenHoursDisplay({ openHours }: { openHours?: OpenHours }) {
  const muted = useThemeColor({}, "textDisabled");

  if (!openHours || Object.keys(openHours).length === 0) {
    return (
      <View style={styles.row}>
        <ThemedText style={{ color: muted, fontSize: 13 }}>
          Open Hours
        </ThemedText>
        <ThemedText type="defaultSemiBold">Not set</ThemedText>
      </View>
    );
  }

  const daysOrder = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const;

  const capitalizeDay = (day: string) =>
    day.charAt(0).toUpperCase() + day.slice(1);

  return (
    <View style={styles.openHoursContainer}>
      <ThemedText style={{ color: muted, fontSize: 13, marginBottom: 8 }}>
        Open Hours
      </ThemedText>
      {daysOrder.map((day) => {
        const hours = openHours[day];
        if (!hours) return null;

        let hoursText = "";
        if (hours.closed) {
          hoursText = "Closed";
        } else if (hours.is24Hours) {
          hoursText = "24 Hours";
        } else {
          hoursText = `${hours.open} - ${hours.close}`;
        }

        return (
          <View key={day} style={styles.dayRow}>
            <ThemedText style={{ fontSize: 13, width: 90 }}>
              {capitalizeDay(day)}
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }}>
              {hoursText}
            </ThemedText>
          </View>
        );
      })}
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
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "rgba(229, 165, 3, 0.1)",
  },
  openHoursContainer: {
    gap: 6,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: "90%",
    height: "80%",
  },
});
