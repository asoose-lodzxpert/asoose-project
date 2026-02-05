import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { requestAccountDeletion } from "@/services/account.service";
import { useAuth } from "@/context/AuthContext";

const DELETION_REASONS = [
  { id: "not-using", label: "I'm not using the app anymore" },
  { id: "better-platform", label: "I found a better platform" },
  { id: "technical-issues", label: "Too many technical issues" },
  { id: "privacy-concerns", label: "Privacy concerns" },
  { id: "fees-too-high", label: "Fees are too high" },
  { id: "poor-support", label: "Poor customer support" },
  { id: "business-closed", label: "My business is closed" },
  { id: "other", label: "Other" },
];

export default function DeleteAccountScreen() {
  const border = useThemeColor({}, "borderDefault");
  const linkColor = useThemeColor({}, "brandPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const textMuted = useThemeColor({}, "textMuted");
  const statusError = useThemeColor({}, "statusError");
  const { signOut } = useAuth();

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Reasons, 3: Confirm

  const toggleReason = (id: string) => {
    setSelectedReasons((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (selectedReasons.length === 0) {
        Toast.show({
          type: "error",
          text1: "Please select at least one reason",
        });
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleSubmitDeletion = async () => {
    setLoading(true);
    setShowConfirmModal(false);

    try {
      const reasonLabels = DELETION_REASONS.filter((r) =>
        selectedReasons.includes(r.id),
      ).map((r) => r.label);

      await requestAccountDeletion({
        reasons: reasonLabels,
        additionalInfo: additionalInfo.trim() || undefined,
      });

      Toast.show({
        type: "success",
        text1: "Account deletion requested",
        text2: "Your request is pending admin approval",
        visibilityTime: 5000,
      });

      // Delay to show toast before signing out
      setTimeout(() => {
        signOut();
        router.replace("/(auth)/login");
      }, 2000);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to request account deletion",
        text2: error.message || "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[
            styles.stepDot,
            { backgroundColor: s <= step ? linkColor : border },
          ]}
        />
      ))}
    </View>
  );

  const renderInfoStep = () => (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.warningCard, { backgroundColor: "#FEF2F2" }]}>
        <IconSymbol
          name="exclamationmark.triangle.fill"
          size={48}
          color={statusError}
        />
        <ThemedText
          type="subtitle"
          style={{ textAlign: "center", marginTop: 12 }}
        >
          Before you delete your account
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: surfaceCard }]}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
          What happens when you delete your account:
        </ThemedText>

        <InfoItem
          icon="xmark.circle"
          text="Your store will be permanently removed from the marketplace"
          color={statusError}
        />
        <InfoItem
          icon="xmark.circle"
          text="All your product listings will be deleted"
          color={statusError}
        />
        <InfoItem
          icon="xmark.circle"
          text="You won't be able to access your order history"
          color={statusError}
        />
        <InfoItem
          icon="xmark.circle"
          text="Your business information will be permanently deleted"
          color={statusError}
        />
        <InfoItem
          icon="clock"
          text="Your request will be reviewed by our admin team"
          color="#F59E0B"
        />
        <InfoItem
          icon="shield.checkmark"
          text="Pending payments will be processed before deletion"
          color="#10B981"
        />
      </View>

      <View style={[styles.card, { backgroundColor: surfaceCard }]}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
          Important Notes:
        </ThemedText>
        <ThemedText style={{ color: textMuted, fontSize: 14, lineHeight: 20 }}>
          • Your account deletion request will be sent to our admin team for
          approval{"\n"}• You will receive a notification about the approval
          status{"\n"}• Some data may be retained for legal compliance purposes
          {"\n"}• This action cannot be undone once approved
        </ThemedText>
      </View>
    </ScrollView>
  );

  const renderReasonsStep = () => (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: surfaceCard }]}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
          Why are you deleting your account?
        </ThemedText>
        <ThemedText
          style={{ color: textMuted, fontSize: 14, marginBottom: 16 }}
        >
          Select all that apply. This helps us improve our platform.
        </ThemedText>

        {DELETION_REASONS.map((reason) => (
          <Pressable
            key={reason.id}
            style={[
              styles.reasonItem,
              { borderColor: border },
              selectedReasons.includes(reason.id) && {
                borderColor: linkColor,
                backgroundColor: linkColor + "10",
              },
            ]}
            onPress={() => toggleReason(reason.id)}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: border },
                selectedReasons.includes(reason.id) && {
                  backgroundColor: linkColor,
                  borderColor: linkColor,
                },
              ]}
            >
              {selectedReasons.includes(reason.id) && (
                <IconSymbol name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <ThemedText>{reason.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: surfaceCard }]}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>
          Additional feedback (optional)
        </ThemedText>
        <TextInput
          style={[styles.textArea, { borderColor: border, color: textMuted }]}
          placeholder="Tell us more about your experience..."
          placeholderTextColor={textMuted}
          multiline
          numberOfLines={4}
          value={additionalInfo}
          onChangeText={setAdditionalInfo}
          maxLength={500}
        />
        <ThemedText style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>
          {additionalInfo.length}/500 characters
        </ThemedText>
      </View>
    </ScrollView>
  );

  const renderConfirmStep = () => (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.warningCard, { backgroundColor: "#FEF2F2" }]}>
        <IconSymbol
          name="exclamationmark.triangle.fill"
          size={48}
          color={statusError}
        />
        <ThemedText
          type="subtitle"
          style={{ textAlign: "center", marginTop: 12 }}
        >
          Final Confirmation
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: surfaceCard }]}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>
          You selected these reasons:
        </ThemedText>
        {DELETION_REASONS.filter((r) => selectedReasons.includes(r.id)).map(
          (reason) => (
            <View key={reason.id} style={styles.selectedReason}>
              <IconSymbol
                name="checkmark.circle.fill"
                size={18}
                color={linkColor}
              />
              <ThemedText>{reason.label}</ThemedText>
            </View>
          ),
        )}

        {additionalInfo.trim() && (
          <>
            <ThemedText
              type="defaultSemiBold"
              style={{ marginTop: 16, marginBottom: 8 }}
            >
              Additional feedback:
            </ThemedText>
            <ThemedText style={{ color: textMuted, fontSize: 14 }}>
              "{additionalInfo}"
            </ThemedText>
          </>
        )}
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: "#FEF2F2",
            borderWidth: 1,
            borderColor: statusError,
          },
        ]}
      >
        <ThemedText
          type="defaultSemiBold"
          style={{ color: statusError, marginBottom: 8 }}
        >
          ⚠️ This action will:
        </ThemedText>
        <ThemedText style={{ fontSize: 14, lineHeight: 22 }}>
          • Submit your account for deletion approval{"\n"}• Send a notification
          to our admin team{"\n"}• Log you out immediately{"\n"}• Cannot be
          undone once approved
        </ThemedText>
      </View>
    </ScrollView>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={10}
          disabled={loading}
        >
          <IconSymbol name="chevron.left" size={20} color={linkColor} />
          <ThemedText style={{ color: linkColor }}>
            {step === 1 ? "Cancel" : "Back"}
          </ThemedText>
        </Pressable>

        <ThemedText type="subtitle">Delete Account</ThemedText>
        <View style={{ width: 60 }} />
      </View>

      {renderStepIndicator()}

      {step === 1 && renderInfoStep()}
      {step === 2 && renderReasonsStep()}
      {step === 3 && renderConfirmStep()}

      {/* Action Button */}
      <View style={[styles.footer, { borderTopColor: border }]}>
        {step < 3 ? (
          <Pressable
            style={[
              styles.button,
              { backgroundColor: linkColor },
              step === 2 &&
                selectedReasons.length === 0 && {
                  opacity: 0.5,
                },
            ]}
            onPress={handleNext}
            disabled={step === 2 && selectedReasons.length === 0}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
              Continue
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, { backgroundColor: statusError }]}
            onPress={() => setShowConfirmModal(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                Request Account Deletion
              </ThemedText>
            )}
          </Pressable>
        )}
      </View>

      <ConfirmationModal
        visible={showConfirmModal}
        message="Are you absolutely sure you want to request account deletion? This action cannot be undone once approved by admin."
        onConfirm={handleSubmitDeletion}
        onCancel={() => setShowConfirmModal(false)}
        loading={loading}
      />

      <Toast />
    </ThemedView>
  );
}

function InfoItem({
  icon,
  text,
  color,
}: {
  icon: string;
  text: string;
  color: string;
}) {
  return (
    <View style={styles.infoItem}>
      <IconSymbol name={icon as any} size={20} color={color} />
      <ThemedText style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  warningCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 100,
  },
  selectedReason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    backgroundColor: "#fff",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
