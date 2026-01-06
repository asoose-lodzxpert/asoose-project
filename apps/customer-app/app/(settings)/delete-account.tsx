import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

import { deleteAccountRequest } from "@/services/delete-account.service";
import { useToast } from "@/components/ui/toast";

/* ------------------ Options ------------------ */
const deleteReasons = [
  "I don't use the app enough",
  "Privacy concerns",
  "Found a better alternative",
  "Other",
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const danger = useThemeColor({}, "statusError");
  const border = useThemeColor({}, "borderDefault");

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");
  const [loading, setLoading] = useState(false);

  const showConfirm = useConfirm();
  const toast = useToast();

  /* ------------------ Handlers ------------------ */
  const handleDelete = async () => {
    if (!selectedReason) {
      toast({
        title: "Select a reason",
        message: "Please select a reason before continuing.",
        variant: "warning",
      });
      return;
    }

    const reasonToSend =
      selectedReason === "Other" ? otherReason : selectedReason;

    if (selectedReason === "Other" && reasonToSend.trim() === "") {
      toast({
        title: "Enter reason",
        message: "Please provide a reason for deleting your account.",
        variant: "warning",
      });
      return;
    }

    // Confirmation dialog
    const ok = await showConfirm({
      title: "Sign out",
      message: "Are you sure you want to sign out?",
      icon: "alert-circle",
      variant: "danger",
      confirmLabel: "Sign out",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setLoading(true);
    await deleteAccountRequest(reasonToSend);
    setLoading(false);

    toast({
      title: "Account deleted",
      message: "Your account has been deleted successfully.",
      variant: "success",
      onClose: () => router.replace("/(auth)/login"),
    });
  };

  return (
    <ThemedView style={styles.container}>
      <Header title="Delete Account" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.intro}>
          We're sorry to see you go. Please let us know why you are deleting
          your account.
        </ThemedText>

        {deleteReasons.map((reason) => (
          <Pressable
            key={reason}
            style={[
              styles.optionRow,
              {
                borderColor: selectedReason === reason ? primary : border,
              },
            ]}
            onPress={() => setSelectedReason(reason)}
          >
            <ThemedText style={styles.optionText}>{reason}</ThemedText>
            {selectedReason === reason && (
              <IconSymbol name="check" size={18} color={primary} />
            )}
          </Pressable>
        ))}

        {selectedReason === "Other" && (
          <ThemedInput
            placeholder="Type your reason"
            value={otherReason}
            onChangeText={setOtherReason}
            multiline
            containerStyle={{ marginTop: 12 }}
          />
        )}

        <Pressable
          style={[styles.deleteBtn, { backgroundColor: danger }]}
          onPress={handleDelete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.deleteText}>Delete Account</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

/* ------------------ Header ------------------ */
function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <IconSymbol name="chevron.left" size={22} color={primary} />
      </Pressable>
      <ThemedText type="title" style={styles.headerTitle}>
        {title}
      </ThemedText>
    </View>
  );
}

/* ------------------ Styles ------------------ */
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  intro: {
    fontSize: 14,
    marginBottom: 16,
    color: "#444",
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
  },

  deleteBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
