import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useConfirm } from "@/hooks/use-confirm";
import { useThemeColor } from "@/hooks/use-theme-color";
import { deleteAccount } from "@/services/delete-account.service";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

const REASONS = [
  "I have another account",
  "I am not satisfied with the service",
  "I have privacy concerns",
  "I no longer need the app",
  "Other",
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const textPrimary = useThemeColor({}, "textPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const statusError = useThemeColor({}, "statusError");
  const statusSuccess = useThemeColor({}, "statusSuccess");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteAccount(selectedReason || "No reason provided");
      setStep(3);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1, backgroundColor: surface }}>
      <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText
            style={{ color: primary, marginLeft: 4, fontWeight: "500" }}
          >
            Back
          </ThemedText>
        </Pressable>
        <ThemedText type="subtitle" style={{ flex: 1, textAlign: "center" }}>
          Delete Account
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {step === 1 && (
          <>
            <ThemedText style={[styles.warning, { color: statusError }]}>
              Deleting your account is permanent and cannot be undone. All your
              data will be lost.
            </ThemedText>
            <ThemedText style={{ marginTop: 24, marginBottom: 12 }}>
              Please select a reason for deleting your account:
            </ThemedText>
            {REASONS.map((reason) => (
              <Pressable
                key={reason}
                style={[
                  {
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 10,
                    backgroundColor: surfaceCard,
                  },
                  selectedReason === reason && {
                    borderColor: primary,
                    backgroundColor: primary + "10",
                  },
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <ThemedText
                  style={{
                    color: selectedReason === reason ? primary : textPrimary,
                  }}
                >
                  {reason}
                </ThemedText>
              </Pressable>
            ))}
            <Pressable
              style={[
                styles.nextButton,
                { backgroundColor: selectedReason ? primary : border },
              ]}
              disabled={!selectedReason}
              onPress={() => setStep(2)}
            >
              <ThemedText
                style={{
                  color: selectedReason ? textOnPrimary : textSecondary,
                  fontWeight: "700",
                }}
              >
                Continue
              </ThemedText>
            </Pressable>
          </>
        )}
        {step === 2 && (
          <>
            <ThemedText style={[styles.warning, { color: statusError }]}>
              Are you absolutely sure you want to delete your account?
            </ThemedText>
            <Pressable
              style={[
                styles.nextButton,
                { backgroundColor: statusError, marginTop: 32 },
              ]}
              onPress={async () => {
                const confirmed = await confirm({
                  title: "Final Confirmation",
                  message:
                    "This action cannot be undone. Do you want to proceed?",
                  confirmText: "Delete Account",
                  cancelText: "Cancel",
                });
                if (confirmed) handleDelete();
              }}
              disabled={loading}
            >
              <ThemedText style={{ color: textOnPrimary, fontWeight: "700" }}>
                Delete Account
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.nextButton,
                { backgroundColor: border, marginTop: 16 },
              ]}
              onPress={() => setStep(1)}
            >
              <ThemedText>Back</ThemedText>
            </Pressable>
          </>
        )}
        {step === 3 && (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <IconSymbol name="checkmark.seal" size={48} color={statusSuccess} />
            <ThemedText
              style={{ fontSize: 18, fontWeight: "700", marginTop: 16 }}
            >
              Account Deleted
            </ThemedText>
            <ThemedText
              style={{
                color: textSecondary,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Your account has been deleted. We&apos;re sorry to see you go.
            </ThemedText>
            <Pressable
              style={[
                styles.nextButton,
                { backgroundColor: primary, marginTop: 32 },
              ]}
              onPress={() => router.replace("/")}
            >
              <ThemedText style={{ color: textOnPrimary, fontWeight: "700" }}>
                Go to Home
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <ConfirmModal />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  warning: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 12,
  },
  nextButton: {
    marginTop: 32,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
});
